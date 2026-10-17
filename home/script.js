const logs = [
  ['Log data 001', '2025/10/08 12:34'],
  ['Log data 002', '2025/10/07 18:21'],
  ['Log data 003', '2025/10/06 09:15'],
  ['Log data 004', '2025/10/05 14:03'],
  ['Log data 005', '2025/10/04 20:11'],
  ['Log data 006', '2025/10/03 11:48'],
  ['Log data 007', '2025/10/02 16:20'],
];
const recent = [
  ['Log data 005', '2025/10/04 20:11'],
  ['Log data 004', '2025/10/05 14:03'],
  ['Log data 003', '2025/10/06 09:15'],
];
const friends = [
  { name: 'User001', state: 'online',  label: 'Online',  grad: 'linear-gradient(160deg,#cfe3f5,#7fa4c8 55%,#46607f)' },
  { name: 'User002', state: 'online',  label: 'Online',  grad: 'linear-gradient(160deg,#d8e3ea,#8a9aa6 55%,#4d5a60)' },
  { name: 'User003', state: 'offline', label: 'Offline', grad: 'linear-gradient(160deg,#b9d3ee,#5f86b3 55%,#33506f)' },
  { name: 'User004', state: 'busy',    label: 'Busy',    grad: 'linear-gradient(160deg,#c8dcea,#6d8fa6 55%,#3d5568)' },
];
const stats = [
  ['Mon', 47], ['Tue', 50], ['Wed', 68], ['Thu', 57], ['Fri', 70], ['Sat', 96], ['Sun', 88],
];

const docIcon = '<svg viewBox="0 0 24 24"><path d="M6 2.5h8l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V4A1.5 1.5 0 0 1 6 2.5z"/><path d="M14 2.5V8h5M8.5 13h7M8.5 16.5h7"/></svg>';
const logItem = ([n, d]) =>
  `<li>${docIcon}<div><div class="name">${n}</div><div class="date">${d}</div></div></li>`;

document.getElementById('log-list').innerHTML = logs.map(logItem).join('');
document.getElementById('recent-list').innerHTML = recent.map(logItem).join('');
document.getElementById('friend-list').innerHTML = friends.map(f =>
  `<li><span class="avatar" style="background:${f.grad}"></span>
   <div><div class="name">${f.name}</div>
   <div class="state"><span class="dot ${f.state}"></span>${f.label}</div></div></li>`).join('');

// chart: smooth line + area
(function drawChart() {
  const svg = document.getElementById('chart');
  const L = 28, R = 226, T = 8, B = 100;
  const x = i => L + 6 + i * (R - L - 8) / (stats.length - 1);
  const y = v => B - v / 100 * (B - T);
  const pts = stats.map(([, v], i) => [x(i), y(v)]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  let s = `<defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3b6fd8" stop-opacity=".28"/><stop offset="1" stop-color="#3b6fd8" stop-opacity=".03"/></linearGradient></defs>`;
  s += `<line x1="${L}" y1="${T - 2}" x2="${L}" y2="${B}" stroke="#c9cdd6" stroke-width=".6"/>`;
  [0, 50, 100].forEach(v => {
    s += `<text x="${L - 4}" y="${y(v) + 2.5}" text-anchor="end">${v}</text>`;
  });
  s += `<path d="${d} L${pts.at(-1)[0]},${B} L${pts[0][0]},${B} Z" fill="url(#ag)"/>`;
  s += `<path d="${d}" fill="none" stroke="#4a7be0" stroke-width="1.2"/>`;
  pts.forEach(([px, py], i) => {
    const hi = stats[i][1] === Math.max(...stats.map(a => a[1]));
    s += `<circle cx="${px}" cy="${py}" r="${hi ? 3 : 1.6}" fill="${hi ? '#fff' : '#4a7be0'}" stroke="#4a7be0" stroke-width="${hi ? 1.4 : 0}"/>`;
    s += `<text x="${px}" y="${B + 12}" text-anchor="middle">${stats[i][0]}</text>`;
  });
  svg.innerHTML = s;
})();

// nav: アクティブ切り替え
document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('is-active', b === btn));
  document.getElementById(btn.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}));
