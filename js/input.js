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
}

export function endFrame() {
  input.jumpPressed = false;
  input.specialPressed = false;
  input.pausePressed = false;
}
