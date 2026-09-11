(() => {
  const opening = document.getElementById('opening');
  const home = document.getElementById('home');
  const title = document.getElementById('glitch-title');
  const skipBtn = document.getElementById('opening-skip');
  if (!opening || !home || !title) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.body.classList.add('is-locked');

  // ---- タイムライン -----------------------------------------------------
  // 0.0s: 真っ暗 / 1.5s: 白ノイズ+グリッチで文字がいきなり出現
  // 2.0s: 再び文字に白ノイズ+グリッチをかけつつ明転開始 / 2.5s: ゆっくり明るくなりホーム表示
  const timers = [];
  function schedule(fn, delay) {
    timers.push(setTimeout(fn, delay));
  }

  function finishOpening() {
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
      title.classList.add('is-noisy');
    }, 1500);

    schedule(() => {
      opening.classList.remove('is-flashing');
      title.classList.remove('is-noisy');
    }, 1850);

    schedule(() => {
      opening.classList.add('is-glitch-2');
      title.classList.add('is-noisy-2');
    }, 2000);

    schedule(() => {
      opening.classList.remove('is-glitch-2');
      title.classList.remove('is-noisy-2');
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
    title.classList.remove('is-noisy', 'is-noisy-2');
    finishOpening();
  }

  skipBtn?.addEventListener('click', skipIntro);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') skipIntro();
  }, { once: true });

  runSequence();
})();
