(() => {
  const opening = document.getElementById('opening');
  const interlude = document.getElementById('interlude');
  const interludeTitle = document.getElementById('interlude-title');
  const home = document.getElementById('home');
  const title = document.getElementById('glitch-title');
  const skipBtn = document.getElementById('opening-skip');
  if (!opening || !interlude || !interludeTitle || !home || !title) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.body.classList.add('is-locked');

  // ---- タイムライン -----------------------------------------------------
  // 0.0s: 真っ暗 / 1.5s: カラーグリッチで文字がいきなり出現
  // 2.0s: 再びカラーグリッチ / 2.5秒後、1.5秒かけて明転しながら中間画面（黒背景+黒傷のみ）へ
  // 中間画面表示から1秒後：激しいエラーグリッチ / 表示から4秒後：暗転しつつホーム画面へ
  const timers = [];
  function schedule(fn, delay) {
    timers.push(setTimeout(fn, delay));
  }

  function revealInterlude() {
    opening.classList.add('is-bright');
    opening.classList.add('is-done');
    interlude.classList.add('is-visible');
  }

  function revealHome() {
    // 文字だけを一気に消して真っ黒にしてから、背景ごとゆっくり明るくしてホームを見せる
    interludeTitle.classList.add('is-blackout');
    interlude.classList.add('is-done');
    home.classList.add('is-visible');
    document.body.classList.remove('is-locked');
  }

  const OPENING_TO_INTERLUDE = 2500; // オープニング演出の開始からここで明転を始める
  const CROSSFADE = 1500;            // 明転・暗転にかける時間
  const INTERLUDE_HOLD = 4000;       // 中間画面を保持する時間
  const INTERLUDE_ERROR_AT = 1000;   // 中間画面表示からエラーグリッチが入るまでの時間
  const interludeVisibleAt = OPENING_TO_INTERLUDE + CROSSFADE;

  function runSequence() {
    if (reduceMotion) {
      revealHome();
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
    }, 2350);

    schedule(revealInterlude, OPENING_TO_INTERLUDE);

    schedule(() => {
      interludeTitle.classList.add('is-error');
    }, interludeVisibleAt + INTERLUDE_ERROR_AT);

    schedule(() => {
      interludeTitle.classList.remove('is-error');
    }, interludeVisibleAt + INTERLUDE_ERROR_AT + 550);

    schedule(revealHome, interludeVisibleAt + INTERLUDE_HOLD);

    schedule(() => {
      opening.classList.add('is-skippable');
    }, 900);
  }

  function skipIntro() {
    timers.forEach(clearTimeout);
    title.classList.remove('is-noisy', 'is-noisy-2');
    interludeTitle.classList.remove('is-error');
    opening.classList.add('is-done');
    revealHome();
  }

  skipBtn?.addEventListener('click', skipIntro);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') skipIntro();
  }, { once: true });

  runSequence();
})();
