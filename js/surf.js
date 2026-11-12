// Bonus level: Surf the Egg Nog Wave.
// An endless ride on a rolling wave of egg nog that keeps getting faster.
// Jump over floating hazards, don't jump into flying ones, collect stars.
// Tim can glide and throw; Rex can sprint straight through hazards.
// Three wipeouts and the ride is over. Score is distance ridden plus stars and smashes.
import * as D from './draw.js';
import * as S from './sprites.js';
import { CHARACTERS } from './characters.js';
import { sfx, playMusic } from './audio.js';
import { input } from './input.js';

export const BONUS = 4;
export const BONUS_NAME = 'Surf the Egg Nog Wave';
const VW = 960, VH = 560, STEP = 1 / 120;
const GRAV = 2100, JUMP_V = 780, GLIDE_FALL = 115;
const PX = 260; // player's position across the screen
const NOG = '#f3e2b3';
const PX_PER_M = 40;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class Surf {
  constructor(canvas, hooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
    this.running = false;
    this.paused = false;
    this.scale = 1;
    this.acc = 0;
    this.frame = this.frame.bind(this);
  }

  resize(cssW, cssH, dpr) {
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.scale = this.canvas.width / VW;
    if (this.running) this.render();
  }

  start(charId, card, best = 0) {
    this.charId = charId;
    this.ch = CHARACTERS[charId];
    this.card = card;
    this.bestM = best;
    this.reset();
    this.running = true;
    this.paused = false;
    this.last = performance.now();
    this.acc = 0;
    playMusic('jingle');
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  stop() { this.running = false; }
  setPaused(v) { this.paused = v; this.last = performance.now(); }

  frame(now) {
    if (!this.running) { this.raf = null; return; }
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (input.pausePressed) {
      input.pausePressed = false;
      if (!this.paused && this.state === 'play') this.hooks.onPause();
    }
    if (!this.paused) {
      this.acc += dt;
      while (this.acc >= STEP) {
        this.update(STEP);
        this.acc -= STEP;
      }
    }
    this.render();
  }

  reset() {
    this.time = 0;
    this.dist = 0;
    this.speed = 280;
    this.state = 'play';
    this.endTimer = 0;
    this.reported = false;
    this.p = {
      y: 0, vy: 0, onBoard: true, hp: 3, inv: 0, sprintT: 0, sprintCD: 0,
      throwCD: 0, throwAnim: 0, gliding: false, tilt: 0, phase: 0,
    };
    this.p.y = this.surfY(PX);
    this.items = [];
    this.snacks = [];
    this.particles = [];
    this.toasts = [];
    this.stats = { stars: 0, total: 0, smashed: 0, wipeouts: 0 };
    this.nextSpawn = 700;
    this.nextMilestone = 100;
    this.banner = 4;
    this.state = 'play';
  }

  // Height of the egg nog at a world x, rolling over time
  surfY(wx) {
    const t = this.time;
    return 395 + 44 * Math.sin(wx / 240 + t * 0.6) + 22 * Math.sin(wx / 97 + 1.3 - t * 0.4) + 9 * Math.sin(wx / 41 + t * 1.3);
  }

  // ---------- Spawning ----------
  spawn(wx) {
    const k = Math.min(1, this.dist / 24000); // 0 at the start, 1 after about 600 m
    const r = Math.random();
    const early = this.dist < 1600;
    const starArc = (x, n, base = 60, h = 70) => {
      for (let i = 0; i < n; i++) {
        this.items.push({ kind: 'star', wx: x + i * 46, off: base + Math.sin((i / Math.max(1, n - 1)) * Math.PI) * h });
        this.stats.total++;
      }
    };
    if (early ? r < 0.45 : r < 0.25) {
      starArc(wx, 5, 50, 40);
      return 420;
    }
    if (early || r < 0.6) {
      const look = ['sprout', 'pudding', 'cracker'][Math.floor(Math.random() * 3)];
      this.items.push({ kind: 'float', look, wx, off: 0, w: 40, h: 34 });
      starArc(wx - 46, 3, 90, 50);
      return 520 - 160 * k + Math.random() * 120;
    }
    if (r < 0.82) {
      this.items.push({ kind: 'fly', wx, off: 120, w: 46, h: 30, phase: Math.random() * 6 });
      starArc(wx - 60, 4, 30, 0);
      return 480 - 120 * k + Math.random() * 120;
    }
    // two hazards close together: a long jump, a glide or a sprint
    const look = ['sprout', 'pudding', 'cracker'][Math.floor(Math.random() * 3)];
    this.items.push({ kind: 'float', look, wx, off: 0, w: 40, h: 34 });
    this.items.push({ kind: 'float', look: 'pudding', wx: wx + 120, off: 0, w: 40, h: 34 });
    starArc(wx - 20, 4, 140, 30);
    return 640 - 160 * k + Math.random() * 120;
  }

  // ---------- Update ----------
  update(dt) {
    this.time += dt;
    const jp = input.jumpPressed, sp = input.specialPressed;
    input.jumpPressed = false;
    input.specialPressed = false;
    const p = this.p;
    this.banner = Math.max(0, this.banner - dt);
    this.toasts = this.toasts.filter((t) => (t.life -= dt) > 0);
    this.updateParticles(dt);

    if (this.state === 'over') {
      this.endTimer -= dt;
      p.vy += 300 * dt;
      p.y += p.vy * dt;
      this.dist += this.speed * 0.3 * dt;
      if (this.endTimer <= 0 && !this.reported) {
        this.reported = true;
        this.hooks.onComplete(this.result());
      }
      return;
    }

    this.speed = Math.min(660, 280 + this.time * 6);
    const mult = p.sprintT > 0 ? 1.8 : 1;
    this.dist += this.speed * mult * dt;
    p.inv = Math.max(0, p.inv - dt);
    p.sprintCD -= dt;
    p.throwCD -= dt;
    p.throwAnim -= dt;
    p.phase += dt * 6;

    // special moves
    if (sp) {
      if (this.ch.abilities.throw && p.throwCD <= 0 && this.snacks.length < 3) {
        this.snacks.push({ x: PX + 14, y: p.y - 46, vx: 620, vy: -220, rot: 0, life: 1.4 });
        p.throwCD = 0.3;
        p.throwAnim = 0.18;
        sfx.throw();
      }
      if (this.ch.abilities.sprint && p.sprintCD <= 0) {
        p.sprintT = 0.65;
        p.sprintCD = 1.6;
        sfx.sprint();
      }
    }
    if (p.sprintT > 0) {
      p.sprintT -= dt;
      if (Math.random() < 0.5) this.particles.push({ type: 'line', x: PX - 30, y: p.y - 20 - Math.random() * 40, vx: -400, vy: 0, life: 0.25, max: 0.25 });
    }

    // riding and jumping
    const surface = this.surfY(this.dist + PX);
    if (p.onBoard) {
      p.y = surface;
      p.vy = 0;
      p.gliding = false;
      if (jp) {
        p.onBoard = false;
        p.vy = -JUMP_V;
        sfx.jump();
        this.splash(PX, surface, 6);
      }
    } else {
      let g = GRAV;
      if (p.vy < 0 && !input.jump) g *= 2.4;
      p.vy += g * dt;
      p.gliding = false;
      if (this.ch.abilities.glide && input.jump && p.vy > 0) {
        p.vy = Math.min(p.vy, GLIDE_FALL);
        p.gliding = true;
      }
      p.y += p.vy * dt;
      if (p.y >= surface) {
        p.y = surface;
        p.onBoard = true;
        p.vy = 0;
        this.splash(PX, surface, 8);
      }
    }
    const slope = (this.surfY(this.dist + PX + 12) - this.surfY(this.dist + PX - 12)) / 24;
    p.tilt = p.onBoard ? Math.atan(slope) : p.tilt * 0.95;

    // spawn ahead
    while (this.nextSpawn < this.dist + VW + 300) this.nextSpawn += this.spawn(this.nextSpawn);

    // collisions
    const box = { x: PX - 14, y: p.y - 58, w: 28, h: 52 };
    for (const it of this.items) {
      if (it.gone) continue;
      const sx = it.wx - this.dist;
      if (sx < -80) { it.gone = true; continue; }
      if (sx > VW + 80) continue;
      const iy = this.itemY(it);
      if (it.kind === 'star') {
        if (Math.abs(sx - PX) < 26 && Math.abs(iy - (p.y - 30)) < 40) {
          it.gone = true;
          this.stats.stars++;
          sfx.spark();
          this.burst(sx, iy, 4, 'star');
        }
        continue;
      }
      const hb = { x: sx - it.w / 2, y: iy - it.h, w: it.w, h: it.h };
      if (!overlap(box, hb)) continue;
      if (p.sprintT > 0) {
        this.smash(it, sx, iy);
      } else if (p.inv <= 0) {
        it.gone = true;
        this.wipeout(sx, iy);
      }
    }
    this.items = this.items.filter((it) => !it.gone);

    // thrown snacks
    for (const s of this.snacks) {
      s.vy += 1100 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += dt * 14;
      s.life -= dt;
      if (s.y > this.surfY(this.dist + s.x)) { s.life = 0; this.splash(s.x, s.y, 4); continue; }
      for (const it of this.items) {
        if (it.kind === 'star' || it.gone) continue;
        const sx = it.wx - this.dist, iy = this.itemY(it);
        if (Math.abs(s.x - sx) < it.w / 2 + 8 && s.y > iy - it.h - 8 && s.y < iy + 8) {
          this.smash(it, sx, iy);
          s.life = 0;
          break;
        }
      }
    }
    this.snacks = this.snacks.filter((s) => s.life > 0 && s.x < VW + 40);

    const m = Math.floor(this.dist / PX_PER_M);
    if (m >= this.nextMilestone) {
      this.toast(m === this.bestM ? 'Your best!' : `${this.nextMilestone} m!`);
      this.nextMilestone += 100;
    }
  }

  itemY(it) {
    const base = this.surfY(it.wx);
    if (it.kind === 'fly') return base - it.off + Math.sin(this.time * 3 + it.phase) * 12 + it.h / 2;
    if (it.kind === 'float') return base + 6 + Math.sin(this.time * 4 + it.wx) * 2;
    return base - it.off;
  }

  smash(it, sx, iy) {
    it.gone = true;
    this.stats.smashed++;
    sfx.stomp();
    this.burst(sx, iy - 15, 8, 'dot');
    this.particles.push({ type: 'text', text: 'smashed!', x: sx, y: iy - 50, vx: 0, vy: -50, life: 0.9, max: 0.9 });
  }

  wipeout(sx, iy) {
    const p = this.p;
    p.hp--;
    p.inv = 1.6;
    this.stats.wipeouts++;
    sfx.hurt();
    this.splash(sx, iy, 14);
    if (p.hp <= 0) {
      this.state = 'over';
      this.endTimer = 2.6;
      p.vy = -300;
      sfx.die();
      this.toast(`Wiped out at ${Math.floor(this.dist / PX_PER_M)} m!`);
    } else {
      this.toast(p.hp === 1 ? 'Last chance!' : 'Splash! Hold on...');
    }
  }

  result() {
    const distance = Math.floor(this.dist / PX_PER_M);
    const s = this.stats;
    const score = distance * 2 + s.stars * 4 + s.smashed * 20;
    return {
      level: BONUS, bonus: true, distance, sparks: s.stars, total: s.total, smashed: s.smashed,
      secrets: 0, secretTotal: 0, deaths: 0, enemies: s.smashed, time: this.time, timeBonus: 0, score,
    };
  }

  toast(text) {
    this.toasts = this.toasts.filter((t) => t.text !== text);
    this.toasts.push({ text, life: 2.2 });
    if (this.toasts.length > 2) this.toasts.shift();
  }

  splash(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        type: 'drop', x: x + (Math.random() - 0.5) * 30, y,
        vx: (Math.random() - 0.7) * 200, vy: -150 - Math.random() * 250, g: 900, life: 0.7, max: 0.7, r: 2 + Math.random() * 3,
      });
    }
  }

  burst(x, y, n, type) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 180;
      this.particles.push({ type, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100, g: 500, life: 0.6, max: 0.6 });
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  // ---------- Drawing ----------
  render() {
    const ctx = this.ctx;
    D.setBoil(this.time);
    D.setPaper('#f6efdf');
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.fillStyle = D.paperPattern(ctx, '#f6efdf');
    ctx.fillRect(0, 0, VW, VH);

    this.drawSky(ctx);
    this.drawNog(ctx);
    this.drawWaveCrest(ctx);

    for (const it of this.items) {
      const sx = it.wx - this.dist;
      if (sx < -80 || sx > VW + 80) continue;
      const iy = this.itemY(it);
      ctx.save();
      ctx.translate(sx, iy);
      if (it.kind === 'star') S.drawSpark(ctx, this.time, it.wx);
      else if (it.kind === 'fly') drawFruitcake(ctx, this.time + it.phase);
      else if (it.look === 'sprout') { ctx.scale(1.2, 1.2); S.drawWalker(ctx, 1, 0); }
      else if (it.look === 'pudding') drawPudding(ctx);
      else drawCracker(ctx);
      ctx.restore();
    }

    for (const s of this.snacks) {
      ctx.save();
      ctx.translate(s.x, s.y);
      S.drawSnack(ctx, s.rot, 0.8);
      ctx.restore();
    }

    this.drawPlayer(ctx);
    this.drawParticles(ctx);
    this.drawHUD(ctx);
  }

  drawSky(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    D.pen(ctx, D.INK, 2);
    D.circle(ctx, 820, 90, 34, { fill: 'rgba(241,200,75,0.5)' });
    // rooftops with fairy lights, far away
    const off = (this.dist * 0.15) % 220;
    const cols = [D.RED, D.GOLD, '#3b9ad9', '#4caf6a'];
    for (let i = -1; i < 7; i++) {
      const x = i * 220 - off;
      const k = Math.floor((this.dist * 0.15) / 220) + i;
      const h = 70 + D.hash(k * 31) * 60;
      D.poly(ctx, [[x, 300], [x, 300 - h], [x + 60, 300 - h - 40], [x + 120, 300 - h], [x + 120, 300]], { close: false });
      D.rect(ctx, x + 45, 300 - h + 10, 26, 26);
      for (let j = 0; j < 6; j++) D.dot(ctx, x + j * 22, 300 - h + 4 + Math.sin(j) * 4, 3, cols[(j + k) % 4]);
    }
    ctx.restore();
  }

  drawNog(ctx) {
    const pts = [];
    for (let x = -10; x <= VW + 20; x += 16) pts.push([x, this.surfY(this.dist + x)]);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-10, VH + 10);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.lineTo(VW + 20, VH + 10);
    ctx.closePath();
    ctx.fillStyle = NOG;
    ctx.fill();
    ctx.clip();
    // nutmeg speckles, fixed to the nog
    for (let i = 0; i < 90; i++) {
      const x = ((D.hash(i * 7 + Math.floor(this.dist / 1200)) * (VW + 40)) - (this.dist * 0.6) % (VW + 40) + VW + 40) % (VW + 40) - 20;
      const y = this.surfY(this.dist + x) + 18 + D.hash(i * 13) * 140;
      D.dot(ctx, x, y, 1.6, 'rgba(140,90,40,0.45)');
    }
    // swirls of cream
    D.pen(ctx, 'rgba(29,79,184,0.25)', 1.6);
    for (let x = -60; x < VW + 60; x += 120) {
      const wx = x - (this.dist % 120);
      const y = this.surfY(this.dist + wx) + 50;
      D.arc(ctx, wx, y, 22, 8, Math.PI * 0.1, Math.PI * 1.1, 0.5);
    }
    ctx.restore();
    D.pen(ctx, D.INK, 2.6);
    D.poly(ctx, pts, { close: false, amt: 0.8 });
    D.text(ctx, 'EGG NOG', VW - 120, VH - 40, 30, { sc: true, color: 'rgba(29,79,184,0.35)' });
  }

  drawWaveCrest(ctx) {
    // the big wave chasing the player from the left: a tall face sloping down
    // into the nog, with a lip curling over and foam along the top
    const t = this.time;
    const top = 110 + Math.sin(t * 1.5) * 10;
    const reach = 190;
    const end = this.surfY(this.dist + reach);
    const face = (x) => top + 20 + Math.pow(x / reach, 2.2) * (end - top - 20);
    const pts = [[-20, VH + 10], [-20, top + 30]];
    for (let x = 0; x < reach; x += 12) pts.push([x, face(x)]);
    pts.push([reach, end]);
    pts.push([reach + 10, VH + 10]);
    ctx.save();
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = NOG;
    ctx.fill();
    D.pen(ctx, D.INK, 2.6);
    D.poly(ctx, pts.slice(1, -1), { close: false, amt: 0.8 });
    // the curling lip
    const lx = 60 + Math.sin(t * 2) * 6, ly = top + 18;
    ctx.beginPath();
    ctx.moveTo(-20, top + 30);
    ctx.quadraticCurveTo(lx, top - 40, lx + 70, ly + 10);
    ctx.quadraticCurveTo(lx + 40, ly - 10, lx + 30, ly + 22);
    ctx.quadraticCurveTo(lx, ly + 10, -20, top + 46);
    ctx.closePath();
    ctx.fillStyle = NOG;
    ctx.fill();
    D.curve(ctx, [[-20, top + 30], [lx, top - 30], [lx + 70, ly + 10]], 0.8);
    D.curve(ctx, [[lx + 70, ly + 10], [lx + 44, ly], [lx + 30, ly + 22]], 0.6);
    // inner swirl and foam
    D.pen(ctx, 'rgba(29,79,184,0.4)', 1.8);
    D.arc(ctx, 40, top + 90, 26, 22, Math.PI * 1.2, Math.PI * 2.4, 0.6);
    D.arc(ctx, 30, top + 160, 18, 14, Math.PI * 1.1, Math.PI * 2.2, 0.6);
    for (let i = 0; i < 7; i++) {
      const fx = lx + 70 - i * 16 + Math.sin(t * 5 + i) * 3;
      D.circle(ctx, fx, ly + 12 - Math.sin(i / 2) * 24 + Math.sin(t * 4 + i) * 3, 4 + (i % 3), { fill: '#fff', amt: 0.4 });
    }
    ctx.restore();
  }

  drawPlayer(ctx) {
    const p = this.p;
    if (this.state !== 'over' && p.inv > 0 && Math.floor(p.inv * 14) % 2) return;
    ctx.save();
    ctx.translate(PX, p.y);
    ctx.rotate(p.tilt * 0.8 + (this.state === 'over' ? this.time * 3 : 0));
    // surfboard
    D.pen(ctx, D.INK, 2.4);
    D.ellipse(ctx, 0, -3, 40, 6, { fill: 'rgba(200,50,60,0.6)', amt: 0.5 });
    D.line(ctx, -32, -3, 32, -3, 0.4);
    let state = 'idle';
    if (p.sprintT > 0) state = 'sprint';
    else if (p.gliding) state = 'glide';
    else if (!p.onBoard) state = p.vy < 0 ? 'jump' : 'fall';
    else if (this.charId === 'rex') state = 'run';
    ctx.translate(0, -6);
    ctx.scale(1.3, 1.3);
    this.ch.draw(ctx, { state, t: this.time, phase: p.phase, throwing: p.throwAnim > 0 });
    ctx.restore();
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const k = p.life / p.max;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 1.5);
      if (p.type === 'drop') {
        ctx.fillStyle = NOG;
        ctx.strokeStyle = D.INK;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (p.type === 'star') {
        D.pen(ctx, D.INK, 1.5);
        D.star(ctx, p.x, p.y, 5, { fill: D.GOLD });
      } else if (p.type === 'line') {
        D.pen(ctx, D.INK, 2);
        D.line(ctx, p.x, p.y, p.x - 20, p.y, 0.3);
      } else if (p.type === 'text') {
        D.text(ctx, p.text, p.x, p.y, 20);
      } else {
        D.dot(ctx, p.x, p.y, 2.5, D.INK);
      }
      ctx.restore();
    }
  }

  drawHUD(ctx) {
    const p = this.p, s = this.stats;
    D.pen(ctx, D.RED, 2.2);
    for (let i = 0; i < 3; i++) D.heart(ctx, 30 + i * 34, 32, 13, { fill: i < p.hp ? 'rgba(200,50,60,0.75)' : null });
    D.pen(ctx, D.INK, 2);
    D.star(ctx, 148, 32, 13, { fill: 'rgba(241,200,75,0.7)' });
    D.text(ctx, `${s.stars}`, 168, 33, 26, { align: 'left' });
    const m = Math.floor(this.dist / PX_PER_M);
    D.text(ctx, `${m} m`, VW / 2, 32, 34, { sc: true });
    if (this.bestM) D.text(ctx, `best ${this.bestM} m`, VW / 2, 62, 18);

    if (this.banner > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.banner);
      D.text(ctx, 'Bonus level', VW / 2, 150, 30);
      D.text(ctx, BONUS_NAME, VW / 2, 198, 54, { sc: true });
      D.text(ctx, 'Jump the floating hazards, keep clear of the flying ones. Ride as far as you can!', VW / 2, 245, 21);
      ctx.restore();
    }
    this.toasts.forEach((t, i) => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, t.life * 2);
      D.text(ctx, t.text, VW / 2, 110 + i * 34, 28);
      ctx.restore();
    });
  }
}

// ---------- Egg nog hazards ----------
function drawPudding(ctx) {
  D.pen(ctx, D.INK, 2.2);
  D.circle(ctx, 0, -18, 18, { fill: 'rgba(120,70,40,0.65)' });
  D.poly(ctx, [[-16, -26], [-10, -20], [-4, -25], [2, -18], [8, -25], [14, -20], [16, -27], [10, -35], [-10, -35]], { fill: '#fff', amt: 0.4 });
  D.ellipse(ctx, -4, -38, 6, 3, { rot: -0.4, amt: 0.3, fill: 'rgba(76,175,106,0.5)' });
  D.ellipse(ctx, 6, -38, 6, 3, { rot: 0.4, amt: 0.3, fill: 'rgba(76,175,106,0.5)' });
  D.dot(ctx, 1, -39, 2.6, D.RED);
}

function drawCracker(ctx) {
  D.pen(ctx, D.INK, 2.2);
  ctx.save();
  ctx.rotate(-0.15);
  D.rect(ctx, -14, -24, 28, 18, { fill: 'rgba(200,50,60,0.55)', amt: 0.4 });
  D.poly(ctx, [[-14, -24], [-24, -28], [-21, -15], [-24, -2], [-14, -6]], { fill: 'rgba(241,200,75,0.6)', amt: 0.3 });
  D.poly(ctx, [[14, -24], [24, -28], [21, -15], [24, -2], [14, -6]], { fill: 'rgba(241,200,75,0.6)', amt: 0.3 });
  D.text(ctx, 'BANG', 0, -15, 9, { color: '#fff' });
  ctx.restore();
}

function drawFruitcake(ctx, t) {
  D.pen(ctx, D.INK, 2.2);
  const flap = Math.sin(t * 14) * 8;
  D.poly(ctx, [[-8, -16], [-26, -26 - flap], [-14, -10]], { fill: true, amt: 0.3 });
  D.poly(ctx, [[8, -16], [26, -26 - flap], [14, -10]], { fill: true, amt: 0.3 });
  D.rect(ctx, -18, -26, 36, 22, { fill: 'rgba(120,70,40,0.6)', amt: 0.4 });
  for (const [x, y, c] of [[-10, -18, D.RED], [0, -12, '#4caf6a'], [9, -20, D.GOLD], [6, -9, D.RED]]) D.dot(ctx, x, y, 2.4, c);
  D.text(ctx, 'fruitcake', 0, -36, 11);
}
