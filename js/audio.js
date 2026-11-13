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
  pulse: () => { tone(220, 0.18, { type: 'sawtooth', vol: 0.1, slide: 600 }); tone(880, 0.12, { type: 'square', vol: 0.05, at: 0.04 }); },
  harp: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.09, at: i * 0.035 })),
  flap: () => noise(0.12, { vol: 0.16, freq: 700, sweep: -300, q: 0.8 }),
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

SONGS.gym = { ...SONGS.deck, bpm: 172 };

function schedule() {
  if (!ac) return;
  if (jazz) { scheduleJazz(); return; }
  if (!song) return;
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

// ---------- Avant Garde Acid Jazz ----------
// Generated live: walking upright bass, swung ride cymbal, jazzy comping,
// a squelchy acid bassline and the occasional unsettling flourish.
// Each song gets its own key, tempo and time signature (pulses = eighth notes per bar).
const JAZZ = {
  deck: { bpm: 132, root: 38, pulses: 8, swing: true },    // D, 4/4
  jingle: { bpm: 150, root: 41, pulses: 8, swing: true },  // F, 4/4
  gym: { bpm: 176, root: 43, pulses: 7, swing: false },    // G, 7/8
  godrest: { bpm: 116, root: 33, pulses: 10, swing: true }, // A, 5/4
  wish: { bpm: 104, root: 36, pulses: 6, swing: true },    // C, 3/4 waltz
};
// a minor-ish modal cycle: i-7, iv-7, bVII7, V7(#9)
const CHORDS = [[0, [0, 3, 7, 10]], [5, [0, 3, 7, 10]], [10, [0, 4, 7, 10]], [7, [0, 4, 10, 15]]];
const ACID_SCALE = [0, 3, 5, 6, 7, 10, 12, 15];

let style = 'festive';
let currentName = null;
let jazz = null;

function voice(f, t, dur, { type = 'sine', vol = 0.1, attack = 0.005, filter = null, vib = 0 } = {}) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (vib) {
    const lfo = ac.createOscillator();
    const lg = ac.createGain();
    lfo.frequency.value = 6;
    lg.gain.value = vib;
    lfo.connect(lg).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (filter) {
    const bq = ac.createBiquadFilter();
    bq.type = filter.type || 'lowpass';
    bq.Q.value = filter.q || 1;
    bq.frequency.setValueAtTime(filter.from, t);
    if (filter.to) bq.frequency.exponentialRampToValueAtTime(filter.to, t + (filter.time || dur));
    node = o.connect(bq);
  }
  node.connect(g).connect(musicBus);
  o.start(t);
  o.stop(t + dur + 0.05);
  return o;
}
function hat(t, dur, vol, freq) {
  noise(dur, { vol, freq, q: 4, at: t - ac.currentTime, bus: musicBus });
}

function newAcidPattern() {
  const pat = [];
  for (let i = 0; i < 16; i++) {
    const on = Math.random() < (i % 4 === 0 ? 0.85 : 0.55);
    pat.push(on ? {
      n: ACID_SCALE[Math.floor(Math.random() * ACID_SCALE.length)] + (Math.random() < 0.2 ? 12 : 0),
      accent: Math.random() < 0.3,
    } : null);
  }
  return pat;
}

function jazzPulse(t) {
  const c = jazz.cfg;
  const pulseDur = 30 / c.bpm;
  const { pulse, bar } = jazz;
  const [deg, tones] = CHORDS[bar % CHORDS.length];
  const root = c.root + deg;
  const beat = pulse % 2 === 0;

  // ride cymbal: ding on the beat, a skip before beats 2 and 4
  if (beat) hat(t, 0.25, 0.05, 6800);
  if (c.swing && pulse % 4 === 3) hat(t, 0.12, 0.035, 7200);
  if (pulse % 4 === 2) hat(t, 0.04, 0.03, 3000); // hi-hat foot

  // walking bass on every beat, approaching the next chord chromatically
  if (beat) {
    let n;
    const lastBeat = pulse + 2 >= c.pulses;
    if (pulse === 0) n = root;
    else if (lastBeat) {
      const nextRoot = c.root + CHORDS[(bar + 1) % CHORDS.length][0];
      n = nextRoot + (Math.random() < 0.5 ? -1 : 1);
    } else n = root + tones[1 + Math.floor(Math.random() * 3)] - (Math.random() < 0.3 ? 12 : 0);
    while (n < c.root - 5) n += 12;
    voice(freq(n), t, pulseDur * 1.9, { type: 'triangle', vol: 0.2, filter: { from: 900, to: 300, q: 2 } });
  }

  // comping: Rhodes-ish chords, mostly off the beat
  if (Math.random() < (beat ? 0.12 : 0.35)) {
    for (const iv of [tones[1], tones[3], tones[0] + 14, tones[2] + 9]) {
      voice(freq(root + 24 + iv), t, pulseDur * 1.6, { type: 'sine', vol: 0.035, attack: 0.01, vib: 3 });
    }
  }

  // the acid line: two sixteenths per pulse, silent every fourth bar
  if (bar % 4 !== 3 && bar > 0) {
    for (let k = 0; k < 2; k++) {
      const st = jazz.acid[(pulse * 2 + k) % 16];
      if (!st) continue;
      const at = t + k * pulseDur / 2;
      voice(freq(c.root + 12 + st.n), at, pulseDur * 0.55, {
        type: 'sawtooth', vol: st.accent ? 0.075 : 0.045,
        filter: { type: 'lowpass', from: st.accent ? 2800 : 1400, to: 180, q: 16, time: pulseDur * 0.5 },
      });
    }
  }

  // avant garde: now and then a cluster chord or a squealing sax
  if (pulse === 0 && bar > 0 && bar % 6 === 5) {
    if (Math.random() < 0.5) {
      for (const iv of [0, 1, 2, 6]) voice(freq(root + 36 + iv), t, pulseDur * 6, { type: 'triangle', vol: 0.03, attack: 0.3, vib: 5 });
    } else {
      const o = voice(freq(root + 31), t, pulseDur * 4, { type: 'square', vol: 0.03, attack: 0.05, vib: 14, filter: { type: 'bandpass', from: 1500, q: 3 } });
      o.frequency.exponentialRampToValueAtTime(freq(root + 50), t + pulseDur * 3.5);
    }
  }

  jazz.pulse++;
  if (jazz.pulse >= c.pulses) {
    jazz.pulse = 0;
    jazz.bar++;
    if (jazz.bar % 4 === 0) jazz.acid = newAcidPattern();
  }
}

function scheduleJazz() {
  const c = jazz.cfg;
  const pulseDur = 30 / c.bpm;
  while (jazz.next < ac.currentTime + 0.25) {
    const swingOffset = c.swing && jazz.pulse % 2 === 1 ? pulseDur * 0.28 : 0;
    jazzPulse(jazz.next + swingOffset);
    jazz.next += pulseDur;
  }
}

export function setMusicStyle(s) {
  if (s === style) return;
  style = s;
  const name = currentName;
  song = null;
  jazz = null;
  currentName = null;
  if (name) playMusic(name);
}
export function getMusicStyle() { return style; }

export function playMusic(name) {
  if (!ac) return;
  if (currentName === name && (song || jazz)) return;
  currentName = name;
  if (style === 'acid') {
    song = null;
    jazz = { cfg: JAZZ[name] || JAZZ.deck, pulse: 0, bar: 0, next: ac.currentTime + 0.1, acid: newAcidPattern() };
  } else {
    jazz = null;
    song = SONGS[name] || null;
    noteIdx = 0;
    nextTime = ac.currentTime + 0.1;
  }
  if (!timer) timer = setInterval(schedule, 60);
}

export function stopMusic() {
  song = null;
  jazz = null;
  currentName = null;
}
