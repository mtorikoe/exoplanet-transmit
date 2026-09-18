/* ============================================================
   starfield.js — background starfield and interactive game stars
   Depends on: S (game state), W, H (canvas dimensions)
   ============================================================ */

// ── Background starfield (tiny faint dots) ────────────────
function drawStarfield() {
  const ctx = sfCvs.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 300; i++) {
    const x  = Math.random() * W;
    const y  = Math.random() * H;
    const r  = Math.random() * .75 + .1;
    const op = Math.random() * .3  + .04;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,220,255,${op})`;
    ctx.fill();
  }
}

// ── Game stars (clickable targets) ───────────────────────
function generateStars() {
  const n = 7 + Math.floor(Math.random() * 4);
  const arr = [];
  for (let i = 0; i < n; i++) {
    let x, y, ok, t = 0;
    do {
      x  = 80 + Math.random() * (W - 160);
      y  = 60 + Math.random() * (H - 120);
      ok = arr.every(s => Math.hypot(s.x - x, s.y - y) > 90);
      t++;
    } while (!ok && t < 60);
    const br  = .45 + Math.random() * .55;
    const tp  = Math.random();
    const col = tp < .3 ? '#bcd2ff' : tp < .7 ? '#fff5d0' : '#ffd0a0';
    arr.push({ x, y, brightness: br, baseColor: col, phi: Math.random() * Math.PI * 2 });
  }
  return arr;
}

// ── Returns index of star nearest to (cx, cy), or -1 ────
function starAt(cx, cy) {
  let best = -1, bd = 46;
  S.stars.forEach((s, i) => {
    const d = Math.hypot(s.x - cx, s.y - cy);
    if (d < bd) { best = i; bd = d; }
  });
  return best;
}

// ── Render loop for the telescope canvas ─────────────────
let frame = 0;
function render() {
  if (S.phase === 'attract') { requestAnimationFrame(render); return; }
  frame++;
  const ctx = mainCvs.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  S.stars.forEach((s, i) => {
    const fl  = Math.sin(frame * .04 + s.phi) * .055;
    const rad = (8 + s.brightness * 12) * (1 + fl * .08);
    const al  = .7 + s.brightness * .3 + fl * .07;

    // glow halo
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad * 3.2);
    g.addColorStop(0, s.baseColor + 'bb');
    g.addColorStop(1, s.baseColor + '00');
    ctx.beginPath(); ctx.arc(s.x, s.y, rad * 3.2, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();

    // core
    ctx.beginPath(); ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
    ctx.fillStyle = s.baseColor; ctx.globalAlpha = al; ctx.fill(); ctx.globalAlpha = 1;

    // selection ring
    if (i === S.selectedIdx) {
      ctx.beginPath(); ctx.arc(s.x, s.y, rad + 11, 0, Math.PI * 2);
      ctx.strokeStyle = '#7ecfed'; ctx.lineWidth = 1.5; ctx.stroke();
      for (let t = 0; t < 4; t++) {
        const a = (t / 4) * Math.PI * 2 + frame * .006;
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(a) * (rad + 15), s.y + Math.sin(a) * (rad + 15));
        ctx.lineTo(s.x + Math.cos(a) * (rad + 22), s.y + Math.sin(a) * (rad + 22));
        ctx.stroke();
      }
    }

    // discovery glow (only after correct detection)
    if (S.planetDiscovered && i === S.targetIdx) {
      const pr = rad + 22 + Math.sin(frame * .07) * 5;
      ctx.beginPath(); ctx.arc(s.x, s.y, pr, 0, Math.PI * 2);
      ctx.strokeStyle = '#7ecfed88'; ctx.lineWidth = 2; ctx.stroke();
    }

    // hint pulse
    if (S.hintUsed && i === S.targetIdx && S.phase === 'pick') {
      const pct = (Math.sin(frame * .07) + 1) * .5;
      ctx.globalAlpha = .4 + pct * .45;
      ctx.beginPath(); ctx.arc(s.x, s.y, rad + 28 + pct * 7, 0, Math.PI * 2);
      ctx.strokeStyle = '#f0c060'; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });

  requestAnimationFrame(render);
}