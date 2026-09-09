(() => {
  'use strict';

  // ===================== 音名・音域表記 =====================
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function octaveLabel(oct) {
    if (oct >= 5) return 'Hi'.repeat(oct - 4);
    if (oct === 4) return 'Mid2';
    if (oct === 3) return 'Mid1';
    if (oct === 2) return 'Low1';
    if (oct === 1) return 'Low2';
    return 'Low' + (3 - oct);
  }

  function noteNameFromMidi(midi) {
    const rounded = Math.round(midi);
    const pc = ((rounded % 12) + 12) % 12;
    const oct = Math.floor(rounded / 12) - 1;
    return octaveLabel(oct) + NOTE_NAMES[pc];
  }

  function formatTime(t) {
    if (t == null || isNaN(t)) return '--:--.-';
    const m = Math.floor(t / 60);
    const s = t - m * 60;
    return m + ':' + s.toFixed(1).padStart(4, '0');
  }

  // ===================== 状態 =====================
  const state = {
    file: null,
    objectUrl: null,
    duration: 0,
    segments: [],
    worker: null,
  };

  const el = {};
  [
    'vk-dropzone', 'vk-file-input', 'vk-file-info', 'vk-file-name', 'vk-file-duration',
    'vk-adv-toggle', 'vk-adv-panel', 'vk-clarity', 'vk-clarity-val', 'vk-rms', 'vk-rms-val',
    'vk-mindur', 'vk-mindur-val', 'vk-minfreq', 'vk-maxfreq',
    'vk-analyze-btn', 'vk-reset-btn', 'vk-progress-wrap', 'vk-progress-fill', 'vk-progress-label',
    'vk-error', 'vk-player-card', 'vk-video', 'vk-now-value', 'vk-now-freq',
    'vk-result-card', 'vk-graph', 'vk-table-body', 'vk-copy-btn', 'vk-download-btn',
  ].forEach(id => { el[id] = document.getElementById(id); });

  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const COLORS = {
    accent: () => cssVar('--accent') || '#b5602f',
    gold: () => cssVar('--gold') || '#a9821c',
    border: () => cssVar('--border') || '#ddd8c8',
    muted: () => cssVar('--text-muted') || '#6b6a5c',
    primary: () => cssVar('--primary') || '#3f5744',
  };

  // ===================== ファイル選択 =====================
  el['vk-dropzone'].addEventListener('click', () => el['vk-file-input'].click());
  el['vk-dropzone'].addEventListener('dragover', (e) => { e.preventDefault(); el['vk-dropzone'].classList.add('is-drag'); });
  el['vk-dropzone'].addEventListener('dragleave', () => el['vk-dropzone'].classList.remove('is-drag'));
  el['vk-dropzone'].addEventListener('drop', (e) => {
    e.preventDefault();
    el['vk-dropzone'].classList.remove('is-drag');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  el['vk-file-input'].addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  });

  function handleFile(file) {
    hideError();
    state.file = file;
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = URL.createObjectURL(file);

    el['vk-file-name'].textContent = file.name;
    el['vk-file-duration'].textContent = '';
    el['vk-file-info'].classList.remove('hidden');
    el['vk-analyze-btn'].disabled = false;

    el['vk-video'].src = state.objectUrl;
    el['vk-video'].addEventListener('loadedmetadata', function onMeta() {
      state.duration = el['vk-video'].duration || 0;
      el['vk-file-duration'].textContent = '（' + formatTime(state.duration) + '）';
      el['vk-video'].removeEventListener('loadedmetadata', onMeta);
    });

    el['vk-player-card'].classList.remove('hidden');
    el['vk-result-card'].classList.add('hidden');
  }

  // ===================== 詳細設定 =====================
  el['vk-adv-toggle'].addEventListener('click', () => {
    const opening = el['vk-adv-panel'].classList.contains('hidden');
    el['vk-adv-panel'].classList.toggle('hidden');
    el['vk-adv-toggle'].textContent = (opening ? '▼' : '▶') + ' 詳細設定（検出感度・音域など）';
    el['vk-adv-toggle'].setAttribute('aria-expanded', String(opening));
  });
  el['vk-clarity'].addEventListener('input', () => { el['vk-clarity-val'].textContent = Number(el['vk-clarity'].value).toFixed(2); });
  el['vk-rms'].addEventListener('input', () => { el['vk-rms-val'].textContent = Number(el['vk-rms'].value).toFixed(3); });
  el['vk-mindur'].addEventListener('input', () => { el['vk-mindur-val'].textContent = el['vk-mindur'].value; });

  // ===================== 解析 =====================
  el['vk-analyze-btn'].addEventListener('click', runAnalysis);
  el['vk-reset-btn'].addEventListener('click', resetAnalysis);

  function resetAnalysis() {
    state.segments = [];
    el['vk-result-card'].classList.add('hidden');
    el['vk-reset-btn'].classList.add('hidden');
    el['vk-analyze-btn'].disabled = false;
    el['vk-analyze-btn'].textContent = '解析を開始';
    hideError();
  }

  function showError(msg) {
    el['vk-error'].textContent = msg;
    el['vk-error'].classList.remove('hidden');
  }
  function hideError() { el['vk-error'].classList.add('hidden'); }

  function setProgress(ratio, label) {
    el['vk-progress-wrap'].classList.remove('hidden');
    el['vk-progress-fill'].style.width = Math.round(ratio * 100) + '%';
    el['vk-progress-label'].textContent = label;
  }

  async function decodeAndResample(file, targetRate) {
    const arrayBuffer = await file.arrayBuffer();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();
    let decoded;
    try {
      decoded = await audioCtx.decodeAudioData(arrayBuffer);
    } finally {
      audioCtx.close();
    }

    const offlineLength = Math.max(1, Math.ceil(decoded.duration * targetRate));
    const offline = new OfflineAudioContext(1, offlineLength, targetRate);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start(0);
    const rendered = await offline.startRendering();

    return { samples: rendered.getChannelData(0), sampleRate: targetRate, duration: decoded.duration };
  }

  async function runAnalysis() {
    if (!state.file) return;
    hideError();
    el['vk-analyze-btn'].disabled = true;
    el['vk-analyze-btn'].textContent = '解析中...';
    setProgress(0, 'ファイルを読み込み中...');

    const TARGET_RATE = 16000;

    let decodedResult;
    try {
      decodedResult = await decodeAndResample(state.file, TARGET_RATE);
    } catch (err) {
      console.error(err);
      showError('この動画/音声ファイルを解析できませんでした。ブラウザがコーデックに対応していない可能性があります。Google ChromeやMicrosoft Edgeなどの最新ブラウザでお試しいただくか、MP3/WAV形式に変換してから再度アップロードしてください。');
      el['vk-analyze-btn'].disabled = false;
      el['vk-analyze-btn'].textContent = '解析を開始';
      el['vk-progress-wrap'].classList.add('hidden');
      return;
    }

    setProgress(0.05, 'ピッチを検出中... 0%');

    const params = {
      windowSize: 1024,
      hopSize: 512,
      minFreq: Number(el['vk-minfreq'].value) || 65,
      maxFreq: Number(el['vk-maxfreq'].value) || 1400,
      clarityThreshold: Number(el['vk-clarity'].value) || 0.5,
      rmsThreshold: Number(el['vk-rms'].value),
      minNoteDuration: (Number(el['vk-mindur'].value) || 80) / 1000,
      medianWindow: 5,
    };

    if (state.worker) state.worker.terminate();
    const worker = new Worker('assets/js/vocalkey-worker.js');
    state.worker = worker;

    const samples = decodedResult.samples;

    worker.onmessage = (e) => {
      const data = e.data;
      if (data.type === 'progress') {
        setProgress(0.05 + data.ratio * 0.95, 'ピッチを検出中... ' + Math.round(data.ratio * 100) + '%');
      } else if (data.type === 'done') {
        setProgress(1, '完了');
        state.segments = data.segments;
        renderResults();
        el['vk-progress-wrap'].classList.add('hidden');
        el['vk-analyze-btn'].disabled = false;
        el['vk-analyze-btn'].textContent = '再解析する';
        el['vk-reset-btn'].classList.remove('hidden');
        worker.terminate();
        state.worker = null;
      } else if (data.type === 'error') {
        showError('解析中にエラーが発生しました: ' + data.message);
        el['vk-analyze-btn'].disabled = false;
        el['vk-analyze-btn'].textContent = '解析を開始';
        el['vk-progress-wrap'].classList.add('hidden');
      }
    };
    worker.onerror = (err) => {
      console.error(err);
      showError('解析中にエラーが発生しました。ページを再読み込みして再度お試しください。');
      el['vk-analyze-btn'].disabled = false;
      el['vk-analyze-btn'].textContent = '解析を開始';
      el['vk-progress-wrap'].classList.add('hidden');
    };

    worker.postMessage(
      { samples, sampleRate: decodedResult.sampleRate, params },
      [samples.buffer]
    );
  }

  // ===================== 結果表示 =====================
  function renderResults() {
    el['vk-result-card'].classList.remove('hidden');
    renderTable();
    drawGraph();
  }

  function renderTable() {
    const tbody = el['vk-table-body'];
    tbody.innerHTML = '';
    if (state.segments.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.textContent = '検出できるノートがありませんでした。詳細設定で感度や音量ゲートを下げてみてください。';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    state.segments.forEach((seg, i) => {
      const tr = document.createElement('tr');
      tr.dataset.index = String(i);
      tr.innerHTML =
        '<td>' + formatTime(seg.start) + '</td>' +
        '<td>' + formatTime(seg.end) + '</td>' +
        '<td class="vk-note-tag">' + noteNameFromMidi(seg.midi) + '</td>' +
        '<td>' + seg.freq.toFixed(1) + ' Hz</td>';
      tr.addEventListener('click', () => seekTo(seg.start));
      tbody.appendChild(tr);
    });
  }

  function seekTo(t) {
    el['vk-video'].currentTime = t;
    el['vk-video'].play().catch(() => {});
  }

  // ===================== グラフ描画 =====================
  function drawGraph() {
    const canvas = el['vk-graph'];
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (state.segments.length === 0 || state.duration <= 0) {
      ctx.fillStyle = COLORS.muted();
      ctx.font = '14px sans-serif';
      ctx.fillText('検出結果がありません', 20, H / 2);
      return;
    }

    const leftMargin = 64, rightMargin = 12, topMargin = 10, bottomMargin = 10;
    const graphW = W - leftMargin - rightMargin;
    const graphH = H - topMargin - bottomMargin;

    let midiMin = Infinity, midiMax = -Infinity;
    state.segments.forEach(s => { if (s.midi < midiMin) midiMin = s.midi; if (s.midi > midiMax) midiMax = s.midi; });
    midiMin -= 1.5; midiMax += 1.5;
    if (midiMax - midiMin < 6) { const c = (midiMax + midiMin) / 2; midiMin = c - 3; midiMax = c + 3; }

    const timeToX = (t) => leftMargin + (t / state.duration) * graphW;
    const midiToY = (m) => topMargin + ((midiMax - m) / (midiMax - midiMin)) * graphH;

    // グリッド（オクターブ境界=C音ごと）
    ctx.strokeStyle = COLORS.border();
    ctx.fillStyle = COLORS.muted();
    ctx.font = '11px sans-serif';
    ctx.lineWidth = 1;
    for (let m = Math.ceil(midiMin / 12) * 12; m <= midiMax; m += 12) {
      const y = midiToY(m);
      ctx.beginPath();
      ctx.moveTo(leftMargin, y);
      ctx.lineTo(W - rightMargin, y);
      ctx.stroke();
      ctx.fillText(octaveLabel(Math.floor(m / 12) - 1) + 'C', 4, y + 4);
    }

    // ノートバー
    state.segments.forEach(seg => {
      const x1 = timeToX(seg.start);
      const x2 = Math.max(x1 + 2, timeToX(seg.end));
      const y = midiToY(seg.midi);
      ctx.fillStyle = COLORS.accent();
      ctx.fillRect(x1, y - 3, x2 - x1, 6);
    });

    // 現在再生位置
    const t = el['vk-video'].currentTime || 0;
    const cx = timeToX(t);
    ctx.strokeStyle = COLORS.gold();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, topMargin);
    ctx.lineTo(cx, topMargin + graphH);
    ctx.stroke();

    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const ratio = (x - leftMargin) / graphW;
      if (ratio < 0 || ratio > 1) return;
      seekTo(ratio * state.duration);
    };
  }

  // ===================== 再生同期 =====================
  function findCurrentSegment(t) {
    // segments は開始時刻順に並んでいる前提の線形探索（数千件程度なら十分高速）
    for (let i = 0; i < state.segments.length; i++) {
      const s = state.segments[i];
      if (t >= s.start && t < s.end) return i;
    }
    return -1;
  }

  let lastHighlighted = -1;
  el['vk-video'].addEventListener('timeupdate', () => {
    const t = el['vk-video'].currentTime;
    const idx = findCurrentSegment(t);

    if (idx >= 0) {
      const seg = state.segments[idx];
      el['vk-now-value'].textContent = noteNameFromMidi(seg.midi);
      el['vk-now-freq'].textContent = seg.freq.toFixed(1) + ' Hz';
    } else {
      el['vk-now-value'].textContent = '--';
      el['vk-now-freq'].textContent = state.segments.length ? '(無音 / 未検出)' : '再生すると表示されます';
    }

    if (idx !== lastHighlighted) {
      const rows = el['vk-table-body'].querySelectorAll('tr');
      rows.forEach(r => r.classList.remove('is-current'));
      if (idx >= 0 && rows[idx]) {
        rows[idx].classList.add('is-current');
        rows[idx].scrollIntoView({ block: 'nearest' });
      }
      lastHighlighted = idx;
    }

    if (!el['vk-result-card'].classList.contains('hidden')) drawGraph();
  });

  // ===================== コピー / ダウンロード =====================
  function buildExportText() {
    if (state.segments.length === 0) return '';
    return state.segments
      .map(s => formatTime(s.start) + ' - ' + formatTime(s.end) + '\t' + noteNameFromMidi(s.midi) + '\t' + s.freq.toFixed(1) + 'Hz')
      .join('\n');
  }

  el['vk-copy-btn'].addEventListener('click', async () => {
    const text = buildExportText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const orig = el['vk-copy-btn'].textContent;
      el['vk-copy-btn'].textContent = 'コピーしました';
      setTimeout(() => { el['vk-copy-btn'].textContent = orig; }, 1500);
    } catch (err) {
      showError('クリップボードへのコピーに失敗しました。');
    }
  });

  el['vk-download-btn'].addEventListener('click', () => {
    const text = buildExportText();
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (state.file ? state.file.name.replace(/\.[^.]+$/, '') : 'vocalkey') + '_key.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

})();
