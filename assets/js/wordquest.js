(() => {
  'use strict';

  // ================= 定数・ユーティリティ =================
  const STORAGE_KEY = 'wordquest.v1';
  const MAX_ANSWER_MS = 120000; // 放置による時間の水増しを防ぐため1問あたり最大2分で記録
  const UNTAGGED = '__untagged';
  const $ = (id) => document.getElementById(id);

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
  const norm = (s) => String(s).trim().toLowerCase();
  const pct = (c, a) => (a ? Math.round((c / a) * 100) : 0);
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const dateKey = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const sortCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

  function fmtDuration(ms) {
    const s = Math.round(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h) return `${h}時間${m}分`;
    if (m) return `${m}分${sec}秒`;
    return `${sec}秒`;
  }
  const fmtSec = (ms) => `${(ms / 1000).toFixed(1)}秒`;
  const accClass = (a, n) => (!n ? '' : a >= 80 ? 'acc-hi' : a >= 50 ? 'acc-mid' : 'acc-lo');

  // ================= 状態 =================
  function defaultState() {
    return {
      words: [],
      nextId: 1,
      profile: { xp: 0, answers: 0, correct: 0, ms: 0, bestCombo: 0, sessions: 0 },
      days: {},
      settings: { dir: 't2m', count: 10, mode: 'smart', tags: [], sound: true },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const data = JSON.parse(raw);
      const base = defaultState();
      return {
        ...base, ...data,
        profile: { ...base.profile, ...data.profile },
        settings: { ...base.settings, ...data.settings },
      };
    } catch {
      return defaultState();
    }
  }

  let S = load();
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); }
    catch { toast('⚠ 保存に失敗しました（容量不足の可能性）'); }
  }

  function dayRec(k = dateKey()) {
    if (!S.days[k]) S.days[k] = { imported: 0, answered: 0, correct: 0, ms: 0, xp: 0, words: {} };
    return S.days[k];
  }

  // ================= レベル計算 =================
  // プレイヤー: Lv L → L+1 に必要なXPはレベルが上がるほど増える
  const xpNeed = (L) => Math.round(50 * Math.pow(L, 1.35));
  function levelInfo(xp) {
    let L = 1, rest = xp;
    while (rest >= xpNeed(L)) { rest -= xpNeed(L); L++; }
    return { level: L, cur: rest, need: xpNeed(L) };
  }
  // 単語: 回答数 + 正答数×2 を経験値として、必要量が段階的に増える
  const wordXp = (w) => w.attempts + w.correct * 2;
  const wordNeed = (L) => 3 * L;
  function wordLevel(w) {
    let L = 1, rest = wordXp(w);
    while (rest >= wordNeed(L) && L < 99) { rest -= wordNeed(L); L++; }
    return L;
  }
  const TITLES = [
    [1, '見習い冒険者'], [3, '駆け出しの旅人'], [5, '単語ハンター'], [8, '語彙の剣士'],
    [12, 'ことばの魔導士'], [16, '辞書の守護者'], [20, '語彙マスター'], [30, '伝説の言語王'],
  ];
  const titleFor = (L) => TITLES.filter(([n]) => L >= n).pop()[1];

  // ================= 効果音 =================
  let audioCtx = null;
  function beep(notes) {
    if (!S.settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      let t = audioCtx.currentTime;
      for (const [freq, dur, type = 'sine'] of notes) {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g).connect(audioCtx.destination);
        o.start(t); o.stop(t + dur);
        t += dur * 0.8;
      }
    } catch { /* 音が出せない環境では無視 */ }
  }
  const sfx = {
    good: () => beep([[880, 0.08, 'triangle'], [1320, 0.14, 'triangle']]),
    bad: () => beep([[220, 0.18, 'sawtooth'], [160, 0.22, 'sawtooth']]),
    level: () => beep([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.3]]),
  };

  // ================= 共通UI =================
  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = msg;
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function openModal(html, onMount) {
    $('modal').innerHTML = html;
    $('modal-bg').classList.remove('hidden');
    onMount?.($('modal'));
  }
  function closeModal() { $('modal-bg').classList.add('hidden'); $('modal').innerHTML = ''; }
  $('modal-bg').addEventListener('click', (e) => { if (e.target === $('modal-bg')) closeModal(); });

  let levelupTimer = null;
  function showLevelUp(level) {
    $('lu-level').textContent = level;
    $('lu-sub').textContent = `称号: ${titleFor(level)}`;
    $('levelup').classList.remove('hidden');
    sfx.level();
    clearTimeout(levelupTimer);
    levelupTimer = setTimeout(() => $('levelup').classList.add('hidden'), 2200);
  }
  $('levelup').addEventListener('click', () => $('levelup').classList.add('hidden'));

  function renderHeader() {
    const li = levelInfo(S.profile.xp);
    $('hdr-level').textContent = `Lv ${li.level}`;
    $('hdr-xp-fill').style.width = `${(li.cur / li.need) * 100}%`;
    $('hdr-xp-text').textContent = `${li.cur} / ${li.need} XP`;
    const d = S.days[dateKey()];
    $('hdr-today').textContent = `今日 ${d ? d.answered : 0}問`;
    $('btn-sound').textContent = S.settings.sound ? '🔊' : '🔇';
  }
  $('btn-sound').addEventListener('click', () => {
    S.settings.sound = !S.settings.sound; save(); renderHeader();
  });

  // ================= タブ =================
  let currentView = 'play';
  const renderers = {
    play: () => renderSetup(), import: () => renderPreview(), list: () => renderList(),
    calendar: () => renderCalendar(), profile: () => renderProfile(),
  };
  function showView(v) {
    currentView = v;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === v));
    document.querySelectorAll('.view').forEach((s) => s.classList.toggle('active', s.id === `view-${v}`));
    renderers[v]();
  }
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
    if (game && !game.finished && t.dataset.view !== 'play') {
      if (!confirm('クエスト中です。中断して移動しますか？（ここまでの回答は記録済みです）')) return;
      endGame(true);
    }
    showView(t.dataset.view);
  }));

  // ================= タグ =================
  function allTags() {
    const m = new Map();
    for (const w of S.words) for (const t of w.tags) m.set(t, (m.get(t) || 0) + 1);
    return [...m.entries()].sort((a, b) => sortCollator.compare(a[0], b[0]));
  }
  const untaggedCount = () => S.words.filter((w) => !w.tags.length).length;
  const splitTags = (s) => String(s || '').split(/[;|,、\s　]+/).map((t) => t.trim()).filter(Boolean);
  function matchesTags(w, tags) {
    if (!tags.length) return true;
    return tags.some((t) => (t === UNTAGGED ? !w.tags.length : w.tags.includes(t)));
  }

  function renderTagChips(container, selected, onChange) {
    const tags = allTags();
    const un = untaggedCount();
    let html = `<button type="button" class="chip ${selected.length ? '' : 'on'}" data-t="">すべて<span class="n">${S.words.length}</span></button>`;
    for (const [t, n] of tags) {
      html += `<button type="button" class="chip ${selected.includes(t) ? 'on' : ''}" data-t="${esc(t)}">#${esc(t)}<span class="n">${n}</span></button>`;
    }
    if (un && tags.length) {
      html += `<button type="button" class="chip ${selected.includes(UNTAGGED) ? 'on' : ''}" data-t="${UNTAGGED}">タグなし<span class="n">${un}</span></button>`;
    }
    container.innerHTML = html;
    container.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => {
      const t = c.dataset.t;
      let next;
      if (!t) next = [];
      else next = selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t];
      onChange(next);
    }));
  }

  // ================= プレイ: 準備 =================
  function bindSeg(id, key, cast = String) {
    const el = $(id);
    el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      S.settings[key] = cast(b.dataset.v); save(); renderSetup();
    }));
  }
  bindSeg('play-dir', 'dir');
  bindSeg('play-count', 'count', Number);
  bindSeg('play-mode', 'mode');

  function poolForSettings() {
    const known = new Set(allTags().map(([t]) => t));
    S.settings.tags = S.settings.tags.filter((t) => t === UNTAGGED || known.has(t));
    let pool = S.words.filter((w) => matchesTags(w, S.settings.tags));
    if (S.settings.mode === 'weak') pool = pool.filter((w) => w.attempts && pct(w.correct, w.attempts) < 70);
    if (S.settings.mode === 'new') pool = pool.filter((w) => !w.attempts);
    return pool;
  }

  function renderSetup() {
    renderTagChips($('play-tags'), S.settings.tags, (next) => { S.settings.tags = next; save(); renderSetup(); });
    for (const [id, key] of [['play-dir', 'dir'], ['play-count', 'count'], ['play-mode', 'mode']]) {
      $(id).querySelectorAll('button').forEach((b) => b.classList.toggle('on', String(S.settings[key]) === b.dataset.v));
    }
    const pool = poolForSettings();
    const info = $('play-pool-info');
    const btn = $('btn-start');
    if (S.words.length < 4) {
      info.innerHTML = `4択で出題するには単語が4つ以上必要です（現在 ${S.words.length} 語）。<a href="#" id="go-import">インポート</a>から追加しましょう。`;
      $('go-import').addEventListener('click', (e) => { e.preventDefault(); showView('import'); });
      btn.disabled = true;
    } else if (!pool.length) {
      info.textContent = '条件に合う単語がありません。カテゴリーやモードを変えてください。';
      btn.disabled = true;
    } else {
      const n = S.settings.count ? Math.min(S.settings.count, pool.length) : pool.length;
      info.textContent = `対象: ${pool.length} 語 → ${n} 問出題します`;
      btn.disabled = false;
    }
  }

  // ================= プレイ: ゲーム =================
  let game = null;
  let timerRAF = null;

  function pickWords(pool, n) {
    // 苦手・未回答・低レベルほど出やすい重み付きランダム（重複なし）
    const items = pool.map((w) => {
      const acc = w.attempts ? w.correct / w.attempts : 0;
      const weight = 1 + (w.attempts ? 0 : 2.5) + (1 - acc) * 4 + Math.max(0, 6 - wordLevel(w)) * 0.4;
      return { w, key: Math.pow(Math.random(), 1 / weight) };
    });
    items.sort((a, b) => b.key - a.key);
    return items.slice(0, n).map((x) => x.w);
  }

  function buildQuestion(w, pool) {
    const dir = S.settings.dir === 'mix' ? (Math.random() < 0.5 ? 't2m' : 'm2t') : S.settings.dir;
    const field = dir === 't2m' ? 'meaning' : 'term';
    const answer = w[field];
    const seen = new Set([norm(answer)]);
    const wrong = [];
    // まず同じカテゴリーから、足りなければ全単語から誤答を選ぶ
    for (const src of [shuffle(pool), shuffle(S.words)]) {
      for (const o of src) {
        if (wrong.length >= 3) break;
        const v = o[field];
        if (o.id === w.id || seen.has(norm(v))) continue;
        seen.add(norm(v));
        wrong.push(v);
      }
    }
    const choices = shuffle([answer, ...wrong]);
    return { w, dir, question: dir === 't2m' ? w.term : w.meaning, answer, choices, correctIdx: choices.indexOf(answer) };
  }

  function startGame(words) {
    const pool = poolForSettings();
    const list = words || pickWords(pool, S.settings.count ? Math.min(S.settings.count, pool.length) : pool.length);
    if (!list.length) return;
    game = {
      list, pool: pool.length >= 4 ? pool : S.words, i: 0, combo: 0, maxCombo: 0,
      correct: 0, xp: 0, ms: 0, log: [], startLevel: levelInfo(S.profile.xp).level, finished: false,
    };
    $('play-setup').classList.add('hidden');
    $('play-result').classList.add('hidden');
    $('play-game').classList.remove('hidden');
    nextQuestion();
  }

  function nextQuestion() {
    if (game.i >= game.list.length) { endGame(false); return; }
    const q = buildQuestion(game.list[game.i], game.pool);
    game.q = q;
    q.answered = false;
    const w = q.w;
    $('g-progress').textContent = `${game.i + 1} / ${game.list.length}`;
    $('g-progress-fill').style.width = `${(game.i / game.list.length) * 100}%`;
    const card = $('g-card');
    card.className = 'card';
    void card.offsetWidth;
    card.classList.add('enter');
    $('g-card-meta').innerHTML = `<span>単語Lv ${wordLevel(w)}</span><span>${w.attempts ? `正答率 ${pct(w.correct, w.attempts)}%（${w.attempts}回）` : '✨ NEW'}</span>`;
    $('g-dir').textContent = q.dir === 't2m' ? 'この単語の意味は？' : 'この意味の単語は？';
    $('g-question').textContent = q.question;
    $('g-tags').innerHTML = w.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('');
    $('g-choices').innerHTML = q.choices.map((c, i) =>
      `<button type="button" class="choice" data-i="${i}"><span class="k">${i + 1}</span><span>${esc(c)}</span></button>`).join('');
    $('g-choices').querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => answer(Number(b.dataset.i))));
    $('g-feedback').textContent = '';
    $('g-feedback').className = 'feedback';
    $('btn-next').classList.add('hidden');
    q.start = performance.now();
    cancelAnimationFrame(timerRAF);
    const tick = () => {
      if (!game || game.q !== q || q.answered) return;
      $('g-timer').textContent = `${((performance.now() - q.start) / 1000).toFixed(1)}s`;
      timerRAF = requestAnimationFrame(tick);
    };
    tick();
  }

  function answer(idx) {
    const q = game?.q;
    if (!q || q.answered) return;
    q.answered = true;
    const ms = Math.min(performance.now() - q.start, MAX_ANSWER_MS);
    const ok = idx === q.correctIdx;
    const w = q.w;
    const prevWordLv = wordLevel(w);
    const prevLv = levelInfo(S.profile.xp).level;

    // --- XP計算 ---
    let gain = 2;
    if (ok) {
      game.combo++;
      const speed = ms < 3000 ? 5 : ms < 6000 ? 3 : ms < 10000 ? 1 : 0;
      gain = 10 + speed + Math.min(game.combo - 1, 10);
    } else {
      game.combo = 0;
    }
    game.maxCombo = Math.max(game.maxCombo, game.combo);

    // --- 記録 ---
    w.attempts++; if (ok) w.correct++;
    w.ms = (w.ms || 0) + ms;
    w.lastAt = Date.now();
    const p = S.profile;
    p.answers++; if (ok) p.correct++;
    p.ms += ms; p.xp += gain;
    p.bestCombo = Math.max(p.bestCombo, game.combo);
    const d = dayRec();
    d.answered++; if (ok) d.correct++;
    d.ms += ms; d.xp += gain;
    const dw = d.words[w.id] || (d.words[w.id] = [0, 0]);
    dw[0]++; if (ok) dw[1]++;
    save();

    game.correct += ok ? 1 : 0;
    game.xp += gain;
    game.ms += ms;
    game.log.push({ id: w.id, term: w.term, meaning: w.meaning, ok, ms });

    // --- 演出 ---
    $('g-timer').textContent = `${(ms / 1000).toFixed(1)}s`;
    $('g-choices').querySelectorAll('.choice').forEach((b, i) => {
      b.disabled = true;
      if (i === q.correctIdx) b.classList.add('correct');
      else if (i === idx) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    const card = $('g-card');
    card.classList.remove('enter');
    card.classList.add(ok ? 'good' : 'bad');
    const fb = $('g-feedback');
    fb.className = `feedback ${ok ? 'good' : 'bad'}`;
    fb.innerHTML = ok
      ? `⭕ 正解！ <small>${fmtSec(ms)}</small>`
      : `❌ 不正解… 正解は「${esc(q.answer)}」`;
    const combo = $('g-combo');
    combo.textContent = game.combo >= 2 ? `🔥 ${game.combo} COMBO` : '';
    combo.classList.remove('pop'); void combo.offsetWidth;
    if (game.combo >= 2) combo.classList.add('pop');
    floatText(`+${gain} XP`);
    if (ok) { sparks(); sfx.good(); } else sfx.bad();
    const newWordLv = wordLevel(w);
    if (newWordLv > prevWordLv) setTimeout(() => floatText(`「${w.term}」Lv ${newWordLv} ↑`, true), 250);
    renderHeader();
    const newLv = levelInfo(p.xp).level;
    if (newLv > prevLv) setTimeout(() => showLevelUp(newLv), 400);

    const last = game.i === game.list.length - 1;
    const nb = $('btn-next');
    nb.innerHTML = last ? '結果を見る ▶ <small>(Enter)</small>' : '次へ ▶ <small>(Enter)</small>';
    nb.classList.remove('hidden');
    if (ok) {
      q.auto = setTimeout(() => { if (game?.q === q) goNext(); }, 900);
    }
  }

  function goNext() {
    if (!game || !game.q?.answered) return;
    clearTimeout(game.q.auto);
    game.i++;
    nextQuestion();
  }

  function floatText(text, small = false) {
    const el = document.createElement('div');
    el.className = `float-xp${small ? ' small' : ''}`;
    el.textContent = text;
    $('g-float').appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
  function sparks() {
    const colors = ['#ffcc33', '#2ee59d', '#3dc7ff', '#7c5cff', '#ff8a3d'];
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('div');
      s.className = 'spark';
      const a = (Math.PI * 2 * i) / 16, r = 90 + Math.random() * 70;
      s.style.setProperty('--dx', `${Math.cos(a) * r}px`);
      s.style.setProperty('--dy', `${Math.sin(a) * r}px`);
      s.style.background = colors[i % colors.length];
      $('g-float').appendChild(s);
      setTimeout(() => s.remove(), 800);
    }
  }

  function endGame(aborted) {
    if (!game) return;
    cancelAnimationFrame(timerRAF);
    clearTimeout(game.q?.auto);
    game.finished = true;
    if (game.log.length) { S.profile.sessions++; save(); }
    $('play-game').classList.add('hidden');
    if (aborted && !game.log.length) {
      game = null;
      $('play-setup').classList.remove('hidden');
      renderSetup();
      return;
    }
    showResult(aborted);
  }

  function showResult(aborted) {
    const g = game;
    const n = g.log.length;
    const acc = pct(g.correct, n);
    const grade = acc === 100 ? '🏆 S' : acc >= 85 ? '🥇 A' : acc >= 70 ? '🥈 B' : acc >= 50 ? '🥉 C' : '💪 D';
    $('play-result').classList.remove('hidden');
    $('play-result').querySelector('h2').textContent = aborted ? 'クエスト中断' : 'クエスト完了！';
    $('r-grade').textContent = grade;
    const lvNow = levelInfo(S.profile.xp).level;
    $('r-stats').innerHTML = [
      [`${g.correct} / ${n}`, '正解数'], [`${acc}%`, '正答率'], [`+${g.xp}`, '獲得XP'],
      [g.maxCombo, '最大コンボ'], [fmtDuration(g.ms), '回答時間'], [n ? fmtSec(g.ms / n) : '-', '1問あたり'],
      [lvNow > g.startLevel ? `Lv ${g.startLevel} → ${lvNow}` : `Lv ${lvNow}`, 'プレイヤーレベル'],
    ].map(([v, l]) => `<div class="stat"><div class="v">${esc(v)}</div><div class="l">${l}</div></div>`).join('');
    $('r-list').innerHTML = g.log.map((r) =>
      `<div class="r-row"><span class="mk">${r.ok ? '⭕' : '❌'}</span><span class="t">${esc(r.term)}</span><span>${esc(r.meaning)}</span><span class="ms">${fmtSec(r.ms)}</span></div>`).join('');
    $('btn-retry-wrong').disabled = g.log.every((r) => r.ok);
  }

  $('btn-start').addEventListener('click', () => startGame());
  $('btn-next').addEventListener('click', goNext);
  $('btn-quit').addEventListener('click', () => endGame(true));
  $('btn-retry').addEventListener('click', () => startGame());
  $('btn-retry-wrong').addEventListener('click', () => {
    const ids = new Set(game.log.filter((r) => !r.ok).map((r) => r.id));
    const words = S.words.filter((w) => ids.has(w.id));
    if (words.length) startGame(shuffle(words));
  });
  $('btn-back-setup').addEventListener('click', () => {
    game = null;
    $('play-result').classList.add('hidden');
    $('play-setup').classList.remove('hidden');
    renderSetup();
  });

  document.addEventListener('keydown', (e) => {
    if (currentView !== 'play' || !game || game.finished) return;
    if (e.target.matches('input, textarea')) return;
    if (!$('modal-bg').classList.contains('hidden')) return;
    if (/^[1-4]$/.test(e.key) && !game.q.answered) {
      const i = Number(e.key) - 1;
      if (i < game.q.choices.length) answer(i);
    } else if ((e.key === 'Enter' || e.key === ' ') && game.q.answered) {
      e.preventDefault();
      $('levelup').classList.add('hidden');
      goNext();
    }
  });

  // ================= インポート =================
  function parseCSVLine(line, delim) {
    const out = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"' && !cur.trim()) { q = true; cur = ''; }
      else if (c === delim) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }

  function parseLine(line) {
    if (line.includes('\t')) return parseCSVLine(line, '\t');
    if (line.includes(',')) return parseCSVLine(line, ',');
    const m = line.match(/^(.+?)\s*[：:]\s*(.+)$/) || line.match(/^(.+?)\s+[-–=]\s+(.+)$/);
    return m ? [m[1].trim(), m[2].trim()] : [line.trim()];
  }

  const HEADER_WORDS = ['word', 'term', 'english', 'front', '単語', '英単語', '問題', 'question'];
  function parseImport(text) {
    const rows = [];
    const lines = text.replace(/^﻿/, '').split(/\r?\n/);
    lines.forEach((raw, idx) => {
      const line = raw.trim();
      if (!line || line.startsWith('#')) return;
      const cells = parseLine(line);
      if (idx === 0 && HEADER_WORDS.includes(norm(cells[0]))) return; // 見出し行はスキップ
      const [term, meaning, tags] = cells;
      if (!term || !meaning) { rows.push({ error: true, line }); return; }
      rows.push({ term, meaning, tags: splitTags(tags) });
    });
    // 同じ貼り付け内の重複は後の行を優先
    const map = new Map();
    const errors = [];
    for (const r of rows) {
      if (r.error) errors.push(r);
      else map.set(norm(r.term), r);
    }
    return { rows: [...map.values()], errors };
  }

  function renderPreview() {
    const { rows, errors } = parseImport($('imp-text').value);
    const extra = splitTags($('imp-tags').value);
    const byTerm = new Map(S.words.map((w) => [norm(w.term), w]));
    const el = $('imp-preview');
    $('btn-import').disabled = !rows.length;
    if (!rows.length && !errors.length) { el.innerHTML = ''; return; }
    const newCount = rows.filter((r) => !byTerm.has(norm(r.term))).length;
    let html = `<p><span class="badge-new">新規 ${newCount}</span> ・ <span class="badge-upd">既存 ${rows.length - newCount}</span>${errors.length ? ` ・ <span class="badge-err">読み取れない行 ${errors.length}</span>` : ''}</p>`;
    html += '<div class="scroll"><table><thead><tr><th></th><th>単語</th><th>意味</th><th>タグ</th></tr></thead><tbody>';
    for (const r of rows.slice(0, 200)) {
      const exists = byTerm.has(norm(r.term));
      const tags = [...new Set([...r.tags, ...extra])];
      html += `<tr><td>${exists ? '<span class="badge-upd">更新</span>' : '<span class="badge-new">新規</span>'}</td><td>${esc(r.term)}</td><td>${esc(r.meaning)}</td><td>${tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</td></tr>`;
    }
    for (const e of errors.slice(0, 20)) {
      html += `<tr><td><span class="badge-err">×</span></td><td colspan="3" class="muted">${esc(e.line)}</td></tr>`;
    }
    html += '</tbody></table></div>';
    if (rows.length > 200) html += `<p class="muted">…ほか ${rows.length - 200} 行</p>`;
    el.innerHTML = html;
  }

  $('imp-text').addEventListener('input', renderPreview);
  $('imp-tags').addEventListener('input', renderPreview);
  $('imp-file').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    $('imp-text').value = await f.text();
    e.target.value = '';
    renderPreview();
  });

  $('btn-import').addEventListener('click', () => {
    const { rows } = parseImport($('imp-text').value);
    if (!rows.length) return;
    const extra = splitTags($('imp-tags').value);
    const overwrite = $('imp-overwrite').checked;
    const byTerm = new Map(S.words.map((w) => [norm(w.term), w]));
    let added = 0, updated = 0;
    const now = Date.now();
    for (const r of rows) {
      const tags = [...new Set([...r.tags, ...extra])];
      const ex = byTerm.get(norm(r.term));
      if (ex) {
        if (overwrite) ex.meaning = r.meaning;
        ex.tags = [...new Set([...ex.tags, ...tags])];
        updated++;
      } else {
        const w = { id: S.nextId++, term: r.term, meaning: r.meaning, tags, createdAt: now, attempts: 0, correct: 0, ms: 0, lastAt: 0 };
        S.words.push(w);
        byTerm.set(norm(w.term), w);
        added++;
      }
    }
    if (added) dayRec().imported += added;
    save();
    $('imp-text').value = '';
    renderPreview();
    renderHeader();
    toast(`📥 新規 <b>${added}</b> 語 / 更新 <b>${updated}</b> 語をインポートしました`);
  });

  // ================= 単語一覧 =================
  const listState = { tags: [], q: '', selected: new Set() };

  function filteredWords() {
    const q = norm(listState.q);
    return S.words
      .filter((w) => matchesTags(w, listState.tags))
      .filter((w) => !q || norm(w.term).includes(q) || norm(w.meaning).includes(q))
      .sort((a, b) => sortCollator.compare(a.term, b.term));
  }
  function letterOf(term) {
    const c = term.trim().charAt(0).normalize('NFD').charAt(0).toUpperCase();
    return /[A-Z]/.test(c) ? c : '#';
  }

  function renderList() {
    const known = new Set(allTags().map(([t]) => t));
    listState.tags = listState.tags.filter((t) => t === UNTAGGED || known.has(t));
    const ids = new Set(S.words.map((w) => w.id));
    listState.selected = new Set([...listState.selected].filter((id) => ids.has(id)));
    renderTagChips($('list-tags'), listState.tags, (next) => { listState.tags = next; renderList(); });

    const words = filteredWords();
    $('list-count').textContent = `（${words.length} / ${S.words.length} 語）`;
    const letters = new Set(words.map((w) => letterOf(w.term)));
    $('list-alpha').innerHTML = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'].map((L) =>
      `<a href="#letter-${L === '#' ? 'other' : L}" class="${letters.has(L) ? '' : 'off'}">${L}</a>`).join('');

    if (!words.length) {
      $('list-body').innerHTML = `<div class="empty">${S.words.length ? '該当する単語がありません' : 'まだ単語がありません。インポートから追加してください。'}</div>`;
    } else {
      let html = '', cur = null;
      for (const w of words) {
        const L = letterOf(w.term);
        if (L !== cur) {
          cur = L;
          html += `<div class="letter-head" id="letter-${L === '#' ? 'other' : L}">${L}</div>`;
        }
        const acc = pct(w.correct, w.attempts);
        html += `<div class="w-row" data-id="${w.id}">
          <input type="checkbox" class="sel" data-id="${w.id}" ${listState.selected.has(w.id) ? 'checked' : ''} aria-label="選択">
          <div><div class="term">${esc(w.term)}</div>${w.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</div>
          <div class="meaning">${esc(w.meaning)}</div>
          <div class="w-stats">
            <span>回答数: ${w.attempts}</span>
            <span class="${accClass(acc, w.attempts)}">正答率: ${w.attempts ? acc + '%' : '-'}</span>
            <span class="lv">レベル: ${wordLevel(w)}</span>
            <span>平均: ${w.attempts ? fmtSec(w.ms / w.attempts) : '-'}</span>
          </div>
        </div>`;
      }
      $('list-body').innerHTML = html;
    }
    updateBulk(words);
  }

  function updateBulk(words = filteredWords()) {
    const n = listState.selected.size;
    $('list-selected-count').textContent = n ? `${n} 件選択中` : '';
    $('list-select-all').checked = words.length > 0 && words.every((w) => listState.selected.has(w.id));
    ['btn-bulk-add', 'btn-bulk-remove', 'btn-bulk-delete'].forEach((id) => { $(id).disabled = !n; });
  }

  $('list-search').addEventListener('input', (e) => { listState.q = e.target.value; renderList(); });
  $('list-body').addEventListener('click', (e) => {
    const cb = e.target.closest('.sel');
    if (cb) {
      const id = Number(cb.dataset.id);
      if (cb.checked) listState.selected.add(id); else listState.selected.delete(id);
      updateBulk();
      return;
    }
    const row = e.target.closest('.w-row');
    if (row) editWord(Number(row.dataset.id));
  });
  $('list-select-all').addEventListener('change', (e) => {
    for (const w of filteredWords()) {
      if (e.target.checked) listState.selected.add(w.id); else listState.selected.delete(w.id);
    }
    renderList();
  });
  $('btn-bulk-add').addEventListener('click', () => {
    const tags = splitTags($('bulk-tag').value);
    if (!tags.length) { toast('タグ名を入力してください'); return; }
    for (const w of S.words) if (listState.selected.has(w.id)) w.tags = [...new Set([...w.tags, ...tags])];
    save(); renderList();
    toast(`🏷 ${listState.selected.size} 語にタグを追加しました`);
  });
  $('btn-bulk-remove').addEventListener('click', () => {
    const tags = splitTags($('bulk-tag').value);
    if (!tags.length) { toast('外すタグ名を入力してください'); return; }
    for (const w of S.words) if (listState.selected.has(w.id)) w.tags = w.tags.filter((t) => !tags.includes(t));
    save(); renderList();
  });
  $('btn-bulk-delete').addEventListener('click', () => {
    const n = listState.selected.size;
    if (!confirm(`選択した ${n} 語を削除しますか？（回答記録も消えます）`)) return;
    S.words = S.words.filter((w) => !listState.selected.has(w.id));
    listState.selected.clear();
    save(); renderList();
    toast(`🗑 ${n} 語を削除しました`);
  });

  function editWord(id) {
    const w = S.words.find((x) => x.id === id);
    if (!w) return;
    const acc = pct(w.correct, w.attempts);
    openModal(`
      <h3>単語を編集</h3>
      <label class="field"><span class="field-label">単語</span><input type="text" id="ed-term" value="${esc(w.term)}"></label>
      <label class="field"><span class="field-label">意味</span><input type="text" id="ed-meaning" value="${esc(w.meaning)}"></label>
      <label class="field"><span class="field-label">タグ（スペース区切り）</span><input type="text" id="ed-tags" value="${esc(w.tags.join(' '))}"></label>
      <div class="stat-grid">
        <div class="stat"><div class="v">${wordLevel(w)}</div><div class="l">レベル</div></div>
        <div class="stat"><div class="v">${w.attempts}</div><div class="l">回答数</div></div>
        <div class="stat"><div class="v">${w.attempts ? acc + '%' : '-'}</div><div class="l">正答率（${w.correct}回正解）</div></div>
        <div class="stat"><div class="v">${w.attempts ? fmtSec(w.ms / w.attempts) : '-'}</div><div class="l">平均回答時間</div></div>
      </div>
      <p class="muted">追加日: ${dateKey(new Date(w.createdAt))}${w.lastAt ? ` / 最終回答: ${dateKey(new Date(w.lastAt))}` : ''}</p>
      <div class="btn-row">
        <button type="button" class="btn primary" id="ed-save">保存</button>
        <button type="button" class="btn ghost" id="ed-cancel">キャンセル</button>
        <button type="button" class="btn small ghost" id="ed-reset">記録をリセット</button>
        <button type="button" class="btn danger" id="ed-delete" style="margin-left:auto">削除</button>
      </div>`, (m) => {
      m.querySelector('#ed-cancel').onclick = closeModal;
      m.querySelector('#ed-save').onclick = () => {
        const term = m.querySelector('#ed-term').value.trim();
        const meaning = m.querySelector('#ed-meaning').value.trim();
        if (!term || !meaning) { toast('単語と意味は必須です'); return; }
        const dup = S.words.find((x) => x.id !== w.id && norm(x.term) === norm(term));
        if (dup) { toast('同じ単語がすでにあります'); return; }
        w.term = term; w.meaning = meaning;
        w.tags = [...new Set(splitTags(m.querySelector('#ed-tags').value))];
        save(); closeModal(); renderList();
      };
      m.querySelector('#ed-reset').onclick = () => {
        if (!confirm('この単語の回答数・正答率をリセットしますか？')) return;
        w.attempts = 0; w.correct = 0; w.ms = 0; w.lastAt = 0;
        save(); closeModal(); renderList();
      };
      m.querySelector('#ed-delete').onclick = () => {
        if (!confirm(`「${w.term}」を削除しますか？`)) return;
        S.words = S.words.filter((x) => x.id !== w.id);
        save(); closeModal(); renderList();
      };
    });
  }

  $('btn-manage-tags').addEventListener('click', openTagManager);
  function openTagManager() {
    const tags = allTags();
    openModal(`
      <h3>🏷 タグ管理</h3>
      ${tags.length ? tags.map(([t, n]) => `<div class="tag-manage-row" data-t="${esc(t)}">
        <span class="name">#${esc(t)} <small>${n}語</small></span>
        <button type="button" class="btn small" data-act="rename">名前変更</button>
        <button type="button" class="btn small danger" data-act="delete">削除</button>
      </div>`).join('') : '<p class="muted">タグはまだありません。</p>'}
      <div class="btn-row"><button type="button" class="btn" id="tm-close">閉じる</button></div>`, (m) => {
      m.querySelector('#tm-close').onclick = closeModal;
      m.querySelectorAll('.tag-manage-row button').forEach((b) => b.addEventListener('click', () => {
        const t = b.closest('.tag-manage-row').dataset.t;
        if (b.dataset.act === 'rename') {
          const nn = splitTags(prompt(`「${t}」の新しい名前`, t) || '')[0];
          if (!nn || nn === t) return;
          for (const w of S.words) if (w.tags.includes(t)) w.tags = [...new Set(w.tags.map((x) => (x === t ? nn : x)))];
        } else {
          if (!confirm(`タグ「${t}」を削除しますか？（単語自体は残ります）`)) return;
          for (const w of S.words) w.tags = w.tags.filter((x) => x !== t);
        }
        save(); renderList(); openTagManager();
      }));
    });
  }

  // ================= カレンダー =================
  const cal = { y: new Date().getFullYear(), m: new Date().getMonth(), sel: dateKey() };

  function importedOn(k) {
    return S.words.filter((w) => dateKey(new Date(w.createdAt)) === k);
  }

  function streakInfo() {
    const active = (k) => S.days[k] && (S.days[k].answered > 0);
    let cur = 0;
    const d = new Date();
    if (!active(dateKey(d))) d.setDate(d.getDate() - 1); // 今日まだなら昨日から数える
    while (active(dateKey(d))) { cur++; d.setDate(d.getDate() - 1); }
    let best = 0, run = 0, prev = null;
    for (const k of Object.keys(S.days).filter(active).sort()) {
      const t = parseKey(k).getTime();
      run = prev !== null && Math.round((t - prev) / 86400000) === 1 ? run + 1 : 1;
      best = Math.max(best, run); prev = t;
    }
    return { cur, best };
  }

  function renderCalendar() {
    const { y, m } = cal;
    $('cal-title').textContent = `${y}年 ${m + 1}月`;
    const first = new Date(y, m, 1);
    const days = new Date(y, m + 1, 0).getDate();
    const today = dateKey();
    const maxAns = Math.max(1, ...Object.values(S.days).map((d) => d.answered));
    let html = ['日', '月', '火', '水', '木', '金', '土'].map((d, i) =>
      `<div class="cal-dow ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${d}</div>`).join('');
    for (let i = 0; i < first.getDay(); i++) html += '<div class="cal-cell blank"></div>';
    let mAns = 0, mCor = 0, mImp = 0, mMs = 0, mActive = 0;
    for (let d = 1; d <= days; d++) {
      const k = dateKey(new Date(y, m, d));
      const r = S.days[k];
      let heat = '', lines = '';
      if (r) {
        mAns += r.answered; mCor += r.correct; mImp += r.imported; mMs += r.ms;
        if (r.answered || r.imported) mActive++;
        if (r.answered) {
          const ratio = r.answered / maxAns;
          heat = ratio > 0.75 ? 'h4' : ratio > 0.5 ? 'h3' : ratio > 0.25 ? 'h2' : 'h1';
          lines += `<span class="ln">📝 ${r.answered}問</span><span class="ln">🎯 ${pct(r.correct, r.answered)}%</span>`;
        }
        if (r.imported) lines += `<span class="ln">📥 +${r.imported}</span>`;
      }
      html += `<button type="button" class="cal-cell ${heat} ${k === today ? 'today' : ''} ${k === cal.sel ? 'sel' : ''}" data-k="${k}"><span class="d">${d}</span>${lines}</button>`;
    }
    $('cal-grid').innerHTML = html;
    $('cal-grid').querySelectorAll('.cal-cell[data-k]').forEach((c) => c.addEventListener('click', () => {
      cal.sel = c.dataset.k; renderCalendar();
    }));
    const st = streakInfo();
    $('cal-summary').innerHTML = `
      <span>今月の学習日 <b>${mActive}</b>日</span>
      <span>回答 <b>${mAns}</b>問</span>
      <span>正答率 <b>${mAns ? pct(mCor, mAns) + '%' : '-'}</b></span>
      <span>学習時間 <b>${fmtDuration(mMs)}</b></span>
      <span>インポート <b>${mImp}</b>語</span>
      <span>🔥 連続 <b>${st.cur}</b>日（最高 ${st.best}日）</span>`;
    renderDayDetail();
  }

  function renderDayDetail() {
    const k = cal.sel;
    const d = parseKey(k);
    const r = S.days[k];
    const imported = importedOn(k);
    const title = `${d.getMonth() + 1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）の記録`;
    if (!r && !imported.length) {
      $('cal-detail').innerHTML = `<h2>${title}</h2><p class="muted">この日の記録はありません。</p>`;
      return;
    }
    const ans = r?.answered || 0, cor = r?.correct || 0;
    let html = `<h2>${title}</h2><div class="stat-grid">
      <div class="stat"><div class="v">${r?.imported ?? imported.length}</div><div class="l">インポートした単語数</div></div>
      <div class="stat"><div class="v">${ans}</div><div class="l">回答数</div></div>
      <div class="stat"><div class="v">${cor}</div><div class="l">正答数</div></div>
      <div class="stat"><div class="v">${ans ? pct(cor, ans) + '%' : '-'}</div><div class="l">正答率</div></div>
      <div class="stat"><div class="v">${fmtDuration(r?.ms || 0)}</div><div class="l">学習時間</div></div>
      <div class="stat"><div class="v">+${r?.xp || 0}</div><div class="l">獲得XP</div></div>
    </div>`;
    if (r && Object.keys(r.words).length) {
      const byId = new Map(S.words.map((w) => [w.id, w]));
      const items = Object.entries(r.words)
        .map(([id, [a, c]]) => ({ w: byId.get(Number(id)), a, c }))
        .filter((x) => x.w)
        .sort((x, y) => sortCollator.compare(x.w.term, y.w.term));
      html += `<div class="detail-sub">回答した単語（${items.length}語）</div><div class="day-words">${items.map((x) =>
        `<div><b>${esc(x.w.term)}</b> <span class="${accClass(pct(x.c, x.a), x.a)}">${x.c}/${x.a}</span></div>`).join('')}</div>`;
    }
    if (imported.length) {
      html += `<div class="detail-sub">この日に追加した単語（現在残っているもの ${imported.length}語）</div><div class="day-words">${imported
        .sort((a, b) => sortCollator.compare(a.term, b.term))
        .map((w) => `<div><b>${esc(w.term)}</b> <span class="muted">${esc(w.meaning)}</span></div>`).join('')}</div>`;
    }
    $('cal-detail').innerHTML = html;
  }

  $('cal-prev').addEventListener('click', () => { cal.m--; if (cal.m < 0) { cal.m = 11; cal.y--; } renderCalendar(); });
  $('cal-next').addEventListener('click', () => { cal.m++; if (cal.m > 11) { cal.m = 0; cal.y++; } renderCalendar(); });
  $('cal-today').addEventListener('click', () => {
    const n = new Date(); cal.y = n.getFullYear(); cal.m = n.getMonth(); cal.sel = dateKey(n); renderCalendar();
  });

  // ================= プロフィール =================
  function renderProfile() {
    const p = S.profile;
    const li = levelInfo(p.xp);
    $('pf-level').innerHTML = `<span><small style="display:block;font-size:.8rem;color:#553a00;line-height:1">Lv</small>${li.level}</span>`;
    $('pf-title').textContent = titleFor(li.level);
    $('pf-xp-fill').style.width = `${(li.cur / li.need) * 100}%`;
    $('pf-xp-text').textContent = `次のレベルまで ${li.need - li.cur} XP（${li.cur} / ${li.need}）・累計 ${p.xp} XP`;

    const st = streakInfo();
    const activeDays = Object.values(S.days).filter((d) => d.answered).length;
    const mastered = S.words.filter((w) => wordLevel(w) >= 5).length;
    const answered = S.words.filter((w) => w.attempts).length;
    $('pf-stats').innerHTML = [
      [p.answers.toLocaleString(), '合計回答数'],
      [p.correct.toLocaleString(), '合計正答数'],
      [p.answers ? `${pct(p.correct, p.answers)}%` : '-', '平均正答率'],
      [fmtDuration(p.ms), '合計学習時間（回答にかけた時間）'],
      [p.answers ? fmtSec(p.ms / p.answers) : '-', '1問あたりの平均時間'],
      [S.words.length, '登録単語数'],
      [`${answered} / ${S.words.length}`, '回答したことのある単語'],
      [mastered, '習得単語（Lv5以上）'],
      [p.bestCombo, '最高コンボ'],
      [p.sessions, 'クエスト回数'],
      [`${st.cur}日`, '連続学習日数'],
      [`${activeDays}日`, '学習した日数'],
    ].map(([v, l]) => `<div class="stat"><div class="v">${esc(v)}</div><div class="l">${l}</div></div>`).join('');

    // 直近14日
    const cols = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const r = S.days[dateKey(d)];
      cols.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, a: r?.answered || 0, c: r?.correct || 0 });
    }
    const max = Math.max(1, ...cols.map((c) => c.a));
    $('pf-bars').innerHTML = cols.map((c) => `<div class="bar-col" title="${c.label}: ${c.a}問 / 正答率 ${c.a ? pct(c.c, c.a) + '%' : '-'}">
      <div class="bar" style="height:${(c.a / max) * 100}%">${c.a ? `<span class="bv">${c.a}</span>` : ''}</div>
      <span class="bl">${c.label}</span></div>`).join('');

    // 単語レベル分布
    const dist = new Map();
    for (const w of S.words) {
      const L = wordLevel(w);
      const b = L >= 10 ? '10+' : String(L);
      dist.set(b, (dist.get(b) || 0) + 1);
    }
    const keys = [...dist.keys()].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    const dmax = Math.max(1, ...dist.values());
    $('pf-dist').innerHTML = keys.length ? keys.map((k) => `<div class="dist-row"><span>Lv ${k}</span>
      <div class="dist-track"><div class="dist-fill" style="width:${(dist.get(k) / dmax) * 100}%"></div></div>
      <span>${dist.get(k)}語</span></div>`).join('') : '<p class="muted">単語がまだありません。</p>';
  }

  $('btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `wordquest-backup-${dateKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('restore-file').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.words) || !data.profile) throw new Error('bad');
      if (!confirm('現在のデータをバックアップの内容で置き換えますか？')) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      S = load();
      renderHeader(); renderProfile();
      toast('📂 バックアップから復元しました');
    } catch {
      toast('⚠ バックアップファイルを読み込めませんでした');
    }
  });
  $('btn-reset').addEventListener('click', () => {
    if (!confirm('単語・記録・レベルをすべて削除します。よろしいですか？')) return;
    if (!confirm('本当に削除しますか？この操作は取り消せません。')) return;
    S = defaultState(); save();
    renderHeader(); renderProfile();
    toast('すべてのデータをリセットしました');
  });

  // ================= 初期化 =================
  renderHeader();
  renderSetup();
})();
