(() => {
  'use strict';

  // ==================================================================
  // 定数
  // ==================================================================
  const TERRAIN_SIZE = 100;
  const TERRAIN_HALF = TERRAIN_SIZE / 2;
  const TERRAIN_SEG = 90;
  const PAINT_RES = 1024;
  const GRID_RES = 100;

  const OWNER_NONE = 0;
  const OWNER_PLAYER = 1;
  const OWNER_ENEMY = 2;

  const PLAYER_COLOR = '#f5d300';
  const ENEMY_COLOR = '#b400e0';
  const BASE_GROUND_COLOR = '#bdb298';

  const EYE_HEIGHT = 1.55;
  const MOVE_SPEED = 6.4;
  const SWIM_MULT = 1.7;
  const ENEMY_INK_MULT = 0.55;
  const GRAVITY = 24;
  const JUMP_SPEED = 7.5;
  const CAM_DIST = 6.5;
  const CAM_HEIGHT = 3.2;
  const MOUSE_SENSITIVITY = 0.0022;
  const CAMERA_COLLISION_MARGIN = 0.4;

  const SHOT_RADIUS = 1.5;
  const INK_MAX = 100;
  const INK_REGEN = 20;
  const PROJECTILE_SPEED = 27;
  const PROJECTILE_UP_ARC = 5.5;
  const PROJECTILE_GRAVITY = 20;
  const HIT_RADIUS = 2.0;

  const PLAYER_HP_MAX = 100;
  const HIT_DAMAGE = 34;
  const RESPAWN_DELAY = 2.0;
  const INVULN_TIME = 1.0;

  // ------------------------------------------------------------------
  // 武器の種類(スプラトゥーン風): シューター/ローラー/チャージャー
  // ------------------------------------------------------------------
  const WEAPONS = [
    {
      id: 'shooter', name: 'シューター', mode: 'shot',
      fireInterval: 0.08, inkCost: 4,
      projectileSpeed: 30, upArc: 5, shotRadius: 1.25, hitRadius: 1.7, damage: 28,
    },
    {
      id: 'roller', name: 'ローラー', mode: 'melee',
      fireInterval: 0.42, inkCost: 13,
      range: 3.4, width: 2.6, hitRadius: 2.4, damage: 100,
    },
    {
      id: 'charger', name: 'チャージャー', mode: 'charge',
      chargeTime: 0.95, minChargeFraction: 0.3, inkCostPerFullCharge: 55,
      projectileSpeedMax: 55, upArcMax: 2.2, shotRadiusMax: 1.9, hitRadiusMax: 2.6, damageMax: 100,
    },
  ];

  const ENEMY_COUNT = 3;
  const ENEMY_SPEED = 4.3;
  const ENEMY_HP_MAX = 100;
  const ENEMY_RESPAWN_DELAY = 4.0;
  const ENEMY_AGGRO_RANGE = 20;
  const ENEMY_FIRE_INTERVAL_MIN = 0.9;
  const ENEMY_FIRE_INTERVAL_JITTER = 1.1;

  const SPECIAL_MAX = 100;
  const SPECIAL_RADIUS = 7.5;
  const SPECIAL_PAINT_GAIN = 0.4;
  const SPECIAL_SWIM_GAIN = 5;

  const MATCH_SECONDS = 180;

  // ==================================================================
  // 地形の高低差(プラトー+ランプ)
  // ==================================================================
  const PLATEAUS = [
    { cx: 30, cz: 30, hw: 13, hd: 13, height: 3.2, ramp: 4.5, base: 0 },
    { cx: -30, cz: 30, hw: 11, hd: 11, height: 3.8, ramp: 4.5, base: 0 },
    { cx: 30, cz: -30, hw: 11, hd: 11, height: 3.8, ramp: 4.5, base: 0 },
    { cx: -30, cz: -30, hw: 13, hd: 13, height: 3.2, ramp: 4.5, base: 0 },
    { cx: 0, cz: 0, hw: 17, hd: 17, height: 2.4, ramp: 5, base: 0 },
  ];
  const TOWER = { cx: 0, cz: 0, hw: 6, hd: 6, height: 7.2, ramp: 3, base: 2.4 };

  function plateauContrib(p, x, z) {
    const dx = Math.abs(x - p.cx);
    const dz = Math.abs(z - p.cz);
    if (dx > p.hw || dz > p.hd) return -Infinity;
    const ix = Math.max(0, dx - (p.hw - p.ramp));
    const iz = Math.max(0, dz - (p.hd - p.ramp));
    const t = Math.min(1, Math.max(ix, iz) / p.ramp);
    const s = t * t * (3 - 2 * t);
    return p.base + (p.height - p.base) * (1 - s);
  }

  function heightAt(x, z) {
    let h = 0;
    for (const p of PLATEAUS) h = Math.max(h, plateauContrib(p, x, z));
    h = Math.max(h, plateauContrib(TOWER, x, z));
    h += (Math.sin(x * 0.35) + Math.cos(z * 0.4)) * 0.06 + Math.sin((x + z) * 0.15) * 0.05;
    return h;
  }

  // ==================================================================
  // DOM
  // ==================================================================
  const canvas = document.getElementById('game-canvas');
  const hud = document.getElementById('hud');
  const turfFillPlayer = document.getElementById('turf-fill-player');
  const turfFillEnemy = document.getElementById('turf-fill-enemy');
  const hudPctPlayer = document.getElementById('hud-pct-player');
  const hudPctEnemy = document.getElementById('hud-pct-enemy');
  const hudTimer = document.getElementById('hud-timer');
  const inkFill = document.getElementById('ink-fill');
  const specialFill = document.getElementById('special-fill');
  const specialReady = document.getElementById('special-ready');
  const weaponNameEl = document.getElementById('weapon-name');
  const chargeBar = document.getElementById('charge-bar');
  const chargeFill = document.getElementById('charge-fill');
  const respawnBanner = document.getElementById('respawn-banner');
  const hitFlash = document.getElementById('hit-flash');
  const screenStart = document.getElementById('screen-start');
  const screenPaused = document.getElementById('screen-paused');
  const screenResult = document.getElementById('screen-result');
  const resultTitle = document.getElementById('result-title');
  const resultPctPlayer = document.getElementById('result-pct-player');
  const resultPctEnemy = document.getElementById('result-pct-enemy');
  const resultSplats = document.getElementById('result-splats');

  // ==================================================================
  // Three.js 基本セットアップ
  // ==================================================================
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x6ad0e8);
  scene.fog = new THREE.Fog(0x6ad0e8, 40, 130);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 250);
  camera.rotation.order = 'YXZ';

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const sun = new THREE.DirectionalLight(0xffffff, 0.7);
  sun.position.set(35, 55, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -65;
  sun.shadow.camera.right = 65;
  sun.shadow.camera.top = 65;
  sun.shadow.camera.bottom = -65;
  sun.shadow.camera.far = 170;
  scene.add(sun);

  // ==================================================================
  // 地形メッシュ生成
  // ==================================================================
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let j = 0; j <= TERRAIN_SEG; j++) {
    for (let i = 0; i <= TERRAIN_SEG; i++) {
      const x = -TERRAIN_HALF + (i / TERRAIN_SEG) * TERRAIN_SIZE;
      const z = -TERRAIN_HALF + (j / TERRAIN_SEG) * TERRAIN_SIZE;
      positions.push(x, heightAt(x, z), z);
      uvs.push(i / TERRAIN_SEG, j / TERRAIN_SEG);
    }
  }
  for (let j = 0; j < TERRAIN_SEG; j++) {
    for (let i = 0; i < TERRAIN_SEG; i++) {
      const a = j * (TERRAIN_SEG + 1) + i;
      const b = a + 1;
      const c = a + (TERRAIN_SEG + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const terrainGeo = new THREE.BufferGeometry();
  terrainGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  terrainGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  terrainGeo.setIndex(indices);
  terrainGeo.computeVertexNormals();

  // ---- ペイントキャンバス(地面テクスチャ兼インク描画先) ----
  const paintCanvas = document.createElement('canvas');
  paintCanvas.width = PAINT_RES;
  paintCanvas.height = PAINT_RES;
  const pctx = paintCanvas.getContext('2d');
  pctx.fillStyle = BASE_GROUND_COLOR;
  pctx.fillRect(0, 0, PAINT_RES, PAINT_RES);
  for (let i = 0; i < 3000; i++) {
    const rx = Math.random() * PAINT_RES;
    const ry = Math.random() * PAINT_RES;
    pctx.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.045)';
    pctx.beginPath();
    pctx.arc(rx, ry, 5 + Math.random() * 9, 0, Math.PI * 2);
    pctx.fill();
  }
  const paintTexture = new THREE.CanvasTexture(paintCanvas);
  paintTexture.flipY = false;
  paintTexture.wrapS = THREE.ClampToEdgeWrapping;
  paintTexture.wrapT = THREE.ClampToEdgeWrapping;
  let paintDirty = false;

  const terrainMat = new THREE.MeshStandardMaterial({ map: paintTexture, roughness: 0.95 });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  terrain.castShadow = false;
  scene.add(terrain);

  // ---- 陣取りグリッド(スコア・速度判定用) ----
  const ownerGrid = new Uint8Array(GRID_RES * GRID_RES);

  function worldToUV(x, z) {
    return [(x + TERRAIN_HALF) / TERRAIN_SIZE, (z + TERRAIN_HALF) / TERRAIN_SIZE];
  }

  function drawInkBlob(cx, cy, r, color) {
    pctx.fillStyle = color;
    pctx.beginPath();
    const points = 10;
    for (let i = 0; i <= points; i++) {
      const a = (i / points) * Math.PI * 2;
      const jitter = 0.72 + Math.random() * 0.45;
      const px = cx + Math.cos(a) * r * jitter;
      const py = cy + Math.sin(a) * r * jitter;
      if (i === 0) pctx.moveTo(px, py); else pctx.lineTo(px, py);
    }
    pctx.closePath();
    pctx.fill();
  }

  function paintAt(x, z, ownerId, colorHex, radiusWorld) {
    const [u, v] = worldToUV(x, z);
    const cx = u * PAINT_RES;
    const cy = v * PAINT_RES;
    const rpx = (radiusWorld / TERRAIN_SIZE) * PAINT_RES;
    drawInkBlob(cx, cy, rpx, colorHex);
    paintDirty = true;

    const gx = Math.round(u * GRID_RES);
    const gy = Math.round(v * GRID_RES);
    const rg = Math.max(1, Math.round((radiusWorld / TERRAIN_SIZE) * GRID_RES));
    let newlyOwned = 0;
    for (let dy = -rg; dy <= rg; dy++) {
      const gyy = gy + dy;
      if (gyy < 0 || gyy >= GRID_RES) continue;
      for (let dx = -rg; dx <= rg; dx++) {
        if (dx * dx + dy * dy > rg * rg) continue;
        const gxx = gx + dx;
        if (gxx < 0 || gxx >= GRID_RES) continue;
        const idx = gyy * GRID_RES + gxx;
        if (ownerGrid[idx] !== ownerId) {
          if (ownerId === OWNER_PLAYER) newlyOwned++;
          ownerGrid[idx] = ownerId;
        }
      }
    }
    return newlyOwned;
  }

  function ownerAt(x, z) {
    const [u, v] = worldToUV(x, z);
    const gx = Math.min(GRID_RES - 1, Math.max(0, Math.round(u * GRID_RES)));
    const gy = Math.min(GRID_RES - 1, Math.max(0, Math.round(v * GRID_RES)));
    return ownerGrid[gy * GRID_RES + gx];
  }

  function computeTurfPercent() {
    let p = 0, e = 0;
    const total = ownerGrid.length;
    for (let i = 0; i < total; i++) {
      if (ownerGrid[i] === OWNER_PLAYER) p++;
      else if (ownerGrid[i] === OWNER_ENEMY) e++;
    }
    return { playerPct: (p / total) * 100, enemyPct: (e / total) * 100 };
  }

  // ==================================================================
  // 障害物(木箱: 見た目・遮蔽用、地形の高さに合わせて設置)
  // ==================================================================
  const obstacles = [];
  function addObstacle(x, z, size) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshStandardMaterial({ color: 0x8a6a4a })
    );
    const groundY = heightAt(x, z);
    mesh.position.set(x, groundY + size / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    obstacles.push({ mesh, radius: size * 0.62 });
  }
  [
    [19, 0, 2.2], [-19, 0, 2.2], [0, 19, 2.2], [0, -19, 2.2],
    [30, 30, 2], [-30, 30, 2], [30, -30, 2], [-30, -30, 2],
  ].forEach(([x, z, s]) => addObstacle(x, z, s));
  const cameraCollidables = obstacles.map(o => o.mesh);

  function resolveObstacleCollision(pos) {
    for (const ob of obstacles) {
      const dx = pos.x - ob.mesh.position.x;
      const dz = pos.z - ob.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      const minDist = ob.radius + 0.5;
      if (dist < minDist && dist > 0.0001) {
        const push = minDist - dist;
        pos.x += (dx / dist) * push;
        pos.z += (dz / dist) * push;
      }
    }
  }

  function clampToArena(pos) {
    const m = TERRAIN_HALF - 1.5;
    pos.x = Math.max(-m, Math.min(m, pos.x));
    pos.z = Math.max(-m, Math.min(m, pos.z));
  }

  // ==================================================================
  // キャラクターモデル生成(プレイヤー/CPU共通)
  // ==================================================================
  function createCharacterMesh(colorHex) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex });
    const bodyGeo = typeof THREE.CapsuleGeometry === 'function'
      ? new THREE.CapsuleGeometry(0.42, 0.75, 4, 10)
      : new THREE.CylinderGeometry(0.42, 0.48, 1.3, 10);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.95;
    body.castShadow = true;
    const headMat = new THREE.MeshStandardMaterial({ color: colorHex });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 12), headMat);
    head.position.y = 1.72;
    head.castShadow = true;
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1c2733 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeMat);
    eyeL.position.set(0.14, 1.75, 0.28);
    const eyeR = eyeL.clone();
    eyeR.position.x = -0.14;
    group.add(body, head, eyeL, eyeR);
    group.userData.body = body;
    return group;
  }

  // ==================================================================
  // プレイヤー
  // ==================================================================
  const PLAYER_SPAWN = { x: 0, z: 44 };
  const player = {
    x: PLAYER_SPAWN.x,
    z: PLAYER_SPAWN.z,
    vertOffset: 0,
    velocityY: 0,
    canJump: true,
    hp: PLAYER_HP_MAX,
    alive: true,
    respawnTimer: 0,
    invuln: 0,
    ink: INK_MAX,
    special: 0,
    specialReady: false,
    fireCooldown: 0,
    swimTime: 0,
    splatCount: 0,
    weaponIndex: 0,
    charge: 0,
  };
  const playerMesh = createCharacterMesh(PLAYER_COLOR);
  scene.add(playerMesh);

  let yaw = 0;
  let pitch = -0.15;

  // ==================================================================
  // CPU (敵チーム)
  // ==================================================================
  const ENEMY_SPAWNS = [
    { x: 0, z: -44 },
    { x: 44, z: 0 },
    { x: -44, z: 0 },
  ];
  const enemies = ENEMY_SPAWNS.slice(0, ENEMY_COUNT).map((spawn, i) => {
    const mesh = createCharacterMesh(ENEMY_COLOR);
    scene.add(mesh);
    return {
      id: i,
      mesh,
      spawn,
      x: spawn.x,
      z: spawn.z,
      hp: ENEMY_HP_MAX,
      alive: true,
      respawnTimer: 0,
      target: { x: spawn.x, z: spawn.z },
      facing: 0,
      fireTimer: 1 + Math.random() * 1.5,
    };
  });

  function pickEnemyTarget(en) {
    const m = TERRAIN_HALF - 6;
    en.target.x = (Math.random() * 2 - 1) * m;
    en.target.z = (Math.random() * 2 - 1) * m;
  }

  // ==================================================================
  // 発射物(インクショット): プレイヤー/敵共通
  // ==================================================================
  const inkBallGeo = new THREE.SphereGeometry(0.22, 8, 8);
  const projectiles = [];

  function fireInk(originPos, dir, ownerType, colorHex, speed = PROJECTILE_SPEED, upArc = PROJECTILE_UP_ARC, paintRadius = SHOT_RADIUS, hitRadius = HIT_RADIUS, damage = HIT_DAMAGE) {
    const vel = dir.clone().multiplyScalar(speed);
    vel.y += upArc;
    const mesh = new THREE.Mesh(inkBallGeo, new THREE.MeshBasicMaterial({ color: colorHex }));
    mesh.position.copy(originPos);
    scene.add(mesh);
    projectiles.push({ mesh, vel, ownerType, colorHex, life: 2.4, paintRadius, hitRadius, damage });
  }

  function updateProjectiles(delta) {
    for (let idx = projectiles.length - 1; idx >= 0; idx--) {
      const p = projectiles[idx];
      p.vel.y -= PROJECTILE_GRAVITY * delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.life -= delta;

      const pos = p.mesh.position;
      const outOfBounds = Math.abs(pos.x) > TERRAIN_HALF + 2 || Math.abs(pos.z) > TERRAIN_HALF + 2;
      const groundY = outOfBounds ? -999 : heightAt(pos.x, pos.z);

      if (pos.y <= groundY || p.life <= 0 || outOfBounds) {
        if (!outOfBounds) {
          const ownerId = p.ownerType === 'player' ? OWNER_PLAYER : OWNER_ENEMY;
          const gained = paintAt(pos.x, pos.z, ownerId, p.colorHex, p.paintRadius);
          if (gained > 0 && p.ownerType === 'player') {
            player.special = Math.min(SPECIAL_MAX, player.special + gained * SPECIAL_PAINT_GAIN);
          }

          if (p.ownerType === 'player') {
            for (const en of enemies) {
              if (!en.alive) continue;
              if (Math.hypot(en.x - pos.x, en.z - pos.z) < p.hitRadius) damageEnemy(en, p.damage);
            }
          } else if (player.alive && player.invuln <= 0) {
            if (Math.hypot(player.x - pos.x, player.z - pos.z) < p.hitRadius) damagePlayer(p.damage);
          }
        }
        scene.remove(p.mesh);
        projectiles.splice(idx, 1);
      }
    }
  }

  // ==================================================================
  // ダメージ/リスポーン
  // ==================================================================
  function damagePlayer(damage = HIT_DAMAGE) {
    player.hp -= damage;
    player.invuln = INVULN_TIME;
    flashHit();
    if (player.hp <= 0 && player.alive) {
      player.alive = false;
      player.respawnTimer = RESPAWN_DELAY;
      player.charge = 0;
      isFiring = false;
      respawnBanner.classList.remove('hidden');
    }
  }

  function respawnPlayer() {
    player.alive = true;
    player.hp = PLAYER_HP_MAX;
    player.invuln = INVULN_TIME;
    player.x = PLAYER_SPAWN.x;
    player.z = PLAYER_SPAWN.z;
    player.velocityY = 0;
    player.vertOffset = 0;
    respawnBanner.classList.add('hidden');
  }

  function damageEnemy(en, damage = HIT_DAMAGE) {
    en.hp -= damage;
    if (en.hp <= 0 && en.alive) {
      en.alive = false;
      en.mesh.visible = false;
      en.respawnTimer = ENEMY_RESPAWN_DELAY;
      player.splatCount++;
    }
  }

  function respawnEnemy(en) {
    en.alive = true;
    en.hp = ENEMY_HP_MAX;
    en.x = en.spawn.x;
    en.z = en.spawn.z;
    en.mesh.visible = true;
    pickEnemyTarget(en);
  }

  // ==================================================================
  // 入力
  // ==================================================================
  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyE' && !e.repeat && state === 'playing') tryActivateSpecial();
    if (state === 'playing') {
      if (e.code === 'Digit1') switchWeapon(0);
      else if (e.code === 'Digit2') switchWeapon(1);
      else if (e.code === 'Digit3') switchWeapon(2);
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas) return;
    yaw -= e.movementX * MOUSE_SENSITIVITY;
    pitch -= e.movementY * MOUSE_SENSITIVITY;
    pitch = Math.max(-0.7, Math.min(0.55, pitch));
  });

  let isFiring = false;
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && state === 'playing') isFiring = true;
  });
  window.addEventListener('mouseup', () => { isFiring = false; });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      screenPaused.classList.add('hidden');
      if (state === 'paused') state = 'playing';
    } else if (state === 'playing') {
      state = 'paused';
      screenPaused.classList.remove('hidden');
      isFiring = false;
    }
  });

  // ==================================================================
  // ゲーム状態
  // ==================================================================
  let state = 'start'; // start | playing | paused | result
  let matchTime = MATCH_SECONDS;

  function formatTime(t) {
    const s = Math.max(0, Math.ceil(t));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function updateHUD() {
    const { playerPct, enemyPct } = computeTurfPercent();
    turfFillPlayer.style.width = playerPct + '%';
    turfFillEnemy.style.width = enemyPct + '%';
    hudPctPlayer.textContent = Math.round(playerPct) + '%';
    hudPctEnemy.textContent = Math.round(enemyPct) + '%';
    hudTimer.textContent = formatTime(matchTime);
    inkFill.style.width = Math.max(0, player.ink) + '%';
    specialFill.style.width = Math.max(0, player.special) + '%';
    const ready = player.special >= SPECIAL_MAX;
    specialReady.classList.toggle('hidden', !ready);

    const weapon = WEAPONS[player.weaponIndex];
    weaponNameEl.textContent = weapon.name;
    if (weapon.mode === 'charge' && isFiring) {
      chargeBar.classList.remove('hidden');
      chargeFill.style.width = Math.min(100, player.charge * 100) + '%';
      chargeFill.classList.toggle('ready', player.charge >= 1);
    } else {
      chargeBar.classList.add('hidden');
    }
  }

  function flashHit() {
    hitFlash.classList.remove('show');
    void hitFlash.offsetWidth;
    hitFlash.classList.add('show');
    requestAnimationFrame(() => {
      setTimeout(() => hitFlash.classList.remove('show'), 120);
    });
  }

  function tryActivateSpecial() {
    if (player.special < SPECIAL_MAX || !player.alive) return;
    player.special = 0;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const targetX = player.x + dir.x * 3;
    const targetZ = player.z + dir.z * 3;
    paintAt(targetX, targetZ, OWNER_PLAYER, PLAYER_COLOR, SPECIAL_RADIUS);
    for (const en of enemies) {
      if (en.alive && Math.hypot(en.x - targetX, en.z - targetZ) < SPECIAL_RADIUS + 1) {
        pickEnemyTarget(en);
        en.x += (en.x - targetX) * 0.3;
        en.z += (en.z - targetZ) * 0.3;
      }
    }
  }

  // ==================================================================
  // 武器アクション
  // ==================================================================
  function switchWeapon(idx) {
    if (idx === player.weaponIndex || !player.alive) return;
    player.weaponIndex = idx;
    player.charge = 0;
    player.fireCooldown = 0;
    isFiring = false;
  }

  function aimDirection() {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    if (dir.y > -0.05) dir.y = -0.05;
    dir.normalize();
    return dir;
  }

  function muzzlePosition(dir) {
    const groundY = heightAt(player.x, player.z);
    return new THREE.Vector3(player.x, groundY + EYE_HEIGHT + player.vertOffset, player.z)
      .addScaledVector(dir, 0.7);
  }

  function fireWeaponShot(weapon) {
    const dir = aimDirection();
    const muzzle = muzzlePosition(dir);
    fireInk(muzzle, dir, 'player', PLAYER_COLOR, weapon.projectileSpeed, weapon.upArc, weapon.shotRadius, weapon.hitRadius, weapon.damage);
  }

  function performRollerSwing(weapon) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() < 0.0001) dir.set(0, 0, -1);
    dir.normalize();
    const right = new THREE.Vector3(-dir.z, 0, dir.x);

    const steps = 5;
    let gainedTotal = 0;
    for (let i = 0; i <= steps; i++) {
      const dist = (i / steps) * weapon.range;
      const px = player.x + dir.x * dist;
      const pz = player.z + dir.z * dist;
      gainedTotal += paintAt(px, pz, OWNER_PLAYER, PLAYER_COLOR, weapon.width / 2);
    }
    if (gainedTotal > 0) {
      player.special = Math.min(SPECIAL_MAX, player.special + gainedTotal * SPECIAL_PAINT_GAIN);
    }

    for (const en of enemies) {
      if (!en.alive) continue;
      const dx = en.x - player.x;
      const dz = en.z - player.z;
      const along = dx * dir.x + dz * dir.z;
      if (along < -0.5 || along > weapon.range + 0.5) continue;
      const lateral = Math.abs(dx * right.x + dz * right.z);
      if (lateral <= weapon.width / 2 + 0.6) damageEnemy(en, weapon.damage);
    }
  }

  function fireChargerShot(weapon, chargeFrac) {
    const dir = aimDirection();
    const muzzle = muzzlePosition(dir);
    const speed = weapon.projectileSpeedMax * (0.55 + 0.45 * chargeFrac);
    const radius = weapon.shotRadiusMax * (0.5 + 0.5 * chargeFrac);
    const hitRadius = weapon.hitRadiusMax * (0.5 + 0.5 * chargeFrac);
    const damage = weapon.damageMax * chargeFrac;
    fireInk(muzzle, dir, 'player', PLAYER_COLOR, speed, weapon.upArcMax, radius, hitRadius, damage);
  }

  // ==================================================================
  // カメラ追従(三人称・地形/障害物との衝突考慮)
  // ==================================================================
  const camCollisionRay = new THREE.Raycaster();
  function syncCamera() {
    camera.rotation.set(pitch, yaw, 0, 'YXZ');

    const groundY = heightAt(player.x, player.z);
    const eye = new THREE.Vector3(player.x, groundY + EYE_HEIGHT + player.vertOffset, player.z);

    playerMesh.position.set(player.x, groundY + player.vertOffset, player.z);
    playerMesh.rotation.y = yaw + Math.PI;
    playerMesh.visible = player.alive;

    const onOwn = ownerAt(player.x, player.z) === OWNER_PLAYER;
    const targetScaleY = onOwn ? 0.55 : 1;
    const targetScaleXZ = onOwn ? 1.25 : 1;
    playerMesh.scale.y += (targetScaleY - playerMesh.scale.y) * 0.2;
    playerMesh.scale.x += (targetScaleXZ - playerMesh.scale.x) * 0.2;
    playerMesh.scale.z += (targetScaleXZ - playerMesh.scale.z) * 0.2;

    const flatForward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const desired = eye.clone()
      .addScaledVector(flatForward, -CAM_DIST)
      .add(new THREE.Vector3(0, CAM_HEIGHT, 0));

    const toDesired = desired.clone().sub(eye);
    const fullDist = toDesired.length();
    toDesired.normalize();

    let finalDist = fullDist;
    if (cameraCollidables.length > 0) {
      camCollisionRay.set(eye, toDesired);
      camCollisionRay.far = fullDist;
      const hits = camCollisionRay.intersectObjects(cameraCollidables, false);
      if (hits.length > 0 && hits[0].distance < fullDist) {
        finalDist = Math.max(1.5, hits[0].distance - CAMERA_COLLISION_MARGIN);
      }
    }
    camera.position.copy(eye).addScaledVector(toDesired, finalDist);
  }

  // ==================================================================
  // プレイヤー更新
  // ==================================================================
  function updatePlayer(delta) {
    if (!player.alive) {
      player.respawnTimer -= delta;
      if (player.respawnTimer <= 0) respawnPlayer();
      syncCamera();
      return;
    }
    if (player.invuln > 0) player.invuln -= delta;

    const forwardInput = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
    const sideInput = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);

    const own = ownerAt(player.x, player.z);
    let speedMul = 1;
    if (own === OWNER_PLAYER) { speedMul = SWIM_MULT; player.swimTime += delta; }
    else if (own === OWNER_ENEMY) { speedMul = ENEMY_INK_MULT; }

    if (player.swimTime > 0.25) {
      player.special = Math.min(SPECIAL_MAX, player.special + SPECIAL_SWIM_GAIN * delta);
    }
    if (own !== OWNER_PLAYER) player.swimTime = 0;

    if (forwardInput !== 0 || sideInput !== 0) {
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const move = new THREE.Vector3()
        .addScaledVector(forward, forwardInput)
        .addScaledVector(right, sideInput);
      move.normalize().multiplyScalar(MOVE_SPEED * speedMul * delta);
      player.x += move.x;
      player.z += move.z;
    }

    if (keys['Space'] && player.canJump) {
      player.velocityY = JUMP_SPEED;
      player.canJump = false;
    }
    player.velocityY -= GRAVITY * delta;
    player.vertOffset += player.velocityY * delta;
    if (player.vertOffset <= 0) {
      player.vertOffset = 0;
      player.velocityY = 0;
      player.canJump = true;
    }

    const posVec = { x: player.x, z: player.z };
    resolveObstacleCollision(posVec);
    clampToArena(posVec);
    player.x = posVec.x;
    player.z = posVec.z;

    const inkRegen = own === OWNER_PLAYER ? INK_REGEN * 2 : INK_REGEN;
    player.ink = Math.min(INK_MAX, player.ink + inkRegen * delta);

    if (player.fireCooldown > 0) player.fireCooldown -= delta;
    const weapon = WEAPONS[player.weaponIndex];
    if (weapon.mode === 'shot' || weapon.mode === 'melee') {
      if (isFiring && player.fireCooldown <= 0 && player.ink >= weapon.inkCost) {
        player.fireCooldown = weapon.fireInterval;
        player.ink -= weapon.inkCost;
        if (weapon.mode === 'shot') fireWeaponShot(weapon);
        else performRollerSwing(weapon);
      }
    } else if (weapon.mode === 'charge') {
      if (isFiring && player.ink > 0) {
        player.charge = Math.min(1, player.charge + delta / weapon.chargeTime);
        player.ink = Math.max(0, player.ink - (weapon.inkCostPerFullCharge / weapon.chargeTime) * delta);
      } else if (!isFiring && player.charge > 0) {
        if (player.charge >= weapon.minChargeFraction) fireChargerShot(weapon, player.charge);
        player.charge = 0;
      }
    }

    syncCamera();
  }

  // ==================================================================
  // CPU更新
  // ==================================================================
  function updateEnemies(delta) {
    for (const en of enemies) {
      if (!en.alive) {
        en.respawnTimer -= delta;
        if (en.respawnTimer <= 0) respawnEnemy(en);
        continue;
      }

      const dx = en.target.x - en.x;
      const dz = en.target.z - en.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 2.5) {
        pickEnemyTarget(en);
      } else {
        const nx = dx / dist;
        const nz = dz / dist;
        en.x += nx * ENEMY_SPEED * delta;
        en.z += nz * ENEMY_SPEED * delta;
        en.facing = Math.atan2(nx, nz);
      }
      const posVec = { x: en.x, z: en.z };
      resolveObstacleCollision(posVec);
      clampToArena(posVec);
      en.x = posVec.x;
      en.z = posVec.z;

      const groundY = heightAt(en.x, en.z);
      en.mesh.position.set(en.x, groundY, en.z);
      en.mesh.rotation.y = en.facing;

      en.fireTimer -= delta;
      if (en.fireTimer <= 0) {
        en.fireTimer = ENEMY_FIRE_INTERVAL_MIN + Math.random() * ENEMY_FIRE_INTERVAL_JITTER;
        const toPlayer = Math.hypot(player.x - en.x, player.z - en.z);
        let aimX, aimZ;
        if (player.alive && toPlayer < ENEMY_AGGRO_RANGE && Math.random() < 0.6) {
          aimX = player.x + (Math.random() - 0.5) * 3;
          aimZ = player.z + (Math.random() - 0.5) * 3;
        } else {
          aimX = en.x + Math.sin(en.facing) * 6;
          aimZ = en.z + Math.cos(en.facing) * 6;
        }
        const dirVec = new THREE.Vector3(aimX - en.x, 0, aimZ - en.z);
        if (dirVec.lengthSq() < 0.0001) dirVec.set(0, 0, 1);
        dirVec.normalize();
        const origin = new THREE.Vector3(en.x, groundY + 1.5, en.z).addScaledVector(dirVec, 0.6);
        fireInk(origin, dirVec, 'enemy', ENEMY_COLOR);
      }
    }
  }

  // ==================================================================
  // 試合の開始/終了
  // ==================================================================
  function resetMatch() {
    ownerGrid.fill(OWNER_NONE);
    pctx.fillStyle = BASE_GROUND_COLOR;
    pctx.fillRect(0, 0, PAINT_RES, PAINT_RES);
    for (let i = 0; i < 3000; i++) {
      const rx = Math.random() * PAINT_RES;
      const ry = Math.random() * PAINT_RES;
      pctx.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.045)';
      pctx.beginPath();
      pctx.arc(rx, ry, 5 + Math.random() * 9, 0, Math.PI * 2);
      pctx.fill();
    }
    paintDirty = true;

    for (const p of projectiles) scene.remove(p.mesh);
    projectiles.length = 0;

    player.x = PLAYER_SPAWN.x;
    player.z = PLAYER_SPAWN.z;
    player.vertOffset = 0;
    player.velocityY = 0;
    player.hp = PLAYER_HP_MAX;
    player.alive = true;
    player.ink = INK_MAX;
    player.special = 0;
    player.fireCooldown = 0;
    player.swimTime = 0;
    player.splatCount = 0;
    player.invuln = INVULN_TIME;
    player.weaponIndex = 0;
    player.charge = 0;
    respawnBanner.classList.add('hidden');
    yaw = 0;
    pitch = -0.15;

    enemies.forEach((en, i) => {
      en.x = en.spawn.x;
      en.z = en.spawn.z;
      en.hp = ENEMY_HP_MAX;
      en.alive = true;
      en.mesh.visible = true;
      en.fireTimer = 1 + Math.random() * 1.5;
      pickEnemyTarget(en);
    });

    matchTime = MATCH_SECONDS;
    syncCamera();
    updateHUD();
  }

  function endMatch() {
    state = 'result';
    isFiring = false;
    document.exitPointerLock();
    const { playerPct, enemyPct } = computeTurfPercent();
    resultTitle.textContent = playerPct > enemyPct ? 'WIN!' : playerPct < enemyPct ? 'LOSE...' : 'DRAW';
    resultPctPlayer.textContent = Math.round(playerPct) + '%';
    resultPctEnemy.textContent = Math.round(enemyPct) + '%';
    resultSplats.textContent = `たおした数: ${player.splatCount}`;
    hud.classList.add('hidden');
    screenResult.classList.remove('hidden');
  }

  function startGame() {
    resetMatch();
    state = 'playing';
    screenStart.classList.add('hidden');
    screenResult.classList.add('hidden');
    screenPaused.classList.add('hidden');
    hud.classList.remove('hidden');
    canvas.requestPointerLock();
  }

  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-restart').addEventListener('click', startGame);
  document.getElementById('btn-resume').addEventListener('click', () => {
    canvas.requestPointerLock();
  });

  // ==================================================================
  // メインループ
  // ==================================================================
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (state === 'playing') {
      matchTime -= delta;
      updatePlayer(delta);
      updateEnemies(delta);
      updateProjectiles(delta);
      updateHUD();
      if (matchTime <= 0) endMatch();
    }

    if (paintDirty) {
      paintTexture.needsUpdate = true;
      paintDirty = false;
    }

    renderer.render(scene, camera);
  }

  // 開始前のプレビュー用カメラ位置
  camera.position.set(0, heightAt(0, 30) + 6, 34);
  camera.lookAt(0, heightAt(0, 0) + 2, 0);

  animate();
})();
