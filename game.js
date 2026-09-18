/* ============================================================
   game.js — game state, phase control, player actions,
             attract screen, round management
   Depends on: WL, PLANETS, starfield.js, lc-monitor.js
   ============================================================ */

// ── Game state ────────────────────────────────────────────
let S = {
  phase: 'attract',
  stars: [], targetIdx: -1, selectedIdx: -1,
  hasTransit: false,
  lcData: [null, null, null, null],
  lcAnimT: 0, lcDone: false,
  fieldTransitCenter: 0, fieldTransitWidth: 0,
  transitCenter: 0, transitWidth: 0,
  hoverFrac: -1,
  dragStart: -1, dragEnd: -1, dragging: false,
  confirmed: false,
  score: 0, round: 1,
  hintUsed: false,
  planetFact: null,
  planetDiscovered: false,
};

// ── Canvas references ─────────────────────────────────────
const telPanel = document.getElementById('tel-panel');
const sfCvs    = document.getElementById('sfCvs');
const mainCvs  = document.getElementById('mainCvs');
const reticle  = document.getElementById('reticle');
let W, H;

function resize() {
  W = telPanel.offsetWidth; H = telPanel.offsetHeight;
  sfCvs.width = mainCvs.width = W;
  sfCvs.height = mainCvs.height = H;
}

// ── Phase bar ─────────────────────────────────────────────
function setPhase(ph) {
  S.phase = ph;
  const map = { pick: 0, scan: 1, judge: 2, result: 3 };
  const cur = map[ph] ?? -1;
  for (let i = 0; i < 5; i++) {
    const el = document.getElementById('ph' + i);
    el.className = 'phase-step' + (i < cur ? ' done' : i === cur ? ' active' : '');
  }
}

function onScanComplete() {
  setPhase('judge');
  for (let i = 0; i < 4; i++) {
    const c = document.getElementById(`lc-cell-${i}`);
    if (c) c.classList.add('judgeable');
  }
  document.getElementById('judge-prompt').textContent =
    'Hover to inspect, then click or drag to mark the anomalous region.';
  document.getElementById('flat-btn').style.display = 'block';
  document.getElementById('flat-btn').textContent   = 'No anomaly — curves look flat';
  document.getElementById('flat-btn').onclick = () => playerFlat();
  document.getElementById('footer-instr').textContent =
    'Click or drag across the light curve monitors to mark the transit dip.';
  setStatus('', 'Mark the anomaly in the light curve monitor above.', '');
}

// ── Status box ────────────────────────────────────────────
function setStatus(cls, title, body) {
  const b = document.getElementById('status-box');
  b.className = cls;
  b.innerHTML = cls
    ? `<div style="font-weight:bold;color:${cls === 'success' ? 'var(--green)' : 'var(--red)'};margin-bottom:4px">${title}</div>`
    + `<div style="color:var(--muted);font-size:10px;line-height:1.6">${body}</div>`
    : `<div style="color:var(--muted);font-size:11px">${title}</div>`;
}

// ── Player actions ────────────────────────────────────────
function playerFlat() {
  document.getElementById('flat-btn').style.display = 'none';
  document.getElementById('judge-prompt').textContent = '';
  S.dragStart = -1; S.dragEnd = -1;
  setPhase('result');
  if (S.hasTransit) {
    setStatus('miss', 'Transit missed',
      'This star does host a planet. The brightness dipped by '
      + ((1 - WL[2].dip) * 100).toFixed(1)
      + '% in infrared. Look for a small consistent dip across all four channels.');
    setTimeout(() => finishRound(false), 700);
  } else {
    S.score++;
    setStatus('success', 'Correct — no transit detected',
      'Good observation. This star shows flat, steady brightness in all channels.');
    setTimeout(() => finishRound(true, 'clean'), 700);
  }
}

function playerConfirm() {
  document.getElementById('flat-btn').style.display = 'none';
  document.getElementById('judge-prompt').textContent = '';
  setPhase('result');

  const a  = Math.min(S.dragStart, S.dragEnd);
  const b  = Math.max(S.dragStart, S.dragEnd);
  const tc = S.transitCenter, tw = S.transitWidth;

  if (S.hasTransit) {
    const overlap = a < (tc + tw * 2.0) && b > (tc - tw * 2.0);
    if (overlap) {
      S.score++; S.planetDiscovered = true;
      setStatus('success', 'Transit confirmed',
        'Well detected. The dip appears at the same position across all four channels, '
        + 'confirming a planetary transit rather than a stellar flare or noise.');
      setTimeout(() => finishRound(true, 'transit'), 800);
    } else {
      setStatus('miss', 'Wrong region',
        'There is a real transit in these curves, but your selection missed it. '
        + 'The dip is ' + (b < tc ? 'later (to the right)' : 'earlier (to the left)')
        + ' in the time series.');
      S.dragStart = -1; S.dragEnd = -1;
      setPhase('judge');
      for (let i = 0; i < 4; i++) {
        const c = document.getElementById(`lc-cell-${i}`);
        if (c) c.classList.add('judgeable');
      }
      document.getElementById('flat-btn').style.display = 'block';
      document.getElementById('flat-btn').textContent   = 'No anomaly — curves look flat';
      document.getElementById('flat-btn').onclick = () => playerFlat();
      document.getElementById('judge-prompt').textContent = 'Drag to try a different region.';
    }
  } else {
    setStatus('miss', 'No transit in these curves',
      'The variation you selected is photon noise — random fluctuations every detector sees. '
      + 'A real transit dips consistently across all four channels at the same time.');
    S.dragStart = -1; S.dragEnd = -1;
    setPhase('judge');
    for (let i = 0; i < 4; i++) {
      const c = document.getElementById(`lc-cell-${i}`);
      if (c) c.classList.add('judgeable');
    }
    document.getElementById('flat-btn').style.display = 'block';
    document.getElementById('flat-btn').textContent   = 'No anomaly — curves look flat';
    document.getElementById('flat-btn').onclick = () => playerFlat();
    document.getElementById('judge-prompt').textContent = 'Try marking a different region or choose another star.';
  }
}

// ── Round complete overlay ────────────────────────────────
function finishRound(correct, type) {
  if (correct && type === 'transit') {
    const p = S.planetFact;
    document.getElementById('pc-name').textContent = p.name;
    document.getElementById('pc-name').style.color = p.color;
    document.getElementById('pc-desc').textContent = p.desc;
    document.getElementById('planet-card').style.display = 'block';
    document.getElementById('ph4').className = 'phase-step active';
  }

  setTimeout(() => {
    const p = S.planetFact;
    document.getElementById('planet-ball').style.background =
      `radial-gradient(circle at 33% 33%,${p.color}cc,${p.color}22)`;
    document.getElementById('planet-ball').style.border = `2px solid ${p.color}55`;

    document.getElementById('rc-title').textContent =
      correct && type === 'transit' ? 'Exoplanet discovered' :
      correct ? 'Clean star confirmed' : 'Keep searching';
    document.getElementById('rc-msg').textContent =
      correct && type === 'transit'
      ? 'You detected the transit signal across all four wavelength channels.'
      : correct
      ? 'Good work. This star shows no transit in progress — its light curves are flat.'
      : 'Transit signals can be very subtle — less than 1% brightness change. Keep practicing.';

    document.getElementById('fact-card').innerHTML =
      `<b style="color:${p.color}">${p.name}</b><br>`
      + `<span style="font-size:10px">${p.desc}</span><br><br>`
      + WL.map(w =>
          `<span style="color:${w.color};font-size:9px">▪ ${w.name}</span> `
          + `<span style="font-size:9px;color:var(--muted)">dip: ${((1 - w.dip) * 100).toFixed(2)}% — ${w.note}</span>`
        ).join('<br>');

    const btn = document.getElementById('overlay-btn');
    btn.textContent = 'Continue exploring this field';
    btn.onclick = () => dismissOverlayAndResume();
    document.getElementById('round-overlay').style.display = 'flex';
  }, 1400);
}

// ── Dismiss overlay — stay on same field ─────────────────
function dismissOverlayAndResume() {
  document.getElementById('round-overlay').style.display = 'none';
  S.selectedIdx = -1;
  S.lcData = [null, null, null, null]; S.lcAnimT = 0; S.lcDone = false;
  S.dragStart = -1; S.dragEnd = -1; S.hoverFrac = -1;
  document.getElementById('judge-prompt').textContent = '';
  document.getElementById('flat-btn').style.display = 'none';
  for (let i = 0; i < 4; i++) {
    const c = document.getElementById(`lc-cell-${i}`);
    if (c) c.classList.remove('judgeable');
    const svg = document.getElementById(`lc-svg-${i}`);
    if (svg) svg.innerHTML = '';
  }
  setPhase('pick');
  setStatus('', 'Click any star in the field to scan it.', '');
  document.getElementById('footer-instr').textContent =
    'Same star field. Click any star to compare its light curves.';
}

// ── New star field ────────────────────────────────────────
function nextRound() {
  document.getElementById('round-overlay').style.display = 'none';
  S.round++; S.selectedIdx = -1; S.hintUsed = false;
  S.lcData = [null, null, null, null]; S.lcAnimT = 0; S.lcDone = false;
  S.dragStart = -1; S.dragEnd = -1; S.hoverFrac = -1;
  S.planetFact = PLANETS[Math.floor(Math.random() * PLANETS.length)];
  S.planetDiscovered = false;
  document.getElementById('planet-card').style.display = 'none';
  document.getElementById('judge-prompt').textContent = '';
  document.getElementById('flat-btn').style.display = 'none';
  for (let i = 0; i < 4; i++) {
    const c = document.getElementById(`lc-cell-${i}`);
    if (c) c.classList.remove('judgeable');
    const svg = document.getElementById(`lc-svg-${i}`);
    if (svg) svg.innerHTML = '';
  }
  resize(); drawStarfield();
  S.stars  = generateStars();
  S.targetIdx = Math.floor(Math.random() * S.stars.length);
  S.fieldTransitCenter = .28 + Math.random() * .44;
  S.fieldTransitWidth  = .048 + Math.random() * .038;
  setPhase('pick');
  setStatus('', 'Click a star in the field to begin scanning.', '');
  document.getElementById('footer-instr').textContent =
    'New star field loaded. Click any star to lock on and scan its light curves.';
}

// ── Hint ──────────────────────────────────────────────────
function giveHint() {
  if (S.phase !== 'pick') return;
  S.hintUsed = true;
  const s = S.stars[S.targetIdx];
  setStatus('hint', 'Hint',
    `The planet-bearing star is in the ${s.y < H / 2 ? 'upper' : 'lower'}-${s.x < W / 2 ? 'left' : 'right'} quadrant of the field.`);
}

// ── Telescope mouse/touch events ─────────────────────────
telPanel.addEventListener('mousemove', e => {
  if (S.phase === 'attract') return;
  if (document.getElementById('round-overlay').style.display === 'flex') return;
  const r = telPanel.getBoundingClientRect();
  reticle.style.display = 'block';
  reticle.style.left = (e.clientX - r.left) + 'px';
  reticle.style.top  = (e.clientY - r.top)  + 'px';
});
telPanel.addEventListener('mouseleave', () => { reticle.style.display = 'none'; });

telPanel.addEventListener('click', e => {
  if (S.phase === 'attract') return;
  if (document.getElementById('round-overlay').style.display === 'flex') return;
  const r   = telPanel.getBoundingClientRect();
  const idx = starAt(e.clientX - r.left, e.clientY - r.top);
  if (idx === -1) return;
  reticle.style.display = 'none';
  S.selectedIdx = idx;
  S.hasTransit  = (idx === S.targetIdx);
  generateAllLC(S.hasTransit);
  S.lcAnimT = 0; S.lcDone = false;
  S.dragStart = -1; S.dragEnd = -1; S.hoverFrac = -1;
  document.getElementById('judge-prompt').textContent = '';
  document.getElementById('flat-btn').style.display = 'none';
  for (let i = 0; i < 4; i++) {
    const c = document.getElementById(`lc-cell-${i}`);
    if (c) c.classList.remove('judgeable');
    const svg = document.getElementById(`lc-svg-${i}`);
    if (svg) svg.innerHTML = '';
  }
  setPhase('scan');
  setStatus('', 'Scanning light curves across all four filters…', '');
  document.getElementById('footer-instr').textContent =
    'Four channels scanning simultaneously. Watch for a consistent dip across all wavelengths.';
});

telPanel.addEventListener('touchend', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  telPanel.dispatchEvent(new MouseEvent('click', { clientX: t.clientX, clientY: t.clientY }));
}, { passive: false });

// ── Attract screen animation ──────────────────────────────
const alc  = document.getElementById('attract-lc');
const actx = alc.getContext('2d');
let at = 0;

function animAttract() {
  const w = alc.width, h = alc.height;
  actx.fillStyle = '#071419'; actx.fillRect(0, 0, w, h);
  actx.beginPath(); actx.strokeStyle = '#7ecfed'; actx.lineWidth = 1.8;
  for (let i = 0; i <= 90; i++) {
    const x = (i / 90) * w, t = ((i / 90) + at * .0025) % 1;
    let y = .12; const c = .44, dw = .10;
    if (t > c - dw && t < c + dw) { const dt = (t - c) / dw; y += .58 * Math.max(0, 1 - dt * dt * 1.1); }
    const py = h - 6 - y * (h - 12);
    i === 0 ? actx.moveTo(x, py) : actx.lineTo(x, py);
  }
  actx.stroke();
  const fx = w * ((.44 - at * .0025 % 1 + 1) % 1);
  if (fx > 18 && fx < w - 18) {
    actx.fillStyle = '#f0c06033'; actx.fillRect(fx - 14, 3, 28, h - 8);
    actx.fillStyle = '#f0c060'; actx.font = '9px Times New Roman';
    actx.textAlign = 'center'; actx.fillText('transit dip', fx, 14); actx.textAlign = 'left';
  }
  actx.fillStyle = '#3a7088'; actx.font = '8px Times New Roman';
  actx.fillText('brightness vs time', 5, h - 3);
  at++;
  if (S.phase === 'attract') requestAnimationFrame(animAttract);
}
animAttract();

// ── Start game ────────────────────────────────────────────
function startGame() {
  document.getElementById('attract').style.display = 'none';
  S.planetFact = PLANETS[0];
  S.planetDiscovered = false;
  resize(); drawStarfield();
  S.stars  = generateStars();
  S.targetIdx = Math.floor(Math.random() * S.stars.length);
  S.fieldTransitCenter = .28 + Math.random() * .44;
  S.fieldTransitWidth  = .048 + Math.random() * .038;
  buildLCStack();
  setPhase('pick');
  render();
  renderAllLC();
}

document.getElementById('attract').addEventListener('click', startGame);
document.getElementById('attract').addEventListener('touchend', e => {
  e.preventDefault(); startGame();
}, { passive: false });
setTimeout(() => { if (S.phase === 'attract') startGame(); }, 20000);

// ── Idle reset (5 min) ────────────────────────────────────
let lastAct = Date.now();
['click', 'touchstart', 'mousemove'].forEach(ev =>
  document.addEventListener(ev, () => { lastAct = Date.now(); }));
setInterval(() => {
  if (Date.now() - lastAct > 300000 && S.phase !== 'attract') {
    S.phase = 'attract'; S.score = 0; S.round = 1;
    document.getElementById('attract').style.display = 'flex';
    document.getElementById('round-overlay').style.display = 'none';
    at = 0; animAttract();
  }
}, 15000);

window.addEventListener('resize', () => {
  if (S.phase !== 'attract') { resize(); drawStarfield(); }
});