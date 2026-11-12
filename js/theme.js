// Light and dark themes.
//
// Light mode is blue biro on cream card. Dark mode is silvery-white gel pen on
// navy card. Rather than threading a palette through every drawing function,
// a themed canvas context translates colours as they're set: biro blue becomes
// pale silver, January grey lightens, paper tones become navy, and colourful
// accents (gold stars, red hearts, egg nog) pass through unchanged.

let dark = false;
export function isDark() { return dark; }
export function setDark(v) { dark = !!v; }

// light paper tone -> dark card tone
const PAPER = {
  '#f6efdf': '#172036', // default cream; level 1; bonus
  '#eceeeb': '#161f30', // level 2 (rainy commute)
  '#f5eee2': '#1b1f36', // level 3 (gym)
  '#e3d1b0': '#262234', // level 4 (tax office, a warmer dark)
};

// rgb families -> dark equivalents (alpha is kept)
const RGB = [
  [[29, 79, 184], [226, 233, 250]],   // biro ink
  [[90, 100, 121], [160, 172, 200]],  // January gloom
  [[43, 72, 150], [70, 104, 196]],    // Blue Monday's header (keeps white text readable)
  [[80, 60, 30], [255, 255, 255]],    // paper speckles
  [[90, 70, 40], [255, 255, 255]],    // paper fibres
  [[0, 0, 0], [255, 255, 255]],       // unlit bulbs
  [[241, 200, 75], [245, 205, 85], 0.35], // gold star fills: more solid so they glow on navy
];

const HEX = {
  '#1d4fb8': '#e2e9fa',
  '#5a6479': '#a0acc8',
  '#c8323c': '#ff6b74', // red pen
  ...PAPER,
};

function hexToRgb(h) {
  const m = /^#([0-9a-f]{6})$/i.exec(h);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const cache = new Map();
export function mapColor(c) {
  if (!dark || typeof c !== 'string') return c;
  if (cache.has(c)) return cache.get(c);
  let out = c;
  const key = c.toLowerCase();
  if (HEX[key]) out = HEX[key];
  else {
    const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(key);
    if (m) {
      const rgb = [+m[1], +m[2], +m[3]];
      const hit = RGB.find(([from]) => from[0] === rgb[0] && from[1] === rgb[1] && from[2] === rgb[2]);
      if (hit) {
        const [r, g, b] = hit[1];
        const a = m[4] !== undefined ? Math.min(1, +m[4] + (hit[2] || 0)) : undefined;
        out = a !== undefined ? `rgba(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`;
      }
    }
  }
  cache.set(c, out);
  return out;
}

// The paper tone actually drawn for a light tone, in the current theme
export function paperTone(light) {
  return dark ? PAPER[light.toLowerCase()] || darken(light) : light;
}
function darken(h) {
  const rgb = hexToRgb(h);
  if (!rgb) return '#172036';
  return `#${rgb.map((v) => Math.round(v * 0.12 + 14).toString(16).padStart(2, '0')).join('')}`;
}

// Make a canvas context translate colours as they're set
export function themeContext(ctx) {
  if (!ctx || ctx.__themed || typeof CanvasRenderingContext2D === 'undefined') return ctx;
  for (const prop of ['strokeStyle', 'fillStyle']) {
    const desc = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, prop);
    if (!desc) continue;
    Object.defineProperty(ctx, prop, {
      configurable: true,
      get() { return desc.get.call(this); },
      set(v) { desc.set.call(this, mapColor(v)); },
    });
  }
  ctx.__themed = true;
  return ctx;
}
