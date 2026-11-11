// Passcode checking and card decryption.
//
// The answers never appear in the source. Each character has:
//   check: a hash of the normalised answer
//   data:  the card details, XOR-encrypted with a key stream derived from the answer
// A correct answer both passes the check and decrypts the card.
// tools/encrypt.mjs produces these values.

export function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

const STOP = new Set([
  'the', 'a', 'an', 'his', 'her', 'its', 'it', 'is', 'i', 'think', 'my', 'of', 'and', 'with',
  'egg', 'food', 'favourite', 'favorite', 'please', 'obviously', 'definitely', 'probably', 'duh',
  'he', 'likes', 'like', 'love', 'loves', 'tim', 'rex',
]);

// Turn whatever the player typed into a few candidate answers.
// It ignores case, punctuation, plurals, filler words and "hard"/"soft" stuck on the front or back.
export function candidates(input) {
  const words = String(input)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const toks = [];
  for (let w of words) {
    if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
    if (STOP.has(w)) continue;
    toks.push(w);
    for (const aff of ['hard', 'soft']) {
      if (w.startsWith(aff) && w.length > aff.length + 2) toks.push(w.slice(aff.length));
      if (w.endsWith(aff) && w.length > aff.length + 2) toks.push(w.slice(0, -aff.length));
    }
  }
  const set = new Set(toks);
  if (toks.length > 1) set.add(toks.join(''));
  return [...set];
}

export function checkHash(id, cand) {
  let h = `ccc|${id}|${cand}`;
  for (let i = 0; i < 1500; i++) h = cyrb53(h, i).toString(36);
  return h;
}

function keyStream(id, cand, n) {
  const out = new Uint8Array(n);
  let i = 0, block = 0;
  while (i < n) {
    let h = cyrb53(`k|${id}|${cand}|${block++}`);
    for (let b = 0; b < 6 && i < n; b++) {
      out[i++] = h & 255;
      h = Math.floor(h / 256);
    }
  }
  return out;
}

function toB64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function fromB64(str) {
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function encrypt(id, cand, obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  const ks = keyStream(id, cand, bytes.length);
  for (let i = 0; i < bytes.length; i++) bytes[i] ^= ks[i];
  return toB64(bytes);
}

export function decrypt(id, cand, data) {
  try {
    const bytes = fromB64(data);
    const ks = keyStream(id, cand, bytes.length);
    for (let i = 0; i < bytes.length; i++) bytes[i] ^= ks[i];
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

// Returns { key, card } on success, or null.
export function tryUnlock(lock, id, input) {
  for (const cand of candidates(input)) {
    if (checkHash(id, cand) === lock.check) {
      const card = decrypt(id, cand, lock.data);
      if (card) return { key: cand, card };
    }
  }
  return null;
}
