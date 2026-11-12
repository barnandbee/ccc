// High scores: shared through Supabase when configured, otherwise kept on this device.
import { CONFIG } from './config.js';

const LOCAL_KEY = 'ccc:scores';

export function isShared() {
  return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);
}

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; } catch { return []; }
}
function writeLocal(list) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
}

function headers() {
  const key = CONFIG.supabaseAnonKey;
  const h = { apikey: key, 'Content-Type': 'application/json' };
  // Older "anon" keys are JWTs (eyJ...) and also go in Authorization.
  // Newer "sb_publishable_..." keys must only be sent as apikey.
  if (key.startsWith('eyJ')) h.Authorization = `Bearer ${key}`;
  return h;
}

export async function submitScore({ name, character, score }) {
  const entry = { name: String(name).slice(0, 20), character, score: Math.round(score), at: Date.now() };
  const local = readLocal();
  local.push(entry);
  local.sort((a, b) => b.score - a.score);
  writeLocal(local.slice(0, 50));
  if (!isShared()) return { shared: false };
  try {
    const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/scores`, {
      method: 'POST',
      headers: { ...headers(), Prefer: 'return=minimal' },
      body: JSON.stringify({ name: entry.name, character: entry.character, score: entry.score }),
    });
    return { shared: res.ok };
  } catch {
    return { shared: false };
  }
}

export async function topScores(limit = 10) {
  if (isShared()) {
    try {
      const res = await fetch(
        `${CONFIG.supabaseUrl}/rest/v1/scores?select=name,character,score&order=score.desc&limit=${limit}`,
        { headers: headers() },
      );
      if (res.ok) return { shared: true, list: await res.json() };
    } catch { /* fall back to local */ }
  }
  return { shared: false, list: readLocal().slice(0, limit) };
}
