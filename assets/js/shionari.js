(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;

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

  /* ==================== ヒーロー：パーティクル ==================== */
  (function initHeroCanvas(){
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
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
