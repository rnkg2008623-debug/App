(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;

  function hasWebGL(){
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  function makeSoftSprite(){
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  /* ==================== ブート演出 ==================== */
  (function initBootIntro(){
    const boot = document.getElementById('boot-intro');
    const fill = document.getElementById('boot-bar-fill');
    const pct = document.getElementById('boot-pct');
    const status = document.getElementById('boot-status');
    if (!boot) return;

    const hide = () => {
      boot.classList.add('is-hidden');
      document.body.style.overflow = '';
      setTimeout(() => boot.remove(), 700);
    };

    if (reduceMotion) {
      setTimeout(hide, 200);
      return;
    }

    document.body.style.overflow = 'hidden';
    const duration = 1500;
    const start = performance.now();
    const messages = [
      [0, 'INITIALIZING WORLD...'],
      [0.4, 'LOADING OCEAN DATA...'],
      [0.75, 'SYNCHRONIZING...'],
    ];

    function step(now){
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 2);
      const pctVal = Math.round(eased * 100);
      if (fill) fill.style.width = `${pctVal}%`;
      if (pct) pct.textContent = `${pctVal}%`;
      if (status) {
        const msg = messages.filter(([t]) => progress >= t).pop();
        if (msg) status.textContent = msg[1];
      }
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setTimeout(hide, 250);
      }
    }
    requestAnimationFrame(step);
  })();

  /* ==================== カスタムカーソル ==================== */
  (function initCursor(){
    if (isCoarse) return;
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    });

    (function loop(){
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();

    const hoverTargets = 'a, button, .tilt-card, .gallery-item';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverTargets)) ring.classList.add('is-active');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverTargets)) ring.classList.remove('is-active');
    });
  })();

  /* ==================== スクロール進捗バー ==================== */
  (function initScrollProgress(){
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;
    const update = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const max = h.scrollHeight - h.clientHeight;
      bar.style.width = max > 0 ? `${(scrolled / max) * 100}%` : '0%';
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  })();

  /* ==================== ナビゲーション ==================== */
  (function initNav(){
    const nav = document.getElementById('site-nav');
    const burger = document.getElementById('nav-burger');
    const mobileMenu = document.getElementById('mobile-menu');
    const navLinks = document.querySelectorAll('[data-nav]');

    const onScroll = () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (burger && mobileMenu) {
      burger.addEventListener('click', () => {
        const open = mobileMenu.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.style.overflow = open ? 'hidden' : '';
      });
      mobileMenu.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', () => {
          mobileMenu.classList.remove('is-open');
          burger.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        });
      });
    }

    const sections = Array.from(document.querySelectorAll('main > section[id]'));
    if (sections.length && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((a) => {
            a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`);
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach((s) => io.observe(s));
    }
  })();

  /* ==================== スクロールリビール ==================== */
  (function initReveal(){
    const targets = document.querySelectorAll('.reveal-up, .reveal-scale, .reveal-title');
    if (!targets.length) return;
    if (!('IntersectionObserver' in window) || reduceMotion) {
      targets.forEach((t) => t.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    targets.forEach((t) => io.observe(t));
  })();

  /* ==================== カウントアップ ==================== */
  (function initCounters(){
    const nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;
    const animate = (el) => {
      const target = parseInt(el.dataset.count, 10) || 0;
      const suffix = el.dataset.suffix || '';
      const duration = 1400;
      const start = performance.now();
      const step = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      if (reduceMotion) {
        el.textContent = target + suffix;
      } else {
        requestAnimationFrame(step);
      }
    };
    if (!('IntersectionObserver' in window)) {
      nums.forEach(animate);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    nums.forEach((n) => io.observe(n));
  })();

  /* ==================== カードのチルト効果 ==================== */
  (function initTilt(){
    if (isCoarse || reduceMotion) return;
    const cards = document.querySelectorAll('.tilt-card');
    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--rx', `${(px * 10).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${(-py * 10).toFixed(2)}deg`);
      });
      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  })();

  /* ==================== ヒーロー：マウス視差 ==================== */
  (function initHeroParallax(){
    const scene = document.getElementById('hero-scene');
    const hero = document.getElementById('hero');
    if (!scene || !hero || isCoarse || reduceMotion) return;

    const far = scene.querySelector('.hero-mountains-far');
    const near = scene.querySelector('.hero-mountains-near');
    const ruins = scene.querySelector('.hero-ruins');
    const glow = scene.querySelector('.hero-glow');

    hero.addEventListener('mousemove', (e) => {
      const px = (e.clientX / window.innerWidth) - 0.5;
      const py = (e.clientY / window.innerHeight) - 0.5;
      if (far) far.style.transform = `translate(${px * -12}px, ${py * -6}px)`;
      if (near) near.style.transform = `translate(${px * -22}px, ${py * -10}px)`;
      if (ruins) ruins.style.transform = `translate(${px * -30}px, ${py * -12}px)`;
      if (glow) glow.style.transform = `translate(calc(-50% + ${px * 26}px), ${py * 16}px)`;
    });
  })();

  /* ==================== ヒーロー：3D海洋シーン ==================== */
  function initHeroScene3D(canvas){
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x05070d, 9, 34);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    const basePos = { x: 0, y: 3.1, z: 10.5 };
    camera.position.set(basePos.x, basePos.y, basePos.z);
    camera.lookAt(0, 1.1, 0);

    scene.add(new THREE.AmbientLight(0x1c3244, 1.3));
    const tealLight = new THREE.PointLight(0x7fe9ea, 3.2, 26, 2);
    tealLight.position.set(-4, 3.5, 2);
    scene.add(tealLight);
    const goldLight = new THREE.DirectionalLight(0xf3dfa8, 1.3);
    goldLight.position.set(5, 6, 4);
    scene.add(goldLight);

    /* --- 海洋 --- */
    const segs = isCoarse ? 32 : 56;
    const oceanGeo = new THREE.PlaneGeometry(58, 34, segs, Math.round(segs * 0.62));
    const oceanMat = new THREE.MeshPhongMaterial({
      color: 0x0a2632, emissive: 0x051018, specular: 0x9beef0, shininess: 110,
      transparent: true, opacity: 0.94, side: THREE.DoubleSide,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -1.1;
    scene.add(ocean);
    const oceanPos = oceanGeo.attributes.position;
    const oceanBase = Float32Array.from(oceanPos.array);

    /* --- 空に浮かぶクリスタル（タイトル文字と重ならない高さに配置） --- */
    const crystal = new THREE.Group();
    const outer = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.78, 0),
      new THREE.MeshBasicMaterial({ color: 0x7fe9ea, wireframe: true, transparent: true, opacity: 0.4 })
    );
    const inner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.42, 1),
      new THREE.MeshStandardMaterial({ color: 0xf3dfa8, emissive: 0xd4af6a, emissiveIntensity: 1.5, metalness: 0.6, roughness: 0.25 })
    );
    crystal.add(outer, inner);
    const crystalBaseY = 5.4;
    crystal.position.set(0, crystalBaseY, -6);
    scene.add(crystal);

    /* --- パーティクル --- */
    const count = isCoarse ? 260 : 520;
    const posArr = new Float32Array(count * 3);
    const colorArr = new Float32Array(count * 3);
    const teal = new THREE.Color(0x7fe9ea);
    const gold = new THREE.Color(0xf3dfa8);
    for (let i = 0; i < count; i++) {
      posArr[i * 3] = (Math.random() - 0.5) * 26;
      posArr[i * 3 + 1] = Math.random() * 7;
      posArr[i * 3 + 2] = (Math.random() - 0.5) * 18 - 2;
      const c = Math.random() > 0.5 ? teal : gold;
      colorArr[i * 3] = c.r; colorArr[i * 3 + 1] = c.g; colorArr[i * 3 + 2] = c.b;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.09, map: makeSoftSprite(), transparent: true, alphaTest: 0.01,
      depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    /* --- リサイズ --- */
    function resize(){
      const w = canvas.clientWidth || canvas.parentElement.clientWidth;
      const h = canvas.clientHeight || canvas.parentElement.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    window.addEventListener('resize', resize);
    resize();

    /* --- マウス視差 --- */
    let targetX = basePos.x, targetY = basePos.y;
    if (!isCoarse) {
      window.addEventListener('mousemove', (e) => {
        const px = (e.clientX / window.innerWidth) - 0.5;
        const py = (e.clientY / window.innerHeight) - 0.5;
        targetX = basePos.x + px * (reduceMotion ? 0 : 1.4);
        targetY = basePos.y + py * (reduceMotion ? 0 : -0.8);
      });
    }

    /* --- アニメーションループ --- */
    let running = true;
    let frame = 0;
    const clock = new THREE.Clock();
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) requestAnimationFrame(loop);
    });

    function loop(){
      if (!running) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime * (reduceMotion ? 0.3 : 1);
      frame++;

      for (let i = 0; i < oceanPos.count; i++) {
        const bx = oceanBase[i * 3];
        const by = oceanBase[i * 3 + 1];
        const wave = Math.sin(bx * 0.28 + t * 1.1) * 0.22 + Math.cos(by * 0.34 + t * 0.8) * 0.16;
        oceanPos.setZ(i, wave);
      }
      oceanPos.needsUpdate = true;
      if (frame % 2 === 0) oceanGeo.computeVertexNormals();

      crystal.rotation.y += dt * 0.28;
      crystal.rotation.x += dt * 0.09;
      crystal.position.y = crystalBaseY + Math.sin(t * 0.6) * 0.16;

      const pos = particleGeo.attributes.position;
      for (let i = 0; i < count; i++) {
        let y = pos.getY(i) + dt * (0.28 + (i % 5) * 0.05);
        if (y > 7) y = 0;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;

      camera.position.x += (targetX - camera.position.x) * 0.04;
      camera.position.y += (targetY - camera.position.y) * 0.04;
      camera.lookAt(0, 1.1, 0);

      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ==================== ヒーロー：3D/2Dパーティクル ==================== */
  (function initHeroCanvas(){
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    if (typeof THREE !== 'undefined' && hasWebGL()) {
      try {
        initHeroScene3D(canvas);
        return;
      } catch (e) {
        /* WebGL初期化に失敗した場合は2Dパーティクルにフォールバック */
      }
    }

    const ctx = canvas.getContext('2d');
    let w, h, dpr;
    let particles = [];
    let running = true;
    let mouseX = 0, mouseY = 0;

    const COUNT = reduceMotion ? 0 : (isCoarse ? 45 : 90);

    function resize(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeParticle(){
      return {
        x: Math.random() * w,
        y: h + Math.random() * 60,
        r: Math.random() * 1.8 + 0.4,
        speed: Math.random() * 0.5 + 0.15,
        drift: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.5 + 0.2,
        hue: Math.random() > 0.5 ? 'teal' : 'gold',
      };
    }

    function init(){
      resize();
      particles = Array.from({ length: COUNT }, makeParticle);
    }

    function draw(){
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.y -= p.speed;
        p.x += p.drift + (mouseX * 0.15);
        if (p.y < -10) Object.assign(p, makeParticle(), { y: h + 10 });
        const color = p.hue === 'teal' ? `rgba(127,233,234,${p.alpha})` : `rgba(243,223,168,${p.alpha})`;
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    if (!isCoarse) {
      window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) - 0.5;
      });
    }
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) requestAnimationFrame(draw);
    });

    init();
    if (COUNT > 0) requestAnimationFrame(draw);
  })();

  /* ==================== 世界観：3Dクリスタルエンブレム ==================== */
  (function initWorldEmblem3D(){
    const frame = document.getElementById('world-art-frame');
    const canvas = document.getElementById('world-emblem-canvas');
    if (!frame || !canvas || typeof THREE === 'undefined' || !hasWebGL()) return;

    try {
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 20);
      camera.position.set(0, 0, 4.4);

      scene.add(new THREE.AmbientLight(0x1c3244, 1.4));
      const key = new THREE.PointLight(0xf3dfa8, 2.4, 12);
      key.position.set(2, 2, 3);
      scene.add(key);
      const rim = new THREE.PointLight(0x7fe9ea, 1.8, 12);
      rim.position.set(-2, -1, 2);
      scene.add(rim);

      const group = new THREE.Group();
      const shell = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.4, 0),
        new THREE.MeshBasicMaterial({ color: 0x7fe9ea, wireframe: true, transparent: true, opacity: 0.45 })
      );
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.82, 1),
        new THREE.MeshStandardMaterial({ color: 0xf3dfa8, emissive: 0xd4af6a, emissiveIntensity: 1.4, metalness: 0.65, roughness: 0.2 })
      );
      group.add(shell, core);
      scene.add(group);

      function resize(){
        const size = frame.clientWidth;
        if (!size) return;
        camera.aspect = 1;
        camera.updateProjectionMatrix();
        renderer.setSize(size, size, false);
      }
      window.addEventListener('resize', resize);
      resize();
      frame.classList.add('has-3d');

      let running = true;
      const clock = new THREE.Clock();
      document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
        if (running) requestAnimationFrame(loop);
      });

      function loop(){
        if (!running) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime * (reduceMotion ? 0.25 : 1);
        group.rotation.y += dt * 0.35;
        group.rotation.x = Math.sin(t * 0.4) * 0.2;
        renderer.render(scene, camera);
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    } catch (e) {
      /* WebGL初期化に失敗した場合はCSSの漢字エンブレムのまま表示 */
    }
  })();

  /* ==================== キャラクター横スクロール（ドラッグ対応） ==================== */
  (function initCharScroller(){
    const scroller = document.querySelector('.char-scroller');
    if (!scroller) return;
    let isDown = false, startX = 0, startScroll = 0;

    scroller.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX;
      startScroll = scroller.scrollLeft;
    });
    window.addEventListener('mouseup', () => { isDown = false; });
    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      scroller.scrollLeft = startScroll - (e.pageX - startX);
    });
  })();

  /* ==================== モーダル共通 ==================== */
  function bindModal(modal){
    if (!modal) return;
    const open = () => { modal.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
    const close = () => { modal.classList.remove('is-open'); document.body.style.overflow = ''; };
    modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
    return { open, close };
  }

  /* ==================== トレーラーモーダル ==================== */
  (function initTrailer(){
    const modal = document.getElementById('trailer-modal');
    const btn = document.getElementById('btn-trailer');
    const controls = bindModal(modal);
    if (btn && controls) btn.addEventListener('click', controls.open);
  })();

  /* ==================== ギャラリー・ライトボックス ==================== */
  (function initLightbox(){
    const modal = document.getElementById('lightbox');
    const controls = bindModal(modal);
    const items = Array.from(document.querySelectorAll('.gallery-item'));
    const visual = document.getElementById('lightbox-visual');
    const caption = document.getElementById('lightbox-caption');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    if (!modal || !items.length || !controls) return;

    let index = 0;

    function render(){
      const item = items[index];
      const tone = item.dataset.tone;
      const label = item.querySelector('.gallery-caption')?.textContent || '';
      visual.className = 'lightbox-visual';
      visual.classList.add(`tone-${tone}`);
      caption.textContent = label;
    }

    items.forEach((item, i) => {
      item.addEventListener('click', () => {
        index = i;
        render();
        controls.open();
      });
    });

    prevBtn?.addEventListener('click', () => { index = (index - 1 + items.length) % items.length; render(); });
    nextBtn?.addEventListener('click', () => { index = (index + 1) % items.length; render(); });
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'ArrowLeft') prevBtn?.click();
      if (e.key === 'ArrowRight') nextBtn?.click();
    });
  })();

})();
