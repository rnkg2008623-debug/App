(() => {
  'use strict';

  /* =========================================================
     魚の種類データ（10種）
  ========================================================= */
  const FISH_TYPES = [
    { id: 'maguro', name: 'マグロ',   color: '#2b3a55', belly: '#c7d3e0', accent: '#141b2b', pattern: 'plain',        shape: 'normal', size: 32, speed: 1.35, weight: 4,  rarity: 'レア'   },
    { id: 'katsuo', name: 'カツオ',   color: '#2f5d78', belly: '#e7ded0', accent: '#16323f', pattern: 'stripesBack',  shape: 'normal', size: 25, speed: 1.30, weight: 9,  rarity: '普通'   },
    { id: 'saba',   name: 'サバ',     color: '#3c6e63', belly: '#dfe6d8', accent: '#22403a', pattern: 'stripesBack',  shape: 'normal', size: 21, speed: 1.15, weight: 10, rarity: '普通'   },
    { id: 'aji',    name: 'アジ',     color: '#b8b9a8', belly: '#eef0e2', accent: '#c9a23a', pattern: 'plain',        shape: 'normal', size: 18, speed: 1.00, weight: 10, rarity: '普通'   },
    { id: 'iwashi', name: 'イワシ',   color: '#9fb4c7', belly: '#eef3f7', accent: '#5c7d94', pattern: 'plain',        shape: 'normal', size: 12, speed: 1.60, weight: 12, rarity: '普通'   },
    { id: 'sake',   name: 'サケ',     color: '#3a6b8a', belly: '#f2c9b0', accent: '#c2703f', pattern: 'spots',        shape: 'normal', size: 27, speed: 1.10, weight: 6,  rarity: 'やや稀' },
    { id: 'tai',    name: 'タイ',     color: '#e58fa0', belly: '#fbe4e8', accent: '#c85f76', pattern: 'plain',        shape: 'normal', size: 23, speed: 0.95, weight: 6,  rarity: 'やや稀' },
    { id: 'fugu',   name: 'フグ',     color: '#e0c24d', belly: '#f5ecc8', accent: '#8a6d1f', pattern: 'spots',        shape: 'round',  size: 19, speed: 0.60, weight: 5,  rarity: 'やや稀' },
    { id: 'hirame', name: 'ヒラメ',   color: '#a98358', belly: '#c9ac82', accent: '#6e5230', pattern: 'spots',        shape: 'flat',   size: 24, speed: 0.70, weight: 4,  rarity: 'レア'   },
    { id: 'unagi',  name: 'ウナギ',   color: '#4a3b2a', belly: '#8a7550', accent: '#2c2115', pattern: 'plain',        shape: 'eel',    size: 14, speed: 1.20, weight: 3,  rarity: 'レア'   },
  ];
  const FISH_BY_ID = Object.fromEntries(FISH_TYPES.map(f => [f.id, f]));
  const TOTAL_WEIGHT = FISH_TYPES.reduce((s, f) => s + f.weight, 0);
  const TANK_COUNT = 6;
  const SAVE_KEY = 'umi_taiki_save_v1';

  function weightedRandomType() {
    let r = Math.random() * TOTAL_WEIGHT;
    for (const f of FISH_TYPES) {
      r -= f.weight;
      if (r <= 0) return f;
    }
    return FISH_TYPES[FISH_TYPES.length - 1];
  }

  /* =========================================================
     セーブデータ
  ========================================================= */
  function defaultSave() {
    const pool = {};
    FISH_TYPES.forEach(f => { pool[f.id] = 0; });
    return {
      pool,
      tanks: Array.from({ length: TANK_COUNT }, () => ({ species: null, count: 0 })),
      totalCaught: 0,
      discovered: {},
      lastSeen: Date.now(),
      muted: false,
    };
  }

  function loadSave() {
    let save;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      save = raw ? JSON.parse(raw) : null;
    } catch (e) {
      save = null;
    }
    const base = defaultSave();
    if (!save || typeof save !== 'object') return base;
    save.pool = Object.assign(base.pool, save.pool || {});
    if (!Array.isArray(save.tanks)) save.tanks = base.tanks;
    while (save.tanks.length < TANK_COUNT) save.tanks.push({ species: null, count: 0 });
    save.tanks = save.tanks.slice(0, TANK_COUNT).map(t => ({
      species: t && t.species && FISH_BY_ID[t.species] ? t.species : null,
      count: t && Number.isFinite(t.count) ? Math.max(0, Math.floor(t.count)) : 0,
    }));
    save.totalCaught = Number.isFinite(save.totalCaught) ? save.totalCaught : 0;
    save.discovered = save.discovered && typeof save.discovered === 'object' ? save.discovered : {};
    save.lastSeen = Number.isFinite(save.lastSeen) ? save.lastSeen : Date.now();
    save.muted = !!save.muted;
    return save;
  }

  const state = {
    save: loadSave(),
    currentView: 'sea',
  };

  function persist() {
    state.save.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state.save)); } catch (e) { /* ignore */ }
  }

  /* =========================================================
     放置（オフライン）計算
  ========================================================= */
  function computeOfflineCatch() {
    const save = state.save;
    const now = Date.now();
    const elapsedMs = now - (save.lastSeen || now);
    save.lastSeen = now;
    const elapsedSec = elapsedMs / 1000;
    if (elapsedSec < 30) return null;

    const cappedSec = Math.min(elapsedSec, 8 * 3600); // 最大8時間分まで
    const CATCH_INTERVAL_SEC = 40; // 放置中は40秒に1匹ペースで自動的に獲れる
    let count = Math.floor(cappedSec / CATCH_INTERVAL_SEC);
    count = Math.min(count, 400);
    if (count <= 0) return null;

    const breakdown = {};
    for (let i = 0; i < count; i++) {
      const t = weightedRandomType();
      save.pool[t.id] = (save.pool[t.id] || 0) + 1;
      save.discovered[t.id] = true;
      breakdown[t.id] = (breakdown[t.id] || 0) + 1;
    }
    save.totalCaught += count;
    persist();
    return { count, breakdown, elapsedSec: cappedSec };
  }

  function showOfflineModal(result) {
    const modal = document.getElementById('modal-offline');
    const text = document.getElementById('offline-summary-text');
    const breakdownEl = document.getElementById('offline-breakdown');
    const hours = result.elapsedSec / 3600;
    text.textContent = `留守中（約${hours >= 1 ? hours.toFixed(1) + '時間' : Math.round(result.elapsedSec / 60) + '分'}）に、海で ${result.count} 匹の魚が獲れました！`;
    breakdownEl.innerHTML = '';
    Object.entries(result.breakdown)
      .sort((a, b) => b[1] - a[1])
      .forEach(([id, n]) => {
        const span = document.createElement('span');
        span.textContent = `${FISH_BY_ID[id].name} ×${n}`;
        breakdownEl.appendChild(span);
      });
    modal.classList.remove('hidden');
  }

  /* =========================================================
     サウンド（WebAudioで簡易生成、外部音源なし）
  ========================================================= */
  let audioCtx = null;
  function playCatchSound() {
    if (state.save.muted) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, t0);
      osc.frequency.exponentialRampToValueAtTime(1100, t0 + 0.12);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.26);
    } catch (e) { /* ignore audio errors */ }
  }

  /* =========================================================
     魚の描画（共通テンプレート＋形状別バリエーション）
  ========================================================= */
  function drawNormalBody(ctx, cfg, s, t, phase) {
    const tailAngle = Math.sin((t + phase) * 7) * 0.5;
    ctx.save();
    ctx.translate(-s * 0.95, 0);
    ctx.rotate(tailAngle * 0.6);
    ctx.fillStyle = cfg.accent;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-s * 0.7, -s * 0.5);
    ctx.lineTo(-s * 0.7, s * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = cfg.color;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, s * 0.24, s * 0.72, s * 0.26, 0, 0, Math.PI * 2);
    ctx.fillStyle = cfg.belly;
    ctx.fill();

    if (cfg.pattern === 'stripesBack') {
      ctx.strokeStyle = cfg.accent;
      ctx.lineWidth = Math.max(1, s * 0.08);
      for (let i = -2; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * s * 0.3, -s * 0.5);
        ctx.lineTo(i * s * 0.3 + s * 0.22, s * 0.15);
        ctx.stroke();
      }
    } else if (cfg.pattern === 'spots') {
      ctx.fillStyle = cfg.accent;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * s * 0.35, -s * 0.05, s * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.beginPath();
    ctx.fillStyle = cfg.accent;
    ctx.moveTo(-s * 0.05, -s * 0.5);
    ctx.lineTo(s * 0.25, -s * 0.5);
    ctx.lineTo(s * 0.05, -s * 0.92);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(s * 0.55, -s * 0.08, s * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = '#111';
    ctx.arc(s * 0.6, -s * 0.08, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRoundBody(ctx, cfg, s, t, phase) {
    const pulse = 1 + Math.sin((t + phase) * 2) * 0.05;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.82 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = cfg.color;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, s * 0.3, s * 0.52, s * 0.24, 0, 0, Math.PI * 2);
    ctx.fillStyle = cfg.belly;
    ctx.fill();

    ctx.fillStyle = cfg.accent;
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * s * 0.48, Math.sin(ang) * s * 0.38 - s * 0.08, s * 0.075, 0, Math.PI * 2);
      ctx.fill();
    }

    const tailAngle = Math.sin((t + phase) * 6) * 0.4;
    ctx.save();
    ctx.translate(-s * 0.78, 0);
    ctx.rotate(tailAngle * 0.5);
    ctx.fillStyle = cfg.accent;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-s * 0.38, -s * 0.32);
    ctx.lineTo(-s * 0.38, s * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(s * 0.38, -s * 0.15, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = '#111';
    ctx.arc(s * 0.43, -s * 0.15, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFlatBody(ctx, cfg, s, t, phase) {
    const wiggle = Math.sin((t + phase) * 5) * 0.06;
    ctx.save();
    ctx.rotate(wiggle);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 1.15, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = cfg.color;
    ctx.fill();

    ctx.fillStyle = cfg.accent;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(i * s * 0.35, -s * 0.03, s * 0.065, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.fillStyle = cfg.accent;
    ctx.moveTo(-s * 1.1, 0);
    ctx.lineTo(-s * 1.42, -s * 0.22);
    ctx.lineTo(-s * 1.42, s * 0.22);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(s * 0.5, -s * 0.16, s * 0.1, 0, Math.PI * 2);
    ctx.arc(s * 0.72, -s * 0.13, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = '#111';
    ctx.arc(s * 0.53, -s * 0.16, s * 0.045, 0, Math.PI * 2);
    ctx.arc(s * 0.75, -s * 0.13, s * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawEelBody(ctx, cfg, s, t, phase) {
    const len = s * 3.4;
    const amp = s * 0.4;
    const segments = 12;
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const px = -len / 2 + (len * i) / segments;
      const py = Math.sin(px * 0.07 + (t + phase) * 6) * amp;
      pts.push([px, py]);
    }
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = s * 0.55;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.beginPath();
    pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py - s * 0.08) : ctx.lineTo(px, py - s * 0.08)));
    ctx.strokeStyle = cfg.belly;
    ctx.lineWidth = s * 0.14;
    ctx.stroke();

    const [hx, hy] = pts[pts.length - 1];
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(hx - 2, hy - 2, s * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = '#111';
    ctx.arc(hx - 1, hy - 2, s * 0.065, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFish(ctx, cfg, x, y, dir, size, t, phase) {
    ctx.save();
    ctx.translate(x, y);
    if (dir < 0) ctx.scale(-1, 1);
    switch (cfg.shape) {
      case 'eel': drawEelBody(ctx, cfg, size, t, phase); break;
      case 'flat': drawFlatBody(ctx, cfg, size, t, phase); break;
      case 'round': drawRoundBody(ctx, cfg, size, t, phase); break;
      default: drawNormalBody(ctx, cfg, size, t, phase);
    }
    ctx.restore();
  }

  function hitTest(f, mx, my) {
    const dx = mx - f.x;
    const dy = my - f.y;
    if (f.cfg.shape === 'eel') {
      return Math.abs(dx) < f.size * 1.9 && Math.abs(dy) < f.size * 0.9;
    }
    if (f.cfg.shape === 'flat') {
      return (dx * dx) / ((f.size * 1.3) ** 2) + (dy * dy) / ((f.size * 0.7) ** 2) <= 1;
    }
    const r = f.size * 1.15;
    return dx * dx + dy * dy <= r * r;
  }

  /* =========================================================
     HiDPI canvas セットアップ
  ========================================================= */
  function setupCanvas(canvas) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w <= 0 || h <= 0) return { ctx: canvas.getContext('2d'), w: 0, h: 0 };
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  /* =========================================================
     海シーン
  ========================================================= */
  const seaCanvas = document.getElementById('sea-canvas');
  const seaStage = seaCanvas.closest('.sea-stage');
  let seaCtx = null;
  let seaW = 0, seaH = 0;
  const seaFish = [];
  const bubbles = [];
  let seaSpawnTimer = 0;
  let nextFishId = 1;

  function resizeSea() {
    const r = setupCanvas(seaCanvas);
    seaCtx = r.ctx;
    seaW = r.w;
    seaH = r.h;
    seaFish.forEach(f => { f.y = Math.min(f.y, Math.max(20, seaH - 20)); });
  }

  function initBubbles() {
    bubbles.length = 0;
    for (let i = 0; i < 16; i++) {
      bubbles.push({
        x: Math.random(),
        y: Math.random(),
        r: 2 + Math.random() * 4,
        speed: 8 + Math.random() * 18,
      });
    }
  }
  initBubbles();

  function spawnSeaFish() {
    if (seaFish.length >= 16 || seaW <= 0) return;
    const cfg = weightedRandomType();
    const fromLeft = Math.random() < 0.5;
    const margin = 40;
    const isBottomDweller = cfg.shape === 'flat';
    const yMin = isBottomDweller ? seaH * 0.6 : seaH * 0.12;
    const yMax = isBottomDweller ? seaH * 0.92 : seaH * 0.85;
    seaFish.push({
      id: nextFishId++,
      cfg,
      size: cfg.size,
      x: fromLeft ? -margin : seaW + margin,
      baseY: yMin + Math.random() * (yMax - yMin),
      y: 0,
      dir: fromLeft ? 1 : -1,
      speed: cfg.speed * (48 + Math.random() * 18),
      phase: Math.random() * 10,
      bobAmp: cfg.size * (0.12 + Math.random() * 0.1),
      bobFreq: 1.2 + Math.random() * 1.2,
    });
  }

  function updateSea(dt, t) {
    if (seaW <= 0) return;
    seaSpawnTimer -= dt;
    if (seaSpawnTimer <= 0) {
      spawnSeaFish();
      seaSpawnTimer = 0.55 + Math.random() * 0.85;
    }
    for (let i = seaFish.length - 1; i >= 0; i--) {
      const f = seaFish[i];
      f.x += f.dir * f.speed * dt;
      f.y = f.baseY + Math.sin((t + f.phase) * f.bobFreq) * f.bobAmp;
      if (f.x < -80 && f.dir < 0 || f.x > seaW + 80 && f.dir > 0) {
        seaFish.splice(i, 1);
      }
    }
    bubbles.forEach(b => {
      b.y -= (b.speed * dt) / seaH;
      if (b.y < -0.05) { b.y = 1.02; b.x = Math.random(); }
    });
  }

  function drawSea(t) {
    if (!seaCtx || seaW <= 0) return;
    seaCtx.clearRect(0, 0, seaW, seaH);
    seaCtx.fillStyle = 'rgba(255,255,255,0.35)';
    bubbles.forEach(b => {
      seaCtx.beginPath();
      seaCtx.arc(b.x * seaW, b.y * seaH, b.r, 0, Math.PI * 2);
      seaCtx.fill();
    });
    seaFish.forEach(f => drawFish(seaCtx, f.cfg, f.x, f.y, f.dir, f.size, t, f.phase));
  }

  function spawnCatchFloatText(clientX, clientY, name) {
    const el = document.createElement('div');
    el.className = 'catch-float';
    el.textContent = `+1 ${name}`;
    const rect = seaStage.getBoundingClientRect();
    el.style.left = (clientX - rect.left) + 'px';
    el.style.top = (clientY - rect.top) + 'px';
    seaStage.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  function handleSeaPointer(ev) {
    if (seaW <= 0) return;
    const rect = seaCanvas.getBoundingClientRect();
    const clientX = ev.clientX !== undefined ? ev.clientX : (ev.changedTouches && ev.changedTouches[0].clientX);
    const clientY = ev.clientY !== undefined ? ev.clientY : (ev.changedTouches && ev.changedTouches[0].clientY);
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    for (let i = seaFish.length - 1; i >= 0; i--) {
      const f = seaFish[i];
      if (hitTest(f, mx, my)) {
        seaFish.splice(i, 1);
        state.save.pool[f.cfg.id] = (state.save.pool[f.cfg.id] || 0) + 1;
        state.save.discovered[f.cfg.id] = true;
        state.save.totalCaught += 1;
        persist();
        spawnCatchFloatText(clientX, clientY, f.cfg.name);
        playCatchSound();
        updateStatsBar();
        renderDex();
        break;
      }
    }
  }
  seaCanvas.addEventListener('click', handleSeaPointer);

  new ResizeObserver(() => resizeSea()).observe(seaStage);

  /* =========================================================
     水族館シーン
  ========================================================= */
  const tankGrid = document.getElementById('tank-grid');
  const tanksRuntime = []; // {canvas, ctx, w, h, fish:[]}
  let tankObservers = [];

  function buildTankVisualFish(rt, tankData) {
    rt.fish = [];
    if (!tankData.species || tankData.count <= 0 || rt.w <= 0) return;
    const cfg = FISH_BY_ID[tankData.species];
    const n = Math.min(tankData.count, 10);
    for (let i = 0; i < n; i++) {
      const size = cfg.size * 0.5;
      rt.fish.push({
        cfg,
        size,
        x: Math.random() * rt.w,
        y: size * 1.4 + Math.random() * Math.max(1, rt.h - size * 2.8),
        dir: Math.random() < 0.5 ? 1 : -1,
        speed: cfg.speed * (18 + Math.random() * 10),
        phase: Math.random() * 10,
        bobAmp: size * 0.15,
        bobFreq: 1.4 + Math.random() * 1,
      });
    }
  }

  function renderTankGrid() {
    tankGrid.innerHTML = '';
    tanksRuntime.length = 0;
    tankObservers.forEach(ro => ro.disconnect());
    tankObservers = [];
    state.save.tanks.forEach((tankData, idx) => {
      const card = document.createElement('div');
      card.className = 'tank-card';

      const canvasWrap = document.createElement('div');
      canvasWrap.className = 'tank-canvas-wrap';
      const canvas = document.createElement('canvas');
      canvasWrap.appendChild(canvas);
      const badge = document.createElement('div');
      badge.className = 'tank-badge';
      badge.textContent = `水槽${idx + 1}：${tankData.species ? FISH_BY_ID[tankData.species].name + ' ×' + tankData.count : '空'}`;
      canvasWrap.appendChild(badge);
      card.appendChild(canvasWrap);

      const controls = document.createElement('div');
      controls.className = 'tank-controls';

      const select = document.createElement('select');
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = '（空にする）';
      select.appendChild(emptyOpt);
      FISH_TYPES.forEach(cfg => {
        const owned = state.save.pool[cfg.id] || 0;
        const inThisTank = tankData.species === cfg.id ? tankData.count : 0;
        const avail = owned + inThisTank;
        const opt = document.createElement('option');
        opt.value = cfg.id;
        opt.textContent = `${cfg.name}（所持${avail}）`;
        if (avail <= 0) opt.disabled = true;
        if (tankData.species === cfg.id) opt.selected = true;
        select.appendChild(opt);
      });

      const numberInput = document.createElement('input');
      numberInput.type = 'number';
      numberInput.min = '0';
      numberInput.value = String(tankData.count);

      const availLabel = document.createElement('div');
      availLabel.className = 'avail';

      function updateAvailLabel() {
        const sel = select.value;
        if (!sel) { availLabel.textContent = '水槽を空にします'; numberInput.value = '0'; numberInput.max = '0'; numberInput.disabled = true; return; }
        numberInput.disabled = false;
        const owned = state.save.pool[sel] || 0;
        const inThisTank = tankData.species === sel ? tankData.count : 0;
        const maxAvail = owned + inThisTank;
        numberInput.max = String(maxAvail);
        if (Number(numberInput.value) > maxAvail) numberInput.value = String(maxAvail);
        availLabel.textContent = `入れられる数：0〜${maxAvail}匹`;
      }
      select.addEventListener('change', () => {
        numberInput.value = String(tankData.species === select.value ? tankData.count : Math.min(1, state.save.pool[select.value] || 0));
        updateAvailLabel();
      });
      updateAvailLabel();

      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'btn-primary';
      confirmBtn.textContent = '決定';
      confirmBtn.addEventListener('click', () => {
        const newSpecies = select.value || null;
        let newCount = Math.max(0, Math.floor(Number(numberInput.value) || 0));

        // 元の魚をいったん倉庫に戻す
        if (tankData.species) {
          state.save.pool[tankData.species] = (state.save.pool[tankData.species] || 0) + tankData.count;
        }
        tankData.species = null;
        tankData.count = 0;

        if (newSpecies) {
          const owned = state.save.pool[newSpecies] || 0;
          newCount = Math.min(newCount, owned);
          state.save.pool[newSpecies] = owned - newCount;
          if (newCount > 0) {
            tankData.species = newSpecies;
            tankData.count = newCount;
          }
        }
        persist();
        updateStatsBar();
        renderTankGrid();
      });

      const emptyBtn = document.createElement('button');
      emptyBtn.type = 'button';
      emptyBtn.className = 'btn-secondary';
      emptyBtn.textContent = '全部出す';
      emptyBtn.addEventListener('click', () => {
        if (tankData.species) {
          state.save.pool[tankData.species] = (state.save.pool[tankData.species] || 0) + tankData.count;
          tankData.species = null;
          tankData.count = 0;
          persist();
          updateStatsBar();
          renderTankGrid();
        }
      });

      controls.appendChild(select);
      controls.appendChild(numberInput);
      controls.appendChild(confirmBtn);
      controls.appendChild(emptyBtn);
      controls.appendChild(availLabel);
      card.appendChild(controls);
      tankGrid.appendChild(card);

      const rt = { canvas, w: 0, h: 0, ctx: null, fish: [], tankData };
      tanksRuntime.push(rt);
      const ro = new ResizeObserver(() => {
        const r = setupCanvas(canvas);
        rt.ctx = r.ctx;
        rt.w = r.w;
        rt.h = r.h;
        buildTankVisualFish(rt, tankData);
      });
      ro.observe(canvasWrap);
      tankObservers.push(ro);
    });
  }

  function updateAquarium(dt, t) {
    tanksRuntime.forEach(rt => {
      if (rt.w <= 0) return;
      rt.fish.forEach(f => {
        f.x += f.dir * f.speed * dt;
        if (f.x < f.size) { f.x = f.size; f.dir = 1; }
        if (f.x > rt.w - f.size) { f.x = rt.w - f.size; f.dir = -1; }
      });
    });
  }

  function drawAquarium(t) {
    tanksRuntime.forEach(rt => {
      if (!rt.ctx || rt.w <= 0) return;
      rt.ctx.clearRect(0, 0, rt.w, rt.h);
      rt.fish.forEach(f => {
        const y = f.y + Math.sin((t + f.phase) * f.bobFreq) * f.bobAmp;
        drawFish(rt.ctx, f.cfg, f.x, y, f.dir, f.size, t, f.phase);
      });
    });
  }

  /* =========================================================
     図鑑ストリップ・統計バー
  ========================================================= */
  const dexStrip = document.getElementById('dex-strip');
  function renderDex() {
    dexStrip.innerHTML = '';
    FISH_TYPES.forEach(cfg => {
      const owned = (state.save.pool[cfg.id] || 0) +
        state.save.tanks.filter(t => t.species === cfg.id).reduce((s, t) => s + t.count, 0);
      const discovered = !!state.save.discovered[cfg.id];
      const chip = document.createElement('div');
      chip.className = 'dex-chip' + (discovered ? '' : ' undiscovered');
      chip.title = `${cfg.name}（${cfg.rarity}）`;
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = cfg.color;
      const label = document.createElement('span');
      label.textContent = discovered ? cfg.name : '？？？';
      const count = document.createElement('span');
      count.className = 'count';
      count.textContent = discovered ? `×${owned}` : '';
      chip.appendChild(swatch);
      chip.appendChild(label);
      chip.appendChild(count);
      dexStrip.appendChild(chip);
    });
  }

  function updateStatsBar() {
    const poolTotal = Object.values(state.save.pool).reduce((a, b) => a + b, 0);
    const tankTotal = state.save.tanks.reduce((a, t) => a + t.count, 0);
    document.getElementById('stat-pool').textContent = poolTotal;
    document.getElementById('stat-tank').textContent = tankTotal;
    document.getElementById('stat-total').textContent = state.save.totalCaught;
    document.getElementById('stat-dex').textContent = Object.keys(state.save.discovered).length;
  }

  /* =========================================================
     タブ切り替え
  ========================================================= */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      state.currentView = view;
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      document.getElementById('view-sea').classList.toggle('active', view === 'sea');
      document.getElementById('view-aquarium').classList.toggle('active', view === 'aquarium');
      if (view === 'sea') requestAnimationFrame(resizeSea);
      if (view === 'aquarium') renderTankGrid();
    });
  });

  /* =========================================================
     ミュートボタン
  ========================================================= */
  const muteBtn = document.getElementById('btn-mute');
  function updateMuteBtn() { muteBtn.textContent = state.save.muted ? '🔇' : '🔊'; }
  muteBtn.addEventListener('click', () => {
    state.save.muted = !state.save.muted;
    persist();
    updateMuteBtn();
  });

  /* =========================================================
     おかえりモーダル
  ========================================================= */
  document.getElementById('btn-offline-close').addEventListener('click', () => {
    document.getElementById('modal-offline').classList.add('hidden');
  });

  /* =========================================================
     メインループ
  ========================================================= */
  let lastT = performance.now() / 1000;
  function loop(now) {
    const t = now / 1000;
    let dt = t - lastT;
    lastT = t;
    dt = Math.min(dt, 0.05);

    if (state.currentView === 'sea') {
      updateSea(dt, t);
      drawSea(t);
    } else {
      updateAquarium(dt, t);
      drawAquarium(t);
    }
    requestAnimationFrame(loop);
  }

  /* =========================================================
     定期セーブ
  ========================================================= */
  setInterval(persist, 8000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  window.addEventListener('pagehide', persist);

  /* =========================================================
     初期化
  ========================================================= */
  function init() {
    const offlineResult = computeOfflineCatch();
    updateMuteBtn();
    resizeSea();
    renderTankGrid();
    updateStatsBar();
    renderDex();
    if (offlineResult) showOfflineModal(offlineResult);
    persist();
    requestAnimationFrame(loop);
  }
  init();

  // デバッグ用（開発者ツールから状態確認したい場合に使用）
  window.__umiDebug = { state, seaFish };
})();
