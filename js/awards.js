// Baubles: awards for feats, earned from the player's stats.
//
// Each award has a test on `facts`, a small record of what this device has done.
// main.js updates the facts when something happens (a level is finished, a
// character is unlocked, a score is posted) and then calls checkAwards().

export const AWARDS = [
  { id: 'first-light', name: 'First Light', desc: 'Light your first Christmas tree by finishing a level.', test: (f) => f.levels >= 1 },
  { id: 'full-run', name: 'Full Run', desc: 'Finish a full run: levels 1 to 4 in a row.', test: (f) => f.fullRun },
  { id: 'season-saved', name: 'Season Saved', desc: 'Complete all four levels with one character.', test: (f) => f.seasonSaved },
  { id: 'nog-surfer', name: 'Nog Surfer', desc: 'Ride 100 m on the egg nog wave.', test: (f) => f.surfBest >= 100 },
  { id: 'big-kahuna', name: 'Big Kahuna', desc: 'Ride 500 m on the egg nog wave.', test: (f) => f.surfBest >= 500 },
  { id: 'ensemble-cast', name: 'Ensemble Cast', desc: 'Finish levels as two different characters.', test: (f) => f.chars.length >= 2 },
  { id: 'full-house', name: 'Full House', desc: 'Unlock every Christmas card character.', test: (f) => f.allCards },
  { id: 'starstruck', name: 'Starstruck', desc: 'Collect every star in a level.', test: (f) => f.allStars },
  { id: 'treasure-hunter', name: 'Treasure Hunter', desc: 'Find all three hidden treasures in one level.', test: (f) => f.allSecrets },
  { id: 'untouchable', name: 'Untouchable', desc: 'Finish a level without taking a single hit.', test: (f) => f.noHit },
  { id: 'beat-the-clock', name: 'Beat the Clock', desc: 'Finish Boxing Day Leftovers in under 1 minute 30.', test: (f) => f.speedy },
  { id: 'unbothered', name: 'Unbothered', desc: 'Ignore the Reindeer Influencer into oblivion.', test: (f) => f.reindeer },
  { id: 'monday-cancelled', name: 'Monday Cancelled', desc: 'Defeat Blue Monday.', test: (f) => f.monday },
  { id: 'morale-officer', name: 'Morale Officer', desc: "Cheer up 100 of January's minions.", test: (f) => f.minions >= 100, progress: (f) => [f.minions, 100] },
  { id: 'stargazer', name: 'Stargazer', desc: 'Collect 1,000 stars in total.', test: (f) => f.stars >= 1000, progress: (f) => [f.stars, 1000] },
  { id: 'on-the-board', name: 'On the Board', desc: 'Put a full run on the high-score board.', test: (f) => f.board },
  { id: 'night-owl', name: 'Night Owl', desc: 'Finish a level in dark mode.', test: (f) => f.dark },
  { id: 'acid-test', name: 'Acid Test', desc: 'Finish a level to Avant Garde Acid Jazz.', test: (f) => f.acid },
  // a secret until earned: the name and description are hidden so Blue Monday stays a surprise
  { id: 'changed-sides', name: 'Changed Sides', desc: 'Blue Monday has joined your side.', secret: 'A surprise for finishing the game as 3 different characters.', test: (f) => f.mondayUnlocked },
  { id: 'ebenezer', name: 'Ebenezer', desc: 'Shut up shop for Christmas.', test: (f) => f.ebenezer },
  { id: 'big-ten', name: 'Big Ten', desc: 'Score 10,000 or more across a full run.', test: (f) => f.bestRun >= 10000, progress: (f) => [f.bestRun, 10000] },
  { id: 'black-wednesday', name: 'Black Wednesday', desc: 'Finish a level as Blue Monday.', secret: 'Some days are darker than others.', test: (f) => f.blackWednesday },
  { id: 'gym-bunny', name: 'Gym Bunny', desc: 'Finish The Gym of Resolutions without taking a hit.', test: (f) => f.gymBunny },
  { id: 'treasure-trove', name: 'Treasure Trove', desc: 'Find all 12 hidden treasures with one character.', test: (f) => Object.values(f.treasures).some((lv) => [0, 1, 2, 3].every((i) => (lv[i] || 0) >= 3)) },
  { id: 'boxing-day', name: 'Boxing Day', desc: 'Play on Boxing Day.', test: (f) => f.boxingDay },
  { id: 'ring-in-2027', name: 'Ring in 2027', desc: "Play on New Year's Day 2027.", test: (f) => f.newYear },
  { id: 'fully-decorated', name: 'Fully Decorated', desc: 'Earn every other bauble.', test: (f, earned) => AWARDS.every((a) => a.id === 'fully-decorated' || earned[a.id]) },
];

export function blankFacts() {
  return {
    levels: 0, stars: 0, minions: 0, surfBest: 0, chars: [],
    fullRun: false, seasonSaved: false, allCards: false, allStars: false, allSecrets: false,
    noHit: false, speedy: false, reindeer: false, monday: false, board: false,
    dark: false, acid: false, mondayUnlocked: false, ebenezer: false,
    bestRun: 0, blackWednesday: false, gymBunny: false, treasures: {}, boxingDay: false, newYear: false,
  };
}

// Records a finished level (or surf ride) in the facts
export function recordResult(facts, result, { charId, dark, acid, runDone, seasonSaved }) {
  if (result.bonus) {
    facts.surfBest = Math.max(facts.surfBest, result.distance || 0);
    return;
  }
  facts.levels++;
  facts.stars += result.sparks || 0;
  facts.minions += result.enemies || 0;
  if (!facts.chars.includes(charId)) facts.chars.push(charId);
  if (result.allStars) facts.allStars = true;
  if (result.secretTotal > 0 && result.secrets >= result.secretTotal) facts.allSecrets = true;
  if (result.hits === 0) facts.noHit = true;
  if (result.level === 0 && result.time < 90) facts.speedy = true;
  if (result.boss === 'reindeer') facts.reindeer = true;
  if (result.boss === 'monday') facts.monday = true;
  if (dark) facts.dark = true;
  if (acid) facts.acid = true;
  if (runDone) facts.fullRun = true;
  if (charId === 'monday') facts.blackWednesday = true;
  if (result.level === 2 && result.hits === 0) facts.gymBunny = true;
  const tr = (facts.treasures[charId] = facts.treasures[charId] || {});
  tr[result.level] = Math.max(tr[result.level] || 0, result.secrets || 0);
  if (seasonSaved) facts.seasonSaved = true;
}

// Marks newly earned awards and returns them (in order)
export function checkAwards(facts, earned) {
  const fresh = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const a of AWARDS) {
      if (!earned[a.id] && a.test(facts, earned)) {
        earned[a.id] = Date.now();
        fresh.push(a);
        changed = true;
      }
    }
  }
  return fresh;
}

// Dates that earn baubles just for playing
export function recordDate(facts, now = new Date()) {
  if (now.getMonth() === 11 && now.getDate() === 26) facts.boxingDay = true;
  if (now.getFullYear() === 2027 && now.getMonth() === 0 && now.getDate() === 1) facts.newYear = true;
}
