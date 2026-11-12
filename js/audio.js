// Tiny Web Audio synth: chirpy sound effects and public-domain carols.

let ac = null, master = null, musicBus = null, sfxBus = null;
let muted = false;
let song = null, nextTime = 0, noteIdx = 0, timer = null;

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = muted ? 0 : 0.8;
  master.connect(ac.destination);
  musicBus = ac.createGain();
  musicBus.gain.value = 0.32;
  musicBus.connect(master);
  sfxBus = ac.createGain();
  sfxBus.gain.value = 0.6;
  sfxBus.connect(master);
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ac.currentTime, 0.02);
}
export function isMuted() { return muted; }

function tone(freq, dur, { type = 'square', vol = 0.2, at = 0, slide = 0, bus = sfxBus } = {}) {
  if (!ac) return;
  const t = ac.currentTime + at;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.05);
}

let noiseBuf = null;
function noise(dur, { vol = 0.2, at = 0, freq = 2000, q = 1, sweep = 0, bus = sfxBus } = {}) {
  if (!ac) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime + at;
  const s = ac.createBufferSource();
  s.buffer = noiseBuf;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq + sweep), t + dur);
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(bus);
  s.start(t);
  s.stop(t + dur + 0.05);
}

export const sfx = {
  jump: () => tone(300, 0.14, { vol: 0.12, slide: 400 }),
  spark: () => { tone(1320, 0.08, { type: 'triangle', vol: 0.16 }); tone(1980, 0.14, { type: 'triangle', vol: 0.12, at: 0.06 }); },
  stomp: () => { tone(220, 0.12, { vol: 0.16, slide: -120 }); noise(0.08, { vol: 0.2, freq: 800 }); },
  hurt: () => tone(380, 0.3, { type: 'sawtooth', vol: 0.14, slide: -260 }),
  die: () => { tone(500, 0.6, { type: 'triangle', vol: 0.16, slide: -420 }); },
  throw: () => noise(0.15, { vol: 0.18, freq: 1200, sweep: 1800, q: 2 }),
  sprint: () => { noise(0.35, { vol: 0.25, freq: 600, sweep: 2600, q: 1.5 }); tone(200, 0.3, { vol: 0.08, slide: 500 }); },
  break: () => { noise(0.4, { vol: 0.35, freq: 400, sweep: -200, q: 0.7 }); tone(120, 0.3, { vol: 0.14, slide: -60 }); },
  crack: () => noise(0.12, { vol: 0.25, freq: 900, q: 1 }),
  checkpoint: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { type: 'triangle', vol: 0.14, at: i * 0.07 })),
  secret: () => [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.16, { type: 'triangle', vol: 0.14, at: i * 0.06 })),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'square', vol: 0.1, at: i * 0.12 })),
  bossHit: () => { tone(160, 0.25, { type: 'sawtooth', vol: 0.18, slide: -80 }); noise(0.2, { vol: 0.25, freq: 500 }); },
  bossThrow: () => noise(0.2, { vol: 0.15, freq: 1800, sweep: -1200, q: 3 }),
  slam: () => { tone(80, 0.4, { type: 'sine', vol: 0.3, slide: -40 }); noise(0.3, { vol: 0.3, freq: 300 }); },
  wrong: () => { tone(220, 0.15, { vol: 0.12 }); tone(180, 0.25, { vol: 0.12, at: 0.15 }); },
  unlock: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.15, at: i * 0.09 })),
  click: () => tone(900, 0.04, { type: 'triangle', vol: 0.08 }),
  engage: () => { tone(988, 0.08, { type: 'square', vol: 0.1 }); tone(1319, 0.2, { type: 'square', vol: 0.1, at: 0.08 }); },
  wave: () => noise(0.5, { vol: 0.2, freq: 500, sweep: -300, q: 0.6 }),
};

// ---------- Music ----------
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(n) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n);
  const v = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 12 * (+m[3] + 1) + v;
}
function parse(str) {
  return str.trim().split(/\s+/).map((tok) => {
    const [n, d] = tok.split(':');
    return [n === 'R' ? null : midi(n), d ? parseFloat(d) : 1];
  });
}
const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

const DECK_A = 'G5:1.5 F5:.5 E5 D5 C5 D5 E5 C5 D5:.5 E5:.5 F5:.5 D5:.5 E5:1.5 D5:.5 C5 B4 C5:2';
const SONGS = {
  // Deck the Halls
  deck: {
    bpm: 150,
    notes: parse(`${DECK_A} ${DECK_A}
      D5:1.5 E5:.5 F5 D5 E5:1.5 F5:.5 G5 D5 E5:.5 F#5:.5 G5 A5:.5 B5:.5 C6 B5 A5 G5:2
      G5:1.5 F5:.5 E5 D5 C5 D5 E5 C5 A5:.5 A5:.5 A5:.5 A5:.5 G5:1.5 F5:.5 E5 D5 C5:2`),
    wave: 'square',
  },
  // Jingle Bells (chorus)
  jingle: {
    bpm: 170,
    notes: parse(`E5 E5 E5:2 E5 E5 E5:2 E5 G5 C5:1.5 D5:.5 E5:4
      F5 F5 F5:1.5 F5:.5 F5 E5 E5 E5:.5 E5:.5 E5 D5 D5 E5 D5:2 G5:2
      E5 E5 E5:2 E5 E5 E5:2 E5 G5 C5:1.5 D5:.5 E5:4
      F5 F5 F5 F5 F5 E5 E5 E5:.5 E5:.5 G5 G5 F5 D5 C5:4`),
    wave: 'triangle',
  },
  // God Rest Ye Merry Gentlemen, for the boss
  godrest: {
    bpm: 168,
    notes: parse(`A4 A4 E5 E5 D5 C5 B4 A4 G4 A4 B4 C5 D5 E5:3 R
      A4 A4 E5 E5 D5 C5 B4 A4 G4 A4 B4 C5 D5 E5:3 R
      E5 F5 D5 E5 F5 G5 A5 E5 D5 C5 A4 B4 C5 D5 E5:3 R
      E5:2 D5 C5 B4 A4 G4:2 A4 C5 B4 A4 A4:4`),
    wave: 'sawtooth',
  },
  // We Wish You a Merry Christmas, for the finale
  wish: {
    bpm: 150,
    notes: parse(`G4 C5 C5:.5 D5:.5 C5:.5 B4:.5 A4 A4 A4 D5 D5:.5 E5:.5 D5:.5 C5:.5 B4 G4 G4
      E5 E5:.5 F5:.5 E5:.5 D5:.5 C5 A4 G4:.5 G4:.5 A4 D5 B4 C5:3`),
    wave: 'triangle',
  },
};

function schedule() {
  if (!ac || !song) return;
  const spb = 60 / song.bpm;
  while (nextTime < ac.currentTime + 0.25) {
    const [m, beats] = song.notes[noteIdx];
    const dur = beats * spb;
    if (m !== null) {
      const at = nextTime - ac.currentTime;
      tone(freq(m), Math.min(dur * 0.9, 0.6), { type: song.wave, vol: song.wave === 'sawtooth' ? 0.07 : 0.11, at, bus: musicBus });
      // a simple bass two octaves below on longer notes
      if (beats >= 1) tone(freq(m - 24), dur * 0.8, { type: 'triangle', vol: 0.12, at, bus: musicBus });
    }
    // sleigh-bell tick on each beat
    const beatsWhole = Math.floor(beats);
    for (let b = 0; b < Math.max(1, beatsWhole); b++) {
      noise(0.05, { vol: 0.05, freq: 7000, q: 3, at: nextTime - ac.currentTime + b * spb, bus: musicBus });
    }
    nextTime += dur;
    noteIdx = (noteIdx + 1) % song.notes.length;
  }
}

export function playMusic(name) {
  if (!ac) return;
  if (song === SONGS[name]) return;
  song = SONGS[name] || null;
  noteIdx = 0;
  nextTime = ac.currentTime + 0.1;
  if (!timer) timer = setInterval(schedule, 60);
}

export function stopMusic() {
  song = null;
}
