// The Christmas card characters.
// Only public details live here: the card details are encrypted in locks.js.
import * as D from './draw.js';

const { INK } = D;

// Pose: { state: idle|run|jump|fall|glide|sprint|hurt, t: time, phase: run cycle, throwing }
// Drawn with the feet at (0, 0), facing right.

export function drawTim(ctx, p = {}) {
  const st = p.state || 'idle', t = p.t || 0;
  const run = st === 'run', air = st === 'jump' || st === 'fall', glide = st === 'glide';
  const ph = p.phase || 0;
  const bob = run ? -Math.abs(Math.sin(ph)) * 2.5 : st === 'idle' ? Math.sin(t * 2.2) * 0.8 : 0;
  D.pen(ctx);

  // Legs and shoes
  const sw = run ? Math.sin(ph) * 7 : air ? 4 : glide ? 2 : 0;
  const lift = air || glide ? 3 : 0;
  D.line(ctx, -4, -15 + bob, -4 - sw, -4 - lift);
  D.line(ctx, 4, -15 + bob, 4 + sw, -4 - lift + (air ? 3 : 0));
  D.ellipse(ctx, -2 - sw, -3 - lift, 5.5, 3.2, { fill: INK });
  D.ellipse(ctx, 6 + sw, -3 - lift + (air ? 3 : 0), 5.5, 3.2, { fill: INK });

  // Arms
  const sh = -27 + bob;
  let lh = [-12, -16 + bob], rh = [12, -16 + bob];
  if (run) { lh = [-10 + Math.sin(ph) * 5, -15 + bob]; rh = [10 - Math.sin(ph) * 5, -15 + bob]; }
  if (air) { lh = [-14, -33]; rh = [14, -33]; }
  if (glide) { lh = [-15, -46]; rh = [15, -46]; }
  if (p.throwing) rh = [17, -30 + bob];
  D.line(ctx, -7, sh, lh[0], lh[1]);
  D.line(ctx, 7, sh, rh[0], rh[1]);

  // T-shirt
  D.poly(ctx, [[-8, -29 + bob], [8, -29 + bob], [9, -14 + bob], [-9, -14 + bob]], { fill: true });
  D.text(ctx, '2027', 0, -21 + bob, 7);

  // Hair: big bushy sides, wider when gliding
  const hy = -41 + bob;
  const side = glide ? 24 + Math.sin(t * 18) * 1.5 : 15;
  const bush = glide ? 11 : 8;
  D.ellipse(ctx, -side, hy + 1, bush, glide ? 9 : 11, { spike: 0.28, fill: true, amt: 0.6 });
  D.ellipse(ctx, side, hy + 1, bush, glide ? 9 : 11, { spike: 0.28, fill: true, amt: 0.6 });

  // Head
  D.circle(ctx, 0, hy, 12, { fill: true });
  // Top hair
  const top = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * (1.05 + (i / 12) * 0.9);
    const r = i % 2 ? 17 : 12.5;
    top.push([Math.cos(a) * r, hy + Math.sin(a) * r]);
  }
  D.poly(ctx, top, { close: false, amt: 0.5 });

  // Glasses, eyes, moustache, stubble
  D.circle(ctx, -4.6, hy - 1, 3.8, { amt: 0.3 });
  D.circle(ctx, 4.6, hy - 1, 3.8, { amt: 0.3 });
  D.line(ctx, -0.8, hy - 1, 0.8, hy - 1, 0.2);
  D.dot(ctx, -4.2, hy - 1, 1.2);
  D.dot(ctx, 5, hy - 1, 1.2);
  D.curve(ctx, [[-8, hy + 7.5], [-5, hy + 4.5], [0, hy + 5]], 0.3);
  D.curve(ctx, [[8, hy + 7.5], [5, hy + 4.5], [0, hy + 5]], 0.3);
  for (const [sx, sy] of [[-4, 9], [-1, 10], [2, 9.5], [5, 9], [0.5, 11.2]]) D.dot(ctx, sx, hy + sy, 0.8);

  // 2027 party sign above the hair
  const sy = hy - 21 + (run ? Math.sin(ph * 2) : 0);
  D.line(ctx, -5, hy - 13, -5, sy + 4, 0.4);
  D.line(ctx, 5, hy - 13, 5, sy + 4, 0.4);
  D.rect(ctx, -12, sy - 5, 24, 10, { fill: true, amt: 0.4 });
  D.text(ctx, '2027', 0, sy + 0.5, 8.5);
}

export function drawRex(ctx, p = {}) {
  const st = p.state || 'idle', t = p.t || 0;
  const run = st === 'run', air = st === 'jump' || st === 'fall', sprint = st === 'sprint';
  const ph = p.phase || 0;
  ctx.save();
  if (sprint) ctx.rotate(0.28);
  const bob = st === 'idle' ? Math.sin(t * 3) * 0.8 : 0;
  D.pen(ctx);

  // Roller skates: a gliding stride rather than steps
  const sw = run ? Math.sin(ph * 0.7) * 6 : air ? 3 : sprint ? 5 : 0;
  const feet = [[-5 - sw, air ? -3 : 0], [5 + sw, air ? -1 : 0]];
  D.line(ctx, -4, -14 + bob, feet[0][0], feet[0][1] - 9);
  D.line(ctx, 4, -14 + bob, feet[1][0], feet[1][1] - 9);
  for (const [fx, fy] of feet) {
    D.poly(ctx, [[fx - 4, fy - 11], [fx + 2, fy - 11], [fx + 3, fy - 7], [fx + 8, fy - 6], [fx + 8, fy - 4], [fx - 4, fy - 4]], { fill: true, amt: 0.4 });
    D.circle(ctx, fx - 2, fy - 2, 2.2, { fill: INK, amt: 0.2 });
    D.circle(ctx, fx + 5, fy - 2, 2.2, { fill: INK, amt: 0.2 });
  }

  // Shorts (scribbled in)
  D.poly(ctx, [[-9, -22 + bob], [9, -22 + bob], [10, -13 + bob], [1.5, -13 + bob], [0, -16 + bob], [-1.5, -13 + bob], [-10, -13 + bob]], { fill: 'rgba(29,79,184,0.82)' });

  // Arms: one holds a party popper up
  const sh = -31 + bob;
  let lh = [-13, -22 + bob], rh = [13, -40 + bob];
  if (run) lh = [-12 + Math.sin(ph) * 3, -21 + bob];
  if (air) { lh = [-15, -38]; rh = [14, -44]; }
  if (sprint) { lh = [-14, -24]; rh = [16, -26]; }
  D.line(ctx, -7, sh, lh[0], lh[1]);
  D.line(ctx, 7, sh, rh[0], rh[1]);
  D.poly(ctx, [[rh[0] - 2, rh[1] + 2], [rh[0] + 2, rh[1] + 2], [rh[0] + 4, rh[1] - 9], [rh[0] - 4, rh[1] - 9]], { fill: true, amt: 0.3 });
  if (st === 'idle' && Math.sin(t * 1.3) > 0.85) {
    for (let i = 0; i < 5; i++) D.line(ctx, rh[0] + (i - 2) * 3, rh[1] - 12, rh[0] + (i - 2) * 6, rh[1] - 20 - (i % 2) * 4, 0.6);
  }

  // Shirt and tie
  D.poly(ctx, [[-8, -34 + bob], [8, -34 + bob], [9, -22 + bob], [-9, -22 + bob]], { fill: true });
  D.line(ctx, -4, -34 + bob, 0, -30 + bob, 0.3);
  D.line(ctx, 4, -34 + bob, 0, -30 + bob, 0.3);
  D.poly(ctx, [[0, -32 + bob], [-2, -29 + bob], [0, -22.5 + bob], [2, -29 + bob]], { fill: INK, amt: 0.2 });

  // Head
  const hy = -46 + bob;
  D.ellipse(ctx, -11, hy - 3, 3, 5, { spike: 0.3, fill: INK, amt: 0.3 });
  D.ellipse(ctx, 11, hy - 3, 3, 5, { spike: 0.3, fill: INK, amt: 0.3 });
  D.circle(ctx, 0, hy, 12.5, { fill: true });
  // Big round eyes
  D.circle(ctx, -4.8, hy - 2, 3.8, { fill: true, amt: 0.3 });
  D.circle(ctx, 4.8, hy - 2, 3.8, { fill: true, amt: 0.3 });
  D.dot(ctx, -4.2, hy - 1.5, 1.6);
  D.dot(ctx, 5.4, hy - 1.5, 1.6);
  D.line(ctx, -8, hy - 7.5, -2, hy - 6.5, 0.3);
  D.line(ctx, 8, hy - 7.5, 2, hy - 6.5, 0.3);
  D.circle(ctx, 0, hy + 2, 1.6, { amt: 0.2 });
  // Toothy grimace
  D.ellipse(ctx, 0, hy + 7, 5.5, 3.4, { fill: true, amt: 0.3 });
  D.zigzag(ctx, -5, hy + 7, 5, hy + 7, 1.6, 6);

  // Top hat with 2027 on it, tilted a bit
  ctx.save();
  ctx.translate(0, hy - 10);
  ctx.rotate(-0.06 + (run ? Math.sin(ph) * 0.03 : 0));
  D.line(ctx, -15, 0, 15, 0);
  D.poly(ctx, [[-9, 0], [9, 0], [10, -25], [-8, -25]], { fill: true });
  D.line(ctx, -9, -4, 9, -4, 0.4);
  D.text(ctx, '20', 1, -18, 8);
  D.text(ctx, '27', 1, -10.5, 8);
  ctx.restore();

  ctx.restore();
}


// ---------- Batch 2 ----------

export function drawClive(ctx, p = {}) {
  const st = p.state || 'idle', t = p.t || 0, ph = p.phase || 0;
  const run = st === 'run', ski = st === 'ski';
  const bob = run ? -Math.abs(Math.sin(ph)) * 2 : st === 'idle' ? Math.sin(t * 3) * 0.6 : 0;
  D.pen(ctx);
  // legs and feet (or skis mid ski-jump)
  const sw = run ? Math.sin(ph) * 6 : 0;
  D.line(ctx, -5, -12 + bob, -5 - sw, -4);
  D.line(ctx, 5, -12 + bob, 5 + sw, -4);
  if (ski) {
    D.poly(ctx, [[-22, -1], [16, -4], [21, -9]], { close: false, amt: 0.4 });
    D.poly(ctx, [[-16, 3], [22, 0], [27, -5]], { close: false, amt: 0.4 });
    D.line(ctx, -14, -24 + bob, -24, 2, 0.4);
  } else {
    D.rect(ctx, -10 - sw, -5, 9, 5, { fill: INK, amt: 0.3 });
    D.rect(ctx, 1 + sw, -5, 9, 5, { fill: INK, amt: 0.3 });
  }
  // body with control panel
  D.rect(ctx, -11, -34 + bob, 22, 22, { fill: true });
  D.rect(ctx, -8, -31 + bob, 7, 6, { amt: 0.3 });
  D.circle(ctx, 4, -20 + bob, 3.6, { amt: 0.2 });
  D.line(ctx, 4, -23 + bob, 4, -17 + bob, 0.1);
  D.line(ctx, 1, -20 + bob, 7, -20 + bob, 0.1);
  D.line(ctx, -8, -17 + bob, -2, -17 + bob, 0.2);
  // segmented arms
  const seg = (x1, y1, x2, y2) => {
    D.line(ctx, x1, y1, x2, y2, 0.4);
    for (let i = 1; i < 3; i++) D.dot(ctx, x1 + ((x2 - x1) * i) / 3, y1 + ((y2 - y1) * i) / 3, 1.6);
  };
  seg(-11, -30 + bob, ski ? -14 : -18, ski ? -24 + bob : -20 + bob);
  if (p.throwing) {
    // horseshoe magnet held out front
    seg(11, -30 + bob, 20, -28 + bob);
    D.pen(ctx, D.RED, 2.6);
    D.arc(ctx, 25, -28 + bob, 5, 5, Math.PI * 0.5, Math.PI * 1.5, 0.2);
    D.line(ctx, 25, -33 + bob, 30, -33 + bob, 0.1);
    D.line(ctx, 25, -23 + bob, 30, -23 + bob, 0.1);
    D.pen(ctx);
  } else {
    // holding up a cheeky marg
    seg(11, -30 + bob, 18, -40 + bob);
    D.poly(ctx, [[13, -49 + bob], [24, -49 + bob], [18.5, -42 + bob]], { fill: 'rgba(160,220,120,0.55)', amt: 0.3 });
    D.line(ctx, 18.5, -42 + bob, 18.5, -37 + bob, 0.2);
    D.line(ctx, 15.5, -37 + bob, 21.5, -37 + bob, 0.2);
  }
  // head
  D.line(ctx, 0, -34 + bob, 0, -37 + bob, 0.2);
  const hy = -52 + bob;
  D.rect(ctx, -10, hy, 20, 15, { fill: true });
  D.rect(ctx, -7, hy + 3, 5, 5, { fill: INK, amt: 0.2 });
  D.poly(ctx, [[2, hy + 8], [8, hy + 8], [5, hy + 2.5]], { fill: INK, amt: 0.2 });
  D.rect(ctx, -6, hy + 10, 12, 3, { amt: 0.2 });
  for (let x = -3; x <= 3; x += 3) D.line(ctx, x, hy + 10, x, hy + 13, 0.1);
  // antennae and 2027 sign
  D.line(ctx, -5, hy, -7, hy - 8, 0.3);
  D.line(ctx, 5, hy, 7, hy - 8, 0.3);
  D.rect(ctx, -12, hy - 18, 24, 10, { fill: true, amt: 0.4 });
  D.text(ctx, '2027', 0, hy - 12.5, 8.5);
}

export function drawWatson(ctx, p = {}) {
  const st = p.state || 'idle', t = p.t || 0, ph = p.phase || 0;
  const run = st === 'run', air = st === 'jump' || st === 'fall', balloon = st === 'glide', charge = st === 'sprint';
  ctx.save();
  if (charge) ctx.rotate(0.3);
  const bob = run ? -Math.abs(Math.sin(ph)) * 2.5 : st === 'idle' ? Math.sin(t * 2.5) * 0.8 : 0;
  D.pen(ctx);
  // spring legs
  const sw = run ? Math.sin(ph) * 6 : air ? 3 : 0;
  D.zigzag(ctx, -4, -13 + bob, -4 - sw, -3, 2.6, 6);
  D.zigzag(ctx, 4, -13 + bob, 4 + sw, -3, 2.6, 6);
  D.ellipse(ctx, -5 - sw, -2.5, 4.5, 2.6, { fill: INK, amt: 0.2 });
  D.ellipse(ctx, 5 + sw, -2.5, 4.5, 2.6, { fill: INK, amt: 0.2 });
  // small body
  D.poly(ctx, [[-7, -28 + bob], [7, -28 + bob], [8, -13 + bob], [-8, -13 + bob]], { fill: true });
  D.text(ctx, '20', 0, -24 + bob, 6.5);
  D.text(ctx, '27', 0, -18 + bob, 6.5);
  D.line(ctx, 0, -28 + bob, 0, -31 + bob, 0.2);
  // the very wide head (a balloon when floating)
  const rx = balloon ? 23 : 28, ry = balloon ? 21 : 12;
  const hy = balloon ? -50 + Math.sin(t * 3) * 1.5 : -40 + bob;
  D.ellipse(ctx, 0, hy, rx, ry, { fill: true });
  if (balloon) {
    D.poly(ctx, [[-2, hy + ry], [2, hy + ry], [0, hy + ry + 3]], { fill: INK, amt: 0.2 });
    D.line(ctx, 0, hy + ry + 3, 0, -31, 0.6);
    D.arc(ctx, -10, hy - 8, 6, 6, Math.PI * 1.1, Math.PI * 1.5, 0.2);
  }
  D.ellipse(ctx, -9, hy - 3, 3, 4, { fill: true, amt: 0.2 });
  D.ellipse(ctx, 9, hy - 3, 3, 4, { fill: true, amt: 0.2 });
  D.dot(ctx, -8.4, hy - 2, 1.6);
  D.dot(ctx, 9.6, hy - 2, 1.6);
  D.line(ctx, -1.5, hy - 1, -1.5, hy + 2, 0.1);
  D.line(ctx, 1.5, hy - 1, 1.5, hy + 2, 0.1);
  D.arc(ctx, 0, hy + 1, rx * 0.68, ry * 0.55, Math.PI * 0.12, Math.PI * 0.88, 0.3);
  D.ellipse(ctx, rx * 0.5, hy + ry * 0.6, 3, 4, { fill: INK, amt: 0.2 });
  // bowler hat
  const brim = hy - ry + 1;
  D.line(ctx, -9, brim, 9, brim, 0.3);
  D.ellipse(ctx, 0, brim - 4, 6, 5, { fill: INK, amt: 0.3 });
  // coiled spring arms from the sides of the head
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const droop = balloon ? i * 4 : charge ? -i * 1.5 : run ? Math.sin(ph + i) * 1.5 : Math.sin(t * 3 + i) * 0.8;
      D.circle(ctx, s * (rx + 3 + i * 4.6), hy + 1 + droop, 2.6, { amt: 0.2 });
    }
  }
  ctx.restore();
}

export function drawRinky(ctx, p = {}) {
  const st = p.state || 'idle', t = p.t || 0, ph = p.phase || 0;
  const run = st === 'run', pounce = st === 'pounce';
  ctx.save();
  if (pounce) ctx.rotate(0.35);
  const bob = run ? -Math.abs(Math.sin(ph)) * 2 : st === 'idle' ? Math.sin(t * 2) * 0.6 : 0;
  D.pen(ctx);
  // spiky tail
  D.curve(ctx, [[-8, -20 + bob], [-24, -15 + bob], [-34, -6]], 0.4);
  D.curve(ctx, [[-8, -14 + bob], [-22, -11 + bob], [-34, -6]], 0.4);
  for (const [x, y] of [[-18, -17], [-26, -13]]) D.poly(ctx, [[x - 3, y + bob], [x, y - 6 + bob], [x + 3, y + bob]], { close: false, amt: 0.2 });
  // legs with three-toed feet
  const sw = run ? Math.sin(ph) * 6 : pounce ? 7 : 0;
  for (const [hx, f] of [[-3, -sw], [5, sw]]) {
    D.line(ctx, hx, -14 + bob, hx + f, -3, 0.4);
    for (const dx of [-3, 0, 3]) D.line(ctx, hx + f, -3, hx + f + dx + 2, 0, 0.1);
  }
  // body and back plates
  D.ellipse(ctx, 0, -24 + bob, 12, 13, { fill: true });
  D.text(ctx, '2027', 2, -22 + bob, 6);
  for (const [x, y] of [[-10, -31], [-12, -24], [-11, -17]]) {
    D.poly(ctx, [[x + 2, y - 3 + bob], [x - 6, y + bob], [x + 2, y + 3 + bob]], { fill: true, amt: 0.3 });
  }
  // little arms
  D.line(ctx, 8, -29 + bob, 15, pounce ? -30 : -25 + bob, 0.3);
  D.line(ctx, 15, pounce ? -30 : -25 + bob, 17, pounce ? -28 : -23 + bob, 0.1);
  // raptor head with toothy snout
  const hy = -44 + bob;
  D.poly(ctx, [[-5, hy - 8], [10, hy - 9], [21, hy - 4], [22, hy + 3], [8, hy + 9], [-4, hy + 6], [-7, hy]], { fill: true });
  D.dot(ctx, 7, hy - 3, 2);
  D.line(ctx, 3, hy - 7, 11, hy - 5.5, 0.2);
  D.line(ctx, 22, hy + 1, 8, hy + 3, 0.3);
  D.zigzag(ctx, 10, hy + 3.5, 20, hy + 2, 1.4, 5);
  D.dot(ctx, 19, hy - 3, 0.9);
  // party hat
  D.poly(ctx, [[-3, hy - 6], [6, hy - 7], [0, hy - 20]], { fill: 'rgba(224,122,208,0.5)', amt: 0.3 });
  D.line(ctx, -1, hy - 10, 4, hy - 11, 0.2);
  D.dot(ctx, 0, hy - 21, 2.2);
  // party blower, puffing now and then
  const puff = Math.max(0, Math.sin(t * 2));
  if (!pounce) {
    D.line(ctx, 21, hy + 2, 24 + puff * 7, hy + 2, 0.2);
    if (puff < 0.6) D.arc(ctx, 25, hy + 4.5, 2.5, 2.5, -Math.PI / 2, Math.PI, 0.1);
  }
  ctx.restore();
}

export function drawSatsuma(ctx, p = {}) {
  const st = p.state || 'idle', t = p.t || 0, ph = p.phase || 0;
  const run = st === 'run', air = st === 'jump' || st === 'fall';
  const bob = run ? -Math.abs(Math.sin(ph)) * 2 : st === 'idle' ? Math.sin(t * 2.4) * 0.7 : 0;
  D.pen(ctx);
  // talons
  const sw = run ? Math.sin(ph) * 5 : 0;
  for (const [hx, f] of [[-3, -sw], [4, sw]]) {
    D.line(ctx, hx, -12 + bob, hx + f, -3, 0.3);
    for (const dx of [-3, 0, 3]) D.line(ctx, hx + f, -3, hx + f + dx, 0, 0.1);
  }
  // back wing (flaps in the air)
  const flap = air ? Math.sin(t * 22) : 0;
  if (air) D.poly(ctx, [[-4, -30 + bob], [-26, -36 - flap * 14], [-12, -20 + bob]], { fill: true, amt: 0.4 });
  // body with feather chevrons
  D.ellipse(ctx, 0, -24 + bob, 11, 13, { fill: true });
  for (const y of [-22, -16]) D.poly(ctx, [[-4, y + bob], [0, y + 3 + bob], [4, y + bob]], { close: false, amt: 0.2 });
  if (!air) {
    D.ellipse(ctx, -4, -24 + bob, 6, 10, { amt: 0.3 });
    D.line(ctx, -6, -18 + bob, -9, -13 + bob, 0.2);
  } else {
    D.poly(ctx, [[2, -30 + bob], [22, -34 - flap * 12], [10, -21 + bob]], { fill: true, amt: 0.4 });
  }
  // harp, when playing it
  if (p.throwing) {
    D.poly(ctx, [[10, -18 + bob], [14, -44 + bob], [26, -34 + bob], [22, -18 + bob]], { fill: 'rgba(241,200,75,0.45)', amt: 0.3 });
    for (let i = 0; i < 3; i++) D.line(ctx, 14 + i * 3, -38 + bob + i * 2, 14 + i * 3, -19 + bob, 0.1);
  }
  // Tudor ruff
  D.ellipse(ctx, 1, -37 + bob, 11, 4, { spike: 0.4, fill: true, amt: 0.3 });
  // head and hooked beak
  const hy = -46 + bob;
  D.circle(ctx, 2, hy, 9, { fill: true });
  D.poly(ctx, [[9, hy - 2], [18, hy + 1], [14, hy + 5], [10, hy + 3]], { fill: 'rgba(241,160,60,0.9)', amt: 0.2 });
  D.dot(ctx, 6, hy - 2, 1.7);
  D.line(ctx, 3, hy - 5, 9, hy - 3.5, 0.2);
  // Robin Hood hat with a feather
  D.poly(ctx, [[-7, hy - 6], [11, hy - 7], [6, hy - 12], [-12, hy - 15]], { fill: 'rgba(76,175,106,0.55)', amt: 0.3 });
  D.text(ctx, '2027', 1, hy - 9, 5);
  D.pen(ctx, D.RED, 1.8);
  D.curve(ctx, [[-5, hy - 11], [-10, hy - 20], [-16, hy - 26]], 0.3);
  D.pen(ctx);
}

export function drawEdna(ctx, p = {}) {
  const st = p.state || 'idle', t = p.t || 0, ph = p.phase || 0;
  const run = st === 'run', air = st === 'jump' || st === 'fall';
  const bob = run ? -Math.abs(Math.sin(ph)) * 2.5 : st === 'idle' ? Math.sin(t * 2) * 0.7 : 0;
  D.pen(ctx);
  // stubby legs with clawed feet
  const sw = run ? Math.sin(ph) * 5 : air ? 3 : 0;
  for (const [hx, f] of [[-5, -sw], [5, sw]]) {
    D.line(ctx, hx, -12 + bob, hx + f, -4, 0.3);
    D.ellipse(ctx, hx + f, -3, 5, 3, { fill: INK, amt: 0.2 });
  }
  // body and belly
  D.ellipse(ctx, 0, -23 + bob, 13, 14, { fill: true });
  D.ellipse(ctx, 1, -21 + bob, 7, 9, { amt: 0.3 });
  // arms: paws up, or the audit stamp
  const claws = (x, y) => { for (const dx of [-2, 0, 2]) D.line(ctx, x + dx, y, x + dx * 1.5, y - 4, 0.1); };
  const wave = Math.sin(t * 4) * 3;
  D.line(ctx, -11, -30 + bob, -18, -41 + wave + bob, 0.4);
  claws(-18, -41 + wave + bob);
  if (p.throwing) {
    D.line(ctx, 11, -30 + bob, 22, -26 + bob, 0.4);
    D.circle(ctx, 24, -38 + bob, 4, { fill: true, amt: 0.2 });
    D.line(ctx, 24, -34 + bob, 24, -26 + bob, 0.2);
    D.rect(ctx, 16, -26 + bob, 16, 7, { fill: 'rgba(200,50,60,0.75)', amt: 0.3 });
  } else {
    D.line(ctx, 11, -30 + bob, 18, -41 - wave + bob, 0.4);
    claws(18, -41 - wave + bob);
  }
  // 2027 scarf
  D.rect(ctx, -11, -38 + bob, 22, 6, { fill: true, amt: 0.3 });
  D.text(ctx, '2027', 0, -35 + bob, 5.5);
  D.line(ctx, -8, -32 + bob, -10, -24 + bob, 0.2);
  // head with a curly mane
  const hy = -48 + bob;
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * (0.85 + (i / 10) * 1.3);
    D.circle(ctx, Math.cos(a) * 12, hy + Math.sin(a) * 12, 3.4, { fill: true, amt: 0.2 });
  }
  D.circle(ctx, -8, hy - 9, 3.4, { fill: true, amt: 0.2 });
  D.circle(ctx, 8, hy - 9, 3.4, { fill: true, amt: 0.2 });
  D.circle(ctx, 0, hy, 10, { fill: true });
  D.dot(ctx, -3, hy - 2, 1.5);
  D.dot(ctx, 4, hy - 2, 1.5);
  D.ellipse(ctx, 1, hy + 3.5, 5, 3.5, { fill: true, amt: 0.2 });
  D.dot(ctx, 2, hy + 2.5, 1.8);
  D.arc(ctx, 1, hy + 4.5, 3, 2, 0.2, Math.PI - 0.2, 0.1);
}


// Blue Monday, reformed and playable: a walking calendar page
export function drawMonday(ctx, p = {}) {
  const st = p.state || 'idle', t = p.t || 0, ph = p.phase || 0;
  const run = st === 'run', air = st === 'jump' || st === 'fall';
  const bob = run ? -Math.abs(Math.sin(ph)) * 2 : st === 'idle' ? Math.sin(t * 2.2) * 0.6 : 0;
  D.pen(ctx);
  const sw = run ? Math.sin(ph) * 6 : air ? 3 : 0;
  D.line(ctx, -6, -12 + bob, -6 - sw, -4);
  D.line(ctx, 6, -12 + bob, 6 + sw, -4);
  D.ellipse(ctx, -5 - sw, -3, 5.5, 3, { fill: INK, amt: 0.2 });
  D.ellipse(ctx, 7 + sw, -3, 5.5, 3, { fill: INK, amt: 0.2 });
  // arms
  D.line(ctx, -15, -32 + bob, -21, run ? -22 + Math.sin(ph) * 3 : -22 + bob, 0.4);
  if (p.throwing) {
    D.line(ctx, 15, -32 + bob, 23, -42 + bob, 0.4);
    D.rect(ctx, 20, -54 + bob, 10, 13, { fill: true, amt: 0.3 });
    D.text(ctx, 'DUE', 25, -48 + bob, 4.5, { color: D.RED });
  } else {
    D.line(ctx, 15, -32 + bob, 21, air ? -40 : -22 + bob, 0.4);
  }
  // the calendar page
  D.rect(ctx, -15, -52 + bob, 30, 41, { fill: true });
  D.rect(ctx, -15, -52 + bob, 30, 9, { fill: 'rgba(43,72,150,0.9)', amt: 0.3 });
  D.text(ctx, 'MON', 0, -47.5 + bob, 6.5, { color: '#fff', sc: true });
  for (const x of [-9, 0, 9]) D.circle(ctx, x, -52 + bob, 1.6, { fill: true, amt: 0.1 });
  // a face that's still a bit grumpy, but trying
  D.line(ctx, -9, -40 + bob, -3, -38.5 + bob, 0.2);
  D.line(ctx, 9, -40 + bob, 3, -38.5 + bob, 0.2);
  D.dot(ctx, -6, -36 + bob, 1.4);
  D.dot(ctx, 6, -36 + bob, 1.4);
  D.line(ctx, -3, -32.5 + bob, 3, -33 + bob, 0.2);
  D.text(ctx, '18', 0, -23 + bob, 11);
  D.text(ctx, 'JAN', 0, -14.5 + bob, 4.5);
  // party hat: he's on our side now
  D.poly(ctx, [[2, -52 + bob], [10, -53 + bob], [8, -63 + bob]], { fill: 'rgba(241,200,75,0.6)', amt: 0.2 });
  D.dot(ctx, 8, -64 + bob, 1.8);
}


// Scales Merckx: a haddock in good knitwear, on cowboy-booted tail fins
export function drawScales(ctx, p = {}) {
  const st = p.state || 'idle', t = p.t || 0, ph = p.phase || 0;
  const run = st === 'run', dash = st === 'sprint';
  ctx.save();
  if (dash) { ctx.translate(0, -24); ctx.rotate(-Math.PI / 2 + 0.15); ctx.translate(0, 24); }
  const bob = run ? -Math.abs(Math.sin(ph)) * 2 : st === 'idle' ? Math.sin(t * 2.4) * 0.7 : 0;
  D.pen(ctx);
  // tail split into two legs in cowboy boots with spurs
  const sw = run ? Math.sin(ph) * 6 : 0;
  for (const [hx, f] of [[-4, -sw], [5, sw]]) {
    D.line(ctx, hx, -14 + bob, hx + f, -7, 0.3);
    D.poly(ctx, [[hx + f - 4, -9], [hx + f + 2, -9], [hx + f + 2, -4], [hx + f + 7, -3], [hx + f + 7, 0], [hx + f - 4, 0]], { fill: 'rgba(120,70,40,0.7)', amt: 0.3 });
    D.star(ctx, hx + f - 6, -2, 2.6, { amt: 0.1 });
  }
  // a proper fish tail out the back, flicking as he goes
  const flick = Math.sin(t * (run ? 14 : 4)) * 3;
  D.poly(ctx, [[-9, -24 + bob], [-22, -34 + bob + flick], [-19, -24 + bob], [-23, -14 + bob + flick]], { fill: 'rgba(29,79,184,0.55)', amt: 0.3 });
  D.line(ctx, -19, -30 + bob + flick * 0.6, -13, -25 + bob, 0.1);
  D.line(ctx, -19, -19 + bob + flick * 0.6, -13, -23 + bob, 0.1);
  // body in a cable-knit Arran jumper
  D.ellipse(ctx, 0, -27 + bob, 12, 15, { fill: 'rgba(240,230,205,0.95)' });
  D.pen(ctx, INK, 1.4);
  for (const cx of [-5, 5]) D.zigzag(ctx, cx, -38 + bob, cx, -16 + bob, 1.6, 6);
  D.line(ctx, -9, -18 + bob, 9, -18 + bob, 0.2);
  D.pen(ctx);
  // fins as arms; one holds the 2027 calendar
  if (!dash) {
    D.poly(ctx, [[10, -31 + bob], [20, -40 + bob], [18, -30 + bob]], { fill: true, amt: 0.2 });
    // a little 2027 calendar: binder rings, a red header and the year
    D.rect(ctx, 15, -58 + bob, 18, 18, { fill: true, amt: 0.3 });
    D.rect(ctx, 15, -58 + bob, 18, 5, { fill: 'rgba(200,50,60,0.8)', amt: 0.2 });
    for (const rx of [19, 24, 29]) D.line(ctx, rx, -60 + bob, rx, -56 + bob, 0.1);
    D.text(ctx, '2027', 24, -48 + bob, 5.5);
    for (const gx of [18, 22, 26, 30]) D.dot(ctx, gx, -44 + bob, 0.6);
    D.poly(ctx, [[-10, -31 + bob], [-17, -36 + bob], [-15, -27 + bob]], { fill: true, amt: 0.2 });
  } else {
    // backstroke: arms windmilling
    const a = t * 18;
    D.line(ctx, -8, -32, -8 + Math.cos(a) * 14, -32 + Math.sin(a) * 14, 0.3);
    D.line(ctx, 8, -32, 8 - Math.cos(a) * 14, -32 - Math.sin(a) * 14, 0.3);
  }
  // fishy head: a fin on top, two googly eyes, the haddock's thumbprint and fat lips
  const hy = -50 + bob;
  D.poly(ctx, [[-6, hy - 9], [-3, hy - 22], [5, hy - 18], [9, hy - 8]], { fill: 'rgba(29,79,184,0.55)', amt: 0.3 });
  D.line(ctx, -1, hy - 10, -1, hy - 18, 0.1);
  D.line(ctx, 3, hy - 9, 3, hy - 16, 0.1);
  D.poly(ctx, [[-9, hy + 8], [-11, hy - 4], [-2, hy - 12], [9, hy - 8], [13, hy + 2], [9, hy + 9]], { fill: true });
  D.ellipse(ctx, -6, hy + 3, 2.2, 2.8, { fill: INK, amt: 0.2 });
  // googly eyes: big whites, pupils rolling about loose
  for (const [ex, k] of [[0, 0], [7, 1.7]]) {
    D.circle(ctx, ex, hy - 3, 4.2, { fill: '#fff', amt: 0.2 });
    const a = t * 5 + k + ph * 0.7;
    D.dot(ctx, ex + Math.cos(a) * 1.8, hy - 3 + 1.4 + Math.sin(a) * 1.2, 1.8);
  }
  D.ellipse(ctx, 12, hy + 4, 3, 2, { fill: true, amt: 0.2 });
  D.ellipse(ctx, 12, hy + 7, 3, 2, { fill: true, amt: 0.2 });
  D.arc(ctx, -2, hy + 3, 6, 6, -0.8, 0.8, 0.2);
  ctx.restore();
}


// The Inverse Tapir of Seasonal Space-Time: a crowned tapir in a frosty,
// icy aura. Drawn facing right with feet at (0,0).
export function drawTapir(ctx, p = {}) {
  const st = p.state || 'idle', t = p.t || 0, ph = p.phase || 0;
  const run = st === 'run', fly = st === 'glide';
  const bob = run ? -Math.abs(Math.sin(ph)) * 2 : st === 'idle' ? Math.sin(t * 2) * 0.7 : fly ? Math.sin(t * 6) * 1.5 : 0;
  // the icy aura, spiky and shimmering
  ctx.save();
  ctx.globalAlpha = 0.45;
  D.pen(ctx, 'rgba(110,150,210,1)', 1.6);
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * (1.05 + (i / 14) * 0.9);
    const r = (i % 2 ? 30 : 40) + Math.sin(t * 3 + i) * 3;
    pts.push([2 + Math.cos(a) * r * 1.2, -18 + Math.sin(a) * r]);
  }
  D.poly(ctx, pts, { close: false, amt: 0.5 });
  ctx.restore();
  D.pen(ctx);
  // four stumpy legs
  const sw = run ? Math.sin(ph) * 4 : fly ? 3 : 0;
  for (const [lx, f] of [[-15, sw], [-9, -sw], [5, -sw], [11, sw]]) {
    D.line(ctx, lx, -12 + bob, lx + f, 0, 0.3);
    D.line(ctx, lx + f - 2, 0, lx + f + 3, 0, 0.2);
  }
  // body: dark and crosshatched, like the card
  D.ellipse(ctx, -2, -20 + bob, 19, 11, { fill: 'rgba(29,79,184,0.8)' });
  D.pen(ctx, 'rgba(255,255,255,0.45)', 1);
  for (let i = -14; i <= 10; i += 6) D.line(ctx, i, -28 + bob, i + 6, -13 + bob, 0.2);
  D.pen(ctx);
  // head and long drooping snout
  const hx = 16, hy = -27 + bob;
  D.ellipse(ctx, hx, hy, 9, 8, { fill: true });
  D.curve(ctx, [[hx + 6, hy - 4], [hx + 16, hy + 2], [hx + 18, hy + 14], [hx + 14, hy + 18]], 0.3);
  D.curve(ctx, [[hx + 6, hy + 4], [hx + 12, hy + 8], [hx + 12, hy + 16], [hx + 14, hy + 18]], 0.3);
  D.circle(ctx, hx + 2, hy - 1, 3.6, { fill: '#fff', amt: 0.2 });
  D.dot(ctx, hx + 3, hy - 1, 1.6);
  D.ellipse(ctx, hx - 6, hy - 6, 3, 3.5, { fill: true, amt: 0.2 });
  // crown with three bobbles
  D.poly(ctx, [[hx - 5, hy - 7], [hx - 4, hy - 15], [hx - 1, hy - 10], [hx + 1, hy - 17], [hx + 3, hy - 10], [hx + 6, hy - 15], [hx + 6, hy - 7]], { fill: 'rgba(241,200,75,0.9)', amt: 0.2 });
  for (const cx of [-4, 1, 6]) D.dot(ctx, hx + cx, hy - 17 + (cx === 1 ? -1 : 0), 1.6);
  // a stopwatch floating nearby, ticking
  const sx = -22, sy = -46 + Math.sin(t * 2) * 2;
  D.circle(ctx, sx, sy, 4.5, { fill: true, amt: 0.2 });
  D.line(ctx, sx, sy - 4.5, sx, sy - 7, 0.1);
  const a = t * (p.throwing ? 12 : 2);
  D.line(ctx, sx, sy, sx + Math.cos(a) * 3, sy + Math.sin(a) * 3, 0.1);
}

export const CHARACTERS = {
  tim: {
    id: 'tim',
    number: '#001',
    name: 'Tim Ternabet',
    first: 'Tim',
    question: "What is Tim's favourite food?",
    cardTone: 'kraft',
    draw: drawTim,
    hints: {
      special: 'Press X (or ★) to throw. Hold jump while falling to glide!',
      wall: 'A gloom wall! Throw three things at it to crack it.',
      gap: 'Too far to jump. Jump, then hold jump to glide across.',
    },
    // movement
    speed: 250,
    accel: 2400,
    friction: 2600,
    airControl: 0.8,
    abilities: { projectile: 'snack', glide: 115 },
    tagline: 'A 2027 reveller',
  },
  rex: {
    id: 'rex',
    number: '#042',
    name: 'Rex P. Majestrum',
    first: 'Rex',
    question: "What is Rex's favourite egg?",
    cardTone: 'white',
    draw: drawRex,
    hints: {
      special: 'Press X (or ★) for a Keirin Sprint. It works mid-air too!',
      wall: 'A gloom wall! Sprint straight into it.',
      gap: 'Too far to jump. Jump, then sprint in mid-air.',
    },
    speed: 285,
    accel: 1500,
    friction: 1100,
    airControl: 0.7,
    abilities: { sprint: true },
    tagline: 'Famed 2027 partygoer',
  },
  clive: {
    id: 'clive', number: '#022', name: 'Clive-Bot 1400', first: 'Clive-Bot',
    question: "Who is Clive-Bot's favourite scientist?",
    cardTone: 'kraft', draw: drawClive,
    hints: {
      special: 'Press X (or ★) for a magnet pulse. Press jump again in mid-air to ski jump!',
      wall: 'A gloom wall! Three magnet pulses will crack it.',
      gap: 'Too far to jump. Jump, then press jump again to ski jump across.',
    },
    speed: 240, accel: 2000, friction: 2200, airControl: 0.8,
    abilities: { projectile: 'pulse', airJumps: { count: 1, vy: 560, kind: 'ski', boost: 1.7 } },
  },
  rinky: {
    id: 'rinky', number: '#033', name: 'Dr. Rinky', first: 'Dr. Rinky',
    question: "What is Dr. Rinky's least eaten biscuit?",
    cardTone: 'white', draw: drawRinky,
    hints: {
      special: 'Press X (or ★) to pounce. It works mid-air too!',
      wall: 'A gloom wall! Pounce straight into it.',
      gap: 'Too far to jump. Jump, then pounce in mid-air.',
    },
    speed: 265, accel: 2300, friction: 2400, airControl: 0.8,
    abilities: { pounce: true },
  },
  satsuma: {
    id: 'satsuma', number: '#147', name: 'J. Satsuma MacEagle', first: 'Satsuma',
    question: "What is J. Satsuma MacEagle's favourite fruit?",
    cardTone: 'white', draw: drawSatsuma,
    hints: {
      special: 'Press X (or ★) to strum the harp. Press jump in mid-air to flap!',
      wall: 'A gloom wall! Two harp blasts will crack it.',
      gap: 'Too far to jump. Keep pressing jump to flap across.',
    },
    speed: 245, accel: 2200, friction: 2400, airControl: 0.85,
    abilities: { projectile: 'harp', airJumps: { count: 3, vy: 500, kind: 'flap' } },
  },
  watson: {
    id: 'watson', number: '#208', name: 'Wide Watson', first: 'Wide Watson',
    question: "When was Wide Watson's most memorable day out?",
    cardTone: 'kraft', draw: drawWatson,
    hints: {
      special: 'Press X (or ★) for a wide-head charge. Hold jump while falling to float!',
      wall: 'A gloom wall! Charge straight into it.',
      gap: 'Too far to jump. Jump, then hold jump to float across on your head.',
    },
    speed: 255, accel: 2100, friction: 2300, airControl: 0.8,
    abilities: { sprint: true, glide: 70 },
  },
  edna: {
    id: 'edna', number: '#2468', name: 'Edna Bilton-Claws', first: 'Edna',
    question: 'What does Edna Bilton-Claws dislike?',
    cardTone: 'kraft', draw: drawEdna,
    hints: {
      special: 'Press X (or ★) to stamp. Press jump again in mid-air for the EBC Bounce!',
      wall: 'A gloom wall! Walk right up to it and stamp.',
      gap: 'Too far to jump. Jump, then press jump again to bounce across.',
    },
    speed: 235, accel: 2100, friction: 2400, airControl: 0.8,
    abilities: { stamp: true, airJumps: { count: 1, vy: 720, kind: 'bounce', boost: 1.35 } },
  },
  scales: {
    id: 'scales', number: '#337', name: 'Scales Merckx', first: 'Scales',
    question: "What is Scales Merckx's favourite sea?",
    cardTone: 'kraft', draw: drawScales,
    hints: {
      special: 'Press X (or ★) for an 85 mph backstroke dash. Press jump again in mid-air to backflip!',
      wall: 'A gloom wall! Backstroke straight into it.',
      gap: 'Too far to jump. Jump, then dash across in mid-air.',
    },
    speed: 255, accel: 2100, friction: 2300, airControl: 0.8,
    abilities: { sprint: true, airJumps: { count: 1, vy: 640, kind: 'flip' } },
  },
  // Unlocked by finishing the game as 3 different characters, not by a passcode,
  // so his card details are public
  monday: {
    id: 'monday', number: '#018', name: 'Blue Monday', first: 'Blue Monday',
    unlockedBy: 'completions', completionsNeeded: 3,
    cardTone: 'white', draw: drawMonday,
    hints: {
      special: 'Press X (or ★) to toss a deadline. Press jump again in mid-air for a Leap Day!',
      wall: 'A gloom wall! Three tax forms will crack it.',
      gap: 'Too far to jump. Jump, then press jump again to Leap Day across.',
    },
    speed: 245, accel: 2100, friction: 2300, airControl: 0.8,
    abilities: { projectile: 'paper', airJumps: { count: 1, vy: 640, kind: 'leap', boost: 1.4 } },
    card: {
      stats: [
        ['Name', 'Blue Monday'],
        ['Date', 'Monday 18 January 2027'],
        ['Former occupation', 'Most miserable day of the year'],
        ['Likes', 'Drizzle, deadlines, the 07:52 being delayed'],
        ['Dislikes', 'Weekends'],
        ['Reason for changing sides', 'Beaten by three different Christmas card characters, and frankly impressed'],
      ],
      ability: 'Deadline Toss & Leap Day',
      abilityHow: 'Your special (X, a tap, or the ★ button) lobs a tax form that sends minions packing; three crack a gloom wall. Press jump again in mid-air for a Leap Day: an extra-long leap that only comes round once per jump.',
      secret: 'Friday off',
      secrets: 'Fridays off',
      victory: 'Blue Monday has saved the Seasonal Spirit. Nobody saw that coming, least of all Blue Monday.',
    },
  },
  // The final secret: unlocked by every other character plus three tapir sightings
  tapir: {
    id: 'tapir', number: '#e', name: 'Inverse Tapir of Seasonal Space-Time', first: 'The Tapir',
    unlockedBy: 'sightings',
    cardTone: 'white', draw: drawTapir,
    hints: {
      special: 'Press X (or ★) for Temporal Vacuum: time stops. Hold jump in the air for Frosty Reception!',
      wall: 'A gloom wall! Stop time and walk straight through it.',
      gap: 'Too far to jump. Jump, then hold jump to fly across.',
    },
    speed: 245, accel: 2000, friction: 2300, airControl: 0.85,
    abilities: { timeStop: true, fly: 5 },
    card: {
      signature: 'I.T.o.S.S-T',
      stats: [
        ['Name', 'Inverse Tapir of Seasonal Space-Time'],
        ['Age', '∞'],
        ['Purpose', 'The absolute epitome of the festive spirit'],
        ['Favourite athlete', 'Dennis Taylor'],
        ['Likes', 'Yorkshire pudding'],
        ['Vision', 'All things, past & present'],
      ],
      ability: 'Temporal Vacuum & Frosty Reception',
      abilityHow: "Your special (X, a tap, or the ★ button) is Temporal Vacuum: time stops for 3 seconds. Minions, bosses and their missiles freeze, and anything you walk into is swept away, gloom walls included. Hold jump in the air for Frosty Reception: up to 5 seconds of flight, trailing snowflakes.",
      secret: 'snooker triangle',
      secrets: 'snooker triangles',
      victory: 'The Inverse Tapir of Seasonal Space-Time has saved the Seasonal Spirit. It was always going to; it saw it happen.',
    },
  },
};

// in card-number order
export const ORDER = ['tim', 'clive', 'rinky', 'rex', 'satsuma', 'watson', 'scales', 'edna', 'monday', 'tapir'];

