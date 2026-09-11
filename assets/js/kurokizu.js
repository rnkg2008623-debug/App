(() => {
  const opening = document.getElementById('opening');
  const home = document.getElementById('home');
  const canvas = document.getElementById('noise-canvas');
  const skipBtn = document.getElementById('opening-skip');
  if (!opening || !home) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.body.classList.add('is-locked');

  // ---- ノイズ（TVスタティック風）--------------------------------------
  const ctx = canvas.getContext('2d');
  const NOISE_W = 160, NOISE_H = 90;
  canvas.width = NOISE_W;
  canvas.height = NOISE_H;
  let noiseRunning = false;
  let noiseFrame = null;

  function drawNoiseFrame() {
    const imageData = ctx.createImageData(NOISE_W, NOISE_H);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const shade = Math.random() * 255 | 0;
      data[i] = shade;
      data[i + 1] = shade;
      data[i + 2] = shade;
      data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function noiseLoop() {
    if (!noiseRunning) return;
    drawNoiseFrame();
    noiseFrame = requestAnimationFrame(noiseLoop);
  }

  function startNoise() {
    if (noiseRunning) return;
    noiseRunning = true;
    noiseLoop();
  }

  function stopNoise() {
    noiseRunning = false;
    if (noiseFrame) cancelAnimationFrame(noiseFrame);
  }

  // ---- タイムライン -----------------------------------------------------
  // 0.0s: 真っ暗 / 1.5s: ノイズ+グリッチでタイトル出現
  // 2.0s: 再グリッチしつつ明転開始 / 2.5s: ゆっくり明るくなりホーム表示
  const timers = [];
  function schedule(fn, delay) {
    timers.push(setTimeout(fn, delay));
  }

  function finishOpening() {
    stopNoise();
    opening.classList.add('is-done');
    home.classList.add('is-visible');
    document.body.classList.remove('is-locked');
  }

  function runSequence() {
    if (reduceMotion) {
      finishOpening();
      return;
    }

    schedule(() => {
      opening.classList.add('is-flashing');
      startNoise();
    }, 1500);

    schedule(() => {
      stopNoise();
      opening.classList.remove('is-flashing');
    }, 1850);

    schedule(() => {
      opening.classList.add('is-glitch-2');
      startNoise();
    }, 2000);

    schedule(() => {
      stopNoise();
      opening.classList.remove('is-glitch-2');
      opening.classList.add('is-bright');
    }, 2450);

    schedule(() => {
      finishOpening();
    }, 2500);

    schedule(() => {
      opening.classList.add('is-skippable');
    }, 900);
  }

  function skipIntro() {
    timers.forEach(clearTimeout);
    finishOpening();
  }

  skipBtn?.addEventListener('click', skipIntro);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') skipIntro();
  }, { once: true });

  runSequence();
})();
