(() => {
  'use strict';

  // ------------------------------------------------------------------
  // 定数
  // ------------------------------------------------------------------
  const ARENA_HALF = 48;          // 移動可能範囲(±)
  const EYE_HEIGHT = 1.7;
  const GRAVITY = 22;
  const JUMP_SPEED = 8;
  const MOVE_SPEED = 7.5;
  const PLAYER_RADIUS = 0.5;
  const MOUSE_SENSITIVITY = 0.0022;
  const FIRE_COOLDOWN = 0.22;     // 秒
  const WEAPON_DAMAGE = 20;
  const ENEMY_CONTACT_RANGE = 1.6;
  const ENEMY_CONTACT_DAMAGE = 8;
  const ENEMY_CONTACT_INTERVAL = 0.9;

  // ------------------------------------------------------------------
  // DOM
  // ------------------------------------------------------------------
  const canvas = document.getElementById('game-canvas');
  const hud = document.getElementById('hud');
  const hudHealth = document.getElementById('hud-health');
  const hudScore = document.getElementById('hud-score');
  const hudWave = document.getElementById('hud-wave');
  const hudEnemies = document.getElementById('hud-enemies');
  const hitFlash = document.getElementById('hit-flash');
  const screenStart = document.getElementById('screen-start');
  const screenPaused = document.getElementById('screen-paused');
  const screenGameover = document.getElementById('screen-gameover');
  const finalScoreEl = document.getElementById('final-score');
  const finalWaveEl = document.getElementById('final-wave');

  // ------------------------------------------------------------------
  // Three.js 基本セットアップ
  // ------------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fc7e8);
  scene.fog = new THREE.Fog(0x8fc7e8, 25, 95);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.rotation.order = 'YXZ';

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  // 光源
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(30, 45, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sun.shadow.camera.far = 150;
  scene.add(sun);

  // 地面
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: 0x5a9e52 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // 外周フェンス(見た目のみ、実際の境界はARENA_HALFでクランプ)
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8a7a63 });
  const fenceGeo = new THREE.BoxGeometry(1, 3, 1);
  const fenceCount = 48;
  for (let i = 0; i < fenceCount; i++) {
    const angle = (i / fenceCount) * Math.PI * 2;
    const post = new THREE.Mesh(fenceGeo, fenceMat);
    post.position.set(Math.cos(angle) * (ARENA_HALF + 1), 1.5, Math.sin(angle) * (ARENA_HALF + 1));
    post.castShadow = true;
    scene.add(post);
  }

  // ------------------------------------------------------------------
  // 障害物(木箱)
  // ------------------------------------------------------------------
  const obstacles = []; // { mesh, radius }
  function createObstacles(count) {
    const geo = new THREE.BoxGeometry(2.2, 2.2, 2.2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xa3703c });
    let tries = 0;
    while (obstacles.length < count && tries < count * 20) {
      tries++;
      const x = (Math.random() * 2 - 1) * (ARENA_HALF - 6);
      const z = (Math.random() * 2 - 1) * (ARENA_HALF - 6);
      if (Math.hypot(x, z) < 8) continue; // 中央付近は空ける
      const tooClose = obstacles.some(o => Math.hypot(o.mesh.position.x - x, o.mesh.position.z - z) < 5);
      if (tooClose) continue;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 1.1, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      obstacles.push({ mesh, radius: 1.6 });
    }
  }
  createObstacles(14);

  // ------------------------------------------------------------------
  // 敵
  // ------------------------------------------------------------------
  const enemies = []; // { group, health, speed, alive, hitTimer }
  function createEnemyMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd8433f });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 1.4, 10), bodyMat);
    body.position.y = 1.0;
    body.castShadow = true;
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffd8a8 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), headMat);
    head.position.y = 1.85;
    head.castShadow = true;
    group.add(body, head);
    return group;
  }

  function spawnEnemy(speed) {
    const angle = Math.random() * Math.PI * 2;
    const r = ARENA_HALF - 2;
    const group = createEnemyMesh();
    group.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    scene.add(group);
    enemies.push({ group, health: 40, speed, alive: true, hitTimer: 0 });
  }

  function spawnWave(n) {
    wave = n;
    const count = 3 + (n - 1) * 2;
    const speed = Math.min(2.2 + n * 0.18, 5.5);
    for (let i = 0; i < count; i++) spawnEnemy(speed);
    updateHUD();
  }

  // ------------------------------------------------------------------
  // 入力
  // ------------------------------------------------------------------
  const keys = {};
  window.addEventListener('keydown', (e) => { keys[e.code] = true; });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  let yaw = 0;
  let pitch = 0;
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas) return;
    yaw -= e.movementX * MOUSE_SENSITIVITY;
    pitch -= e.movementY * MOUSE_SENSITIVITY;
    const limit = Math.PI / 2 - 0.05;
    pitch = Math.max(-limit, Math.min(limit, pitch));
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
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

  // ------------------------------------------------------------------
  // ゲーム状態
  // ------------------------------------------------------------------
  let state = 'start'; // start | playing | paused | gameover
  let health = 100;
  let score = 0;
  let wave = 1;
  let velocityY = 0;
  let canJump = true;
  let fireCooldown = 0;

  function updateHUD() {
    hudHealth.textContent = Math.max(0, Math.round(health));
    hudScore.textContent = score;
    hudWave.textContent = wave;
    hudEnemies.textContent = enemies.filter(en => en.alive).length;
    hudHealth.style.color = health > 60 ? 'var(--gg-hp-good)' : health > 30 ? 'var(--gg-hp-mid)' : 'var(--gg-hp-bad)';
  }

  function flashHit() {
    hitFlash.classList.remove('show');
    void hitFlash.offsetWidth; // reflow でアニメーションを再トリガー
    hitFlash.classList.add('show');
    requestAnimationFrame(() => {
      setTimeout(() => hitFlash.classList.remove('show'), 120);
    });
  }

  function resolveObstacleCollision(pos) {
    for (const ob of obstacles) {
      const dx = pos.x - ob.mesh.position.x;
      const dz = pos.z - ob.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      const minDist = ob.radius + PLAYER_RADIUS;
      if (dist < minDist && dist > 0.0001) {
        const push = (minDist - dist);
        pos.x += (dx / dist) * push;
        pos.z += (dz / dist) * push;
      }
    }
  }

  function clampToArena(pos) {
    const r = ARENA_HALF - 0.5;
    const dist = Math.hypot(pos.x, pos.z);
    if (dist > r) {
      const scale = r / dist;
      pos.x *= scale;
      pos.z *= scale;
    }
  }

  // 射線: カメラ中央から一直線に発射(ヒットスキャン)
  const raycaster = new THREE.Raycaster();
  function shoot() {
    fireCooldown = FIRE_COOLDOWN;
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);

    const targets = [];
    for (const en of enemies) {
      if (en.alive) targets.push(en.group);
    }
    const hits = raycaster.intersectObjects(targets, true);

    let tracerEnd;
    if (hits.length > 0) {
      tracerEnd = hits[0].point;
      let obj = hits[0].object;
      while (obj.parent && !enemies.some(en => en.group === obj)) obj = obj.parent;
      const enemy = enemies.find(en => en.group === obj);
      if (enemy && enemy.alive) {
        enemy.health -= WEAPON_DAMAGE;
        if (enemy.health <= 0) {
          enemy.alive = false;
          scene.remove(enemy.group);
          score += 10;
          updateHUD();
          maybeStartNextWave();
        }
      }
    } else {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      tracerEnd = camera.position.clone().add(dir.multiplyScalar(60));
    }
    drawTracer(camera.position, tracerEnd);
  }

  function drawTracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to]);
    const mat = new THREE.LineBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    setTimeout(() => scene.remove(line), 70);
  }

  let waveTransitionTimer = null;
  function maybeStartNextWave() {
    if (state !== 'playing') return;
    if (enemies.length && enemies.every(en => !en.alive) && !waveTransitionTimer) {
      waveTransitionTimer = setTimeout(() => {
        waveTransitionTimer = null;
        enemies.length = 0;
        spawnWave(wave + 1);
      }, 1600);
    }
  }

  function takeDamage(amount) {
    health -= amount;
    flashHit();
    updateHUD();
    if (health <= 0) gameOver();
  }

  function gameOver() {
    state = 'gameover';
    isFiring = false;
    document.exitPointerLock();
    finalScoreEl.textContent = score;
    finalWaveEl.textContent = wave;
    hud.classList.add('hidden');
    screenGameover.classList.remove('hidden');
  }

  function resetGame() {
    health = 100;
    score = 0;
    wave = 0;
    velocityY = 0;
    fireCooldown = 0;
    yaw = 0;
    pitch = 0;
    camera.position.set(0, EYE_HEIGHT, 10);
    camera.rotation.set(0, 0, 0, 'YXZ');
    for (const en of enemies) scene.remove(en.group);
    enemies.length = 0;
    if (waveTransitionTimer) { clearTimeout(waveTransitionTimer); waveTransitionTimer = null; }
    spawnWave(1);
    updateHUD();
  }

  function startGame() {
    resetGame();
    state = 'playing';
    screenStart.classList.add('hidden');
    screenGameover.classList.add('hidden');
    screenPaused.classList.add('hidden');
    hud.classList.remove('hidden');
    canvas.requestPointerLock();
  }

  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-restart').addEventListener('click', startGame);
  document.getElementById('btn-resume').addEventListener('click', () => {
    canvas.requestPointerLock();
  });

  // ------------------------------------------------------------------
  // メインループ
  // ------------------------------------------------------------------
  const clock = new THREE.Clock();

  function updatePlayer(delta) {
    const forwardInput = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
    const sideInput = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);

    if (forwardInput !== 0 || sideInput !== 0) {
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const move = new THREE.Vector3()
        .addScaledVector(forward, forwardInput)
        .addScaledVector(right, sideInput);
      move.normalize().multiplyScalar(MOVE_SPEED * delta);
      camera.position.x += move.x;
      camera.position.z += move.z;
    }

    if (keys['Space'] && canJump) {
      velocityY = JUMP_SPEED;
      canJump = false;
    }

    velocityY -= GRAVITY * delta;
    camera.position.y += velocityY * delta;
    if (camera.position.y <= EYE_HEIGHT) {
      camera.position.y = EYE_HEIGHT;
      velocityY = 0;
      canJump = true;
    }

    resolveObstacleCollision(camera.position);
    clampToArena(camera.position);

    if (fireCooldown > 0) fireCooldown -= delta;
    if (isFiring && fireCooldown <= 0) shoot();
  }

  function updateEnemies(delta) {
    for (const en of enemies) {
      if (!en.alive) continue;
      const dx = camera.position.x - en.group.position.x;
      const dz = camera.position.z - en.group.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist > ENEMY_CONTACT_RANGE) {
        en.group.position.x += (dx / dist) * en.speed * delta;
        en.group.position.z += (dz / dist) * en.speed * delta;
      } else {
        en.hitTimer -= delta;
        if (en.hitTimer <= 0) {
          en.hitTimer = ENEMY_CONTACT_INTERVAL;
          takeDamage(ENEMY_CONTACT_DAMAGE);
        }
      }
      en.group.lookAt(camera.position.x, en.group.position.y, camera.position.z);
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (state === 'playing') {
      updatePlayer(delta);
      updateEnemies(delta);
      updateHUD();
    }

    renderer.render(scene, camera);
  }

  // 開始前のプレビュー用カメラ位置
  camera.position.set(0, EYE_HEIGHT, 18);
  camera.lookAt(0, EYE_HEIGHT, 0);

  animate();
})();
