(() => {
  const root = document.getElementById('cursor-fx');
  if (!root) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  if (reduceMotion || !finePointer) return;

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let x = targetX;
  let y = targetY;
  let hasMoved = false;

  window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    if (!hasMoved) {
      hasMoved = true;
      x = targetX;
      y = targetY;
      root.classList.add('is-active');
    }
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    root.classList.remove('is-active');
  });
  document.addEventListener('mouseenter', () => {
    if (hasMoved) root.classList.add('is-active');
  });

  function tick() {
    // 少し遅れて追いかける「トラッキング」の軌跡感
    x += (targetX - x) * 0.22;
    y += (targetY - y) * 0.22;
    root.style.setProperty('--cx', `${x.toFixed(1)}px`);
    root.style.setProperty('--cy', `${y.toFixed(1)}px`);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function glitchPulse() {
    const gx = (Math.random() * 12 - 6).toFixed(1);
    const gy = (Math.random() * 12 - 6).toFixed(1);
    root.style.setProperty('--gx', `${gx}px`);
    root.style.setProperty('--gy', `${gy}px`);
    root.classList.add('is-glitching');
    setTimeout(() => root.classList.remove('is-glitching'), 140);
    scheduleGlitch();
  }
  function scheduleGlitch() {
    setTimeout(glitchPulse, 250 + Math.random() * 500);
  }
  scheduleGlitch();
})();
