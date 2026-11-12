// Keyboard and on-screen touch controls.

export const input = {
  left: false, right: false, jump: false, special: false,
  jumpPressed: false, specialPressed: false, pausePressed: false,
};

const held = { left: new Set(), right: new Set(), jump: new Set(), special: new Set() };

function set(action, source, down) {
  const s = held[action];
  const was = s.size > 0;
  if (down) s.add(source); else s.delete(source);
  const now = s.size > 0;
  input[action] = now;
  if (now && !was) {
    if (action === 'jump') input.jumpPressed = true;
    if (action === 'special') input.specialPressed = true;
  }
}

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyZ: 'jump',
  KeyX: 'special', ShiftLeft: 'special', ShiftRight: 'special', KeyJ: 'special', KeyK: 'special',
};

export function initInput(root) {
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'Escape' || e.code === 'KeyP') { input.pausePressed = true; return; }
    const a = KEYS[e.code];
    if (a) {
      e.preventDefault();
      if (!e.repeat) set(a, 'k:' + e.code, true);
    }
  });
  window.addEventListener('keyup', (e) => {
    const a = KEYS[e.code];
    if (a) set(a, 'k:' + e.code, false);
  });
  window.addEventListener('blur', () => releaseAll());

  root.querySelectorAll('[data-action]').forEach((btn) => {
    const a = btn.dataset.action;
    const down = (e) => {
      e.preventDefault();
      btn.setPointerCapture?.(e.pointerId);
      btn.classList.add('down');
      set(a, 'p:' + e.pointerId, true);
    };
    const up = (e) => {
      btn.classList.remove('down');
      set(a, 'p:' + e.pointerId, false);
    };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}

export function releaseAll() {
  for (const k of Object.keys(held)) { held[k].clear(); input[k] = false; }
  document.querySelectorAll('[data-action].down').forEach((b) => b.classList.remove('down'));
  swipes.clear();
}

// Releases every action held by sources whose name starts with `prefix`.
function releaseSource(prefix) {
  for (const action of Object.keys(held)) {
    for (const src of [...held[action]]) if (src.startsWith(prefix)) set(action, src, false);
  }
  if (prefix === 'p:') document.querySelectorAll('[data-action].down').forEach((b) => b.classList.remove('down'));
}

// When the last finger leaves the screen, nothing can still be held down.
// iPhones sometimes drop the "finger lifted" event for a button (for example while
// the page zooms), which used to leave a direction stuck on.
export function initTouchSafety() {
  const allUp = (e) => {
    if (e.touches.length === 0) releaseSource('p:');
  };
  document.addEventListener('touchend', allUp, { passive: true });
  document.addEventListener('touchcancel', allUp, { passive: true });
  // Stop pinch and double-tap zoom while playing (iPhones ignore user-scalable=no).
  document.addEventListener('gesturestart', (e) => { if (document.body.classList.contains('playing')) e.preventDefault(); });
  document.addEventListener('dblclick', (e) => { if (document.body.classList.contains('playing')) e.preventDefault(); });
  document.addEventListener('touchmove', (e) => {
    if (document.body.classList.contains('playing') && e.cancelable) e.preventDefault();
  }, { passive: false });
}

// ---------- Swipe controls ----------
// Slide a finger left or right to run, flick up to jump (keep the finger down to
// jump higher or glide), tap for the special move. Every finger is tracked on its
// own, so one thumb can do everything or two thumbs can share the work.
const DEAD = 14;     // px a finger must slide before running starts
const LEASH = 26;    // how far the finger can get ahead before the anchor follows it
const FLICK = 26;    // px upwards that counts as a jump
const MIN_JUMP = 0.3; // seconds a flicked jump is held, so even a quick flick gives a near-full jump
const TAP_MS = 280;
const swipes = new Map();

function releaseJump(s, id) {
  if (!s.jumping) return;
  s.jumping = false;
  const left = MIN_JUMP * 1000 - (performance.now() - s.jumpAt);
  if (left > 0) setTimeout(() => set('jump', id, false), left);
  else set('jump', id, false);
}

function swipeMove(s, id, x, y) {
  if (Math.hypot(x - s.x0, y - s.y0) > 12) s.moved = true;
  // left and right: the finger acts like a joystick anchored where it went down,
  // and the anchor trails along so turning round only needs a short slide back
  if (s.dir === 0) {
    if (x - s.ax > DEAD) s.dir = 1;
    else if (x - s.ax < -DEAD) s.dir = -1;
  } else if (s.dir === 1) {
    s.ax = Math.max(s.ax, x - LEASH);
    if (x < s.ax - DEAD) { s.dir = -1; s.ax = x + LEASH; }
  } else {
    s.ax = Math.min(s.ax, x + LEASH);
    if (x > s.ax + DEAD) { s.dir = 1; s.ax = x - LEASH; }
  }
  set('right', id, s.dir === 1);
  set('left', id, s.dir === -1);
  // up: a flick from the lowest point jumps; moving back down re-arms it
  if (!s.jumping) {
    // track the lowest recent point (sliding sideways keeps it under the finger)
    if (y >= s.lowY) { s.lowY = y; s.lowX = x; }
    const up = s.lowY - y;
    if (up > FLICK && up > Math.abs(x - s.lowX) * 0.8) {
      s.jumping = true;
      s.jumped = true;
      s.jumpAt = performance.now();
      s.hiY = y;
      set('jump', id, true);
    }
  } else {
    if (y < s.hiY) s.hiY = y;
    if (y - s.hiY > FLICK) {
      releaseJump(s, id);
      s.lowY = y;
      s.lowX = x;
    }
  }
}

export function initSwipe(el) {
  const opts = { passive: false };
  el.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      swipes.set(t.identifier, {
        x0: t.clientX, y0: t.clientY, ax: t.clientX, lowY: t.clientY, lowX: t.clientX, hiY: t.clientY,
        t0: performance.now(), dir: 0, jumping: false, jumped: false, moved: false, jumpAt: 0,
      });
    }
  }, opts);
  el.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const s = swipes.get(t.identifier);
      if (s) swipeMove(s, 's:' + t.identifier, t.clientX, t.clientY);
    }
  }, opts);
  const end = (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const s = swipes.get(t.identifier);
      if (!s) continue;
      swipes.delete(t.identifier);
      const id = 's:' + t.identifier;
      set('left', id, false);
      set('right', id, false);
      releaseJump(s, id);
      if (!s.moved && !s.jumped && performance.now() - s.t0 < TAP_MS) {
        set('special', 'tap', true);
        set('special', 'tap', false);
      }
    }
    if (e.touches.length === 0) {
      for (const action of ['left', 'right', 'special']) {
        for (const src of [...held[action]]) if (src.startsWith('s:')) set(action, src, false);
      }
    }
  };
  el.addEventListener('touchend', end, opts);
  el.addEventListener('touchcancel', end, opts);
}

export function endFrame() {
  input.jumpPressed = false;
  input.specialPressed = false;
  input.pausePressed = false;
}
