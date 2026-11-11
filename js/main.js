// Screens, saving, unlocking and starting the game.
import { CHARACTERS, ORDER, drawJunie } from './characters.js';
import { LOCKS } from './locks.js';
import { tryUnlock, decrypt } from './lock.js';
import { Game, VW, VH } from './game.js';
import { LEVELS } from './levels.js';
import { initInput, releaseAll } from './input.js';
import * as A from './audio.js';
import * as D from './draw.js';
import * as S from './sprites.js';
import { submitScore, topScores, isShared } from './scores.js';
import { shareImage, whatsappLink } from './share.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TONES = { kraft: '#c9a87a', white: '#f8f6f0', paper: '#f6efdf' };
const DEV = new URLSearchParams(location.search).has('dev');

// ---------- Save data ----------
const SAVE_KEY = 'ccc:save:v1';
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s === 'object') return { unlocked: {}, progress: {}, name: '', muted: false, seenStory: {}, ...s };
  } catch { /* no save yet */ }
  return { unlocked: {}, progress: {}, name: '', muted: false, seenStory: {} };
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
const game = new Game(canvas, { onComplete, onPause: pauseGame });
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
  $('#touch').hidden = !(on && isTouch);
  $('#pauseBtn').hidden = !on;
}

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
  const ctx = c.getContext('2d');
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

  if (scene === 'title') {
    // card-style starburst
    D.pen(ctx, D.INK, 2);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.15 + i * 0.12);
      D.line(ctx, 280 + Math.cos(a) * 120, 230 + Math.sin(a) * 120, 280 + Math.cos(a) * 175, 230 + Math.sin(a) * 175, 1.2);
    }
    for (const [x, y] of [[60, 60], [500, 50], [120, 150], [440, 140]]) D.star(ctx, x, y, 10, { fill: 'rgba(241,200,75,0.7)' });
    ORDER.forEach((id, i) => {
      const x = 200 + i * 160;
      if (cards[id]) {
        const hop = Math.max(0, Math.sin(t * 3 + i * 1.7)) * 10;
        drawCharAt(ctx, id, x, 205 - hop, 2, { state: hop > 2 ? 'jump' : 'idle', t: t + i });
      } else {
        ctx.save();
        ctx.translate(x - 50, 40);
        drawMystery(ctx, 100, 170);
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
    ctx.translate(450, 245);
    ctx.scale(2, 2);
    drawJunie(ctx, t);
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
}
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
    const btn = document.createElement('button');
    btn.className = `char-tile sketch ${ch.cardTone}`;
    btn.innerHTML = `
      <canvas class="portrait" width="150" height="150" data-tone="${ch.cardTone}" ${unlocked ? `data-char="${id}"` : 'data-locked="1"'}></canvas>
      <span class="num">${esc(ch.number)}</span>
      <div class="name">${esc(ch.name)}</div>
      <div class="state">${unlocked ? 'Unlocked: tap to see the card' : 'Locked: tap to unlock'}</div>`;
    btn.addEventListener('click', () => {
      A.sfx.click();
      if (unlocked) openCard(id); else openUnlock(id);
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
  'Still no. Maybe ask Cass?',
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
          <div class="asks">≡ asks Cass ≡<small>(and probably you, too)</small></div>
        </div>
        <div class="card-body">
          <canvas class="portrait" width="150" height="170" data-char="${id}" data-tone="${ch.cardTone}"></canvas>
          <dl class="stats">${card.stats.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        </div>
        <div class="signature">x ${esc(ch.name)}</div>
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
function totalScore(id) {
  const p = prog(id);
  return Object.values(p.best).reduce((sum, r) => sum + (r?.score || 0), 0);
}
function openLevels() {
  const ch = CHARACTERS[current];
  const p = prog(current);
  $('#levelsTitle').textContent = `${ch.first}'s adventure`;
  const list = $('#levelList');
  list.innerHTML = '';
  LEVELS.forEach((L, i) => {
    const open = DEV || i <= p.reached;
    const best = p.best[i];
    const btn = document.createElement('button');
    btn.className = 'level-tile sketch';
    btn.disabled = !open;
    btn.innerHTML = `
      <div class="n">Level ${i + 1}</div>
      <div class="t">${esc(L.name)}</div>
      <div class="b">${!open ? 'Locked' : best ? `Best ${best.score.toLocaleString('en-GB')}<br>★ ${best.sparks}/${best.total} · treasures ${best.secrets}/${best.secretTotal}` : 'Not played yet'}</div>`;
    btn.addEventListener('click', () => {
      A.sfx.click();
      if (i === 0 && !save.seenStory[current]) openStory();
      else startLevel(i);
    });
    list.appendChild(btn);
  });
  const total = totalScore(current);
  $('#levelsTotal').textContent = total ? `Total score: ${total.toLocaleString('en-GB')}` : '';
  $('#finaleReplay').hidden = !p.done;
  show('levels');
  A.playMusic('jingle');
}
$('#levelsBack').addEventListener('click', () => openCard(current));
$('#finaleReplay').addEventListener('click', () => openFinale());

function openStory() {
  const ch = CHARACTERS[current];
  $('#storyText').innerHTML = `
    <p>January has come early!</p>
    <p>It's creeping through the Christmas holidays and draining the Seasonal Spirit out of everything. The leftovers have gone sad, the commute is back, the gym is full of resolutions, and Blue Monday is waiting in the tax office.</p>
    <p>Only <b>${esc(ch.name)}</b> can light the Christmas trees and bring the Seasonal Spirit back.</p>`;
  show('story');
  paintVisible();
}
$('#storyGo').addEventListener('click', () => {
  save.seenStory[current] = true;
  persist();
  startLevel(0);
});

// ---------- Playing ----------
function startLevel(i) {
  currentLevel = i;
  hidePages();
  setPlaying(true);
  releaseAll();
  game.start(i, current, cards[current]);
  checkRotate();
}

function pauseGame() {
  if (!game.running || game.paused) return;
  game.setPaused(true);
  releaseAll();
  openModal('pause');
}
function resumeGame() {
  closeModal();
  releaseAll();
  game.setPaused(false);
}
$('#pauseBtn').addEventListener('click', pauseGame);
$('#resumeBtn').addEventListener('click', resumeGame);
$('#restartBtn').addEventListener('click', () => { closeModal(); startLevel(currentLevel); });
$('#quitBtn').addEventListener('click', () => { game.stop(); openLevels(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });

function onComplete(result) {
  const p = prog(current);
  const prev = p.best[result.level];
  const isBest = !prev || result.score > prev.score;
  if (isBest) p.best[result.level] = result;
  p.reached = Math.max(p.reached, Math.min(LEVELS.length - 1, result.level + 1));
  if (result.level === LEVELS.length - 1) p.done = true;
  persist();
  lastResult = result;
  game.setPaused(true);
  setPlaying(false);
  if (result.level === LEVELS.length - 1) {
    game.stop();
    openFinale();
    return;
  }
  const mins = Math.floor(result.time / 60), secs = Math.floor(result.time % 60).toString().padStart(2, '0');
  const secretName = cards[current]?.secrets || 'treasures';
  $('#completeName').textContent = LEVELS[result.level].name;
  $('#completeStats').innerHTML = `
    <tr><td>★ Stars</td><td>${result.sparks} / ${result.total}</td><td>${result.sparks * 10}</td></tr>
    <tr><td>Hidden ${esc(secretName)}</td><td>${result.secrets} / ${result.secretTotal}</td><td>${result.secrets * 250}</td></tr>
    <tr><td>Minions cheered up</td><td>${result.enemies}</td><td>${result.enemies * 20}</td></tr>
    <tr><td>Time</td><td>${mins}:${secs}</td><td>${result.timeBonus}</td></tr>
    <tr><td>Tree lit</td><td></td><td>500</td></tr>
    <tr><td>Tumbles</td><td>${result.deaths}</td><td>${result.deaths ? -result.deaths * 50 : 0}</td></tr>
    <tr class="total"><td>Score</td><td></td><td>${result.score.toLocaleString('en-GB')}</td></tr>`;
  $('#completeBest').textContent = isBest ? (prev ? 'New best score!' : '') : `Best: ${prev.score.toLocaleString('en-GB')}`;
  openModal('complete');
}
$('#completeNext').addEventListener('click', () => { game.stop(); startLevel(lastResult.level + 1); });
$('#completeRetry').addEventListener('click', () => { game.stop(); startLevel(lastResult.level); });
$('#completeLevels').addEventListener('click', () => { game.stop(); openLevels(); });

// ---------- Finale ----------
let finaleTotal = 0;
function openFinale() {
  finaleTotal = totalScore(current);
  $('#finaleVictory').textContent = cards[current]?.victory || '';
  $('#finaleScore').textContent = finaleTotal.toLocaleString('en-GB');
  $('#nameInput').value = save.name || '';
  $('#scoreMsg').textContent = '';
  $('#scoreForm button').disabled = false;
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
  $('#scoreForm button').disabled = true;
  const { shared } = await submitScore({ name, character: CHARACTERS[current].name, score: finaleTotal });
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

// ---------- High scores ----------
async function openScores() {
  show('scores');
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
    else if (go === 'howto') show('howto');
    else if (go === 'scores') openScores();
  });
});
$('#muteBtn').addEventListener('click', toggleMute);
$('#pauseMute').addEventListener('click', toggleMute);

// ---------- Layout ----------
function checkRotate() {
  const portrait = window.innerHeight > window.innerWidth;
  if (game.running && isTouch && portrait && !rotateDismissed) {
    if (!game.paused) { game.setPaused(true); pausedForRotate = true; }
    openModal('rotate');
  } else if ($('#s-rotate').classList.contains('active')) {
    closeModal();
    if (pausedForRotate) { pausedForRotate = false; game.setPaused(false); }
  }
}
$('#rotateAnyway').addEventListener('click', () => {
  rotateDismissed = true;
  closeModal();
  if (pausedForRotate) { pausedForRotate = false; game.setPaused(false); }
});

function resize() {
  const W = window.innerWidth, H = window.innerHeight;
  const aspect = VW / VH;
  let w = W, h = W / aspect;
  if (h > H) { h = H; w = H * aspect; }
  canvas.style.width = `${Math.floor(w)}px`;
  canvas.style.height = `${Math.floor(h)}px`;
  game.resize(Math.floor(w), Math.floor(h), Math.min(2, window.devicePixelRatio || 1));
  checkRotate();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// ---------- Boot ----------
function wakeAudio() {
  A.initAudio();
  A.setMuted(save.muted);
  if (!game.running) A.playMusic($('#s-finale').classList.contains('active') ? 'wish' : 'jingle');
}
window.addEventListener('pointerdown', wakeAudio, { once: true });
window.addEventListener('keydown', wakeAudio, { once: true });

initInput(document);
updateMuteLabels();
resize();
openTitle();
const fontsReady = document.fonts?.ready || Promise.resolve();
fontsReady.then(() => paintVisible());
