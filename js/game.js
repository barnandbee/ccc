// The platformer itself: physics, enemies, the boss and drawing.
import * as D from './draw.js';
import { themeContext, paperTone } from './theme.js';
import * as S from './sprites.js';
import { LEVELS, OFFICE, CELLAR, T, ROWS, TILE } from './levels.js';
import { CHARACTERS } from './characters.js';
import { sfx, playMusic } from './audio.js';
import { input } from './input.js';

export const VW = 960, VH = 560;
const GRAV = 2100, JUMP_V = 760, MAX_FALL = 950;
const COYOTE = 0.1, BUFFER = 0.13;
const SPRINT_V = 640, SPRINT_T = 0.38, SPRINT_CD = 0.85;
const STEP = 1 / 120;
export const LEVEL_MUSIC = ['deck', 'jingle', 'gym', 'godrest'];

// projectile kinds: Tim's prawns, Clive-Bot's magnet pulse, MacEagle's harp blast
const PROJ = {
  snack: { cd: 0.28, life: 1.6, g: 1300, speed: 520, vy: -320, pierce: false, dmg: 1, r: 10 },
  paper: { cd: 0.32, life: 1.6, g: 1300, speed: 500, vy: -360, pierce: false, dmg: 1, r: 12 }, // Blue Monday's deadline toss
  pulse: { cd: 0.3, life: 0.55, g: 0, speed: 640, vy: 0, pierce: false, dmg: 1, r: 12 },
  harp: { cd: 0.5, life: 1.0, g: 0, speed: 420, vy: 0, pierce: true, dmg: 2, r: 22 },
};
const POUNCE_V = 560;
// sprinting, charging or pouncing: smashes walls and minions, can't be hurt
const smashing = (o) => o.sprintT > 0 || o.pounceT > 0;
const isSolid = (v) => v === TILE.SOLID || v === TILE.CONV_L || v === TILE.CONV_R || v === TILE.GLOOM;
const approach = (v, target, d) => (v < target ? Math.min(v + d, target) : Math.max(v - d, target));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const REINDEER_SELLS = [
  'Use code REINDEER for 10% off!', 'Swipe up for festive savings!', 'This jumper? #gifted',
  'Link in bio!', 'Limited edition tinsel, only 9,000 left!', 'Smash that like button!',
];
const REINDEER_PLEADS = [
  'Look at me!', 'Hello?? Over here!', "Don't scroll past!", 'My engagement is dropping...',
  "I'm literally giving away a sleigh!", 'Is this thing on?',
];
const GIFT_LABELS = ['#AD', 'SWIPE UP', '#GIFTED', 'LINK IN BIO', '50% OFF*', 'SPONSORED'];

const CHEERS = {
  1: ['cheered up!', 'un-sprouted!', 'festive again!'],
  2: ['unsubscribed!', 'archived!', 'marked as read!'],
  3: ['resolution abandoned!', 'gone for a lie down!', 'cancelled membership!'],
  4: ['filed!', 'stamped!', 'shredded!'],
};

export class Game {
  constructor(canvas, hooks) {
    this.canvas = canvas;
    this.ctx = themeContext(canvas.getContext('2d'));
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

  start(levelIndex, charId, card, opts = {}) {
    this.charId = charId;
    this.ch = CHARACTERS[charId];
    this.card = card;
    this.officePrizeTaken = !!opts.officeDone;
    this.load(levelIndex);
    this.running = true;
    this.paused = false;
    this.last = performance.now();
    this.acc = 0;
    playMusic(LEVEL_MUSIC[levelIndex]);
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

  // ---------- Setup ----------
  load(i) {
    const L = LEVELS[i];
    this.levelIndex = i;
    this.L = L;
    this.cols = L.width;
    this.tiles = L.tiles.slice();
    this.Wpx = L.width * T;
    this.time = 0;
    this.clock = 0;
    this.sparks = L.sparks.map((s, k) => ({ x: s.x * T + T / 2, y: s.y * T + T / 2, got: false, seed: k }));
    this.secrets = L.secrets.map((s) => ({ x: s.x * T + T / 2, y: s.y * T + T / 2, got: false }));
    this.cps = L.checkpoints.map((c) => ({ x: c.x * T + T / 2, y: (c.y + 1) * T, on: false }));
    this.signs = L.signs.map((s) => ({
      x: s.x * T + T / 2,
      y: (s.y + 1) * T,
      text: typeof s.text === 'string' ? s.text : this.ch.hints[s.text.hint],
    }));
    this.walls = L.walls.map((w, k) => ({ ...w, hp: 3, alive: true, seed: k + 1, shake: 0 }));
    this.movers = L.movers.map((m) => ({
      x0: m.x * T, y0: m.y * T, x: m.x * T, y: m.y * T, w: m.w * T,
      range: m.range * T, axis: m.axis, speed: m.speed, t: 0, dx: 0, dy: 0,
    }));
    this.enemies = L.enemies.map((e) => this.makeEnemy(e, L.difficulty));
    this.exit = { x: L.exit.x * T + T / 2, y: (L.exit.y + 1) * T, lit: false, visible: !L.boss, drop: 0 };
    this.boss = L.boss ? this.makeBoss(L.boss) : null;
    this.gateClosed = false;
    this.snacks = [];
    this.stamps = [];
    this.missiles = [];
    this.waves = [];
    this.particles = [];
    this.toasts = [];
    this.spawn = { x: L.start.x * T + T / 2, y: (L.start.y + 1) * T };
    this.player = this.makePlayer(this.spawn);
    this.stats = { sparks: 0, secrets: 0, deaths: 0, hits: 0, total: this.sparks.length, enemies: 0, officeStars: 0, giant: 0 };
    this.cam = { x: clamp(this.spawn.x - VW / 3, 0, this.Wpx - VW) };
    this.state = 'play';
    this.endTimer = 0;
    this.reported = false;
    this.banner = 3;
    this.shake = 0;
    this.activeSign = null;
    this.office = null;
    this.cellar = null;
    this.trap = { open: false, creaked: false };
    this.trapSay = null;
    this.stash = null;
    this.doorPush = 0;
  }

  makePlayer(sp) {
    return {
      x: sp.x - 14, y: sp.y - 54, w: 28, h: 54, vx: 0, vy: 0,
      onGround: false, facing: 1, coyote: 0, jumpBuf: 0, hp: 3, inv: 0, knock: 0,
      sprintT: 0, sprintCD: 0, throwCD: 0, throwAnim: 0, gliding: false, dead: 0,
      airJumpsLeft: 0, ski: false, fullRise: false, pounceT: 0, pounceCD: 0, pouncedAir: false, stampCD: 0,
      phase: 0, ride: null, groundTile: 0, canRide: true,
    };
  }

  makeEnemy(e, diff) {
    const cx = e.x * T + T / 2, foot = (e.y + 1) * T;
    const base = { kind: e.kind, alive: true, dying: 0, t: Math.random() * 6, dir: -1, vx: 0, vy: 0, canRide: false };
    if (e.kind === 'walker') return { ...base, x: cx - 18, y: foot - 34, w: 36, h: 34, speed: [45, 62, 88, 78][diff] };
    if (e.kind === 'flyer') {
      return { ...base, x0: cx - 20, y0: e.y * T + 6, x: cx - 20, y: e.y * T + 6, w: 40, h: 30, range: (e.range || 2) * T, speed: 0.9 + diff * 0.15 };
    }
    return { ...base, x: cx - 18, y: foot - 36, w: 36, h: 36, wait: 1 + Math.random(), squash: 0, diff };
  }

  makeBoss(b) {
    const reindeer = b.type === 'reindeer';
    const w = reindeer ? 56 : 84, h = reindeer ? 100 : 104;
    return {
      ...b, x: b.x * T, y: 12 * T - h, w, h, vx: 0, vy: 0,
      // Blue Monday has hit points; the Reindeer Influencer has "buzz", drained by being ignored
      hp: reindeer ? 100 : 8, maxHp: reindeer ? 100 : 8,
      state: reindeer ? 'pose' : 'walk', timer: 2, inv: 0, dir: -1, active: false, dead: false, deathT: 0,
      throwing: 0, intro: 0, t: 0, thrown: 0, canRide: false, homeX: b.x * T,
      throwT: 1, talk: 0, line: '', watched: false,
      heavy: true, // too big for the ledges: falls straight through them
    };
  }

  // ---------- Tiles ----------
  tileAt(tx, ty) {
    if (tx < 0 || tx >= this.cols) return TILE.SOLID;
    if (ty < 0 || ty >= ROWS) return TILE.EMPTY;
    return this.tiles[ty * this.cols + tx];
  }
  setTile(tx, ty, v) {
    if (tx >= 0 && tx < this.cols && ty >= 0 && ty < ROWS) this.tiles[ty * this.cols + tx] = v;
  }

  moveX(o, dx) {
    o.hitWall = false;
    if (!dx) return;
    o.x += dx;
    const top = Math.floor(o.y / T), bot = Math.floor((o.y + o.h - 0.01) / T);
    const tx = dx > 0 ? Math.floor((o.x + o.w - 0.01) / T) : Math.floor(o.x / T);
    for (let ty = top; ty <= bot; ty++) {
      const v = this.tileAt(tx, ty);
      if (!isSolid(v)) continue;
      if (v === TILE.GLOOM && o === this.player && smashing(o)) {
        this.breakWall(tx, ty);
        continue;
      }
      o.x = dx > 0 ? tx * T - o.w : (tx + 1) * T;
      o.hitWall = true;
      return;
    }
  }

  moveY(o, dy) {
    const prevBottom = o.y + o.h;
    o.y += dy;
    o.onGround = false;
    o.ride = null;
    const l = Math.floor(o.x / T), r = Math.floor((o.x + o.w - 0.01) / T);
    if (dy > 0) {
      const ty = Math.floor((o.y + o.h - 0.01) / T);
      for (let tx = l; tx <= r; tx++) {
        const v = this.tileAt(tx, ty);
        if (isSolid(v) || (v === TILE.ONEWAY && !o.heavy && prevBottom <= ty * T + 0.5)) {
          o.y = ty * T - o.h;
          o.vy = 0;
          o.onGround = true;
          o.groundTile = v;
          break;
        }
      }
    } else if (dy < 0) {
      const ty = Math.floor(o.y / T);
      for (let tx = l; tx <= r; tx++) {
        if (isSolid(this.tileAt(tx, ty))) {
          o.y = (ty + 1) * T;
          o.vy = 0;
          break;
        }
      }
    }
    if (dy >= 0 && o.canRide) {
      for (const m of this.movers) {
        if (o.x + o.w > m.x + 2 && o.x < m.x + m.w - 2 && prevBottom <= m.y + 1 + Math.max(0, m.dy) && o.y + o.h >= m.y) {
          o.y = m.y - o.h;
          o.vy = 0;
          o.onGround = true;
          o.ride = m;
          o.groundTile = TILE.ONEWAY;
        }
      }
    }
  }

  findWall(tx, ty) {
    return this.walls.find((w) => w.alive && w.x === tx && ty >= w.y && ty < w.y + w.h);
  }
  hitWall(tx, ty, dmg = 1) {
    const w = this.findWall(tx, ty);
    if (!w) return;
    w.hp -= dmg;
    w.shake = 0.2;
    sfx.crack();
    this.burst(tx * T + T / 2, ty * T + T / 2, 6, 'debris');
    if (w.hp <= 0) this.breakWall(tx, ty);
  }
  breakWall(tx, ty) {
    const w = this.findWall(tx, ty);
    if (!w) return;
    w.alive = false;
    for (let j = w.y; j < w.y + w.h; j++) {
      this.setTile(w.x, j, TILE.EMPTY);
      this.burst(w.x * T + T / 2, j * T + T / 2, 6, 'debris');
    }
    sfx.break();
    this.shake = 0.25;
    this.toast('Gloom wall smashed!');
  }

  // ---------- Update ----------
  update(dt) {
    this.time += dt;
    const jp = input.jumpPressed, sp = input.specialPressed;
    input.jumpPressed = false;
    input.specialPressed = false;
    this.updateMovers(dt);
    if (this.state === 'play') {
      this.clock += dt;
      this.updatePlayer(dt, jp, sp);
    } else if (this.state === 'win') {
      const p = this.player;
      p.vx *= 0.9;
      p.vy = Math.min(p.vy + GRAV * dt, MAX_FALL);
      this.moveY(p, p.vy * dt);
      this.endTimer -= dt;
      if (Math.random() < 0.3) this.burst(this.exit.x + (Math.random() - 0.5) * 300, -10, 1, 'confetti');
      if (this.endTimer <= 0 && !this.reported) {
        this.reported = true;
        this.hooks.onComplete(this.result());
      }
    }
    this.updateEnemies(dt);
    this.updateSnacks(dt);
    if (this.office) this.updateOffice(dt);
    if (this.cellar) this.updateCellar(dt);
    if (this.trapSay && (this.trapSay.life -= dt) <= 0) this.trapSay = null;
    for (const st of this.stamps) {
      st.life -= dt;
      if (st.life > 0.1) this.applyStamp(st);
    }
    this.stamps = this.stamps.filter((st) => st.life > -0.4);
    this.updateBoss(dt);
    this.updateParticles(dt);
    this.updateCamera(dt);
    this.banner = Math.max(0, this.banner - dt);
    this.shake = Math.max(0, this.shake - dt);
    for (const w of this.walls) w.shake = Math.max(0, w.shake - dt);
    if (this.exit.drop > 0) this.exit.drop = Math.max(0, this.exit.drop - dt * 0.8);
    this.toasts = this.toasts.filter((t) => (t.life -= dt) > 0);
  }

  updateMovers(dt) {
    for (const m of this.movers) {
      m.t += dt * m.speed;
      const u = (1 - Math.cos(m.t)) / 2;
      const nx = m.axis === 'x' ? m.x0 + u * m.range : m.x0;
      const ny = m.axis === 'y' ? m.y0 - u * m.range : m.y0;
      m.dx = nx - m.x;
      m.dy = ny - m.y;
      m.x = nx;
      m.y = ny;
    }
  }

  updatePlayer(dt, jp, sp) {
    const p = this.player, ch = this.ch;
    if (p.dead > 0) {
      p.dead -= dt;
      p.vy += GRAV * dt;
      p.y += p.vy * dt;
      if (p.dead <= 0) this.respawn();
      return;
    }
    p.inv = Math.max(0, p.inv - dt);
    p.knock -= dt;
    p.sprintCD -= dt;
    p.throwCD -= dt;
    p.throwAnim -= dt;
    if (jp) p.jumpBuf = BUFFER; else p.jumpBuf -= dt;
    if (p.onGround) p.coyote = COYOTE; else p.coyote -= dt;
    let dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (p.knock > 0) dir = 0;
    const ab = ch.abilities;
    p.pounceCD -= dt;
    p.stampCD -= dt;
    if (p.onGround) {
      p.airJumpsLeft = ab.airJumps?.count || 0;
      p.ski = false;
      p.pouncedAir = false;
    }

    if (sp && this.office && this.officeInteract()) sp = false;
    if (sp && this.cellar && this.cellarInteract()) sp = false;
    if (sp && this.trapVisible() && this.trapInteract()) sp = false;
    if (sp) {
      const proj = ab.projectile;
      if (proj && p.throwCD <= 0 && this.snacks.length < 3) {
        const d = PROJ[proj];
        this.snacks.push({
          type: proj, x: p.x + p.w / 2 + p.facing * 10, y: d.g ? p.y + 12 : p.y + p.h * 0.42,
          vx: p.facing * d.speed + (d.g ? p.vx * 0.3 : 0), vy: d.vy, rot: 0, dir: p.facing,
          life: d.life, age: 0, hitBoss: false,
        });
        p.throwCD = d.cd;
        p.throwAnim = 0.2;
        if (proj === 'harp') sfx.harp(); else if (proj === 'pulse') sfx.pulse(); else sfx.throw();
      }
      if (ab.pounce && p.pounceCD <= 0 && p.pounceT <= 0 && (p.onGround || !p.pouncedAir)) {
        if (dir) p.facing = dir;
        if (!p.onGround) p.pouncedAir = true;
        p.pounceT = 0.9;
        p.pounceCD = 0.8;
        p.vy = -560;
        p.vx = p.facing * POUNCE_V;
        p.onGround = false;
        p.ride = null;
        sfx.sprint();
        this.burst(p.x + p.w / 2, p.y + p.h, 5, 'dust');
      }
      if (ab.stamp && p.stampCD <= 0) {
        if (dir) p.facing = dir;
        const st = {
          x: p.facing > 0 ? p.x + p.w - 6 : p.x - 64, y: p.y - 6, w: 70, h: p.h + 6,
          life: 0.3, dir: p.facing,
        };
        this.stamps.push(st);
        p.stampCD = 0.5;
        p.throwAnim = 0.3;
        sfx.slam();
        this.shake = 0.12;
        this.applyStamp(st);
      }
      if (ch.abilities.sprint && p.sprintCD <= 0) {
        if (dir) p.facing = dir;
        p.sprintT = SPRINT_T;
        p.sprintCD = SPRINT_CD;
        p.vy = 0;
        sfx.sprint();
        this.burst(p.x + p.w / 2, p.y + p.h / 2, 6, 'line');
      }
    }

    if (p.sprintT > 0) {
      p.sprintT -= dt;
      p.vx = p.facing * SPRINT_V;
      p.vy = 0;
      p.gliding = false;
      if (Math.random() < 0.4) this.burst(p.x + p.w / 2 - p.facing * 20, p.y + 8 + Math.random() * 30, 1, 'line');
      if (p.sprintT <= 0) p.vx = p.facing * ch.speed;
    } else if (p.pounceT > 0) {
      p.pounceT -= dt;
      if (p.onGround && p.pounceT < 0.82) p.pounceT = 0;
      p.vx = p.facing * POUNCE_V;
      p.vy = Math.min(p.vy + GRAV * dt, MAX_FALL);
      p.gliding = false;
      if (Math.random() < 0.4) this.burst(p.x + p.w / 2 - p.facing * 20, p.y + 8 + Math.random() * 30, 1, 'line');
    } else {
      const aj = ab.airJumps;
      const target = dir * ch.speed * (p.ski && !p.onGround ? aj.boost : 1)
        || (p.ski && !p.onGround ? p.facing * ch.speed * aj.boost : 0);
      let a = dir ? ch.accel : ch.friction;
      if (!p.onGround) a *= ch.airControl;
      if (dir && Math.sign(p.vx) === -dir) a *= 1.8;
      p.vx = approach(p.vx, target, a * dt);
      if (dir) p.facing = dir;
      if (p.jumpBuf > 0 && p.coyote > 0) {
        p.vy = -JUMP_V;
        p.jumpBuf = 0;
        p.coyote = 0;
        p.onGround = false;
        p.ride = null;
        sfx.jump();
        this.burst(p.x + p.w / 2, p.y + p.h, 4, 'dust');
      } else if (jp && aj && !p.onGround && p.coyote <= 0 && p.airJumpsLeft > 0) {
        // mid-air jump: Clive-Bot's ski jump, MacEagle's flaps, Edna's EBC Bounce
        p.airJumpsLeft--;
        p.vy = -aj.vy;
        p.jumpBuf = 0;
        p.fullRise = true;
        if (aj.boost) {
          // ski jump and EBC Bounce also push forwards until landing
          p.ski = true;
          p.vx = (dir || p.facing) * ch.speed * aj.boost;
        }
        if (aj.kind === 'flap') sfx.flap(); else sfx.jump();
        this.burst(p.x + p.w / 2, p.y + p.h, aj.kind === 'flap' ? 3 : 5, 'dust');
      }
      let g = GRAV;
      if (p.vy >= 0) p.fullRise = false;
      if (p.vy < 0 && !input.jump && !p.fullRise) g *= 2.4;
      p.vy += g * dt;
      p.gliding = false;
      if (ab.glide && input.jump && !p.onGround && p.vy > 0) {
        p.gliding = true;
        p.vy = Math.min(p.vy, ab.glide);
      }
      p.vy = Math.min(p.vy, MAX_FALL);
    }

    let ex = 0;
    if (p.onGround && (p.groundTile === TILE.CONV_L || p.groundTile === TILE.CONV_R)) {
      ex = (p.groundTile === TILE.CONV_R ? 1 : -1) * 110 * dt;
    }
    if (p.ride) {
      ex += p.ride.dx;
      p.y += p.ride.dy;
    }
    this.moveX(p, p.vx * dt + ex);
    if (p.hitWall && !smashing(p)) p.vx = 0;
    this.moveY(p, p.vy * dt);
    p.phase += Math.abs(p.vx) * dt * 0.06;

    // dropping through the opened trap door
    if (this.trap.open && !this.cellar && this.L.trapdoor && p.y > 12 * T + 10) {
      const td = this.L.trapdoor, pcx0 = p.x + p.w / 2;
      if (pcx0 > td.x * T && pcx0 < (td.x + td.w) * T) { this.enterCellar(); return; }
    }
    if (p.y > VH + 60) { this.kill(); return; }

    // Walk into the far end of level 1 (having jumped the tree) to find a secret room;
    // walk into the office's left wall to go back.
    const pushingOut = this.office
      ? input.left && p.x <= T + 1 && p.onGround
      : this.L.secretDoor && input.right && p.x + p.w >= this.Wpx - 1 && p.onGround;
    this.doorPush = pushingOut ? this.doorPush + dt : 0;
    if (this.doorPush > 0.45) {
      this.doorPush = 0;
      if (this.office) this.exitOffice(); else this.enterOffice();
      return;
    }

    // spikes
    const l = Math.floor(p.x / T), r = Math.floor((p.x + p.w) / T);
    const top = Math.floor(p.y / T), bot = Math.floor((p.y + p.h) / T);
    for (let ty = top; ty <= bot; ty++) {
      for (let tx = l; tx <= r; tx++) {
        if (this.tileAt(tx, ty) !== TILE.SPIKE) continue;
        const box = { x: tx * T + 5, y: ty * T + T * 0.5, w: T - 10, h: T * 0.5 };
        if (overlap(p, box)) {
          this.hurt(tx * T + T / 2);
          if (p.dead <= 0) p.vy = -560;
        }
      }
    }

    // pickups
    const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    for (const s of this.sparks) {
      if (!s.got && Math.abs(s.x - pcx) < 26 && Math.abs(s.y - pcy) < 32) {
        s.got = true;
        this.stats.sparks++;
        sfx.spark();
        this.burst(s.x, s.y, 5, 'star');
      }
    }
    this.secrets.forEach((s, i) => {
      if (!s.got && Math.abs(s.x - pcx) < 30 && Math.abs(s.y - pcy) < 36) {
        s.got = true;
        this.stats.secrets++;
        sfx.secret();
        this.burst(s.x, s.y, 16, 'confetti');
        const name = this.card?.secret || 'secret';
        this.toast(`You found a ${name}! (${this.stats.secrets}/${this.secrets.length})`);
      }
    });

    // checkpoints
    for (const c of this.cps) {
      if (!c.on && Math.abs(c.x - pcx) < 26 && p.y + p.h > c.y - 90) {
        c.on = true;
        this.spawn = { x: c.x, y: c.y };
        sfx.checkpoint();
        this.toast('Checkpoint!');
        this.burst(c.x + 12, c.y - 56, 8, 'star');
      }
    }

    // signs
    this.activeSign = this.signs.find((s) => Math.abs(s.x - pcx) < 60 && Math.abs(s.y - (p.y + p.h)) < 80) || null;

    // boss arena gate
    const b = this.boss;
    if (b && !b.dead && !this.gateClosed && pcx > b.triggerX * T) {
      this.gateClosed = true;
      for (let ty = 3; ty < 12; ty++) this.setTile(b.gateX, ty, TILE.SOLID);
      b.active = true;
      b.intro = 1.8;
      b.state = b.type === 'reindeer' ? 'pose' : 'walk';
      b.timer = 2;
      b.throwT = 1.2;
      playMusic(b.type === 'reindeer' ? 'deck' : 'godrest');
      this.shake = 0.3;
      sfx.slam();
      if (b.type === 'reindeer') this.toast('Look away from it to drain its buzz!');
    }

    // exit
    const e = this.exit;
    // touching the trunk or lower branches lights the tree; a good running jump clears it
    if (e.visible && e.drop === 0 && !e.lit && Math.abs(pcx - e.x) < 28 && p.y + p.h > e.y - 70) {
      e.lit = true;
      this.state = 'win';
      this.endTimer = 2.6;
      sfx.win();
      this.burst(e.x, e.y - 120, 40, 'confetti');
      this.toast('Christmas restored!');
    }
  }

  updateEnemies(dt) {
    const p = this.player;
    const camX = this.cam.x;
    for (const e of this.enemies) {
      if (!e.alive) { e.dying -= dt; continue; }
      if (e.x < camX - 500 || e.x > camX + VW + 500) continue; // asleep off-screen
      e.t += dt;
      if (e.kind === 'walker') {
        this.moveX(e, e.dir * e.speed * dt);
        if (e.hitWall) e.dir *= -1;
        if (e.onGround) {
          const ahead = e.dir > 0 ? e.x + e.w + 2 : e.x - 2;
          const ax = Math.floor(ahead / T);
          const below = this.tileAt(ax, Math.floor((e.y + e.h + 4) / T));
          const atFeet = this.tileAt(ax, Math.floor((e.y + e.h - 4) / T));
          if ((!isSolid(below) && below !== TILE.ONEWAY) || atFeet === TILE.SPIKE) e.dir *= -1;
        }
        e.vy = Math.min(e.vy + GRAV * dt, MAX_FALL);
        this.moveY(e, e.vy * dt);
      } else if (e.kind === 'flyer') {
        e.x = e.x0 + Math.sin(e.t * e.speed) * e.range;
        e.y = e.y0 + Math.sin(e.t * 2.2) * 12;
        e.dir = Math.cos(e.t * e.speed) >= 0 ? 1 : -1;
      } else {
        if (e.onGround) {
          e.wait -= dt;
          e.squash = e.wait < 0.3 ? (0.3 - e.wait) / 0.3 : 0;
          if (e.wait <= 0) {
            const dx = p.x - e.x;
            if (Math.abs(dx) < 320) e.dir = Math.sign(dx) || 1;
            e.vy = -600 - e.diff * 30;
            e.vx = e.dir * (90 + e.diff * 15);
            e.wait = 1.1 + Math.random() * 0.6;
            e.squash = 0;
          } else e.vx = 0;
        }
        this.moveX(e, e.vx * dt);
        if (e.hitWall) { e.dir *= -1; e.vx = -e.vx; }
        e.vy = Math.min(e.vy + GRAV * dt, MAX_FALL);
        this.moveY(e, e.vy * dt);
      }
      if (e.y > VH + 100) { e.alive = false; continue; }

      if (this.state === 'play' && p.dead <= 0 && overlap(p, e)) {
        const stomp = p.vy > 0 && p.y + p.h - e.y < 18;
        if (stomp) {
          this.defeat(e);
          p.vy = input.jump ? -760 : -500;
          sfx.stomp();
        } else if (smashing(p)) {
          this.defeat(e);
          sfx.stomp();
        } else {
          this.hurt(e.x + e.w / 2);
        }
      }
    }
  }

  defeat(e) {
    e.alive = false;
    e.dying = 0.5;
    this.stats.enemies++;
    const words = CHEERS[this.L.theme];
    this.burst(e.x + e.w / 2, e.y + e.h / 2, 8, 'dot');
    this.burst(e.x + e.w / 2, e.y, 1, 'heart');
    this.particles.push({
      type: 'text', text: words[Math.floor(Math.random() * words.length)],
      x: e.x + e.w / 2, y: e.y - 10, vx: 0, vy: -50, g: 0, life: 1.1, max: 1.1,
    });
  }

  updateSnacks(dt) {
    for (const s of this.snacks) {
      const d = PROJ[s.type || 'snack'];
      s.vy += d.g * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += dt * 14 * s.dir;
      s.life -= dt;
      s.age += dt;
      const tx = Math.floor(s.x / T), ty = Math.floor(s.y / T);
      const v = this.tileAt(tx, ty);
      if (v === TILE.GLOOM) { this.hitWall(tx, ty, d.dmg); s.life = 0; continue; }
      if (isSolid(v)) { s.life = 0; this.burst(s.x, s.y, 4, 'dot'); continue; }
      const box = { x: s.x - d.r, y: s.y - d.r, w: d.r * 2, h: d.r * 2 };
      for (const e of this.enemies) {
        if (e.alive && overlap(box, e)) {
          this.defeat(e);
          sfx.stomp();
          if (!d.pierce) { s.life = 0; break; }
        }
      }
      const b = this.boss;
      if (s.life > 0 && !s.hitBoss && b && b.active && !b.dead && overlap(box, b)) {
        if (b.type === 'reindeer') this.engage(b); else this.damageBoss();
        s.hitBoss = true;
        if (!d.pierce) s.life = 0;
      }
    }
    this.snacks = this.snacks.filter((s) => s.life > 0 && s.y < VH + 40);
  }

  // ---------- Boss ----------
  updateBoss(dt) {
    const b = this.boss;
    if (!b) return;
    b.t += dt;
    if (b.dead) {
      b.deathT = Math.max(0, b.deathT - dt);
      if (b.deathT > 0 && Math.random() < 0.5) this.burst(b.x + Math.random() * b.w, b.y + Math.random() * b.h, 1, 'confetti');
      return;
    }
    if (!b.active) return;
    b.inv = Math.max(0, b.inv - dt);
    b.throwing -= dt;
    if (b.intro > 0) {
      b.intro -= dt;
      return;
    }
    if (b.type === 'reindeer') this.updateReindeer(dt, b);
    else this.updateMonday(dt, b);
    this.updateMissiles(dt);
  }

  updateMonday(dt, b) {
    const p = this.player;
    const pcx = p.x + p.w / 2, bcx = b.x + b.w / 2;
    const angry = b.hp <= b.maxHp / 2;
    b.timer -= dt;
    if (b.state === 'walk') {
      b.dir = Math.sign(pcx - bcx) || 1;
      b.vx = b.dir * (angry ? 105 : 65);
      if (b.timer <= 0) { b.state = 'throw'; b.timer = 1; b.thrown = 0; }
    } else if (b.state === 'throw') {
      b.vx = 0;
      const want = angry ? 3 : 2;
      if (b.thrown < want && b.timer < 1 - (b.thrown + 1) * 0.25) {
        const spread = (b.thrown - (want - 1) / 2) * 90;
        this.missiles.push({
          x: bcx, y: b.y + 20,
          vx: clamp((pcx - bcx) * 1.1 + spread, -380, 380), vy: -560, rot: 0,
        });
        b.thrown++;
        b.throwing = 0.25;
        sfx.bossThrow();
      }
      if (b.timer <= 0) {
        if (angry) {
          b.state = 'leap';
          b.vy = -880;
          b.vx = clamp((pcx - bcx) * 1.1, -260, 260);
          b.onGround = false;
        } else {
          b.state = 'walk';
          b.timer = 2.2;
        }
      }
    } else if (b.state === 'leap' && b.onGround && b.vy === 0 && b.timer < 0.5) {
      // landed: shockwaves along the floor
      sfx.slam();
      this.shake = 0.35;
      this.waves.push({ x: bcx - 30, dir: -1, life: 3 }, { x: bcx + 30, dir: 1, life: 3 });
      b.state = 'walk';
      b.timer = 2;
      b.vx = 0;
    }
    b.vy = Math.min(b.vy + GRAV * dt, MAX_FALL);
    this.moveX(b, b.vx * dt);
    this.moveY(b, b.vy * dt);
    if (b.state === 'leap' && !b.onGround) b.timer = 0;

    if (this.state === 'play' && p.dead <= 0 && overlap(p, b)) {
      if (p.vy > 0 && p.y + p.h - b.y < 22) {
        this.damageBoss();
        p.vy = -760;
        sfx.stomp();
      } else if (smashing(p)) {
        this.damageBoss();
        p.sprintT = 0;
        p.pounceT = 0;
        p.vx = -p.facing * 320;
        p.vy = -420;
        p.inv = Math.max(p.inv, 0.5);
      } else {
        this.hurt(bcx);
      }
    }
  }

  // The Reindeer Influencer feeds on attention. Facing it tops up its buzz;
  // facing away drains it. It keeps hopping round to get in front of you, and
  // attacking it only counts as more engagement.
  updateReindeer(dt, b) {
    const p = this.player;
    const pcx = p.x + p.w / 2, bcx = b.x + b.w / 2;
    const angry = b.hp <= b.maxHp / 2;
    const alive = p.dead <= 0 && this.state === 'play';
    b.watched = alive && p.facing === (Math.sign(bcx - pcx) || 1);
    if (alive) {
      if (b.watched) b.hp = Math.min(b.maxHp, b.hp + 5 * dt);
      else b.hp -= 7 * dt;
    }
    b.dir = Math.sign(pcx - bcx) || 1;
    b.talk -= dt;
    if (b.talk <= 0) {
      const lines = b.watched ? REINDEER_SELLS : REINDEER_PLEADS;
      b.line = lines[Math.floor(Math.random() * lines.length)];
      b.talk = 2.4;
    }
    if (b.watched && Math.random() < dt * 3) this.burst(bcx + (Math.random() - 0.5) * 50, b.y, 1, 'heart');

    if (b.onGround) {
      if (b.state === 'hop') {
        b.state = 'pose';
        b.timer = angry ? 2.3 : 3.2;
        b.throwT = 0.7;
      }
      b.vx = 0;
      b.timer -= dt;
      b.throwT -= dt;
      if (b.throwT <= 0) {
        const n = angry ? 2 : 1;
        for (let i = 0; i < n; i++) {
          // aim the arc so it comes down where the player is standing (missiles fall at 900 px/s/s)
          const x0 = bcx, y0 = b.y + 30, vy = -560 - i * 90;
          const ty = p.y + p.h / 2;
          const tFlight = (-vy + Math.sqrt(vy * vy - 4 * 450 * (y0 - ty))) / 900;
          const lead = p.vx * 0.5 + (Math.random() - 0.5) * 60;
          this.missiles.push({
            kind: 'gift', label: GIFT_LABELS[Math.floor(Math.random() * GIFT_LABELS.length)],
            x: x0, y: y0, vx: clamp((pcx + lead - x0) / tFlight, -420, 420), vy, rot: 0,
          });
        }
        b.throwing = 0.3;
        b.throwT = angry ? 1.5 : 2;
        sfx.bossThrow();
      }
      if (b.timer <= 0) {
        // hop round to land right in front of the player
        const lo = b.arenaX0 * T + 70, hi = b.arenaX1 * T - 70;
        let target = pcx + p.facing * 240;
        if (target < lo || target > hi) target = pcx - p.facing * 240;
        target = clamp(target, lo, hi);
        b.vy = -820;
        b.vx = (target - bcx) / 0.78;
        b.state = 'hop';
        b.onGround = false;
        sfx.jump();
      }
    }
    b.vy = Math.min(b.vy + GRAV * dt, MAX_FALL);
    this.moveX(b, b.vx * dt);
    this.moveY(b, b.vy * dt);

    if (b.hp <= 0) { this.defeatBoss(); return; }

    if (this.state === 'play' && p.dead <= 0 && overlap(p, b)) {
      if (p.vy > 0 && p.y + p.h - b.y < 24) {
        this.engage(b);
        p.vy = -760;
        sfx.stomp();
      } else if (smashing(p)) {
        this.engage(b);
        p.sprintT = 0;
        p.pounceT = 0;
        p.vx = -p.facing * 320;
        p.vy = -420;
        p.inv = Math.max(p.inv, 0.5);
      } else {
        this.hurt(bcx);
      }
    }
  }

  // Attacking the influencer is still engagement
  engage(b) {
    if (b.inv > 0) return;
    b.inv = 0.6;
    b.hp = Math.min(b.maxHp, b.hp + 12);
    sfx.engage();
    this.toast('It loves the engagement! Buzz up.');
    this.burst(b.x + b.w / 2, b.y, 3, 'heart');
  }

  // ---------- Ebenezer Scroop's Office (secret room) ----------
  // swaps the current level for a secret room, keeping the level to come back to
  enterRoom(O, spawnX) {
    const keep = ['L', 'cols', 'tiles', 'Wpx', 'sparks', 'secrets', 'cps', 'signs', 'walls', 'movers', 'enemies', 'exit', 'boss', 'gateClosed', 'spawn'];
    this.stash = Object.fromEntries(keep.map((k) => [k, this[k]]));
    this.stash.camX = this.cam.x;
    this.L = O;
    this.cols = O.width;
    this.tiles = O.tiles.slice();
    this.Wpx = O.width * T;
    this.sparks = []; this.secrets = []; this.cps = []; this.signs = []; this.walls = [];
    this.movers = []; this.enemies = []; this.snacks = []; this.stamps = []; this.missiles = []; this.waves = [];
    this.exit = { x: -9999, y: 0, lit: false, visible: false, drop: 0 };
    this.boss = null;
    this.gateClosed = false;
    const p = this.player;
    p.x = spawnX; p.y = 12 * T - p.h; p.vx = 0; p.vy = 0; p.ride = null; p.facing = 1;
    this.spawn = { x: spawnX + p.w / 2, y: 12 * T };
    this.cam.x = 0;
    this.banner = 3.5;
    this.activeSign = null;
    sfx.secret();
  }

  exitRoom(x, facing) {
    const st = this.stash;
    for (const [k, v] of Object.entries(st)) if (k !== 'camX') this[k] = v;
    this.cam.x = st.camX;
    this.snacks = []; this.stamps = [];
    const p = this.player;
    p.x = x; p.y = 12 * T - p.h; p.vx = 0; p.vy = 0; p.facing = facing;
    this.stash = null;
    this.banner = 0;
  }

  enterOffice() {
    this.enterRoom(OFFICE, 2 * T);
    this.office = { day: 20, ledger: false, candle: true, closed: false, ghost: 0, say: null, near: null };
  }

  exitOffice() {
    this.exitRoom(this.stash.Wpx - 3 * T, -1);
    this.office = null;
  }

  // ---------- The trap door and the cellar under level 2 ----------
  trapVisible() {
    return !!(this.L.trapdoor && this.boss && this.boss.dead && !this.cellar && !this.office);
  }

  trapInteract() {
    const td = this.L.trapdoor, p = this.player;
    const pcx = p.x + p.w / 2;
    if (this.trap.open || !p.onGround || pcx < td.x * T - 14 || pcx > (td.x + td.w) * T + 14) return false;
    if (!this.trap.creaked) {
      this.trap.creaked = true;
      sfx.crack();
      this.trapSay = { text: 'The floor creaks.', life: 2.5 };
    } else {
      this.trap.open = true;
      for (let i = td.x; i < td.x + td.w; i++) { this.setTile(i, 12, TILE.EMPTY); this.setTile(i, 13, TILE.EMPTY); }
      // whoever opens it falls straight in
      p.x = (td.x + td.w / 2) * T - p.w / 2;
      p.vx = 0;
      p.sprintT = 0;
      sfx.break();
      this.burst(pcx, 12 * T, 10, 'debris');
      this.trapSay = null;
    }
    return true;
  }

  enterCellar() {
    this.enterRoom(CELLAR, 7 * T);
    this.player.vy = 300;
    this.player.y = 6 * T;
    this.cellar = { got: this.stats.giant > 0, near: null };
    this.burst(7 * T, 7 * T, 10, 'dust');
  }

  exitCellar() {
    const td = this.stash.L.trapdoor;
    this.exitRoom((td.x + td.w + 1) * T, 1);
    this.cellar = null;
    sfx.jump();
  }

  cellarInteract() {
    const pcx = this.player.x + this.player.w / 2;
    if (Math.abs(pcx - 3 * T) < 46) { this.exitCellar(); return true; }
    if (Math.abs(pcx - 19.5 * T) < 60) {
      this.toast('On The Venns: coming soon!');
      sfx.click();
      return true;
    }
    return false;
  }

  updateCellar() {
    const c = this.cellar, p = this.player;
    const pcx = p.x + p.w / 2;
    c.near = Math.abs(pcx - 3 * T) < 46 ? 'climb the ladder' : Math.abs(pcx - 19.5 * T) < 60 ? 'read the poster' : null;
    if (!c.got && Math.abs(pcx - 14 * T) < 60 && p.y + p.h > 12 * T - 160) {
      c.got = true;
      this.stats.giant = 1000;
      sfx.secret();
      sfx.win();
      this.burst(14 * T, 9 * T, 50, 'confetti');
      const name = this.card?.secret || 'treasure';
      this.toast(`A GIANT ${name}! +1,000 points`);
      this.hooks.onGiant?.();
    }
  }

  officeObjects() {
    const t = this.time;
    return [
      { id: 'robot', x: 4.5 * T, label: 'talk to the little robot' },
      { id: 'ghost', x: 8.3 * T + Math.sin(t * 0.6) * 1.4 * T, label: 'talk to the ghost', wide: true },
      { id: 'bobb', x: 11.2 * T, label: 'talk to Bobb Crochet' },
      { id: 'candle', x: 13.4 * T, label: 'snuff the candle' },
      { id: 'calendar', x: 16 * T, label: 'turn the calendar' },
      { id: 'door', x: 21 * T, label: 'flip the door sign' },
    ];
  }

  // the nearest thing within reach (the ghost can be reached from a bit further away)
  officeNearest() {
    const pcx = this.player.x + this.player.w / 2;
    let best = null, bestD = Infinity;
    for (const it of this.officeObjects()) {
      const d = Math.abs(it.x - pcx);
      if (d < (it.wide ? 70 : 46) && d < bestD) { best = it; bestD = d; }
    }
    return best;
  }

  officeSay(text, x, y = 300) {
    this.office.say = { text, x, y, life: 4 };
  }

  officeInteract() {
    const o = this.office, p = this.player;
    const obj = this.officeNearest();
    if (!obj) return false;
    sfx.click();
    const day = o.day === 26 ? 'Boxing Day' : `${o.day} December`;
    switch (obj.id) {
      case 'robot':
        this.officeSay('You, boy, what day is it?', obj.x, 380);
        break;
      case 'ghost': {
        const lines = [
          '*looks revelatory*',
          '*looks revelatory, and points at the calendar*',
          '*looks extremely revelatory. Chalk words appear on the wall: DAY, then BOOKS, then LIGHT, then DOOR*',
        ];
        this.officeSay(o.closed ? '*looks revelatory, but in a festive way*' : lines[Math.min(o.ghost, 2)], obj.x, 250);
        o.ghost++;
        break;
      }
      case 'bobb':
        if (o.closed) this.officeSay('Merry Christmas, one and all!', obj.x, 330);
        else if (o.ledger) this.officeSay("Books closed! Just the candle and the door now, and I'm off home.", obj.x, 330);
        else if (o.day === 25) {
          o.ledger = true;
          sfx.checkpoint();
          this.officeSay("Christmas Day? Then the books are closed! Mr Scroop can't argue with that.", obj.x, 330);
        } else {
          this.officeSay(`Mr Scroop says I'm to finish this paperwork. It's only ${day}. Unless it's Christmas Day, of course.`, obj.x, 330);
        }
        break;
      case 'candle':
        if (!o.candle) this.officeSay('Already snuffed out.', obj.x, 360);
        else if (!o.ledger) this.officeSay("Bobb: Oi! I can't see my paperwork!", obj.x, 360);
        else {
          o.candle = false;
          sfx.flap();
          this.officeSay('Snuffed out. Very festive.', obj.x, 360);
        }
        break;
      case 'calendar':
        if (o.ledger) this.officeSay("Best leave the calendar on Christmas Day.", obj.x, 300);
        else {
          o.day = o.day >= 26 ? 20 : o.day + 1;
          this.officeSay(o.day === 26 ? 'Boxing Day. Gone too far!' : `The calendar now says ${o.day} December.`, obj.x, 300);
        }
        break;
      case 'door':
        if (o.closed) this.officeSay('CLOSED FOR CHRISTMAS', obj.x, 330);
        else if (!o.ledger) this.officeSay("Bobb's still working. You can't shut the office on him!", obj.x, 330);
        else if (o.candle) this.officeSay("Not with a candle still burning!", obj.x, 330);
        else this.officeDone(obj.x);
        break;
    }
    return true;
  }

  officeDone(x) {
    const o = this.office;
    o.closed = true;
    sfx.win();
    this.burst(x, 350, 40, 'confetti');
    this.officeSay('CLOSED FOR CHRISTMAS', x, 330);
    if (!this.officePrizeTaken) {
      this.officePrizeTaken = true;
      this.stats.officeStars = 44;
      this.toast('+44 stars!');
      for (let i = 0; i < 12; i++) this.burst(x - 200 + i * 30, 200, 1, 'star');
      this.hooks.onOfficeDone?.();
    } else {
      this.toast("Shut for Christmas. (You've had the stars already.)");
    }
  }

  updateOffice(dt) {
    const o = this.office;
    if (o.say && (o.say.life -= dt) <= 0) o.say = null;
    o.near = this.officeNearest();
  }

  // Edna's audit stamp: smashes walls and flattens minions just in front of her
  applyStamp(st) {
    for (const w of this.walls) {
      if (w.alive && overlap(st, { x: w.x * T, y: w.y * T, w: T, h: w.h * T })) this.breakWall(w.x, w.y);
    }
    for (const e of this.enemies) {
      if (e.alive && overlap(st, e)) { this.defeat(e); sfx.stomp(); }
    }
    const b = this.boss;
    if (b && b.active && !b.dead && overlap(st, b)) {
      if (b.type === 'reindeer') this.engage(b); else this.damageBoss();
    }
  }

  updateMissiles(dt) {
    const p = this.player;
    for (const m of this.missiles) {
      m.vy += 900 * dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.rot += dt * 8;
      if (isSolid(this.tileAt(Math.floor(m.x / T), Math.floor(m.y / T))) || m.y > VH) {
        m.dead = true;
        this.burst(m.x, m.y, 4, 'dot');
      } else if (overlap(p, { x: m.x - 9, y: m.y - 11, w: 18, h: 22 })) {
        m.dead = true;
        this.hurt(m.x);
      }
    }
    this.missiles = this.missiles.filter((m) => !m.dead);
    for (const w of this.waves) {
      w.x += w.dir * 300 * dt;
      w.life -= dt;
      if (overlap(p, { x: w.x - 14, y: 12 * T - 26, w: 28, h: 26 })) this.hurt(w.x);
      if (isSolid(this.tileAt(Math.floor(w.x / T), 11))) w.life = 0;
    }
    this.waves = this.waves.filter((w) => w.life > 0);
  }

  damageBoss() {
    const b = this.boss;
    if (b.inv > 0 || b.dead) return;
    b.hp--;
    b.inv = 0.9;
    sfx.bossHit();
    this.shake = 0.2;
    this.burst(b.x + b.w / 2, b.y + 30, 10, 'dot');
    if (b.hp <= 0) this.defeatBoss();
    else if (b.hp === b.maxHp / 2) this.toast('Blue Monday is getting cross...');
  }

  defeatBoss() {
    const b = this.boss;
    if (b.dead) return;
    b.dead = true;
    b.hp = 0;
    b.deathT = 1.8;
    this.missiles = [];
    this.waves = [];
    this.burst(b.x + b.w / 2, b.y + b.h / 2, 60, 'confetti');
    this.toast(b.type === 'reindeer'
      ? 'The Reindeer Influencer has lost all its followers!'
      : 'Blue Monday has been cancelled!');
    this.exit.visible = true;
    this.exit.drop = 1;
    sfx.win();
    playMusic(b.type === 'reindeer' ? LEVEL_MUSIC[this.levelIndex] : 'deck');
  }

  // ---------- Damage and respawn ----------
  hurt(fromX) {
    const p = this.player;
    if (p.inv > 0 || smashing(p) || p.dead > 0 || this.state !== 'play') return;
    p.hp--;
    this.stats.hits++;
    p.inv = 1.4;
    p.knock = 0.25;
    p.vy = -420;
    p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 260;
    sfx.hurt();
    this.shake = 0.25;
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 6, 'dot');
    if (p.hp <= 0) this.kill();
  }

  kill() {
    const p = this.player;
    if (p.dead > 0) return;
    p.dead = 1.1;
    p.vy = -650;
    if (p.hp > 0) this.stats.hits++;
    p.hp = 0;
    p.sprintT = 0;
    p.pounceT = 0;
    this.stats.deaths++;
    sfx.die();
    this.burst(p.x + p.w / 2, Math.min(p.y, VH - 40), 12, 'dot');
  }

  respawn() {
    this.player = this.makePlayer(this.spawn);
    this.player.inv = 1.2;
    this.snacks = [];
    this.stamps = [];
    this.missiles = [];
    this.waves = [];
    const b = this.boss;
    if (b && !b.dead && this.gateClosed) {
      this.gateClosed = false;
      for (let ty = 3; ty < 12; ty++) this.setTile(b.gateX, ty, TILE.EMPTY);
      b.active = false;
      b.x = b.homeX;
      b.y = 12 * T - b.h;
      b.vx = b.vy = 0;
      b.state = b.type === 'reindeer' ? 'pose' : 'walk';
      playMusic(LEVEL_MUSIC[this.levelIndex]);
    }
    this.cam.x = clamp(this.spawn.x - VW / 3, 0, this.Wpx - VW);
    this.toast('Back you go!');
  }

  result() {
    const s = this.stats;
    const time = this.clock;
    const timeBonus = Math.max(0, Math.round((this.L.par - time) * 5));
    const base = Math.max(0,
      s.sparks * 10 + s.secrets * 250 + 500 + timeBonus + s.enemies * 20 + (this.boss ? 1000 : 0) - s.deaths * 50)
      + s.officeStars * 10 + s.giant;
    // every star collected: +20% on the level score
    const allStars = s.total > 0 && s.sparks >= s.total;
    const starBonus = allStars ? Math.round(base * 0.2) : 0;
    return {
      level: this.levelIndex, sparks: s.sparks, total: s.total, secrets: s.secrets,
      secretTotal: this.secrets.length, deaths: s.deaths, hits: s.hits, time, timeBonus, enemies: s.enemies,
      allStars, starBonus, base, score: base + starBonus, par: this.L.par, boss: this.boss?.type || null,
      officeStars: s.officeStars, giant: s.giant,
    };
  }

  // ---------- Camera, particles, toasts ----------
  updateCamera(dt) {
    const p = this.player;
    const target = p.x + p.w / 2 - VW / 2 + p.facing * 90;
    this.cam.x += (target - this.cam.x) * Math.min(1, dt * 4);
    let min = 0, max = this.Wpx - VW;
    if (this.gateClosed && this.boss) {
      min = this.boss.arenaX0 * T;
      max = this.boss.arenaX1 * T - VW;
    }
    this.cam.x = clamp(this.cam.x, min, max);
  }

  toast(text) {
    this.toasts = this.toasts.filter((t) => t.text !== text);
    this.toasts.push({ text, life: 2.4 });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  burst(x, y, n, type) {
    const cols = [D.RED, D.GOLD, '#3b9ad9', '#4caf6a', '#e07ad0'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 220;
      const part = { type, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, g: 700, life: 0.6 + Math.random() * 0.4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 };
      if (type === 'confetti') { part.color = cols[i % cols.length]; part.g = 300; part.life = 1.6 + Math.random(); part.vy -= 150; }
      if (type === 'line') { part.vx = -this.player.facing * 200; part.vy = 0; part.g = 0; part.life = 0.25; part.len = 12 + Math.random() * 14; }
      if (type === 'dust') { part.vy = -30 - Math.random() * 40; part.vx = (Math.random() - 0.5) * 120; part.g = 0; part.life = 0.35; }
      if (type === 'heart') { part.vx = 0; part.vy = -70; part.g = 0; part.life = 1; }
      if (type === 'star') { part.g = 200; part.life = 0.5; }
      part.max = part.life;
      this.particles.push(part);
    }
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.type === 'confetti') p.vx *= 0.98;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  // ---------- Drawing ----------
  render() {
    const ctx = this.ctx, L = this.L;
    if (!L) return;
    D.setBoil(this.time);
    D.setPaper(L.paper);
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    const cx = Math.round(this.cam.x);

    ctx.save();
    ctx.translate(-cx, 0);
    ctx.fillStyle = D.paperPattern(ctx, paperTone(L.paper));
    ctx.fillRect(cx, 0, VW, VH);
    ctx.restore();

    S.drawBackground(ctx, L.theme, cx, VW);

    ctx.save();
    const sh = this.shake > 0 ? this.shake * 30 : 0;
    ctx.translate(-cx + (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    const inView = (x, pad = 120) => x > cx - pad && x < cx + VW + pad;

    this.drawTiles(ctx, cx);

    for (const w of this.walls) {
      if (!w.alive || !inView(w.x * T)) continue;
      const jx = w.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
      S.drawGloomWall(ctx, w.x * T + jx, w.y * T, T, w.h * T, w.hp, this.time, w.seed);
    }
    for (const m of this.movers) {
      if (!inView(m.x)) continue;
      ctx.save();
      ctx.translate(Math.round(m.x), Math.round(m.y));
      S.drawMover(ctx, m.w, L.theme);
      ctx.restore();
    }
    for (const s of this.signs) {
      if (!inView(s.x)) continue;
      ctx.save();
      ctx.translate(s.x, s.y);
      S.drawSign(ctx);
      ctx.restore();
    }
    for (const c of this.cps) {
      if (!inView(c.x)) continue;
      ctx.save();
      ctx.translate(c.x, c.y);
      S.drawCheckpoint(ctx, c.on, this.time);
      ctx.restore();
    }
    const e = this.exit;
    if (e.visible && inView(e.x, 200)) {
      ctx.save();
      ctx.translate(e.x, e.y - 500 * e.drop * e.drop);
      S.drawTree(ctx, e.lit, this.time);
      ctx.restore();
    }
    for (const s of this.sparks) {
      if (s.got || !inView(s.x)) continue;
      ctx.save();
      ctx.translate(s.x, s.y);
      S.drawSpark(ctx, this.time, s.seed);
      ctx.restore();
    }
    for (const s of this.secrets) {
      if (s.got || !inView(s.x)) continue;
      ctx.save();
      ctx.translate(s.x, s.y + 6);
      S.drawTrinket(ctx, this.charId, this.time);
      ctx.restore();
    }
    for (const en of this.enemies) {
      if (!inView(en.x)) continue;
      if (!en.alive && en.dying <= 0) continue;
      ctx.save();
      ctx.translate(en.x + en.w / 2, en.y + en.h);
      if (!en.alive) {
        const k = en.dying / 0.5;
        ctx.globalAlpha = k;
        ctx.scale(1 + (1 - k) * 0.5, k);
      }
      if (en.dir > 0) ctx.scale(-1, 1);
      ctx.scale(1.25, 1.25);
      if (en.kind === 'walker') S.drawWalker(ctx, L.theme, en.t);
      else if (en.kind === 'flyer') { ctx.translate(0, -en.h / 2.5); S.drawFlyer(ctx, L.theme, en.t); }
      else S.drawJumper(ctx, L.theme, en.t, en.squash);
      ctx.restore();
    }
    const b = this.boss;
    if (b && (!b.dead || b.deathT > 0) && inView(b.x, 200)) {
      ctx.save();
      ctx.translate(b.x + b.w / 2, b.y + b.h);
      if (b.dead) {
        const k = b.deathT / 1.8;
        ctx.globalAlpha = k;
        ctx.rotate((1 - k) * 0.8);
        ctx.scale(k, k);
      }
      if (b.type === 'reindeer') {
        ctx.scale(b.dir, 1);
        S.drawReindeer(ctx, this.time, { watched: b.watched, buzz: b.hp / b.maxHp, throwing: b.throwing > 0 });
      } else {
        S.drawBoss(ctx, this.time, { hurt: b.inv, throwing: b.throwing > 0 });
      }
      ctx.restore();
      if (b.type === 'reindeer' && b.active && !b.dead && b.intro <= 0 && b.line) {
        S.drawBubble(ctx, b.line, clamp(b.x + b.w / 2, cx + 170, cx + VW - 170), b.y - 34, 220);
      }
    }
    for (const m of this.missiles) {
      ctx.save();
      ctx.translate(m.x, m.y);
      if (m.kind === 'gift') S.drawGift(ctx, m.rot, m.label);
      else S.drawPaperMissile(ctx, m.rot);
      ctx.restore();
    }
    D.pen(ctx, D.GLOOM, 2.4);
    for (const w of this.waves) {
      D.zigzag(ctx, w.x - 14, 12 * T - 2, w.x + 14, 12 * T - 2, 10, 4);
    }
    for (const s of this.snacks) {
      ctx.save();
      ctx.translate(s.x, s.y);
      if (s.type === 'pulse') S.drawPulse(ctx, s.age, s.dir);
      else if (s.type === 'paper') S.drawPaperMissile(ctx, s.rot);
      else if (s.type === 'harp') S.drawHarpWave(ctx, s.age, s.dir);
      else S.drawSnack(ctx, s.rot, 0.8);
      ctx.restore();
    }
    for (const st of this.stamps) S.drawStamp(ctx, st);
    if (this.office) this.drawOffice(ctx);
    if (this.cellar) S.drawCellar(ctx, this.cellar, this.time, this.charId);
    if (this.L.trapdoor && !this.office && !this.cellar && (this.trapVisible() || this.trap.open)) {
      S.drawTrapdoor(ctx, this.L.trapdoor.x * T, 12 * T, this.L.trapdoor.w * T, this.trap.open);
      if (this.trapSay) S.drawBubble(ctx, this.trapSay.text, (this.L.trapdoor.x + this.L.trapdoor.w / 2) * T, 12 * T - 70, 200);
    }
    this.drawPlayer(ctx);
    this.drawParticles(ctx);

    if (this.cellar && this.cellar.near) D.text(ctx, `X (or tap): ${this.cellar.near}`, VW / 2, 535, 20);
    if (this.office) {
      const o = this.office;
      if (o.say) S.drawBubble(ctx, o.say.text, clamp(o.say.x, 170, VW - 170), o.say.y, 300);
      else if (o.near) {
        const label = o.near.id === 'ghost' ? 'talk to the ghost of Jacob Marlon Harewood' : o.near.label;
        D.text(ctx, `X (or tap): ${label}`, VW / 2, 535, 20);
      }
    }
    if (this.activeSign && this.state === 'play') {
      const s = this.activeSign;
      const bx = clamp(s.x, cx + 170, cx + VW - 170);
      S.drawBubble(ctx, s.text, bx, s.y - 52);
    }
    ctx.restore();

    if (L.theme === 2) S.drawRain(ctx, this.time, VW, VH);
    this.drawHUD(ctx);
  }

  drawTiles(ctx, cx) {
    const x0 = Math.max(0, Math.floor(cx / T) - 1);
    const x1 = Math.min(this.cols - 1, Math.floor((cx + VW) / T) + 1);
    const solidDraw = (tx, ty) => {
      if (ty >= ROWS) return true;
      const v = this.tileAt(tx, ty);
      return isSolid(v) && v !== TILE.GLOOM;
    };
    // shading
    ctx.fillStyle = 'rgba(29,79,184,0.07)';
    for (let ty = 0; ty < ROWS; ty++)
      for (let tx = x0; tx <= x1; tx++)
        if (solidDraw(tx, ty)) ctx.fillRect(tx * T, ty * T, T, T);

    // hatching
    D.pen(ctx, D.INK_SOFT, 1.3);
    ctx.beginPath();
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!solidDraw(tx, ty)) continue;
        const x = tx * T, y = ty * T;
        if (solidDraw(tx, ty - 1)) {
          D.seg(ctx, x, y + T, x + T, y, 0.8);
          D.seg(ctx, x, y + T / 2, x + T / 2, y, 0.8);
          D.seg(ctx, x + T / 2, y + T, x + T, y + T / 2, 0.8);
        } else {
          D.seg(ctx, x + 2, y + 9, x + T - 2, y + 9, 0.8);
          D.seg(ctx, x + 4, y + T, x + T / 2 + 2, y + T / 2 - 2, 0.8);
          D.seg(ctx, x + T / 2 + 4, y + T, x + T, y + T / 2 + 4, 0.8);
        }
      }
    }
    ctx.stroke();

    // outlines
    D.pen(ctx, D.INK, 2.4);
    ctx.beginPath();
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const x = tx * T, y = ty * T;
        if (solidDraw(tx, ty)) {
          if (!solidDraw(tx, ty - 1)) D.seg(ctx, x, y, x + T, y);
          if (!solidDraw(tx, ty + 1)) D.seg(ctx, x, y + T, x + T, y + T);
          if (!solidDraw(tx - 1, ty)) D.seg(ctx, x, y, x, y + T);
          if (!solidDraw(tx + 1, ty)) D.seg(ctx, x + T, y, x + T, y + T);
        }
        const v = this.tileAt(tx, ty);
        if (v === TILE.ONEWAY) {
          D.seg(ctx, x, y, x + T, y);
          D.seg(ctx, x, y + 10, x + T, y + 10);
          if (this.tileAt(tx - 1, ty) !== TILE.ONEWAY) { D.seg(ctx, x, y, x, y + 10); D.seg(ctx, x + 6, y + 10, x + 14, y + 24); }
          if (this.tileAt(tx + 1, ty) !== TILE.ONEWAY) { D.seg(ctx, x + T, y, x + T, y + 10); D.seg(ctx, x + T - 6, y + 10, x + T - 14, y + 24); }
        }
      }
    }
    ctx.stroke();

    // conveyors and spikes
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const v = this.tileAt(tx, ty);
        const x = tx * T, y = ty * T;
        if (v === TILE.CONV_L || v === TILE.CONV_R) {
          const dir = v === TILE.CONV_R ? 1 : -1;
          D.pen(ctx, D.INK, 2);
          D.circle(ctx, x + T / 2, y + 22, 9, { fill: true, amt: 0.4 });
          const a = this.time * 6 * dir;
          D.line(ctx, x + T / 2 - Math.cos(a) * 8, y + 22 - Math.sin(a) * 8, x + T / 2 + Math.cos(a) * 8, y + 22 + Math.sin(a) * 8, 0.3);
          const off = ((this.time * 40 * dir) % 20 + 20) % 20;
          for (let k = -20; k < T; k += 20) {
            const ax = x + k + off;
            if (ax < x + 2 || ax > x + T - 8) continue;
            D.line(ctx, ax, y + 3, ax + 5 * dir, y + 6, 0.2);
            D.line(ctx, ax + 5 * dir, y + 6, ax, y + 9, 0.2);
          }
        } else if (v === TILE.SPIKE) {
          D.pen(ctx, D.RED, 2.2);
          const pts = [];
          for (let k = 0; k <= 6; k++) pts.push([x + (k * T) / 6, y + (k % 2 ? T - 22 : T)]);
          D.poly(ctx, pts, { close: false, amt: 0.4 });
        } else if (v === TILE.SOLID && this.L.theme === 1 && !solidDraw(tx, ty - 1) && D.hash(tx * 31 + ty) > 0.78) {
          // holly sprig
          D.pen(ctx, D.INK, 1.8);
          for (const sgn of [-1, 1]) {
            const lx = x + 20 + sgn * 9;
            D.poly(ctx, [[x + 20, y - 4], [lx - sgn * 2, y - 12], [lx + sgn * 4, y - 9], [lx + sgn * 8, y - 13], [lx + sgn * 7, y - 6], [lx + sgn * 2, y - 3]], { fill: 'rgba(76,175,106,0.45)', amt: 0.3 });
          }
          D.dot(ctx, x + 18, y - 6, 3, D.RED);
          D.dot(ctx, x + 23, y - 7, 3, D.RED);
        }
      }
    }
  }

  drawOffice(ctx) {
    S.drawOffice(ctx, this.office, this.time);
  }

  drawPlayer(ctx) {
    const p = this.player;
    if (p.dead <= 0 && p.inv > 0 && Math.floor(p.inv * 14) % 2) return;
    let state = 'idle';
    if (p.sprintT > 0) state = 'sprint';
    else if (p.pounceT > 0) state = 'pounce';
    else if (p.gliding) state = 'glide';
    else if (p.ski && !p.onGround && this.ch.abilities.airJumps.kind === 'ski') state = 'ski';
    else if (!p.onGround) state = p.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(p.vx) > 20) state = 'run';
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h);
    if (p.dead > 0) {
      ctx.translate(0, -30);
      ctx.rotate(Math.PI * (1.1 - p.dead));
      ctx.translate(0, 30);
    }
    ctx.scale(p.facing * 1.3, 1.3);
    if (state === 'sprint') {
      D.pen(ctx, D.INK, 2);
      for (let i = 0; i < 4; i++) D.line(ctx, -24 - i * 6, -40 + i * 10, -50 - i * 8, -40 + i * 10, 0.5);
    }
    if (state === 'win' || this.state === 'win') state = 'jump';
    this.ch.draw(ctx, { state, t: this.time, phase: p.phase, throwing: p.throwAnim > 0 });
    ctx.restore();
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const k = p.life / p.max;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 1.5);
      ctx.translate(p.x, p.y);
      if (p.type === 'confetti') {
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-4, -2.5, 8, 5);
      } else if (p.type === 'line') {
        D.pen(ctx, D.INK, 2);
        D.line(ctx, 0, 0, -Math.sign(p.vx || 1) * p.len, 0, 0.3);
      } else if (p.type === 'dust') {
        D.pen(ctx, D.INK_SOFT, 1.5);
        D.circle(ctx, 0, 0, 4 + (1 - k) * 6, { amt: 0.5 });
      } else if (p.type === 'heart') {
        D.pen(ctx, D.RED, 2);
        D.heart(ctx, 0, 0, 9, { fill: 'rgba(200,50,60,0.6)' });
      } else if (p.type === 'star') {
        D.pen(ctx, D.INK, 1.5);
        D.star(ctx, 0, 0, 5, { fill: D.GOLD });
      } else if (p.type === 'debris') {
        ctx.rotate(p.rot);
        D.pen(ctx, D.GLOOM, 2);
        D.line(ctx, -5, -3, 5, 3, 0.5);
        D.line(ctx, -4, 3, 4, -2, 0.5);
      } else if (p.type === 'text') {
        D.text(ctx, p.text, 0, 0, 20, { color: D.INK });
      } else {
        D.dot(ctx, 0, 0, 2.5, D.INK);
      }
      ctx.restore();
    }
  }

  drawHUD(ctx) {
    const p = this.player, s = this.stats;
    D.pen(ctx, D.RED, 2.2);
    for (let i = 0; i < 3; i++) D.heart(ctx, 30 + i * 34, 32, 13, { fill: i < p.hp ? 'rgba(200,50,60,0.75)' : null });
    D.pen(ctx, D.INK, 2);
    D.star(ctx, 148, 32, 13, { fill: 'rgba(241,200,75,0.7)' });
    D.text(ctx, `${s.sparks} / ${s.total}${s.officeStars ? ` +${s.officeStars}` : ''}`, 168, 33, 26, { align: 'left' });
    const found = this.secrets.filter((x) => x.got).length;
    for (let i = 0; i < this.secrets.length; i++) {
      ctx.save();
      ctx.translate(290 + i * 36, 38);
      ctx.scale(0.75, 0.75);
      S.drawTrinket(ctx, this.charId, 0, i >= found);
      ctx.restore();
    }

    const b = this.boss;
    if (b && b.active && !b.dead && b.type === 'reindeer') {
      // sits right of the treasure icons, clear of the pause button
      const bx = 420, bw = 220;
      D.text(ctx, 'REINDEER INFLUENCER', bx + bw / 2, 24, 22, { sc: true, color: D.INK });
      D.pen(ctx, D.INK, 2);
      D.rect(ctx, bx, 40, bw, 14, { amt: 0.5 });
      ctx.fillStyle = 'rgba(224,122,208,0.75)';
      ctx.fillRect(bx + 2, 42, (bw - 4) * Math.max(0, b.hp / b.maxHp), 10);
      D.text(ctx, 'buzz', bx + bw + 10, 47, 18, { align: 'left' });
      if (b.intro > 0) {
        D.text(ctx, 'Reindeer Influencer', VW / 2, 200, 60, { sc: true });
        D.text(ctx, "it lives for your attention. Don't give it any.", VW / 2, 250, 26);
      } else {
        D.text(ctx, b.watched ? "You're looking at it! Its buzz is going up." : 'Ignoring it... its buzz is draining.',
          bx + bw / 2, 72, 18, { color: b.watched ? D.RED : D.INK });
      }
    } else if (b && b.active && !b.dead) {
      D.text(ctx, 'BLUE MONDAY', VW / 2, 26, 24, { sc: true, color: D.GLOOM });
      D.pen(ctx, D.GLOOM, 2);
      for (let i = 0; i < b.maxHp; i++) {
        D.rect(ctx, VW / 2 - b.maxHp * 14 + i * 28, 42, 22, 12, { fill: i < b.hp ? 'rgba(90,100,121,0.8)' : null, amt: 0.5 });
      }
      if (b.intro > 0) {
        D.text(ctx, 'Blue Monday', VW / 2, 200, 64, { sc: true, color: D.GLOOM });
        D.text(ctx, 'the most miserable day of the year', VW / 2, 250, 26, { color: D.GLOOM });
      }
    }

    if (this.banner > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.banner);
      const room = this.office || this.cellar;
      const by = room ? 90 : 0;
      D.text(ctx, room ? 'A secret room!' : `Level ${this.levelIndex + 1}`, VW / 2, 180 - by, 30);
      D.text(ctx, this.L.name, VW / 2, 228 - by, 54, { sc: true });
      ctx.restore();
    }

    this.toasts.forEach((t, i) => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, t.life * 2);
      D.text(ctx, t.text, VW / 2, 100 + i * 34, 28);
      ctx.restore();
    });

    if (this.state === 'win') {
      D.text(ctx, 'Seasonal Spirit restored!', VW / 2, 150, 48, { sc: true });
    }
  }
}
