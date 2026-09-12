(() => {
  const canvas = document.getElementById('cursor-particles');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  if (reduceMotion || !finePointer) return;

  const ctx = canvas.getContext('2d');
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = window.innerWidth;
  let height = window.innerHeight;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  let mouseX = width / 2;
  let mouseY = height / 2;
  let hasMoved = false;
  const particles = [];

  window.addEventListener('mousemove', (e) => {
    const prevX = mouseX;
    const prevY = mouseY;
    mouseX = e.clientX;
    mouseY = e.clientY;
    hasMoved = true;

    // 移動距離に応じて軌跡上に光る粒子をばらまく
    const dx = mouseX - prevX;
    const dy = mouseY - prevY;
    const dist = Math.hypot(dx, dy);
    const count = Math.min(6, Math.max(1, Math.floor(dist / 6)));
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 1 : i / (count - 1);
      spawnParticle(prevX + dx * t, prevY + dy * t);
    }
  }, { passive: true });

  function spawnParticle(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 0.4;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.15, // わずかに上へ漂う
      life: 1,
      decay: 0.018 + Math.random() * 0.02,
      radius: 1.5 + Math.random() * 2.5,
      hue: Math.random() < 0.75 ? 'warm' : 'cool',
    });
    if (particles.length > 260) particles.splice(0, particles.length - 260);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;

      const r = p.radius * (0.4 + p.life * 0.6);
      const alpha = p.life;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
      if (p.hue === 'warm') {
        grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
        grad.addColorStop(0.35, `rgba(240,90,100,${alpha * 0.85})`);
        grad.addColorStop(1, 'rgba(224,38,63,0)');
      } else {
        grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
        grad.addColorStop(0.35, `rgba(120,220,230,${alpha * 0.7})`);
        grad.addColorStop(1, 'rgba(78,224,232,0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // マウスが止まっていても、その場でうっすら発光し続ける
  setInterval(() => {
    if (hasMoved) spawnParticle(mouseX, mouseY);
  }, 60);
})();
