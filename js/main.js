// Screens, saving, unlocking and starting the game.
import { CHARACTERS, ORDER } from './characters.js';
import { Intro } from './intro.js';
import { LOCKS } from './locks.js';
import { tryUnlock, decrypt } from './lock.js';
import { Game, VW, VH } from './game.js';
import { Surf, BONUS, BONUS_NAME } from './surf.js';
import { LEVELS } from './levels.js';
import { initInput, initSwipe, initTouchSafety, releaseAll } from './input.js';
import * as A from './audio.js';
import * as D from './draw.js';
import * as Theme from './theme.js';
import * as S from './sprites.js';
import { submitScore, topScores, isShared } from './scores.js';
import { shareImage, whatsappLink } from './share.js';
import { AWARDS, blankFacts, recordResult, checkAwards } from './awards.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TONES = { kraft: '#c9a87a', white: '#f8f6f0', paper: '#f6efdf' };
const DEV = new URLSearchParams(location.search).has('dev');

// ---------- Save data ----------
const SAVE_KEY = 'ccc:save:v1';
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s === 'object') {
      const out = { ...defaults(), ...s };
      out.facts = { ...blankFacts(), ...(s.facts || {}) };
      return out;
    }
  } catch { /* no save yet */ }
  return defaults();
}
function defaults() {
  return {
    unlocked: {}, progress: {}, name: '', muted: false, seenStory: {}, controls: 'swipe', theme: 'auto',
    music: 'festive', awards: {}, facts: blankFacts(),
  };
}
let save = loadSave();
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* private mode */ }
}
function prog(id) {
  if (!save.progress[id]) save.progress[id] = { reached: 0, best: {}, done: false };
  return save.progress[id];
}

const cards = {};
for (const id of ORDER) {
  const ch = CHARACTERS[id];
  if (ch.unlockedBy) {
    if (save.unlocked[id]) cards[id] = ch.card;
    continue;
  }
  const key = save.unlocked[id];
  if (!key || !LOCKS[id]) continue;
  const card = decrypt(id, key, LOCKS[id].data);
  if (card) cards[id] = card; else delete save.unlocked[id];
}

// ---------- State ----------
let current = null;
let currentLevel = 0;
let unlockId = null;
let unlockTries = 0;
let lastResult = null;
let rotateDismissed = false;
let pausedForRotate = false;
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

const canvas = $('#game');
const game = new Game(canvas, { onComplete, onPause: pauseGame, onOfficeDone, onGiant });
const surf = new Surf(canvas, { onComplete, onPause: pauseGame });
let engine = game; // whichever is running: the platformer or the bonus surf level
if (DEV) window.__surf = surf;
const STARS_FOR_BONUS = 100;
const BONUS_STAR_LEVELS = 3; // stars from levels 1-3 count towards unlocking the bonus
if (DEV) window.__game = game;

// ---------- Screen management ----------
function show(name) {
  document.querySelectorAll('.screen:not(.dim)').forEach((s) => s.classList.toggle('active', s.id === `s-${name}`));
  closeModal();
  setPlaying(false);
  const el = $(`#s-${name}`);
  if (el) el.scrollTop = 0;
}
function hidePages() {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
}
function openModal(name) {
  document.querySelectorAll('.screen.dim').forEach((s) => s.classList.toggle('active', s.id === `s-${name}`));
}
function closeModal() {
  document.querySelectorAll('.screen.dim').forEach((s) => s.classList.remove('active'));
}
function setPlaying(on) {
  const swipe = save.controls !== 'buttons';
  document.body.classList.toggle('playing', on);
  $('#touch').hidden = !(on && isTouch && !swipe);
  $('#swipe').hidden = !(on && isTouch && swipe);
  $('#pauseBtn').hidden = !on;
  if (!on) $('#swipeHint').hidden = true;
}

let hintTimer = null;
function showSwipeHint() {
  if (!isTouch || save.controls === 'buttons') return;
  const h = $('#swipeHint');
  clearTimeout(hintTimer);
  h.hidden = false;
  h.classList.remove('fade');
  hintTimer = setTimeout(() => {
    h.classList.add('fade');
    hintTimer = setTimeout(() => { h.hidden = true; }, 700);
  }, 5000);
}

function updateControlsLabel() {
  for (const b of [$('#controlsBtn'), $('#optControls')]) {
    b.hidden = !isTouch;
    b.textContent = `Controls: ${save.controls === 'buttons' ? 'buttons' : 'swipe'}`;
  }
}
$('#optControls').addEventListener('click', () => $('#controlsBtn').click());
$('#controlsBtn').addEventListener('click', () => {
  save.controls = save.controls === 'buttons' ? 'swipe' : 'buttons';
  persist();
  updateControlsLabel();
});

// ---------- Portrait canvases (redrawn a few times a second so the lines boil) ----------
function drawMystery(ctx, w, h) {
  D.pen(ctx, D.INK_SOFT, 2.5);
  D.circle(ctx, w / 2, h * 0.42, h * 0.2, { amt: 2 });
  D.poly(ctx, [[w / 2 - h * 0.18, h * 0.88], [w / 2 - h * 0.14, h * 0.62], [w / 2 + h * 0.14, h * 0.62], [w / 2 + h * 0.18, h * 0.88]], { amt: 2 });
  D.text(ctx, '?', w / 2, h * 0.43, h * 0.32, { color: D.INK });
}

function drawCharAt(ctx, id, x, y, scale, pose) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  CHARACTERS[id].draw(ctx, pose);
  ctx.restore();
}

function paintCanvas(c, t) {
  if (!c.dataset.lw) {
    c.dataset.lw = c.width;
    c.dataset.lh = c.height;
    // Fix the on-screen size before resizing the backing pixels. Otherwise a canvas
    // with no CSS size would grow by the pixel ratio on every redraw (3x on iPhones).
    if (!c.style.width && !c.classList.contains('sized')) {
      c.style.width = `min(${c.width}px, 100%)`;
      c.style.height = 'auto';
    }
  }
  const lw = +c.dataset.lw, lh = +c.dataset.lh;
  const cw = c.clientWidth;
  if (!cw) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pw = Math.round(cw * dpr), ph = Math.round(((cw * lh) / lw) * dpr);
  if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
  // pictures on the menus follow the theme; ones on the real cards keep the card's colours
  const ctx = c.getContext('2d');
  if (!c.dataset.tone || c.dataset.tone === 'paper') Theme.themeContext(ctx);
  ctx.setTransform(pw / lw, 0, 0, ph / lh, 0, 0);
  ctx.clearRect(0, 0, lw, lh);
  D.setBoil(t);
  D.setPaper(TONES[c.dataset.tone] || TONES.paper);
  const scene = c.dataset.scene;

  if (c.dataset.locked) return drawMystery(ctx, lw, lh);

  if (c.dataset.char) {
    const id = c.dataset.char;
    const s = Math.min(lw, lh) / 100;
    drawCharAt(ctx, id, lw / 2, lh * 0.92, s * 1.05, { state: 'idle', t });
    return;
  }

  if (c.dataset.bauble !== undefined) {
    ctx.save();
    ctx.translate(lw / 2, lh / 2 + 6);
    ctx.scale(lw / 50, lw / 50);
    S.drawBauble(ctx, +c.dataset.bauble, c.dataset.earned === '1', t);
    ctx.restore();
    return;
  }

  if (scene === 'awards') {
    // a big tree hung with every bauble earned so far
    D.pen(ctx, D.INK, 2.6);
    const tiers = [[90, 360, 470], [130, 270, 430], [175, 185, 385]];
    for (const [l, y, r] of tiers) D.poly(ctx, [[l, y], [280, y - 130], [r, y]], { fill: 'rgba(76,175,106,0.25)' });
    D.rect(ctx, 262, 360, 36, 26, { fill: true });
    D.star(ctx, 280, 52, 20, { fill: 'rgba(241,200,75,0.8)', rot: Math.sin(t) * 0.1 });
    // rows of hooks that sit inside each tier of the tree (7 + 6 + 6 + 4 + 4 = 27)
    const slots = [];
    const rows = [[0, 22, 7], [0, 62, 6], [1, 22, 6], [1, 66, 4], [2, 28, 4]];
    for (const [tier, up, count] of rows) {
      const [l, base, r] = tiers[tier];
      const y = base - up;
      const width = (r - l) * ((130 - up) / 130) * 0.8;
      for (let i = 0; i < count; i++) slots.push([280 - width / 2 + (width * (i + 0.5)) / count, y]);
    }
    AWARDS.forEach((a, i) => {
      const [x, y] = slots[i % slots.length];
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(0.56, 0.56);
      if (save.awards[a.id]) S.drawBauble(ctx, i, true, t);
      else { ctx.globalAlpha = 0.35; S.drawBauble(ctx, i, false, t); }
      ctx.restore();
    });
    return;
  }

  if (scene === 'title') {
    // card-style starburst
    D.pen(ctx, D.INK, 2);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.15 + i * 0.12);
      D.line(ctx, 280 + Math.cos(a) * 120, 230 + Math.sin(a) * 120, 280 + Math.cos(a) * 175, 230 + Math.sin(a) * 175, 1.2);
    }
    for (const [x, y] of [[60, 60], [500, 50], [120, 150], [440, 140]]) D.star(ctx, x, y, 10, { fill: 'rgba(241,200,75,0.7)' });
    const shown = ORDER.filter((id) => !CHARACTERS[id].unlockedBy || cards[id]);
    const n = shown.length;
    const gap = 470 / n;
    const sc = Math.min(2, gap / 34);
    shown.forEach((id, i) => {
      const x = 45 + gap * (i + 0.5);
      if (cards[id]) {
        const hop = Math.max(0, Math.sin(t * 3 + i * 1.7)) * 10;
        drawCharAt(ctx, id, x, 205 - hop, sc, { state: hop > 2 ? 'jump' : 'idle', t: t + i });
      } else {
        const w = 50 * sc, h = 85 * sc;
        ctx.save();
        ctx.translate(x - w / 2, 205 - h);
        drawMystery(ctx, w, h);
        ctx.restore();
      }
    });
    D.pen(ctx, D.INK, 2.2);
    D.line(ctx, 40, 208, 520, 208, 1.5);
    return;
  }

  if (scene === 'story' && current) {
    drawCharAt(ctx, current, 110, 185, 2, { state: 'idle', t });
    D.pen(ctx, D.GLOOM, 2.4);
    ctx.save();
    ctx.translate(310, 95);
    ctx.scale(2.6, 2.6);
    S.drawFlyer(ctx, 2, t);
    ctx.restore();
    D.text(ctx, 'JANUARY', 310, 160, 28, { sc: true, color: D.GLOOM });
    D.pen(ctx, D.INK, 2);
    D.text(ctx, 'vs', 210, 110, 34);
    return;
  }

  if (scene === 'finale' && current) {
    ctx.save();
    ctx.translate(90, 250);
    ctx.scale(1.3, 1.3);
    S.drawTree(ctx, true, t);
    ctx.restore();
    const hop = Math.abs(Math.sin(t * 4)) * 22;
    drawCharAt(ctx, current, 290, 245 - hop, 2.1, { state: hop > 6 ? 'jump' : 'idle', t });
    ctx.save();
    ctx.translate(470, 250);
    ctx.scale(1.3, 1.3);
    S.drawTree(ctx, true, t + 1);
    ctx.restore();
    const cols = [D.RED, D.GOLD, '#3b9ad9', '#4caf6a'];
    for (let i = 0; i < 26; i++) {
      const x = (D.hash(i * 7) * 560 + t * 20 * (i % 3 + 1)) % 560;
      const y = (D.hash(i * 3) * 260 + t * 60 * (1 + (i % 4) * 0.3)) % 260;
      ctx.fillStyle = cols[i % 4];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 3 + i);
      ctx.fillRect(-4, -2.5, 8, 5);
      ctx.restore();
    }
  }
}

function paintVisible() {
  const t = performance.now() / 1000;
  document.querySelectorAll('.screen.active canvas.portrait').forEach((c) => paintCanvas(c, t));
}
setInterval(paintVisible, 140);

// ---------- Title ----------
function openTitle() {
  show('title');
  A.playMusic('jingle');
  paintVisible();
}

function updateMuteLabels() {
  const label = `Sound: ${save.muted ? 'off' : 'on'}`;
  $('#muteBtn').textContent = label;
  $('#pauseMute').textContent = label;
  const music = `Music: ${save.music === 'acid' ? 'Avant Garde Acid Jazz' : 'Festive'}`;
  $('#musicBtn').textContent = music;
  $('#pauseMusic').textContent = music;
}
function toggleMusic() {
  save.music = save.music === 'acid' ? 'festive' : 'acid';
  A.setMusicStyle(save.music);
  persist();
  updateMuteLabels();
}
$('#musicBtn').addEventListener('click', toggleMusic);
$('#pauseMusic').addEventListener('click', toggleMusic);

// ---------- The secret office ----------
function onOfficeDone() {
  const p = prog(current);
  if (p.office) return;
  p.office = true;
  save.facts.ebenezer = true;
  save.facts.stars += 44;
  awardCheck();
  persist();
}

function onGiant() {
  save.facts.giant = true;
  awardCheck();
  persist();
}

// ---------- Awards (baubles) ----------
// Characters (other than Blue Monday) who have finished the game
function completions() {
  return ORDER.filter((id) => !CHARACTERS[id].unlockedBy && save.progress[id]?.done).length;
}
function maybeUnlockMonday() {
  const m = CHARACTERS.monday;
  if (save.unlocked.monday || completions() < m.completionsNeeded) return false;
  save.unlocked.monday = 'earned';
  cards.monday = m.card;
  return true;
}
function refreshFacts() {
  for (const pr of Object.values(save.progress)) {
    if (pr.lastRun) save.facts.bestRun = Math.max(save.facts.bestRun || 0, pr.lastRun.total);
  }
  save.facts.allCards = ORDER.every((id) => CHARACTERS[id].unlockedBy || cards[id]);
  save.facts.mondayUnlocked = !!save.unlocked.monday;
  save.facts.unlockedCount = ORDER.filter((id) => cards[id]).length;
  save.facts.characterCount = ORDER.length;
  save.facts.everyone = save.facts.unlockedCount >= ORDER.length;
}
const toastQueue = [];
let toastBusy = false;
function awardCheck() {
  for (const a of checkAwards(save.facts, save.awards)) {
    toastQueue.push({ text: a.name, bauble: AWARDS.indexOf(a) });
  }
  pumpToasts();
  updateAwardsLabel();
}
function showToastMessage(text) {
  toastQueue.push({ text, bauble: null });
  pumpToasts();
}
function pumpToasts() {
  if (toastBusy || !toastQueue.length) return;
  toastBusy = true;
  const item = toastQueue.shift();
  const el = $('#awardToast');
  el.querySelector('small').textContent = item.bauble === null ? 'News!' : 'New bauble!';
  el.querySelector('b').textContent = item.text;
  const cv = el.querySelector('canvas');
  cv.hidden = item.bauble === null;
  el.hidden = false; // show first: a hidden canvas has no size to paint at
  if (item.bauble !== null) { cv.dataset.bauble = item.bauble; cv.dataset.earned = '1'; paintCanvas(cv, performance.now() / 1000); }
  if (item.bauble !== null) A.sfx.secret();
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { el.hidden = true; toastBusy = false; pumpToasts(); }, 400);
  }, 3000);
}
function updateAwardsLabel() {
  const n = AWARDS.filter((a) => save.awards[a.id]).length;
  $('#awardsBtn').textContent = `Baubles (${n}/${AWARDS.length})`;
}
function renderAwards() {
  const n = AWARDS.filter((a) => save.awards[a.id]).length;
  $('#awardsCount').textContent = `${n} of ${AWARDS.length} baubles on the tree.`;
  $('#awardList').innerHTML = AWARDS.map((a, i) => {
    const got = save.awards[a.id];
    const when = got ? new Date(got).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
    const name = got || !a.secret ? a.name : '???';
    const desc = got || !a.secret ? a.desc : a.secret;
    let bar = '';
    if (a.progress && !got) {
      const [have, need] = a.progress(save.facts);
      const pct = Math.min(100, Math.round((have / need) * 100));
      bar = `<div class="progress sketch" title="${have} of ${need}"><span style="width:${pct}%"></span></div><small>${Math.min(have, need).toLocaleString('en-GB')} / ${need.toLocaleString('en-GB')}</small>`;
    }
    return `<div class="award ${got ? 'got' : ''}">
      <canvas class="portrait sized" width="50" height="60" data-bauble="${i}" data-earned="${got ? 1 : 0}"></canvas>
      <div><b>${esc(name)}</b><p>${esc(desc)}</p>${bar}${got ? `<small>Earned ${esc(when)}</small>` : ''}</div>
    </div>`;
  }).join('');
}
// ---------- Theme ----------
// 'auto' follows the phone or computer's dark-mode setting
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const dark = save.theme === 'dark' || (save.theme === 'auto' && darkQuery.matches);
  Theme.setDark(dark);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#0b1020' : '#2a2f3d';
  const label = `Theme: ${save.theme}`;
  $('#themeBtn').textContent = label;
  $('#pauseTheme').textContent = label;
  paintVisible();
  if (engine.running) engine.render();
}
function cycleTheme() {
  save.theme = { auto: 'light', light: 'dark', dark: 'auto' }[save.theme] || 'auto';
  persist();
  applyTheme();
}
darkQuery.addEventListener?.('change', () => { if (save.theme === 'auto') applyTheme(); });

function toggleMute() {
  save.muted = !save.muted;
  A.setMuted(save.muted);
  persist();
  updateMuteLabels();
}

// ---------- Character select ----------
function openSelect() {
  const list = $('#charList');
  list.innerHTML = '';
  for (const id of ORDER) {
    const ch = CHARACTERS[id];
    const unlocked = !!cards[id];
    if (ch.unlockedBy && !unlocked) continue; // a full surprise until unlocked
    const btn = document.createElement('button');
    btn.className = `char-tile sketch ${ch.cardTone}${ch.unlockedBy ? ' special' : ''}`;
    let state = unlocked ? 'Unlocked: tap to see the card' : 'Locked: tap to unlock';
    if (!unlocked && ch.unlockedBy) {
      state = `Finish the game as ${ch.completionsNeeded} different characters to unlock (${completions()}/${ch.completionsNeeded})`;
    }
    btn.innerHTML = `
      <canvas class="portrait" width="150" height="150" data-tone="${ch.cardTone}" ${unlocked ? `data-char="${id}"` : 'data-locked="1"'}></canvas>
      <span class="num">${esc(ch.number)}</span>
      <div class="name">${esc(unlocked || !ch.unlockedBy ? ch.name : '???')}</div>
      <div class="state">${state}</div>`;
    btn.addEventListener('click', () => {
      if (unlocked) { A.sfx.click(); openCard(id); }
      else if (ch.unlockedBy) A.sfx.wrong();
      else { A.sfx.click(); openUnlock(id); }
    });
    list.appendChild(btn);
  }
  show('select');
  paintVisible();
}

// ---------- Unlocking ----------
const WRONG = [
  "Hmm, that's not what the card says.",
  'Not quite. Have a look at the card!',
  "Nope. It's written on your card, honest.",
  'Still no. Maybe ask whoever sent it?',
];
function openUnlock(id) {
  unlockId = id;
  unlockTries = 0;
  const ch = CHARACTERS[id];
  $('#unlockTitle').textContent = `To unlock ${ch.first}:`;
  $('#unlockQ').textContent = ch.question;
  $('#unlockInput').value = '';
  const msg = $('#unlockMsg');
  msg.textContent = '';
  msg.className = 'msg';
  openModal('unlock');
  setTimeout(() => $('#unlockInput').focus(), 60);
}
$('#unlockForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = unlockId;
  const value = $('#unlockInput').value;
  const msg = $('#unlockMsg');
  if (!value.trim()) return;
  const res = tryUnlock(LOCKS[id], id, value);
  if (res) {
    cards[id] = res.card;
    save.unlocked[id] = res.key;
    refreshFacts();
    awardCheck();
    persist();
    A.sfx.unlock();
    msg.textContent = `Correct! ${CHARACTERS[id].first} is unlocked.`;
    msg.className = 'msg good';
    $('#unlockInput').blur();
    setTimeout(() => openCard(id), 900);
  } else {
    A.sfx.wrong();
    msg.textContent = WRONG[Math.min(unlockTries, WRONG.length - 1)];
    msg.className = 'msg bad';
    unlockTries++;
    const form = $('#unlockForm');
    form.classList.remove('shake');
    void form.offsetWidth;
    form.classList.add('shake');
  }
});

// ---------- Character card ----------
function openCard(id) {
  current = id;
  const ch = CHARACTERS[id], card = cards[id];
  $('#cardWrap').innerHTML = `
    <div class="card-paper ${ch.cardTone}">
      <div class="card-frame sketch">
        <div class="card-head"><span>Your Christmas 2026 character</span><span class="num">${esc(ch.number)}</span></div>
        <div class="who">
          <div class="bubble sketch">Who is <b>${esc(ch.name)}</b>?</div>
          <div class="asks">≡ asks the card ≡<small>(and probably you, too)</small></div>
        </div>
        <div class="card-body">
          <canvas class="portrait" width="150" height="170" data-char="${id}" data-tone="${ch.cardTone}"></canvas>
          <dl class="stats">${card.stats.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        </div>
        <div class="signature">x ${esc(card.signature || ch.name)}</div>
      </div>
    </div>
    <div class="ability sketch">
      <h3>Special move: ${esc(card.ability)}</h3>
      <p>${esc(card.abilityHow)}</p>
    </div>`;
  $('#playAs').textContent = `Play as ${ch.first}`;
  show('card');
  paintVisible();
}
$('#playAs').addEventListener('click', () => openLevels());

// ---------- Levels ----------
// ---------- Full runs ----------
// Only a full run counts for the high-score board: start at level 1 and finish
// levels 1, 2, 3 and 4 in order (plus the bonus once, between 3 and 4, if unlocked).
// Restarting the level you're on is fine; jumping to another level ends the run.
function runTotal(run) {
  return Object.values(run.scores).reduce((sum, v) => sum + v, 0) + (run.bonus || 0);
}
// Most stars ever collected in each of levels 1-3, added up
function totalStars(id) {
  const p = prog(id);
  let sum = 0;
  for (let i = 0; i < BONUS_STAR_LEVELS; i++) sum += Math.max(p.stars?.[i] || 0, p.best[i]?.sparks || 0);
  return sum + (p.office ? 44 : 0);
}
function bonusOpen(id) {
  return DEV || totalStars(id) >= STARS_FOR_BONUS;
}
function openLevels() {
  const ch = CHARACTERS[current];
  const p = prog(current);
  $('#levelsTitle').textContent = `${ch.first}'s adventure`;
  const list = $('#levelList');
  list.innerHTML = '';
  // the bonus level sits between levels 3 and 4
  const order = [0, 1, 2, BONUS, 3];
  for (const i of order) {
    const bonus = i === BONUS;
    const open = bonus ? bonusOpen(current) : DEV || i <= p.reached;
    const best = p.best[i];
    const btn = document.createElement('button');
    btn.className = `level-tile sketch${bonus ? ' bonus' : ''}`;
    btn.disabled = !open;
    let detail;
    if (bonus) {
      detail = !open
        ? `Locked: collect ${STARS_FOR_BONUS} ★ in levels 1–3<br>(${totalStars(current)} so far)`
        : best ? `Best ${best.score.toLocaleString('en-GB')}<br>${best.distance} m · ★ ${best.sparks}` : 'Not played yet';
    } else {
      detail = !open ? 'Locked' : best
        ? `Best ${best.score.toLocaleString('en-GB')}<br>★ ${best.sparks}/${best.total} · treasures ${best.secrets}/${best.secretTotal}`
        : 'Not played yet';
    }
    const runNext = p.run && !bonus && p.run.next === i;
    btn.innerHTML = `
      ${runNext ? '<div class="run-next">▶ next in your run</div>' : ''}
      <div class="n">${bonus ? 'Bonus level 3½' : `Level ${i + 1}`}</div>
      <div class="t">${esc(bonus ? BONUS_NAME : LEVELS[i].name)}</div>
      <div class="b">${detail}</div>`;
    btn.addEventListener('click', () => {
      A.sfx.click();
      if (i === 0 && !save.seenStory[current]) openStory();
      else beginLevel(i);
    });
    list.appendChild(btn);
  }
  let note;
  if (p.run) note = `Full run in progress: ${runTotal(p.run).toLocaleString('en-GB')} points so far, next up level ${p.run.next + 1}.`;
  else if (p.lastRun) note = `Last full run: ${p.lastRun.total.toLocaleString('en-GB')}. Start at level 1 for a new run.`;
  else note = 'Start at level 1 and play through to level 4 for a full run that counts for the high scores.';
  $('#levelsTotal').textContent = note;
  $('#finaleReplay').hidden = !(p.done || p.lastRun);
  show('levels');
  A.playMusic('jingle');
}
$('#levelsBack').addEventListener('click', () => openCard(current));
$('#finaleReplay').addEventListener('click', () => openFinale());

// ---------- Intro ----------
const intro = new Intro($('#introCanvas'));
function playIntro(charId, then) {
  show('intro');
  sizeIntro();
  A.playMusic('deck');
  intro.play(charId, () => { $('#s-intro').classList.remove('active'); then(); });
}
function openStory() {
  playIntro(current, () => {
    save.seenStory[current] = true;
    persist();
    startLevel(0);
  });
}
$('#s-intro').addEventListener('pointerdown', (e) => {
  if (e.target.id === 'skipIntro') return;
  intro.next();
});
$('#skipIntro').addEventListener('click', () => intro.finish());
window.addEventListener('keydown', (e) => {
  if (!intro.running) return;
  if (e.code === 'Escape') intro.finish();
  else if (['Space', 'Enter', 'ArrowRight', 'KeyX'].includes(e.code)) { e.preventDefault(); intro.next(); }
});
function sizeIntro() {
  const c = $('#introCanvas');
  const W = window.innerWidth, H = window.innerHeight;
  let w = W, h = (W * VH) / VW;
  if (h > H) { h = H; w = (H * VW) / VH; }
  c.style.width = `${Math.floor(w)}px`;
  c.style.height = `${Math.floor(h)}px`;
  intro.resize(Math.floor(w), Math.floor(h), Math.min(2, window.devicePixelRatio || 1));
}
$('#replayIntro').addEventListener('click', () => {
  const who = current || ORDER.find((id) => cards[id]) || 'tim';
  playIntro(who, () => openOptions('howto'));
});

// ---------- Playing ----------
// Starting a level from the menus: warns before ending a run in progress
function beginLevel(i) {
  const p = prog(current);
  if (i !== BONUS && p.run && p.run.next !== i) {
    const msg = i === 0
      ? `Start a new full run? Your current run (${runTotal(p.run).toLocaleString('en-GB')} points, next up level ${p.run.next + 1}) will end.`
      : `You're on a full run (next up: level ${p.run.next + 1}). Playing level ${i + 1} now ends that run, and it won't count for the high scores. Carry on?`;
    if (!window.confirm(msg)) return;
    p.run = null;
    persist();
  }
  startLevel(i);
}

function startLevel(i) {
  if (i === 0) {
    prog(current).run = { next: 0, scores: {}, bonus: null };
    persist();
  }
  currentLevel = i;
  hidePages();
  setPlaying(true);
  releaseAll();
  if (engine !== (i === BONUS ? surf : game)) engine.stop();
  engine = i === BONUS ? surf : game;
  if (i === BONUS) surf.start(current, cards[current], prog(current).best[BONUS]?.distance || 0);
  else game.start(i, current, cards[current], { officeDone: !!prog(current).office });
  checkRotate();
  showSwipeHint();
}

function pauseGame() {
  if (!engine.running || engine.paused) return;
  engine.setPaused(true);
  releaseAll();
  openModal('pause');
}
function resumeGame() {
  closeModal();
  releaseAll();
  setPlaying(true);
  engine.setPaused(false);
}
$('#pauseBtn').addEventListener('click', pauseGame);
$('#resumeBtn').addEventListener('click', resumeGame);
$('#restartBtn').addEventListener('click', () => { closeModal(); startLevel(currentLevel); });
$('#quitBtn').addEventListener('click', () => { engine.stop(); openLevels(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

function onComplete(result) {
  const p = prog(current);
  const prev = p.best[result.level];
  const isBest = !prev || result.score > prev.score;
  if (isBest) p.best[result.level] = result;
  const bonusWasOpen = bonusOpen(current);
  // full run bookkeeping
  let runNote = '';
  let runDone = false;
  if (p.run) {
    if (result.bonus) {
      if (p.run.next === 3 && p.run.bonus == null) {
        p.run.bonus = result.score;
        runNote = 'Counted towards your full run.';
      } else {
        runNote = p.run.bonus != null ? 'Your run already has a bonus score, so this one is practice.' : 'Practice: the bonus counts once per run, between levels 3 and 4.';
      }
    } else if (result.level === p.run.next) {
      p.run.scores[result.level] = result.score;
      p.run.next++;
      runNote = `Full run so far: ${runTotal(p.run).toLocaleString('en-GB')}`;
    }
    if (p.run.next >= LEVELS.length) {
      p.lastRun = { total: runTotal(p.run), submitted: false };
      save.facts.bestRun = Math.max(save.facts.bestRun || 0, p.lastRun.total);
      p.run = null;
      runDone = true;
    }
  } else if (!result.bonus) {
    runNote = 'Practice: start at level 1 for a full run that counts for the high scores.';
  }
  if (!result.bonus) {
    p.stars = p.stars || {};
    p.stars[result.level] = Math.max(p.stars[result.level] || 0, result.sparks);
    p.reached = Math.max(p.reached, Math.min(LEVELS.length - 1, result.level + 1));
    if (result.level === LEVELS.length - 1) p.done = true;
  }
  // awards
  recordResult(save.facts, result, {
    charId: current, dark: Theme.isDark(), acid: A.getMusicStyle() === 'acid', runDone,
    seasonSaved: !result.bonus && result.level === LEVELS.length - 1,
  });
  const mondayNews = maybeUnlockMonday();
  refreshFacts();
  awardCheck();
  if (mondayNews) setTimeout(() => showToastMessage('Blue Monday has changed sides! Find him on the character screen.'), 400);
  persist();
  lastResult = result;
  engine.setPaused(true);
  setPlaying(false);
  if (result.level === LEVELS.length - 1) {
    engine.stop();
    openFinale(runDone);
    return;
  }
  const bestText = isBest ? (prev ? 'New best score!' : '') : `Best: ${prev.score.toLocaleString('en-GB')}`;
  const next = $('#completeNext');
  if (result.bonus) {
    $('#completeTitle').textContent = 'Wiped out!';
    $('#completeName').textContent = `Bonus: ${BONUS_NAME}`;
    $('#completeStats').innerHTML = `
      <tr><td>Distance ridden</td><td>${result.distance} m</td><td>${result.distance * 2}</td></tr>
      <tr><td>★ Stars</td><td>${result.sparks}</td><td>${result.sparks * 4}</td></tr>
      <tr><td>Hazards smashed</td><td>${result.smashed}</td><td>${result.smashed * 20}</td></tr>
      <tr class="total"><td>Score</td><td></td><td>${result.score.toLocaleString('en-GB')}</td></tr>`;
    $('#completeBest').textContent = [bestText, runNote].filter(Boolean).join(' ');
    $('#completeRetry').textContent = 'Ride again';
    next.hidden = !(DEV || p.reached >= 3);
    next.textContent = 'Level 4';
    next.dataset.go = '3';
    openModal('complete');
    return;
  }
  $('#completeTitle').textContent = 'Tree lit!';
  $('#completeRetry').textContent = 'Replay';
  next.hidden = false;
  next.textContent = 'Next level';
  next.dataset.go = String(result.level + 1);
  const mins = Math.floor(result.time / 60), secs = Math.floor(result.time % 60).toString().padStart(2, '0');
  const secretName = cards[current]?.secrets || 'treasures';
  $('#completeName').textContent = LEVELS[result.level].name;
  $('#completeStats').innerHTML = `
    <tr><td>★ Stars</td><td>${result.sparks} / ${result.total}</td><td>${result.sparks * 10}</td></tr>
    <tr><td>Hidden ${esc(secretName)}</td><td>${result.secrets} / ${result.secretTotal}</td><td>${result.secrets * 250}</td></tr>
    <tr><td>Minions cheered up</td><td>${result.enemies}</td><td>${result.enemies * 20}</td></tr>
    <tr><td>Time</td><td>${mins}:${secs}</td><td>${result.timeBonus}</td></tr>
    <tr><td>Tree lit</td><td></td><td>500</td></tr>
    ${result.boss ? '<tr><td>Boss beaten</td><td></td><td>1000</td></tr>' : ''}
    <tr><td>Tumbles</td><td>${result.deaths}</td><td>${result.deaths ? -result.deaths * 50 : 0}</td></tr>
    ${result.giant ? `<tr class="bonus-row"><td>★ A giant discovery</td><td></td><td>${result.giant.toLocaleString('en-GB')}</td></tr>` : ''}
    ${result.officeStars ? `<tr class="bonus-row"><td>★ A secret reward</td><td>+${result.officeStars}</td><td>${result.officeStars * 10}</td></tr>` : ''}
    ${result.allStars ? `<tr class="bonus-row"><td>★ Every star! Bonus</td><td>+20%</td><td>${result.starBonus.toLocaleString('en-GB')}</td></tr>` : ''}
    <tr class="total"><td>Score</td><td></td><td>${result.score.toLocaleString('en-GB')}</td></tr>`;
  const unlocked = !bonusWasOpen && bonusOpen(current) ? ` Bonus level unlocked: ${BONUS_NAME}!` : '';
  $('#completeBest').textContent = [bestText, runNote, unlocked.trim()].filter(Boolean).join(' ');
  openModal('complete');
}
$('#completeNext').addEventListener('click', (e) => { engine.stop(); beginLevel(Number(e.currentTarget.dataset.go)); });
$('#completeRetry').addEventListener('click', () => { engine.stop(); beginLevel(lastResult.level); });
$('#completeLevels').addEventListener('click', () => { engine.stop(); openLevels(); });
$('#completeHome').addEventListener('click', () => { engine.stop(); openTitle(); });
$('#quitHome').addEventListener('click', () => { engine.stop(); openTitle(); });

// ---------- Finale ----------
let finaleTotal = 0;
function openFinale(justFinishedRun = false) {
  const p = prog(current);
  const run = p.lastRun;
  finaleTotal = run ? run.total : 0;
  $('#finaleVictory').textContent = cards[current]?.victory || '';
  $('#finaleScore').textContent = run ? finaleTotal.toLocaleString('en-GB') : '–';
  $('#nameInput').value = save.name || '';
  $('#scoreMsg').textContent = '';
  let note;
  if (!run) note = "That wasn't a full run, so it can't go on the high-score board. Start at level 1 and play through to level 4 to post a score.";
  else if (run.submitted) note = 'This run is already on the high-score board. Start a new run from level 1 to beat it.';
  else if (justFinishedRun) note = 'Full run complete! Add it to the high scores below.';
  else note = 'Your last full run. You can add it to the high scores once.';
  $('#runNote').textContent = note;
  $('#scoreForm').hidden = !run || run.submitted;
  $('#scoreForm button').disabled = false;
  $('#shareBtn').hidden = !run;
  $('#waBtn').hidden = !run;
  $('#waBtn').href = whatsappLink(current, finaleTotal);
  show('finale');
  A.playMusic('wish');
  paintVisible();
}
$('#scoreForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#nameInput').value.trim();
  if (!name) return;
  save.name = name;
  persist();
  const run = prog(current).lastRun;
  if (!run || run.submitted) return;
  $('#scoreForm button').disabled = true;
  run.submitted = true;
  persist();
  const { shared } = await submitScore({ name, character: CHARACTERS[current].name, score: run.total });
  save.facts.board = true;
  awardCheck();
  persist();
  $('#scoreForm').hidden = true;
  $('#scoreMsg').textContent = shared
    ? 'Added to the shared high scores!'
    : isShared()
      ? "Couldn't reach the shared board, so it's saved on this device."
      : 'Saved on this device.';
});
$('#shareBtn').addEventListener('click', async () => {
  const r = await shareImage(current, finaleTotal);
  if (r === 'downloaded') $('#scoreMsg').textContent = 'Picture saved. Send it to whoever needs to know.';
});
$('#finaleLevels').addEventListener('click', () => openLevels());

// ---------- Options & Stats ----------
let optionsTab = 'settings';
function openOptions(tab = optionsTab) {
  optionsTab = tab;
  document.querySelectorAll('#s-options .tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  document.querySelectorAll('#s-options .panel').forEach((p) => { p.hidden = p.id !== `p-${tab}`; });
  if (tab === 'awards') renderAwards();
  if (tab === 'scores') renderScores();
  if (tab === 'stats') renderStats();
  show('options');
  paintVisible();
}
document.querySelectorAll('#s-options .tab').forEach((b) => b.addEventListener('click', () => { A.sfx.click(); openOptions(b.dataset.tab); }));

function renderStats() {
  const f = save.facts;
  const unlockedCount = ORDER.filter((id) => cards[id]).length;
  const visible = ORDER.filter((id) => !CHARACTERS[id].unlockedBy || cards[id]).length;
  const baubles = AWARDS.filter((a) => save.awards[a.id]).length;
  const rows = [
    ['Levels finished', f.levels],
    ['Stars collected', f.stars],
    ["January's minions cheered up", f.minions],
    ['Best egg nog ride', `${f.surfBest} m`],
    ['Characters unlocked', `${unlockedCount} / ${visible}`],
    ['Characters played', f.chars.length],
    ['Baubles', `${baubles} / ${AWARDS.length}`],
  ];
  $('#statsTable').innerHTML = rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(typeof v === 'number' ? v.toLocaleString('en-GB') : v)}</td></tr>`).join('');
  const played = ORDER.filter((id) => cards[id] && save.progress[id]);
  $('#charStats').innerHTML = played.length
    ? `<h3>Best full runs</h3><ul>${played.map((id) => {
      const r = save.progress[id].lastRun;
      return `<li>${esc(CHARACTERS[id].name)}: ${r ? r.total.toLocaleString('en-GB') : 'no full run yet'}</li>`;
    }).join('')}</ul>`
    : '';
}

// ---------- High scores ----------
async function renderScores() {
  const list = $('#scoreList');
  list.innerHTML = '<li>Loading…</li>';
  const { shared, list: rows } = await topScores(10);
  $('#scoresNote').textContent = shared
    ? 'Everyone who has saved the Seasonal Spirit.'
    : 'Scores on this device.';
  list.innerHTML = rows.length
    ? rows.map((r) => `<li><span class="who">${esc(r.name)} <small>as ${esc(r.character)}</small></span><span class="pts">${Number(r.score).toLocaleString('en-GB')}</span></li>`).join('')
    : '<li>No scores yet. Finish all four levels to get on the board!</li>';
}

// ---------- Navigation buttons ----------
document.querySelectorAll('[data-go]').forEach((b) => {
  b.addEventListener('click', () => {
    A.sfx.click();
    const go = b.dataset.go;
    if (go === 'title') openTitle();
    else if (go === 'select') openSelect();
    else if (go === 'options') openOptions();
    else if (go === 'scores') openOptions('scores');
  });
});
$('#muteBtn').addEventListener('click', toggleMute);
$('#themeBtn').addEventListener('click', cycleTheme);
$('#pauseTheme').addEventListener('click', cycleTheme);
$('#pauseMute').addEventListener('click', toggleMute);

// ---------- Layout ----------
function checkRotate() {
  const portrait = window.innerHeight > window.innerWidth;
  if (engine.running && isTouch && portrait && !rotateDismissed) {
    if (!engine.paused) { engine.setPaused(true); pausedForRotate = true; }
    openModal('rotate');
  } else if ($('#s-rotate').classList.contains('active')) {
    closeModal();
    if (pausedForRotate) { pausedForRotate = false; engine.setPaused(false); }
  }
}
$('#rotateAnyway').addEventListener('click', () => {
  rotateDismissed = true;
  closeModal();
  if (pausedForRotate) { pausedForRotate = false; engine.setPaused(false); }
});

function resize() {
  const W = window.innerWidth, H = window.innerHeight;
  const aspect = VW / VH;
  let w = W, h = W / aspect;
  if (h > H) { h = H; w = H * aspect; }
  canvas.style.width = `${Math.floor(w)}px`;
  canvas.style.height = `${Math.floor(h)}px`;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  game.resize(Math.floor(w), Math.floor(h), dpr);
  if (intro.running) sizeIntro();
  surf.resize(Math.floor(w), Math.floor(h), dpr);
  checkRotate();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// ---------- Boot ----------
function wakeAudio() {
  A.initAudio();
  A.setMuted(save.muted);
  A.setMusicStyle(save.music);
  if (!engine.running) A.playMusic($('#s-finale').classList.contains('active') ? 'wish' : 'jingle');
}
window.addEventListener('pointerdown', wakeAudio, { once: true });
window.addEventListener('keydown', wakeAudio, { once: true });

initInput(document);
initSwipe($('#swipe'));
initTouchSafety();
updateMuteLabels();
updateControlsLabel();
applyTheme();
// catch up awards and Blue Monday for saves from before they existed
if (maybeUnlockMonday()) setTimeout(() => showToastMessage('Blue Monday has changed sides! Find him on the character screen.'), 800);
refreshFacts();
updateAwardsLabel();
setTimeout(awardCheck, 600);
persist();
resize();
openTitle();
const fontsReady = document.fonts?.ready || Promise.resolve();
fontsReady.then(() => paintVisible());
