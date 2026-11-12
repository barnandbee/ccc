// Hand-drawn rendering helpers.
// Every line wobbles a little, and the wobble changes a few times a second,
// so the whole picture "boils" like an animated biro doodle.

export const INK = '#1d4fb8';
export const INK_SOFT = 'rgba(29,79,184,0.35)';
export const RED = '#c8323c';
export const GLOOM = '#5a6479';
export const GOLD = '#f1c84b';
export const CORAL = '#f3a08a';

let boilFrame = 0;
let paperFill = '#f6efdf';
export function setBoil(time) { boilFrame = Math.floor(time * 7) % 4; }
export function setPaper(c) { paperFill = c; }
export function paper() { return paperFill; }

export function hash(n) {
  n |= 0;
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n ^= n >>> 4;
  n = Math.imul(n, 0x27d4eb2d);
  n ^= n >>> 15;
  return (n >>> 0) / 4294967296;
}
function seedOf(x, y) {
  return (Math.round(x * 2) * 73856093) ^ (Math.round(y * 2) * 19349663);
}
function jit(seed, amt) {
  return (hash(seed + boilFrame * 7919) - 0.5) * 2 * amt;
}

// Line widths are multiplied by this, so big blown-up drawings keep a biro-thin line
let penScale = 1;
export function setPenScale(k) { penScale = k; }

export function pen(ctx, color = INK, width = 2.4) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width * penScale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function wob(x, y, amt) {
  const s = seedOf(x, y);
  return [x + jit(s, amt), y + jit(s ^ 0x5bd1e995, amt)];
}

// Straight line, wobbled
export function line(ctx, x1, y1, x2, y2, amt = 1.2) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const n = Math.max(1, Math.ceil(len / 18));
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [px, py] = wob(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, amt);
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.stroke();
}

// Adds a wobbly line to the current path without stroking, so many lines
// can be drawn with a single stroke() call.
export function seg(ctx, x1, y1, x2, y2, amt = 1.2) {
  const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 18));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [px, py] = wob(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, amt);
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
}

// Polygon or polyline through points, optionally filled
export function poly(ctx, pts, o = {}) {
  const amt = o.amt ?? 1.1;
  const closed = o.close ?? true;
  const n = pts.length;
  const segs = closed ? n : n - 1;
  ctx.beginPath();
  let first = true;
  for (let i = 0; i < segs; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n];
    const k = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 18));
    for (let j = first ? 0 : 1; j <= k; j++) {
      const t = j / k;
      const [px, py] = wob(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, amt);
      if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py);
    }
  }
  if (closed) ctx.closePath();
  if (o.fill) { ctx.fillStyle = o.fill === true ? paperFill : o.fill; ctx.fill(); }
  if (o.stroke !== false) ctx.stroke();
}

export function rect(ctx, x, y, w, h, o) {
  poly(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o);
}

export function ellipse(ctx, cx, cy, rx, ry, o = {}) {
  const amt = o.amt ?? 0.9;
  const n = Math.max(10, Math.ceil((rx + ry) * 0.6));
  const spike = o.spike || 0;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const k = i % n;
    const a = (k / n) * Math.PI * 2 + (o.rot || 0);
    const r = spike ? (k % 2 ? 1 - spike : 1) : 1;
    const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
    const s = seedOf(cx + k * 17.3, cy - k * 11.1);
    const px = x + jit(s, amt), py = y + jit(s ^ 0x5bd1e995, amt);
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
  if (o.fill) { ctx.fillStyle = o.fill === true ? paperFill : o.fill; ctx.fill(); }
  if (o.stroke !== false) ctx.stroke();
}
export function circle(ctx, cx, cy, r, o) { ellipse(ctx, cx, cy, r, r, o); }

// Smooth curve through points
export function curve(ctx, pts, amt = 0.8) {
  const p = pts.map(([x, y]) => wob(x, y, amt));
  ctx.beginPath();
  ctx.moveTo(p[0][0], p[0][1]);
  if (p.length === 2) ctx.lineTo(p[1][0], p[1][1]);
  for (let i = 1; i < p.length - 1; i++) {
    const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2;
    if (i === p.length - 2) ctx.quadraticCurveTo(p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]);
    else ctx.quadraticCurveTo(p[i][0], p[i][1], mx, my);
  }
  ctx.stroke();
}

export function arc(ctx, cx, cy, rx, ry, a0, a1, amt = 0.7) {
  const n = Math.max(3, Math.ceil(Math.abs(a1 - a0) * (rx + ry) / 14));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  curve(ctx, pts, amt);
}

export function dot(ctx, x, y, r = 1.6, color = INK) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function zigzag(ctx, x1, y1, x2, y2, amp = 4, n = 6) {
  const pts = [];
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = i % 2 ? amp : -amp;
    pts.push([x1 + dx * t + nx * s, y1 + dy * t + ny * s]);
  }
  poly(ctx, pts, { close: false, amt: 0.6 });
}

export const FONT = "'Patrick Hand', 'Comic Sans MS', cursive";
export const FONT_SC = "'Patrick Hand SC', 'Patrick Hand', cursive";

export function text(ctx, str, x, y, size = 20, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  // keep text readable when a sprite is mirrored
  if (ctx.getTransform().a < 0) ctx.scale(-1, 1);
  ctx.rotate((o.rot || 0) + jit(seedOf(x, y), 0.012));
  ctx.font = `${o.weight || ''} ${size}px ${o.sc ? FONT_SC : FONT}`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.base || 'middle';
  ctx.fillStyle = o.color || INK;
  ctx.fillText(str, 0, 0);
  ctx.restore();
}

export function star(ctx, cx, cy, r, o = {}) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5 + (o.rot || 0);
    const rr = i % 2 ? r * 0.45 : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  poly(ctx, pts, { amt: o.amt ?? 0.5, fill: o.fill });
}

export function heart(ctx, cx, cy, r, o = {}) {
  const pts = [];
  for (let i = 0; i < 20; i++) {
    const t = (i / 20) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push([cx + (x * r) / 16, cy + (y * r) / 16]);
  }
  poly(ctx, pts, { amt: 0.5, fill: o.fill });
}

// Diagonal hatching inside a rectangle
export function hatch(ctx, x, y, w, h, gap = 9, amt = 0.8) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let d = -h; d < w; d += gap) line(ctx, x + d, y + h, x + d + h, y, amt);
  ctx.restore();
}

// Tangled scribble inside a rectangle (used for gloom)
export function scribble(ctx, x, y, w, h, seed = 1, n = 14) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    pts.push([x + hash(seed * 31 + i * 7) * w, y + hash(seed * 17 + i * 13) * h]);
  }
  curve(ctx, pts, 2.2);
}

// Paper texture as a repeating pattern
const paperCache = new Map();
export function paperPattern(ctx, tone) {
  if (paperCache.has(tone)) return paperCache.get(tone);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = tone;
  g.fillRect(0, 0, 256, 256);
  // on dark card the light flecks need to be much fainter
  const n = parseInt(tone.slice(1), 16);
  const lum = ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11;
  const light = lum < 90 ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 2600; i++) {
    const x = hash(i * 3 + 1) * 256, y = hash(i * 5 + 2) * 256;
    const dark = hash(i * 7 + 3) > 0.5;
    g.fillStyle = dark ? 'rgba(80,60,30,0.07)' : light;
    g.fillRect(x, y, 1 + hash(i) * 1.5, 1 + hash(i + 9) * 1.5);
  }
  g.strokeStyle = 'rgba(90,70,40,0.07)';
  g.lineWidth = 0.7;
  for (let i = 0; i < 40; i++) {
    const x = hash(i * 11) * 256, y = hash(i * 13) * 256, a = hash(i * 17) * Math.PI;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12);
    g.stroke();
  }
  const p = ctx.createPattern(c, 'repeat');
  paperCache.set(tone, p);
  return p;
}
