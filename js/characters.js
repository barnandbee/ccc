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
};

// in card-number order
export const ORDER = ['tim', 'clive', 'rinky', 'rex', 'satsuma', 'watson', 'edna'];

// Junie the puppy, for the finale
export function drawJunie(ctx, t = 0) {
  D.pen(ctx);
  const wag = Math.sin(t * 12) * 0.5;
  // tail
  D.curve(ctx, [[-16, -14], [-24, -22 + wag * 6], [-26, -30 + wag * 8]], 0.5);
  // body
  D.ellipse(ctx, -4, -12, 15, 9, { fill: true });
  // legs
  for (const x of [-14, -8, 2, 8]) D.line(ctx, x, -5, x + (x % 4 ? 1 : -1), 0, 0.4);
  // ears first, so the head sits over them
  D.ellipse(ctx, 3, -20, 3.5, 7, { fill: D.INK, rot: 0.35, amt: 0.4 });
  D.ellipse(ctx, 21, -20, 3.5, 7, { fill: D.INK, rot: -0.35, amt: 0.4 });
  // head
  D.circle(ctx, 12, -24, 10, { fill: true });
  D.dot(ctx, 9, -26, 1.5);
  D.dot(ctx, 15, -26, 1.5);
  D.ellipse(ctx, 12, -20, 2.4, 1.6, { fill: D.INK, amt: 0.2 });
  D.curve(ctx, [[9, -17], [12, -15], [15, -17]], 0.2);
  // tongue
  D.ellipse(ctx, 13, -14, 1.6, 2.4, { fill: D.RED, amt: 0.2 });
}
