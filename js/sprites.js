// Everything that isn't a player character: January's minions, pickups and scenery.
import * as D from './draw.js';

const { INK, GLOOM, RED, GOLD } = D;

// ---------- January's minions ----------
// Each is drawn with feet at (0,0), facing right.

function legs(ctx, t, spread = 6, len = 6, speed = 14) {
  const s = Math.sin(t * speed) * 3;
  D.line(ctx, -spread, -len, -spread - s, 0, 0.4);
  D.line(ctx, spread, -len, spread + s, 0, 0.4);
}
function grumpyFace(ctx, x, y, s = 1) {
  D.line(ctx, x - 6 * s, y - 5 * s, x - 2 * s, y - 3 * s, 0.3);
  D.line(ctx, x + 6 * s, y - 5 * s, x + 2 * s, y - 3 * s, 0.3);
  D.dot(ctx, x - 4 * s, y - 1 * s, 1.4);
  D.dot(ctx, x + 4 * s, y - 1 * s, 1.4);
  D.arc(ctx, x, y + 6 * s, 4 * s, 2.5 * s, Math.PI * 1.15, Math.PI * 1.85, 0.2);
}

export function drawWalker(ctx, theme, t) {
  D.pen(ctx, GLOOM, 2.3);
  if (theme === 1) {
    // Sad sprout
    legs(ctx, t, 5, 6);
    D.circle(ctx, 0, -18, 13, { fill: true });
    D.curve(ctx, [[-10, -22], [-4, -12], [0, -6]], 0.5);
    D.curve(ctx, [[10, -22], [4, -12], [0, -6]], 0.5);
    D.curve(ctx, [[-2, -31], [0, -36], [3, -31]], 0.4);
    D.dot(ctx, -4, -20, 1.5, GLOOM);
    D.dot(ctx, 4, -20, 1.5, GLOOM);
    D.arc(ctx, 0, -12, 4, 2.5, Math.PI * 1.15, Math.PI * 1.85, 0.2);
    D.line(ctx, -7, -24, -2, -22, 0.2);
    D.line(ctx, 7, -24, 2, -22, 0.2);
  } else if (theme === 2) {
    // Unread email
    legs(ctx, t, 7, 6);
    D.rect(ctx, -15, -28, 30, 22, { fill: true });
    D.poly(ctx, [[-15, -28], [0, -16], [15, -28]], { close: false, amt: 0.4 });
    grumpyFace(ctx, 0, -12, 0.7);
    D.text(ctx, 'Re: Re: Fwd:', 0, -33, 9, { color: GLOOM });
  } else if (theme === 3) {
    // New Year New Me jogger
    legs(ctx, t, 6, 7, 20);
    D.ellipse(ctx, 0, -20, 13, 14, { fill: true });
    D.rect(ctx, -13, -31, 26, 6, { fill: RED, amt: 0.4 });
    D.text(ctx, 'NEW ME', 0, -28, 6.5, { color: '#fff' });
    grumpyFace(ctx, 0, -17, 0.8);
    D.dot(ctx, 12, -22, 1.6, '#6aa9e6');
  } else {
    // Self-assessment tax form
    legs(ctx, t, 6, 6);
    D.poly(ctx, [[-12, -36], [6, -36], [12, -30], [12, -6], [-12, -6]], { fill: true });
    D.poly(ctx, [[6, -36], [6, -30], [12, -30]], { close: false, amt: 0.3 });
    for (let y = -31; y < -10; y += 5) D.line(ctx, -9, y, y < -28 ? 3 : 8, y, 0.3);
    grumpyFace(ctx, 0, -18, 0.75);
    D.text(ctx, 'SA100', 0, -40, 8, { color: GLOOM });
  }
}

export function drawFlyer(ctx, theme, t) {
  D.pen(ctx, GLOOM, 2.3);
  if (theme === 4) {
    // Flying invoice (paper plane)
    D.poly(ctx, [[-16, -4], [16, 0], [-16, 6], [-8, 0]], { fill: true });
    D.line(ctx, -8, 0, 16, 0, 0.3);
    D.text(ctx, '£', -4, -6, 10, { color: GLOOM });
    for (let i = 0; i < 3; i++) D.line(ctx, -22 - i * 4, -2 + i * 3, -28 - i * 4, -2 + i * 3, 0.4);
  } else {
    // Drizzle cloud
    const bumps = [[-10, 0, 9], [0, -5, 11], [11, 0, 9], [2, 4, 9]];
    for (const [x, y, r] of bumps) D.circle(ctx, x, y, r, { fill: true, amt: 0.6 });
    grumpyFace(ctx, 0, 0, 0.7);
    const k = (t * 3) % 1;
    for (let i = -1; i <= 1; i++) D.line(ctx, i * 8, 12 + k * 10, i * 8 - 1, 16 + k * 10, 0.2);
  }
}

export function drawJumper(ctx, theme, t, squash = 0) {
  D.pen(ctx, GLOOM, 2.4);
  ctx.save();
  ctx.scale(1 + squash * 0.2, 1 - squash * 0.2);
  if (theme === 4) {
    // DENIED rubber stamp
    D.rect(ctx, -6, -36, 12, 12, { fill: true });
    D.ellipse(ctx, 0, -38, 9, 4, { fill: true });
    D.rect(ctx, -15, -24, 30, 18, { fill: true });
    D.rect(ctx, -16, -8, 32, 6, { fill: GLOOM });
    D.text(ctx, 'DENIED', 0, -15, 9, { color: RED });
  } else {
    // Kettlebell
    D.arc(ctx, 0, -26, 8, 9, Math.PI, Math.PI * 2, 0.4);
    D.line(ctx, -8, -26, -8, -22, 0.3);
    D.line(ctx, 8, -26, 8, -22, 0.3);
    D.ellipse(ctx, 0, -12, 15, 12, { fill: 'rgba(90,100,121,0.85)' });
    D.text(ctx, '16kg', 0, -9, 8, { color: '#fff' });
    D.line(ctx, -7, -18, -2, -16, 0.2);
    D.line(ctx, 7, -18, 2, -16, 0.2);
  }
  ctx.restore();
}

// ---------- Boss: Blue Monday ----------
export function drawBoss(ctx, t, o = {}) {
  D.pen(ctx, GLOOM, 3);
  const w = 100, h = 110;
  const flash = o.hurt > 0 && Math.floor(o.hurt * 20) % 2;
  if (flash) D.pen(ctx, RED, 3);
  const stomp = Math.sin(t * 6) * 3;
  // legs
  D.line(ctx, -22, -10, -24 - stomp, 0);
  D.line(ctx, 22, -10, 24 + stomp, 0);
  D.ellipse(ctx, -26 - stomp, -2, 8, 4, { fill: GLOOM });
  D.ellipse(ctx, 26 + stomp, -2, 8, 4, { fill: GLOOM });
  // calendar page
  const x = -w / 2, y = -h;
  D.rect(ctx, x, y + 6, w, h - 16, { fill: true });
  D.rect(ctx, x, y + 6, w, 24, { fill: 'rgba(43,72,150,0.9)' });
  D.text(ctx, 'MONDAY', 0, y + 18, 15, { color: '#fff', sc: true });
  for (let i = -2; i <= 2; i++) D.circle(ctx, i * 18, y + 6, 3.5, { fill: true, amt: 0.3 });
  D.text(ctx, '18', 0, y + 75, 36, { color: GLOOM });
  D.text(ctx, 'JANUARY', 0, y + 92, 11, { color: GLOOM });
  // angry face
  const ey = y + 42;
  D.line(ctx, -26, ey - 6, -10, ey, 0.4);
  D.line(ctx, 26, ey - 6, 10, ey, 0.4);
  D.circle(ctx, -17, ey + 5, 4.5, { fill: true, amt: 0.3 });
  D.circle(ctx, 17, ey + 5, 4.5, { fill: true, amt: 0.3 });
  D.dot(ctx, -16, ey + 6, 2, GLOOM);
  D.dot(ctx, 18, ey + 6, 2, GLOOM);
  // arms
  const arm = o.throwing ? -30 : Math.sin(t * 4) * 6;
  D.line(ctx, x, y + 50, x - 18, y + 62 + arm);
  D.line(ctx, -x, y + 50, -x + 18, y + 62 - (o.throwing ? 30 : arm));
  // scribbly gloom aura
  D.pen(ctx, 'rgba(90,100,121,0.35)', 1.6);
  D.scribble(ctx, x - 12, y - 8, w + 24, 18, Math.floor(t * 7), 8);
}

export function drawPaperMissile(ctx, rot) {
  ctx.save();
  ctx.rotate(rot);
  D.pen(ctx, GLOOM, 2);
  D.rect(ctx, -9, -11, 18, 22, { fill: true, amt: 0.5 });
  D.text(ctx, 'DUE', 0, -3, 7.5, { color: RED });
  D.line(ctx, -5, 4, 5, 4, 0.2);
  D.line(ctx, -5, 7, 3, 7, 0.2);
  ctx.restore();
}

// ---------- Player bits ----------
// Tim's thrown snack
export function drawSnack(ctx, rot = 0, scale = 1) {
  ctx.save();
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  D.pen(ctx, INK, 2);
  const seg = [];
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI * (0.15 + i * 0.22);
    seg.push([Math.cos(a) * 9, Math.sin(a) * 9 - 2]);
  }
  ctx.fillStyle = D.CORAL;
  ctx.beginPath();
  ctx.arc(0, -2, 12, Math.PI * 0.1, Math.PI * 1.5);
  ctx.arc(0, -2, 5, Math.PI * 1.5, Math.PI * 0.1, true);
  ctx.fill();
  D.arc(ctx, 0, -2, 12, 12, Math.PI * 0.1, Math.PI * 1.5, 0.4);
  D.arc(ctx, 0, -2, 5, 5, Math.PI * 0.1, Math.PI * 1.5, 0.3);
  for (let i = 1; i < 5; i++) {
    const a = Math.PI * (0.1 + i * 0.28);
    D.line(ctx, Math.cos(a) * 5, Math.sin(a) * 5 - 2, Math.cos(a) * 12, Math.sin(a) * 12 - 2, 0.2);
  }
  // tail fan
  D.poly(ctx, [[0, -14], [-6, -19], [0, -16], [5, -20]], { close: false, amt: 0.3 });
  // feelers
  D.curve(ctx, [[11, 2], [16, 4], [20, 0]], 0.3);
  D.curve(ctx, [[10, 3], [14, 8], [19, 8]], 0.3);
  D.dot(ctx, 9, 1, 1.2);
  ctx.restore();
}

// Hidden collectible: themed per character
export function drawTrinket(ctx, kind, t = 0, faded = false) {
  ctx.save();
  if (faded) ctx.globalAlpha = 0.3;
  if (kind === 'tim') {
    ctx.translate(0, Math.sin(t * 3) * 2);
    D.pen(ctx, GOLD, 2);
    for (let i = 0; i < 6; i++) {
      const a = t * 1.5 + (i * Math.PI) / 3;
      D.line(ctx, Math.cos(a) * 17, Math.sin(a) * 17 - 2, Math.cos(a) * 22, Math.sin(a) * 22 - 2, 0.3);
    }
    ctx.save();
    ctx.translate(0, 2);
    drawSnack(ctx, 0.3, 1.1);
    ctx.restore();
  } else {
    ctx.translate(0, Math.sin(t * 3) * 2);
    D.pen(ctx, GOLD, 2);
    for (let i = 0; i < 6; i++) {
      const a = t * 1.5 + (i * Math.PI) / 3;
      D.line(ctx, Math.cos(a) * 18, Math.sin(a) * 18 - 4, Math.cos(a) * 23, Math.sin(a) * 23 - 4, 0.3);
    }
    D.pen(ctx, INK, 2);
    // egg in an egg cup, top sliced off to show the (hard) yolk
    D.poly(ctx, [[-9, 2], [9, 2], [6, 8], [8, 12], [-8, 12], [-6, 8]], { fill: true, amt: 0.4 });
    D.ellipse(ctx, 0, -5, 9, 11, { fill: true, amt: 0.4 });
    D.ellipse(ctx, 0, -11, 7, 2.5, { fill: '#fff', amt: 0.3 });
    D.ellipse(ctx, 0, -11, 3.5, 1.4, { fill: GOLD, amt: 0.2 });
  }
  ctx.restore();
}

// ---------- Scenery ----------
export function drawSpark(ctx, t, seed) {
  const bob = Math.sin(t * 3 + seed) * 3;
  ctx.save();
  ctx.translate(0, bob);
  D.pen(ctx, INK, 2);
  D.star(ctx, 0, 0, 10, { fill: 'rgba(241,200,75,0.55)', rot: Math.sin(t * 2 + seed) * 0.15 });
  ctx.restore();
}

export function drawCheckpoint(ctx, on, t) {
  D.pen(ctx, INK, 2.3);
  D.line(ctx, 0, 0, 0, -64);
  D.ellipse(ctx, 0, -1, 9, 3, { fill: true, amt: 0.4 });
  if (on) {
    const flap = Math.sin(t * 6) * 3;
    D.poly(ctx, [[0, -64], [30, -58 + flap], [0, -48]], { fill: 'rgba(200,50,60,0.75)' });
    D.star(ctx, 10, -57 + flap / 2, 5, { fill: GOLD });
  } else {
    D.poly(ctx, [[0, -64], [8, -50], [0, -46]], { fill: 'rgba(90,100,121,0.4)' });
  }
}

export function drawTree(ctx, lit, t) {
  D.pen(ctx, INK, 2.6);
  const droop = lit ? 0 : 6;
  D.rect(ctx, -7, -16, 14, 16, { fill: true });
  const tiers = [[-46, -16, 46], [-36, -50, 36], [-26, -80, 26]];
  for (const [l, y, r] of tiers) {
    D.poly(ctx, [[l, y + droop * 0.3], [0, y - 38], [r, y + droop]], { fill: lit ? 'rgba(80,160,90,0.45)' : true });
  }
  D.star(ctx, 0, -122, 12, { fill: lit ? GOLD : 'rgba(90,100,121,0.25)', rot: lit ? Math.sin(t * 2) * 0.2 : 0.3 });
  if (lit) {
    const cols = [RED, GOLD, '#3b9ad9', '#e07ad0'];
    const bulbs = [[-30, -24], [-12, -30], [10, -26], [30, -22], [-20, -58], [4, -62], [22, -56], [-10, -90], [12, -92]];
    bulbs.forEach(([x, y], i) => {
      const on = Math.sin(t * 5 + i) > -0.3;
      D.dot(ctx, x, y, 4, on ? cols[i % 4] : 'rgba(0,0,0,0.15)');
    });
    D.pen(ctx, GOLD, 2);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + t;
      D.line(ctx, Math.cos(a) * 18, -122 + Math.sin(a) * 18, Math.cos(a) * 26, -122 + Math.sin(a) * 26, 0.3);
    }
  } else {
    D.pen(ctx, GLOOM, 1.5);
    D.text(ctx, 'sad', 0, -40, 12, { color: GLOOM });
  }
}

export function drawGloomWall(ctx, x, y, w, h, hp, t, seed) {
  ctx.save();
  ctx.fillStyle = 'rgba(90,100,121,0.18)';
  ctx.fillRect(x + 2, y, w - 4, h);
  D.pen(ctx, GLOOM, 1.8);
  for (let i = 0; i < 5; i++) D.scribble(ctx, x + 2, y + 2, w - 4, h - 4, seed * 13 + i * 5 + Math.floor(t * 2), 9);
  D.pen(ctx, GLOOM, 2.4);
  D.line(ctx, x + 2, y, x + 2, y + h);
  D.line(ctx, x + w - 2, y, x + w - 2, y + h);
  if (hp < 3) {
    D.pen(ctx, INK, 2);
    D.zigzag(ctx, x + w / 2, y + 10, x + w / 2, y + h * 0.45, 6, 5);
    if (hp < 2) D.zigzag(ctx, x + w / 2, y + h * 0.5, x + w / 2 - 4, y + h - 8, 6, 5);
  }
  ctx.restore();
}

export function drawSign(ctx) {
  D.pen(ctx, INK, 2.2);
  D.line(ctx, 0, 0, 0, -34);
  D.rect(ctx, -16, -48, 32, 20, { fill: true });
  D.text(ctx, '!', 0, -38, 16);
}

export function drawBubble(ctx, text, x, y, maxW = 300) {
  ctx.save();
  ctx.font = `18px ${D.FONT}`;
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  const lw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24;
  const lh = lines.length * 22 + 14;
  const bx = x - lw / 2, by = y - lh - 14;
  D.pen(ctx, INK, 2.2);
  D.poly(ctx, [[bx, by], [bx + lw, by], [bx + lw, by + lh], [x + 10, by + lh], [x, by + lh + 12], [x - 6, by + lh], [bx, by + lh]], { fill: true });
  lines.forEach((l, i) => D.text(ctx, l, x, by + 18 + i * 22, 18));
  ctx.restore();
}

export function drawMover(ctx, w, theme) {
  D.pen(ctx, INK, 2.3);
  D.rect(ctx, 0, 0, w, 10, { fill: true });
  D.line(ctx, 4, 5, w - 4, 5, 0.4);
  if (theme === 2) {
    // umbrella canopy underside
    D.arc(ctx, w / 2, 12, w / 2 - 4, 8, 0, Math.PI, 0.5);
  } else {
    D.line(ctx, w / 2, 10, w / 2, 20, 0.3);
    D.circle(ctx, w / 2, 22, 3, { fill: true, amt: 0.2 });
  }
}

// ---------- Parallax backgrounds ----------
function bgPiece(ctx, theme, k, x) {
  const r = D.hash(k * 977 + theme * 31);
  const y0 = 470;
  if (theme === 1) {
    if (r < 0.33) {
      // window with snow
      D.rect(ctx, x + 40, 120, 120, 150, { fill: true });
      D.line(ctx, x + 100, 120, x + 100, 270);
      D.line(ctx, x + 40, 195, x + 160, 195);
      for (let i = 0; i < 9; i++) D.dot(ctx, x + 50 + D.hash(k + i) * 100, 130 + D.hash(k * 3 + i) * 130, 2);
      D.curve(ctx, [[x + 30, 110], [x + 50, 160], [x + 40, 280]], 1);
      D.curve(ctx, [[x + 170, 110], [x + 150, 160], [x + 160, 280]], 1);
    } else if (r < 0.66) {
      // fireplace with stockings
      D.rect(ctx, x + 30, 260, 180, 20, { fill: true });
      D.rect(ctx, x + 50, 280, 140, y0 - 280, { fill: true });
      D.arc(ctx, x + 120, y0, 45, 70, Math.PI, Math.PI * 2, 1);
      for (let i = 0; i < 3; i++) {
        const sx = x + 60 + i * 50;
        D.poly(ctx, [[sx, 280], [sx + 14, 280], [sx + 14, 310], [sx + 22, 318], [sx + 18, 326], [sx, 316]], { fill: true });
      }
    } else {
      // leftovers on a sideboard: turkey carcass and a tired cracker
      D.rect(ctx, x + 30, 330, 200, 14, { fill: true });
      D.line(ctx, x + 40, 344, x + 40, y0);
      D.line(ctx, x + 220, 344, x + 220, y0);
      D.ellipse(ctx, x + 90, 330, 40, 6, { fill: true });
      for (let i = 0; i < 5; i++) D.arc(ctx, x + 90, 326, 26 - i * 2, 22 - i * 3, Math.PI * 1.05, Math.PI * 1.95, 0.6);
      D.rect(ctx, x + 150, 312, 50, 12, { fill: true });
      D.zigzag(ctx, x + 150, 312, x + 150, 324, 3, 3);
      D.text(ctx, 'leftovers', x + 120, 300, 16);
    }
  } else if (theme === 2) {
    if (r < 0.4) {
      // office block
      const h = 200 + r * 200;
      D.rect(ctx, x + 20, y0 - h, 150, h);
      for (let wy = y0 - h + 20; wy < y0 - 30; wy += 36) for (let wx = x + 36; wx < x + 150; wx += 36) D.rect(ctx, wx, wy, 18, 20);
    } else if (r < 0.7) {
      // departure board
      D.rect(ctx, x + 40, 120, 200, 90, { fill: true });
      D.text(ctx, '07:52  LONDON', x + 140, 145, 17);
      D.text(ctx, 'DELAYED', x + 140, 175, 22, { color: D.RED });
      D.line(ctx, x + 80, 210, x + 80, y0);
      D.line(ctx, x + 200, 210, x + 200, y0);
    } else {
      // lamp post
      D.line(ctx, x + 100, y0, x + 100, 180);
      D.curve(ctx, [[x + 100, 180], [x + 115, 160], [x + 135, 170]], 0.6);
      D.poly(ctx, [[x + 125, 170], [x + 145, 170], [x + 140, 185], [x + 130, 185]], { fill: true });
      D.text(ctx, 'Mind the gap', x + 160, 400, 16);
    }
  } else if (theme === 3) {
    if (r < 0.35) {
      D.rect(ctx, x + 40, 120, 150, 110, { fill: true });
      D.text(ctx, 'NEW YEAR', x + 115, 150, 24, { sc: true });
      D.text(ctx, 'NEW ME', x + 115, 185, 30, { sc: true });
      D.text(ctx, '(again)', x + 115, 212, 14);
    } else if (r < 0.7) {
      // dumbbell rack
      D.rect(ctx, x + 30, 380, 200, 10);
      D.line(ctx, x + 40, 390, x + 40, y0);
      D.line(ctx, x + 220, 390, x + 220, y0);
      for (let i = 0; i < 5; i++) {
        const dx = x + 50 + i * 38;
        D.line(ctx, dx, 372, dx + 22, 372);
        D.rect(ctx, dx - 4, 364, 7, 16);
        D.rect(ctx, dx + 19, 364, 7, 16);
      }
    } else {
      // clock at 6am and a sad motivational banner
      D.circle(ctx, x + 110, 150, 34, { fill: true });
      D.line(ctx, x + 110, 150, x + 110, 124);
      D.line(ctx, x + 110, 150, x + 110, 172);
      D.text(ctx, 'NO PAIN NO GAIN', x + 110, 230, 18, { sc: true });
      D.text(ctx, '(mostly pain)', x + 110, 252, 13);
    }
  } else {
    if (r < 0.35) {
      // filing cabinet
      D.rect(ctx, x + 60, 260, 90, y0 - 260, { fill: true });
      for (let i = 0; i < 4; i++) {
        D.rect(ctx, x + 68, 268 + i * 52, 74, 44);
        D.line(ctx, x + 95, 285 + i * 52, x + 115, 285 + i * 52);
      }
    } else if (r < 0.7) {
      D.rect(ctx, x + 40, 130, 190, 100, { fill: true });
      D.text(ctx, 'SELF ASSESSMENT', x + 135, 160, 18, { sc: true });
      D.text(ctx, 'DEADLINE 31 JAN', x + 135, 192, 22, { color: D.RED, sc: true });
    } else {
      // stacks of paper and a sad plant
      for (let i = 0; i < 6; i++) D.rect(ctx, x + 50 + (i % 2) * 3, y0 - 14 - i * 14, 70, 14);
      D.rect(ctx, x + 170, y0 - 40, 30, 40);
      D.curve(ctx, [[x + 185, y0 - 40], [x + 180, y0 - 70], [x + 160, y0 - 60]], 0.6);
      D.curve(ctx, [[x + 185, y0 - 40], [x + 195, y0 - 75], [x + 210, y0 - 62]], 0.6);
      D.text(ctx, 'PLEASE WAIT', x + 150, 180, 18, { sc: true });
    }
  }
}

export function drawBackground(ctx, theme, camX, VW) {
  ctx.save();
  ctx.globalAlpha = 0.3;
  D.pen(ctx, INK, 2);
  const par = 0.45, seg = 300;
  const off = camX * par;
  const first = Math.floor(off / seg) - 1;
  for (let k = first; k < first + Math.ceil(VW / seg) + 3; k++) {
    bgPiece(ctx, theme, k, k * seg - off);
  }
  if (theme === 1) {
    // bunting across the top
    const boff = (camX * 0.6) % 80;
    D.curve(ctx, [[-20, 40], [VW / 2, 70], [VW + 20, 40]], 1);
    for (let x = -boff; x < VW + 80; x += 80) {
      const y = 40 + 30 * Math.sin(Math.PI * Math.max(0, Math.min(1, (x + 20) / (VW + 40))));
      D.poly(ctx, [[x, y], [x + 30, y + 1], [x + 15, y + 26]]);
    }
  }
  ctx.restore();
}

export function drawRain(ctx, t, VW, VH) {
  ctx.save();
  D.pen(ctx, 'rgba(29,79,184,0.25)', 1.4);
  for (let i = 0; i < 60; i++) {
    const x = (D.hash(i * 7) * (VW + 200) + t * 120) % (VW + 200) - 100;
    const y = (D.hash(i * 13) * VH + t * 700) % VH;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 5, y + 16);
    ctx.stroke();
  }
  ctx.restore();
}
