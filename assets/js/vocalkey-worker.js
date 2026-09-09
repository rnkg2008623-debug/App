// ボーカルキー分析 - ピッチ検出ワーカー
// 正規化自己相関(NSDF風)によるピッチ検出をメインスレッドから切り離して実行する。

function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

function acfNormalized(buf, lag) {
  const n = buf.length;
  const m = n - lag;
  let sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < m; i++) {
    const x = buf[i], y = buf[i + lag];
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }
  const denom = Math.sqrt(sumX2 * sumY2);
  return denom > 0 ? sumXY / denom : 0;
}

function detectPitchFrame(buf, sampleRate, opts) {
  const { minFreq, maxFreq, clarityThreshold, rmsThreshold } = opts;
  const n = buf.length;

  let sumSq = 0;
  for (let i = 0; i < n; i++) sumSq += buf[i] * buf[i];
  const rms = Math.sqrt(sumSq / n);
  if (rms < rmsThreshold) return null;

  const minLag = Math.max(1, Math.floor(sampleRate / maxFreq));
  const maxLag = Math.min(n - 1, Math.ceil(sampleRate / minFreq));
  if (maxLag <= minLag) return null;

  const corr = new Float32Array(maxLag - minLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    corr[lag - minLag] = acfNormalized(buf, lag);
  }

  // 相関値が最大のlagではなく、最初に閾値を超える極大点(=基本周期)を採用する。
  // ピュアな音は倍周期(オクターブ下)の相関もほぼ1.0になりやすく、単純な最大値
  // 探索だとオクターブ違いの誤検出(サブハーモニック誤り)が起きやすいため。
  let bestIdx = -1;
  for (let i = 1; i < corr.length - 1; i++) {
    if (corr[i] >= clarityThreshold && corr[i] >= corr[i - 1] && corr[i] >= corr[i + 1]) {
      bestIdx = i;
      break;
    }
  }
  if (bestIdx < 0) {
    let maxVal = -Infinity;
    for (let i = 0; i < corr.length; i++) {
      if (corr[i] > maxVal) { maxVal = corr[i]; bestIdx = i; }
    }
    if (maxVal < clarityThreshold) return null;
  }

  let refinedLag = bestIdx + minLag;
  if (bestIdx > 0 && bestIdx < corr.length - 1) {
    const yMinus = corr[bestIdx - 1];
    const yZero = corr[bestIdx];
    const yPlus = corr[bestIdx + 1];
    const denom = yMinus - 2 * yZero + yPlus;
    if (Math.abs(denom) > 1e-9) {
      const d = 0.5 * (yMinus - yPlus) / denom;
      if (d > -1 && d < 1) refinedLag += d;
    }
  }

  const freq = sampleRate / refinedLag;
  return { freq, clarity: corr[bestIdx] };
}

function medianSmooth(midiValues, windowSize) {
  const half = Math.floor(windowSize / 2);
  const out = new Array(midiValues.length).fill(null);
  for (let i = 0; i < midiValues.length; i++) {
    if (midiValues[i] == null) continue;
    const vals = [];
    for (let j = Math.max(0, i - half); j <= Math.min(midiValues.length - 1, i + half); j++) {
      if (midiValues[j] != null) vals.push(midiValues[j]);
    }
    vals.sort((a, b) => a - b);
    out[i] = vals[Math.floor(vals.length / 2)];
  }
  return out;
}

function buildSegments(times, midiSmoothed, freqs, frameDur, minDuration) {
  const segments = [];
  let cur = null;
  for (let i = 0; i < midiSmoothed.length; i++) {
    const midi = midiSmoothed[i];
    const rounded = midi == null ? null : Math.round(midi);
    if (rounded == null) {
      if (cur) { segments.push(cur); cur = null; }
      continue;
    }
    if (cur && cur.midi === rounded) {
      cur.end = times[i] + frameDur;
      cur.freqSum += freqs[i];
      cur.count++;
    } else {
      if (cur) segments.push(cur);
      cur = { midi: rounded, start: times[i], end: times[i] + frameDur, freqSum: freqs[i], count: 1 };
    }
  }
  if (cur) segments.push(cur);

  return segments
    .filter(s => (s.end - s.start) >= minDuration)
    .map(s => ({ start: s.start, end: s.end, midi: s.midi, freq: s.freqSum / s.count }));
}

self.onmessage = function (e) {
  try {
    const { samples, sampleRate, params } = e.data;
    const { windowSize, hopSize, minFreq, maxFreq, clarityThreshold, rmsThreshold, minNoteDuration, medianWindow } = params;

    const totalFrames = Math.max(0, Math.floor((samples.length - windowSize) / hopSize) + 1);
    const times = new Array(totalFrames);
    const midiRaw = new Array(totalFrames).fill(null);
    const freqs = new Array(totalFrames).fill(0);

    let lastProgress = -1;
    for (let f = 0; f < totalFrames; f++) {
      const start = f * hopSize;
      const buf = samples.subarray(start, start + windowSize);
      const result = detectPitchFrame(buf, sampleRate, { minFreq, maxFreq, clarityThreshold, rmsThreshold });
      times[f] = start / sampleRate;
      if (result) {
        midiRaw[f] = freqToMidi(result.freq);
        freqs[f] = result.freq;
      }
      const progress = Math.floor((f / totalFrames) * 100);
      if (progress !== lastProgress && progress % 2 === 0) {
        lastProgress = progress;
        self.postMessage({ type: 'progress', ratio: f / totalFrames });
      }
    }

    const midiSmoothed = medianSmooth(midiRaw, medianWindow || 5);
    const frameDur = hopSize / sampleRate;
    const segments = buildSegments(times, midiSmoothed, freqs, frameDur, minNoteDuration);

    self.postMessage({ type: 'done', segments, totalFrames });
  } catch (err) {
    self.postMessage({ type: 'error', message: (err && err.message) || String(err) });
  }
};
