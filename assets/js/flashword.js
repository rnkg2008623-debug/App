(() => {
  'use strict';

  const STORAGE_KEY = 'flashword.settings';
  const $ = (id) => document.getElementById(id);
  const els = {
    source: $('source'), wordCount: $('word-count'),
    speed: $('speed'), speedOut: $('speed-out'),
    size: $('size'), sizeOut: $('size-out'),
    optGap: $('opt-gap'), optCountdown: $('opt-countdown'),
    optShuffle: $('opt-shuffle'), optLoop: $('opt-loop'),
    stage: $('stage'), word: $('word'), bar: $('progress-bar'),
    start: $('btn-start'), pause: $('btn-pause'), stop: $('btn-stop'),
    position: $('position'),
  };

  // スライダー 0〜100 を 1語あたりの表示時間(ms) 2000〜60 に指数的に対応させる
  const MAX_MS = 2000, MIN_MS = 60;
  const sliderToMs = (v) => Math.round(MAX_MS * Math.pow(MIN_MS / MAX_MS, v / 100));

  let words = [];
  let index = 0;
  let timer = null;
  let state = 'idle'; // idle | countdown | running | paused

  const splitWords = (text) => text.split(/[\s　]+/).filter(Boolean);

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function msPerWord() { return sliderToMs(Number(els.speed.value)); }

  function updateSpeedLabel() {
    const ms = msPerWord();
    const wpm = Math.round(60000 / ms);
    els.speedOut.textContent = `${(ms / 1000).toFixed(2)}秒/語（${wpm}語/分）`;
  }
  function updateSize() {
    els.sizeOut.textContent = `${els.size.value}px`;
    els.word.style.fontSize = `${els.size.value}px`;
  }
  function updateWordCount() {
    els.wordCount.textContent = splitWords(els.source.value).length;
  }

  function showMessage(text) {
    els.word.className = 'word idle';
    els.word.textContent = text;
  }
  function showWord(text, extraClass) {
    els.word.className = 'word' + (extraClass ? ' ' + extraClass : '');
    els.word.textContent = text;
  }

  function updateProgress() {
    const total = words.length;
    els.position.textContent = `${Math.min(index, total)} / ${total}`;
    els.bar.style.width = total ? `${(Math.min(index, total) / total) * 100}%` : '0';
  }

  function setButtons() {
    const active = state !== 'idle';
    els.start.disabled = state === 'running' || state === 'countdown';
    els.start.textContent = state === 'paused' ? '▶ 再開' : '▶ スタート';
    els.pause.disabled = state !== 'running';
    els.stop.disabled = !active;
    els.source.readOnly = active;
    els.optShuffle.disabled = active;
  }

  function clearTimer() { clearTimeout(timer); timer = null; }

  function tick() {
    if (state !== 'running') return;
    if (index >= words.length) {
      if (els.optLoop.checked && words.length) {
        index = 0;
        if (els.optShuffle.checked) words = shuffle(words);
      } else {
        finish();
        return;
      }
    }
    const ms = msPerWord();
    const useGap = els.optGap.checked;
    // ブランクは表示時間の約25%（最低30ms, 最大200ms）
    const gap = useGap ? Math.min(200, Math.max(30, Math.round(ms * 0.25))) : 0;
    showWord(words[index]);
    index++;
    updateProgress();
    timer = setTimeout(() => {
      if (state !== 'running') return;
      if (gap) {
        showWord('');
        timer = setTimeout(tick, gap);
      } else {
        tick();
      }
    }, ms - gap);
  }

  function countdown(n) {
    if (state !== 'countdown') return;
    if (n === 0) {
      showWord('');
      state = 'running';
      setButtons();
      timer = setTimeout(tick, 300);
      return;
    }
    showWord(String(n), 'count');
    timer = setTimeout(() => countdown(n - 1), 700);
  }

  function start() {
    if (state === 'paused') {
      state = 'running';
      setButtons();
      tick();
      return;
    }
    if (state !== 'idle') return;
    words = splitWords(els.source.value);
    if (!words.length) {
      showMessage('左の欄に文章を貼り付けてください');
      els.source.focus();
      return;
    }
    if (els.optShuffle.checked) words = shuffle(words);
    index = 0;
    updateProgress();
    els.stage.focus();
    if (els.optCountdown.checked) {
      state = 'countdown';
      setButtons();
      countdown(3);
    } else {
      state = 'running';
      setButtons();
      tick();
    }
  }

  function pause() {
    if (state !== 'running') return;
    clearTimer();
    state = 'paused';
    setButtons();
    // 一時停止中は直前の単語を表示したままにする
    if (index > 0) showWord(words[index - 1]);
  }

  function stop() {
    clearTimer();
    state = 'idle';
    index = 0;
    setButtons();
    updateProgress();
    showMessage('スタートを押してください');
  }

  function finish() {
    clearTimer();
    state = 'idle';
    setButtons();
    updateProgress();
    showMessage(`おわり！（${words.length}語）`);
  }

  // ---- 設定の保存（ブラウザ内のみ） ----
  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        text: els.source.value,
        speed: els.speed.value, size: els.size.value,
        gap: els.optGap.checked, countdown: els.optCountdown.checked,
        shuffle: els.optShuffle.checked, loop: els.optLoop.checked,
      }));
    } catch (e) { /* 保存できなくても動作は継続 */ }
  }
  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!s) return;
      if (typeof s.text === 'string') els.source.value = s.text;
      if (s.speed != null) els.speed.value = s.speed;
      if (s.size != null) els.size.value = s.size;
      els.optGap.checked = s.gap !== false;
      els.optCountdown.checked = s.countdown !== false;
      els.optShuffle.checked = !!s.shuffle;
      els.optLoop.checked = !!s.loop;
    } catch (e) { /* ignore */ }
  }

  // ---- イベント ----
  els.source.addEventListener('input', () => { updateWordCount(); saveSettings(); });
  els.speed.addEventListener('input', () => { updateSpeedLabel(); saveSettings(); });
  els.size.addEventListener('input', () => { updateSize(); saveSettings(); });
  [els.optGap, els.optCountdown, els.optShuffle, els.optLoop].forEach((c) =>
    c.addEventListener('change', saveSettings));
  els.start.addEventListener('click', start);
  els.pause.addEventListener('click', pause);
  els.stop.addEventListener('click', stop);
  els.stage.addEventListener('click', () => (state === 'running' ? pause() : start()));

  document.addEventListener('keydown', (e) => {
    if (e.target === els.source) return;
    if (e.code === 'Space') {
      e.preventDefault();
      state === 'running' ? pause() : start();
    } else if (e.key === 'Escape') {
      stop();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      if (e.target === els.speed || e.target === els.size) return;
      e.preventDefault();
      const d = e.key === 'ArrowRight' ? 5 : -5;
      els.speed.value = Math.max(0, Math.min(100, Number(els.speed.value) + d));
      updateSpeedLabel();
      saveSettings();
    }
  });

  loadSettings();
  updateSpeedLabel();
  updateSize();
  updateWordCount();
  setButtons();
  updateProgress();
  showMessage('スタートを押してください');
})();
