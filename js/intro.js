// The intro: a 20-second hand-drawn cutscene before level 1.
//   1. Christmas News: the Seasonal Spirit has gone.
//   2. The double take: your character slowly turns to camera. Cut to a wide shot.
//   3. Why: January came early and drained the Seasonal Spirit.
//   4. How: only your character can bring it back.
// Tap, click or press a key to jump to the next scene; "Skip intro" ends it.
import * as D from './draw.js';
import * as S from './sprites.js';
import { CHARACTERS } from './characters.js';
import { sfx } from './audio.js';
import { themeContext, paperTone } from './theme.js';

const VW = 960, VH = 560;
const SCENES = [5, 4.6, 5, 5.4]; // seconds each

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const clamp01 = (x) => Math.max(0, Math.min(1, x));

export class Intro {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = themeContext(canvas.getContext('2d'));
    this.running = false;
    this.frame = this.frame.bind(this);
  }

  resize(cssW, cssH, dpr) {
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.scale = this.canvas.width / VW;
  }

  play(charId, onDone) {
    this.ch = CHARACTERS[charId];
    this.onDone = onDone;
    this.scene = 0;
    this.t = 0;
    this.cues = new Set();
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  next() {
    if (!this.running) return;
    if (this.scene >= SCENES.length - 1) return this.finish();
    this.scene++;
    this.t = 0;
  }

  finish() {
    if (!this.running) return;
    this.running = false;
    this.onDone?.();
  }

  cue(name, fn) {
    const key = `${this.scene}:${name}`;
    if (this.cues.has(key)) return;
    this.cues.add(key);
    fn();
  }

  frame(now) {
    if (!this.running) return;
    requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    if (this.t >= SCENES[this.scene]) {
      if (this.scene === SCENES.length - 1) { this.finish(); return; }
      this.scene++;
      this.t = 0;
    }
    this.render(now / 1000);
  }

  // ---------- Drawing ----------
  render(clock) {
    const ctx = this.ctx;
    D.setBoil(clock);
    D.setPaper(paperTone('#f6efdf'));
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.fillStyle = D.paperPattern(ctx, paperTone('#f6efdf'));
    ctx.fillRect(0, 0, VW, VH);
    const t = this.t;
    [this.news, this.doubleTake, this.why, this.how][this.scene].call(this, ctx, t, clock);
    // scene dots and the skip hint
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    for (let i = 0; i < SCENES.length; i++) D.dot(ctx, VW / 2 - 30 + i * 20, VH - 20, i === this.scene ? 5 : 3, i === this.scene ? D.INK : D.INK_SOFT);
    D.text(ctx, 'tap for the next scene', VW - 20, VH - 20, 16, { align: 'right', color: D.INK_SOFT });
  }

  character(ctx, x, y, scale, pose, facing = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * facing, scale);
    this.ch.draw(ctx, pose);
    ctx.restore();
  }

  // the Christmas News studio, shared by scenes 1 and 2
  studio(ctx, clock, { faceCam = false, freeze = false, noChar = false } = {}) {
    const ct = freeze ? 0 : clock;
    // back wall: big windows with city lights, like a late-night news set
    ctx.save();
    ctx.globalAlpha = 0.35;
    D.pen(ctx, D.INK, 2);
    for (let i = 0; i < 4; i++) D.rect(ctx, 60 + i * 220, 70, 190, 190, { amt: 1 });
    for (let i = 0; i < 26; i++) D.dot(ctx, 70 + D.hash(i * 5) * 820, 120 + D.hash(i * 9) * 130, 2.5, i % 3 ? D.GOLD : D.INK);
    ctx.restore();
    // the news logo
    D.pen(ctx, D.INK, 2.4);
    D.rect(ctx, 24, 22, 220, 44, { fill: 'rgba(200,50,60,0.85)' });
    D.text(ctx, 'CHRISTMAS NEWS', 134, 45, 24, { color: '#fff', sc: true });
    D.dot(ctx, 262, 44, 6, D.RED);
    D.text(ctx, 'LIVE', 296, 45, 18, { color: D.RED, sc: true });
    // round desk
    D.pen(ctx, D.INK, 2.6);
    D.ellipse(ctx, 480, 450, 330, 46, { fill: 'rgba(59,154,217,0.18)' });
    D.line(ctx, 160, 455, 170, 520, 1);
    D.line(ctx, 800, 455, 790, 520, 1);
    D.ellipse(ctx, 480, 440, 18, 8, { fill: true, amt: 0.4 });
    D.line(ctx, 462, 440, 464, 420, 0.3);
    D.line(ctx, 498, 440, 496, 420, 0.3);
    // presenter, waving her script about
    presenter(ctx, 220, 430, ct);
    // a snowman guest, who also looks worried
    snowman(ctx, 380, 432, ct);
    // the selected character, on the panel
    if (noChar) return;
    const bob = freeze ? 0 : Math.sin(ct * 2) * 1;
    this.character(ctx, 620, 432 + bob, 2.2, { state: 'idle', t: ct }, faceCam ? 1 : -1);
  }

  news(ctx, t, clock) {
    this.studio(ctx, clock);
    if (t > 0.6) this.cue('sting', () => sfx.checkpoint());
    // presenter speech
    if (t > 0.9) S.drawBubble(ctx, 'Good evening. Breaking news: the Seasonal Spirit has gone.', 240, 250, 300);
    // ticker along the bottom
    D.pen(ctx, D.INK, 2.4);
    D.rect(ctx, 0, 488, VW, 34, { fill: 'rgba(200,50,60,0.85)', amt: 0.6 });
    D.rect(ctx, 0, 488, 150, 34, { fill: 'rgba(241,200,75,0.95)', amt: 0.6 });
    D.text(ctx, 'BREAKING', 75, 506, 20, { sc: true });
    ctx.save();
    ctx.beginPath();
    ctx.rect(152, 488, VW - 152, 34);
    ctx.clip();
    const msg = 'SEASONAL SPIRIT MISSING  ★  CHRISTMAS CANCELLED?  ★  NATION IN SHOCK  ★  ';
    D.text(ctx, msg + msg, VW - t * 160, 506, 19, { align: 'left', color: '#fff', sc: true });
    ctx.restore();
  }

  doubleTake(ctx, t, clock) {
    if (t < 3.3) {
      // close-up: the camera creeps in while the character slowly turns to camera
      const zoom = 1.25 + ease(t / 3.3) * 0.75;
      const toScreen = () => {
        ctx.translate(VW / 2, VH / 2 - 10);
        ctx.scale(zoom, zoom);
        ctx.translate(-620, -340);
      };
      ctx.save();
      toScreen();
      this.studio(ctx, clock, { freeze: true, noChar: true });
      // the slow turn: from facing the presenter round to the camera
      let sx = t < 1 ? -1 : t < 2.4 ? -1 + 2 * ease((t - 1) / 1.4) : 1;
      if (Math.abs(sx) < 0.15) sx = 0.15 * (sx < 0 ? -1 : 1);
      const hop = t > 2.4 && t < 2.65 ? -6 : 0;
      ctx.translate(620, 432 + hop);
      ctx.scale(2.2 * sx, 2.2);
      this.ch.draw(ctx, { state: t > 2.4 && t < 2.7 ? 'jump' : 'idle', t: 0 });
      ctx.restore();
      if (t < 1) D.text(ctx, '...', VW / 2, 90, 40);
      if (t > 2.4) {
        this.cue('take', () => sfx.slam());
        const k = clamp01((t - 2.4) / 0.25);
        D.pen(ctx, D.INK, 3);
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i - 2.5) * 0.35;
          D.line(ctx, VW / 2 + Math.cos(a) * 200, 170 + Math.sin(a) * 90, VW / 2 + Math.cos(a) * (200 + 50 * k), 170 + Math.sin(a) * (90 + 30 * k), 0.6);
        }
        D.text(ctx, '?!', VW / 2 + 210, 130, 70, { color: D.RED });
      }
    } else {
      // cut to the wide shot: everyone frozen, the character staring down the camera
      this.studio(ctx, clock, { faceCam: true, freeze: true });
      D.text(ctx, '...', 620, 250, 34);
    }
  }

  why(ctx, t, clock) {
    D.text(ctx, 'January came early...', VW / 2, 60, 40, { sc: true });
    // calendar flipping from Christmas to January
    const day = t < 0.6 ? 'DEC 24' : t < 1.2 ? 'DEC 25' : t < 1.8 ? 'DEC 31' : 'JAN 1';
    D.pen(ctx, D.INK, 2.4);
    D.rect(ctx, 110, 190, 140, 160, { fill: true });
    D.rect(ctx, 110, 190, 140, 36, { fill: day.startsWith('JAN') ? 'rgba(90,100,121,0.85)' : 'rgba(200,50,60,0.85)' });
    D.text(ctx, day.split(' ')[0], 180, 208, 22, { color: '#fff', sc: true });
    D.text(ctx, day.split(' ')[1], 180, 288, 64, { color: day.startsWith('JAN') ? D.GLOOM : D.RED });
    if (t > 1.8) this.cue('jan', () => sfx.hurt());
    // the tree, fading from lit to sad
    const lit = t < 3.2;
    ctx.save();
    ctx.translate(560, 470);
    ctx.scale(1.6, 1.6);
    S.drawTree(ctx, lit, clock);
    ctx.restore();
    // January's minions creep in from the right and haul the spirit away in a sack
    const creep = ease(clamp01((t - 0.8) / 1.6));
    ctx.save();
    ctx.translate(VW + 60 - creep * 220, 470);
    ctx.scale(1.8, 1.8);
    S.drawWalker(ctx, 1, clock);
    ctx.restore();
    ctx.save();
    ctx.translate(VW + 160 - creep * 210, 470);
    ctx.scale(1.8, 1.8);
    S.drawWalker(ctx, 4, clock + 1);
    ctx.restore();
    ctx.save();
    ctx.translate(VW + 40 - creep * 160, 210 + Math.sin(clock * 2) * 8);
    ctx.scale(1.8, 1.8);
    S.drawFlyer(ctx, 2, clock);
    ctx.restore();
    // the sack, with stars streaming into it from the tree
    const sx = VW + 110 - creep * 220, sy = 440;
    D.pen(ctx, D.GLOOM, 2.4);
    D.ellipse(ctx, sx, sy, 34, 30, { fill: 'rgba(90,100,121,0.35)' });
    D.text(ctx, 'SPIRIT', sx, sy + 4, 13, { color: D.GLOOM, sc: true });
    if (t > 1.6 && t < 3.6) {
      for (let i = 0; i < 6; i++) {
        const k = ((t * 0.9 + i / 6) % 1);
        const x = 560 + (sx - 560) * k, y = 330 - Math.sin(k * Math.PI) * 120 + (sy - 330) * k;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(0.8, 0.8);
        S.drawSpark(ctx, clock, i);
        ctx.restore();
      }
    }
    if (t > 2.4) D.text(ctx, '...and drained the Seasonal Spirit out of everything.', VW / 2, 110, 26);
  }

  how(ctx, t, clock) {
    const name = this.ch.name;
    D.text(ctx, `Only ${name} can bring it back.`, VW / 2, 60, 36, { sc: true });
    // four sad trees, lit one after another as the character runs past
    const run = clamp01(t / 4);
    const cx = 80 + run * 760;
    for (let i = 0; i < 4; i++) {
      const tx = 200 + i * 190;
      const lit = cx > tx + 10;
      if (lit) this.cue(`lit${i}`, () => sfx.spark());
      ctx.save();
      ctx.translate(tx, 440);
      ctx.scale(0.9, 0.9);
      S.drawTree(ctx, lit, clock);
      ctx.restore();
    }
    D.pen(ctx, D.INK, 2.2);
    D.line(ctx, 30, 442, 930, 442, 1.2);
    this.character(ctx, cx, 440, 1.9, { state: t < 4 ? 'run' : 'idle', t: clock, phase: clock * 14 }, 1);
    const lines = ['Light the Christmas trees.', 'Collect the stars of Seasonal Spirit.', 'Beat Blue Monday.'];
    lines.forEach((l, i) => {
      if (t > 0.6 + i * 1.1) D.text(ctx, l, VW / 2, 120 + i * 36, 26);
    });
    if (t > 4.1) {
      this.cue('go', () => sfx.win());
      D.text(ctx, "Let's go!", VW / 2, 270, 70, { sc: true, color: D.RED });
    }
  }
}

function presenter(ctx, x, y, t) {
  D.pen(ctx, D.INK, 2.3);
  D.poly(ctx, [[x - 22, y - 70], [x + 22, y - 70], [x + 26, y], [x - 26, y]], { fill: 'rgba(200,50,60,0.6)' });
  const wave = Math.sin(t * 3) * 6;
  D.line(ctx, x + 18, y - 62, x + 46, y - 80 + wave, 0.4);
  D.poly(ctx, [[x + 40, y - 96 + wave], [x + 62, y - 92 + wave], [x + 58, y - 70 + wave], [x + 36, y - 74 + wave]], { fill: true, amt: 0.4 });
  D.line(ctx, x - 18, y - 62, x - 30, y - 30, 0.4);
  D.circle(ctx, x, y - 92, 20, { fill: true });
  // long hair either side
  D.curve(ctx, [[x - 18, y - 104], [x - 26, y - 84], [x - 22, y - 62]], 0.5);
  D.curve(ctx, [[x + 18, y - 104], [x + 26, y - 84], [x + 22, y - 62]], 0.5);
  D.arc(ctx, x, y - 96, 21, 16, Math.PI, Math.PI * 2, 0.4);
  D.dot(ctx, x - 6, y - 94, 2);
  D.dot(ctx, x + 7, y - 94, 2);
  D.arc(ctx, x, y - 84, 6, 3, 0.2, Math.PI - 0.2, 0.2);
}

function snowman(ctx, x, y, t) {
  D.pen(ctx, D.INK, 2.3);
  D.circle(ctx, x, y - 34, 34, { fill: true });
  D.circle(ctx, x, y - 96, 24, { fill: true });
  D.dot(ctx, x - 8, y - 100, 2.4);
  D.dot(ctx, x + 8, y - 100, 2.4);
  D.poly(ctx, [[x, y - 94], [x + 20, y - 91], [x, y - 88]], { fill: 'rgba(245,150,40,0.85)', amt: 0.2 });
  D.arc(ctx, x, y - 80, 8, 4, Math.PI * 1.15, Math.PI * 1.85, 0.2);
  D.rect(ctx, x - 20, y - 122, 40, 6, { fill: 'rgba(29,79,184,0.8)', amt: 0.3 });
  D.rect(ctx, x - 13, y - 146, 26, 24, { fill: 'rgba(29,79,184,0.8)', amt: 0.3 });
  for (const yy of [y - 46, y - 30, y - 14]) D.dot(ctx, x, yy, 2.6);
  D.line(ctx, x - 30, y - 50, x - 54, y - 70 + Math.sin(t * 2) * 3, 0.5);
  D.line(ctx, x + 30, y - 50, x + 52, y - 66, 0.5);
}
