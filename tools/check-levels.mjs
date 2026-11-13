// Checks every level can be finished by every character, using the real game physics.
//
//   node tools/check-levels.mjs            (all levels, all characters)
//   node tools/check-levels.mjs 2 rex      (one level, one character)
//
// From each place the player can stand, it tries a spread of runs, jumps and special
// moves, and records where they land. Enemies are removed and touching spikes counts as
// a failed move. Gloom walls are removed, since both characters can break them.
// Then it reports whether the exit can be reached, plus any stars or treasures that can't.
import { Game } from '../js/game.js';
import { LEVELS, T, TILE } from '../js/levels.js';
import { CHARACTERS, ORDER } from '../js/characters.js';
import { input } from '../js/input.js';

const DT = 1 / 120;
const MAX_T = 2.6;

function makeGame(li, cid) {
  const g = new Game({ getContext: () => ({}) }, { onComplete() {}, onPause() {} });
  g.charId = cid;
  g.ch = CHARACTERS[cid];
  g.card = null;
  g.load(li);
  g.enemies = [];
  g.boss = null;
  g.exit.visible = true;
  for (const w of g.walls) {
    w.alive = false;
    for (let j = w.y; j < w.y + w.h; j++) g.setTile(w.x, j, TILE.EMPTY);
  }
  g.hurt = () => { g._failed = true; };
  g.kill = () => { g._failed = true; };
  g.toast = () => {};
  g.burst = () => {};
  return g;
}

function setClock(g, tau) {
  for (const m of g.movers) {
    m.t = tau * m.speed;
    const u = (1 - Math.cos(m.t)) / 2;
    m.x = m.axis === 'x' ? m.x0 + u * m.range : m.x0;
    m.y = m.axis === 'y' ? m.y0 - u * m.range : m.y0;
    m.dx = m.dy = 0;
  }
}

function nodeKey(g, p, tau) {
  if (p.ride) {
    const i = g.movers.indexOf(p.ride);
    const period = (Math.PI * 2) / p.ride.speed;
    const bucket = Math.floor(((tau % period) / period) * 10);
    const rel = Math.round((p.x - p.ride.x) / 20);
    return `m${i}:${bucket}:${rel}`;
  }
  return `${Math.floor((p.x + p.w / 2) / T)},${Math.floor((p.y + p.h) / T)}`;
}

function simulate(g, node, act, onLand) {
  const ch = g.ch;
  setClock(g, node.tau);
  const p = g.makePlayer({ x: 0, y: 0 });
  Object.assign(p, { x: node.x, y: node.y, onGround: true, coyote: 0.1, facing: act.d || 1 });
  p.vx = act.run ? act.d * ch.speed : 0;
  p.ride = node.mover >= 0 ? g.movers[node.mover] : null;
  g.player = p;
  g._failed = false;
  g.state = 'play';
  g.exit.lit = false;
  let tau = node.tau;
  // optionally stand still first, so moving platforms are tried at different points in their cycle
  for (let w = 0; w < (act.delay || 0); w += DT) {
    input.left = input.right = input.jump = false;
    g.updateMovers(DT);
    g.updatePlayer(DT, false, false);
    tau += DT;
  }
  let t = 0, airborne = false;
  let lastKey = nodeKey(g, p, tau);
  input.left = act.d < 0;
  input.right = act.d > 0;
  input.jump = false;
  while (t < MAX_T) {
    const dHeld = act.release == null || t < act.release;
    input.left = dHeld && act.d < 0;
    input.right = dHeld && act.d > 0;
    let jp = false, sp = false;
    if (act.jump != null) {
      if (t === 0) jp = true;
      input.jump = t < act.jump;
    }
    // extra presses in mid-air (ski jump, flaps, bounce)
    if (act.air) {
      for (const at of act.air) {
        if (Math.abs(t - at) < DT / 2) { jp = true; input.jump = true; }
        else if (t > at && t < at + 0.15) input.jump = true;
      }
    }
    if (act.special != null && Math.abs(t - act.special) < DT / 2) sp = true;
    g.updateMovers(DT);
    tau += DT;
    g.updatePlayer(DT, jp, sp);
    t += DT;
    if (g._failed) return;
    if (g.state === 'win') { onLand(null, 'exit'); return; }
    if (!p.onGround) airborne = true;
    else {
      const key = nodeKey(g, p, tau);
      if (airborne || key !== lastKey) {
        onLand({ x: p.x, y: p.y, mover: p.ride ? g.movers.indexOf(p.ride) : -1, tau }, key);
        lastKey = key;
        if (airborne && act.d === 0) return;
        airborne = false;
      }
      if (act.jump == null && act.d === 0 && !p.ride) return;
    }
  }
}

function actions(cid, hasMovers) {
  const ch = CHARACTERS[cid];
  const ab = ch.abilities;
  const out = [];
  const delays = hasMovers ? [0, 0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6] : [0];
  const specials = ab.sprint || ab.pounce ? [null, 0.1, 0.25, 0.4, 0.55] : [null];
  // mid-air jump timings to try
  let airs = [null];
  if (ab.airJumps) {
    const n = ab.airJumps.count;
    airs = [null, [0.2], [0.35], [0.5]];
    if (n >= 2) airs.push([0.3, 0.6], [0.4, 0.75]);
    if (n >= 3) airs.push([0.3, 0.6, 0.9], [0.45, 0.8, 1.15]);
  }
  for (const d of [-1, 0, 1]) {
    for (const run of d ? [false, true] : [false]) {
      for (const jump of [null, 0.08, 0.2, 99]) {
        for (const special of specials) {
          for (const air of jump == null ? [null] : airs) {
            for (const release of d ? [null, 0.35] : [null]) {
              for (const delay of delays) out.push({ d, run, jump, special, air, release, delay });
            }
          }
        }
      }
    }
  }
  // riding a platform: wait a bit
  out.push({ d: 0, run: false, jump: null, special: null, release: null, wait: true });
  return out;
}

function check(li, cid) {
  const g = makeGame(li, cid);
  const start = { x: g.player.x, y: g.player.y, mover: -1, tau: 0 };
  const seen = new Map([[nodeKey(g, g.player, 0), start]]);
  const queue = [start];
  let exit = false;
  const acts = actions(cid, g.movers.length > 0);
  while (queue.length) {
    const node = queue.shift();
    for (const act of acts) {
      if (act.wait && node.mover < 0) continue;
      simulate(g, node, act, (n, key) => {
        if (key === 'exit') { exit = true; return; }
        if (!seen.has(key)) { seen.set(key, n); queue.push(n); }
      });
    }
    if (seen.size > 6000) break;
  }
  const missedSparks = g.sparks.filter((s) => !s.got).map((s) => `(${Math.floor(s.x / T)},${Math.floor(s.y / T)})`);
  const missedSecrets = g.secrets.filter((s) => !s.got).map((s) => `(${Math.floor(s.x / T)},${Math.floor(s.y / T)})`);
  return { exit, nodes: seen.size, missedSparks, missedSecrets };
}

const [onlyLevel, onlyChar] = process.argv.slice(2);
let ok = true;
for (let li = 0; li < LEVELS.length; li++) {
  if (onlyLevel && +onlyLevel !== li + 1) continue;
  for (const cid of ORDER) {
    if (onlyChar && onlyChar !== cid) continue;
    const t0 = Date.now();
    const r = check(li, cid);
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const status = r.exit ? 'OK  ' : 'FAIL';
    if (!r.exit || r.missedSecrets.length) ok = false;
    console.log(`${status} L${li + 1} ${cid.padEnd(4)} nodes=${r.nodes} ${secs}s` +
      (r.missedSecrets.length ? `  missed treasures ${r.missedSecrets.join(' ')}` : '') +
      (r.missedSparks.length ? `  missed stars ${r.missedSparks.join(' ')}` : ''));
  }
}
process.exit(ok ? 0 : 1);
