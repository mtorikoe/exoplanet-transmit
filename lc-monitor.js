/* ============================================================
   lc-monitor.js — four-channel light curve monitor
   Builds the LC DOM stack, handles hover/drag interaction,
   and runs the render loop for all four canvases.
   Depends on: S, WL
   ============================================================ */

const lcCvsList = [];

// ── Build the four LC cells in the DOM ───────────────────
function buildLCStack() {
  const stack = document.getElementById('lc-stack');
  stack.innerHTML = '';
  lcCvsList.length = 0;

  WL.forEach((w, i) => {
    const cell = document.createElement('div');
    cell.className = 'lc-cell';
    cell.id = `lc-cell-${i}`;

    const lbl = document.createElement('div');
    lbl.className = 'lc-cell-label';
    lbl.textContent = w.name;
    cell.appendChild(lbl);

    const note = document.createElement('div');
    note.className = 'lc-cell-note';
    note.textContent = w.range;
    cell.appendChild(note);

    const cvs = document.createElement('canvas');
    cell.appendChild(cvs);
    lcCvsList.push(cvs);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = `lc-svg-${i}`;
    cell.appendChild(svg);

    stack.appendChild(cell);
  });

  attachLCHoverListeners();
}

// ── Light curve data generation ───────────────────────────
function makeLCData(hasTransit, dipDepth, tc, tw) {
  const pts = 120, data = [];
  for (let i = 0; i < pts; i++) {
    const t = i / pts;
    let v = 1 + (Math.random() - .5) * .009;
    if (hasTransit) {
      const dt = (t - tc) / tw;
      v -= (1 - dipDepth) * Math.max(0, 1 - dt * dt * 1.1);
    }
    data.push(Math.min(1.04, Math.max(.82, v)));
  }
  return data;
}

function generateAllLC(hasTransit) {
  S.transitCenter = S.fieldTransitCenter;
  S.transitWidth  = S.fieldTransitWidth;
  S.lcData = WL.map(w => makeLCData(hasTransit, w.dip, S.transitCenter, S.transitWidth));
}

// ── Hover / click / drag listeners ───────────────────────
function attachLCHoverListeners() {
  const stack = document.getElementById('lc-stack');

  function fracFromX(e) {
    const cell = document.getElementById('lc-cell-0');
    if (!cell) return -1;
    const r  = cell.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (cx - r.left) / r.width));
  }

  stack.addEventListener('mousemove', e => {
    if (S.phase !== 'judge') return;
    S.hoverFrac = fracFromX(e);
  });
  stack.addEventListener('mouseleave', () => { S.hoverFrac = -1; });

  // single click → centre a window
  stack.addEventListener('click', e => {
    if (S.phase !== 'judge') return;
    if (S.dragging) return;
    const f = fracFromX(e), half = 0.10;
    S.dragStart = Math.max(0, f - half);
    S.dragEnd   = Math.min(1, f + half);
    activateConfirm();
  });

  // drag → custom range
  stack.addEventListener('mousedown', e => {
    if (S.phase !== 'judge') return;
    S.dragStart = fracFromX(e); S.dragEnd = S.dragStart;
    S.dragging = true; S.confirmed = false;
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if (!S.dragging || S.phase !== 'judge') return;
    S.dragEnd = fracFromX(e);
  });
  window.addEventListener('mouseup', e => {
    if (!S.dragging || S.phase !== 'judge') return;
    S.dragEnd = fracFromX(e); S.dragging = false;
    const span = Math.abs(S.dragEnd - S.dragStart);
    if (span <= 0.02) {
      const f = (S.dragStart + S.dragEnd) / 2, half = 0.10;
      S.dragStart = Math.max(0, f - half); S.dragEnd = Math.min(1, f + half);
    }
    activateConfirm();
  });

  // touch
  stack.addEventListener('touchstart', e => {
    if (S.phase !== 'judge') return;
    S.dragStart = fracFromX(e); S.dragEnd = S.dragStart;
    S.dragging = true; S.confirmed = false;
  }, { passive: true });
  stack.addEventListener('touchmove', e => {
    if (!S.dragging || S.phase !== 'judge') return;
    S.dragEnd = fracFromX(e);
  }, { passive: true });
  stack.addEventListener('touchend', e => {
    if (!S.dragging || S.phase !== 'judge') return;
    S.dragging = false;
    const span = Math.abs(S.dragEnd - S.dragStart);
    if (span <= 0.02) {
      const f = (S.dragStart + S.dragEnd) / 2, half = 0.10;
      S.dragStart = Math.max(0, f - half); S.dragEnd = Math.min(1, f + half);
    }
    activateConfirm();
  }, { passive: true });
}

function activateConfirm() {
  const fb = document.getElementById('flat-btn');
  fb.style.display = 'block';
  fb.textContent   = 'Confirm — this region shows the anomaly';
  fb.onclick       = () => playerConfirm();
}

// ── Render loop — all four canvases ──────────────────────
function renderAllLC() {
  if (S.phase === 'scan' && S.lcAnimT < 119) {
    S.lcAnimT += .85;
    if (S.lcAnimT >= 119) {
      S.lcAnimT = 119;
      if (!S.lcDone) { S.lcDone = true; onScanComplete(); }
    }
  }
  const scanIdx = Math.floor(S.lcAnimT);

  WL.forEach((w, i) => {
    const cvs = lcCvsList[i];
    if (!cvs) return;
    const cw  = cvs.width  = cvs.offsetWidth  || 280;
    const ch  = cvs.height = cvs.offsetHeight || 52;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);

    if (!S.lcData[i]) {
      ctx.fillStyle = '#1a4452'; ctx.font = '9px Times New Roman';
      ctx.fillText('awaiting selection…', 6, ch / 2 + 4);
      return;
    }

    const pts = S.lcData[i].length;

    // grid lines
    ctx.strokeStyle = '#1a4452'; ctx.lineWidth = .5;
    [.25, .5, .75].forEach(f => {
      const y = 5 + f * (ch - 10);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    });

    // curve
    const lim = (S.phase === 'pick') ? 0 : Math.min(scanIdx, pts - 1);
    if (lim > 0) {
      ctx.beginPath(); ctx.strokeStyle = w.color; ctx.lineWidth = 1.5;
      for (let k = 0; k <= lim; k++) {
        const x = (k / pts) * cw;
        const v = S.lcData[i][k];
        const y = 5 + (1 - (v - .82) / .26) * (ch - 10);
        k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.lineTo((lim / pts) * cw, ch - 2); ctx.lineTo(0, ch - 2); ctx.closePath();
      ctx.fillStyle = w.color + '14'; ctx.fill();
    }

    // scan cursor
    if (S.phase === 'scan' && !S.lcDone) {
      const sx = (scanIdx / pts) * cw;
      ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, ch); ctx.stroke();
    }

    // SVG overlays
    const svg = document.getElementById(`lc-svg-${i}`);
    if (!svg) return;
    svg.innerHTML = '';

    // hover line
    if (S.phase === 'judge' && S.hoverFrac >= 0 && !S.dragging) {
      const hx   = S.hoverFrac * cw;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', hx); line.setAttribute('y1', 0);
      line.setAttribute('x2', hx); line.setAttribute('y2', ch);
      line.setAttribute('stroke', 'rgba(126,207,237,0.4)');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-dasharray', '2,3');
      svg.appendChild(line);
    }

    // selection rect
    if (S.phase === 'judge' && S.dragStart >= 0 && Math.abs(S.dragEnd - S.dragStart) > .005) {
      const a    = Math.min(S.dragStart, S.dragEnd) * cw;
      const b    = Math.max(S.dragStart, S.dragEnd) * cw;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', a); rect.setAttribute('y', 3);
      rect.setAttribute('width', b - a); rect.setAttribute('height', ch - 6);
      rect.setAttribute('fill', 'rgba(240,192,96,0.10)');
      rect.setAttribute('stroke', '#f0c060');
      rect.setAttribute('stroke-width', '1.2');
      rect.setAttribute('stroke-dasharray', '3,3');
      svg.appendChild(rect);
      if (i === 0) {
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', (a + b) / 2); txt.setAttribute('y', 14);
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('fill', '#f0c060');
        txt.setAttribute('font-size', '8');
        txt.setAttribute('font-family', 'Times New Roman');
        txt.textContent = 'selection';
        svg.appendChild(txt);
      }
    }
  });

  requestAnimationFrame(renderAllLC);
}