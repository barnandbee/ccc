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

export const CHARACTERS = {
  tim: {
    id: 'tim',
    number: '#001',
    name: 'Tim Ternabet',
    first: 'Tim',
    question: "What is Tim's favourite food?",
    cardTone: 'kraft',
    draw: drawTim,
    // movement
    speed: 250,
    accel: 2400,
    friction: 2600,
    airControl: 0.8,
    abilities: { throw: true, glide: true },
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
    speed: 285,
    accel: 1500,
    friction: 1100,
    airControl: 0.7,
    abilities: { sprint: true },
    tagline: 'Famed 2027 partygoer',
  },
};

export const ORDER = ['tim', 'rex'];

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
