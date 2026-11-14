# Christmas Card Characters: Save The Seasonal Spirit

Made by Bass Moultapps.

A hand-drawn Christmas platformer. January has come early, and the characters from this year's Christmas cards have to save the Seasonal Spirit.

It's a plain web page with no build step, so it runs on GitHub Pages as-is. It works on phones (with touch buttons) and on computers (with the keyboard).

## Playing it locally

Any static file server works. For example:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. It won't work opened straight from the file system, because the browser blocks JavaScript modules on `file://`.

Add `?dev` to the address to open every level for characters you've already unlocked. It doesn't unlock characters.

## Putting it online with GitHub Pages

1. In the repository on GitHub, go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**, and pick `main` and `/ (root)`.
3. After a minute the game is live at `https://<your-username>.github.io/<repo-name>/`. Send that link to your friends.

GitHub Pages on a free account needs a public repository, so anyone could read the code. That's why the passcode answers aren't stored anywhere in it (see below).

## Publishing an update

Run this before pushing any change to the game:

```sh
node tools/bump-version.mjs
```

It stamps a new version on every script and the stylesheet in `index.html`, so players' phones load the new files instead of reusing old cached copies.

## How the character passcodes work

Each friend unlocks their character by answering a question about their card, for example "What is Tim's favourite food?".

- The answers aren't in the code. `js/locks.js` holds a hash of each answer and the card details, encrypted with the answer as the key. A correct answer unlocks the card and decrypts it in one step.
- Matching is forgiving. It ignores capitals, punctuation, plurals and filler words such as "the" and "egg".
- Unlocks are remembered in the browser, so friends only answer once per device.

This keeps the answers away from anyone reading the code. A determined friend with a list of foods could still guess by trial and error. It's a Christmas card, not a bank.

### Adding a new character

1. Write a private JSON file **outside this repo**, or name it `*.private.json` (that name is ignored by git):

   ```json
   {
     "tim": { "answer": "...", "card": { "stats": [["Name", "Tim Ternabet"], ["...", "..."]], "ability": "...", "abilityHow": "...", "secret": "...", "secrets": "...", "victory": "..." } }
   }
   ```

   The file only needs the new characters: the tool keeps everyone already in `js/locks.js`. Add `"key"` to choose the word to match for multi-word answers (for example `"pooh"` for "Winnie the Pooh"), and `"alsoAccept"` to list other answers that must work.
2. Run `node tools/encrypt.mjs path/to/cards.private.json`. It updates `js/locks.js`.
3. Add the character's public details (name, number, question, drawing function, moves and tutorial `hints`) to `js/characters.js`, and add their ID to `ORDER`. Moves can mix `projectile` (`snack`, `pulse` or `harp`), `glide` (fall speed), `sprint`, `pounce`, `stamp` and `airJumps`.
4. Run `node tools/check-levels.mjs` to make sure the new character can finish every level.

## Shared high scores (optional)

Out of the box, scores are saved on each player's device. To share one high-score board between everyone:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the **SQL editor**, run:

   ```sql
   create table scores (
     id bigint generated always as identity primary key,
     name text not null check (char_length(name) between 1 and 20),
     character text not null check (char_length(character) <= 40),
     score integer not null check (score between 0 and 100000),
     created_at timestamptz not null default now()
   );
   alter table scores enable row level security;
   create policy "anyone can read scores" on scores for select using (true);
   create policy "anyone can add a score" on scores for insert with check (true);
   grant select, insert on table scores to anon;
   ```

3. Copy the **Project URL** and the public key into `js/config.js`. The public key is called the **publishable key** (starting `sb_publishable_`) in newer projects, or the **anon** key in older ones. Never use the secret or `service_role` key, because it bypasses the security rules.

The public key is designed to be seen by anyone. Row level security limits it to reading and adding scores. Scores aren't verified, so a friend who's good with browser tools could post a fake one.

## Code layout

| File | What it does |
|---|---|
| `index.html`, `css/style.css` | Menus, the redrawn character cards, touch buttons |
| `js/main.js` | Screens, saving progress, unlocking, starting levels |
| `js/game.js` | The platformer: physics, enemies, the two bosses, drawing |
| `js/levels.js` | The four level layouts |
| `js/surf.js` | Bonus level 3½: Surf the Egg Nog Wave |
| `js/characters.js` | The characters, drawn in code |
| `js/sprites.js` | January's minions, pickups, scenery and backgrounds |
| `js/draw.js` | Wobbly biro drawing helpers |
| `js/theme.js` | Light and dark themes: translates colours as they're drawn |
| `js/audio.js` | Sound effects, carols (all public domain) and the generated Avant Garde Acid Jazz |
| `js/lock.js`, `js/locks.js` | Passcode checking and the encrypted cards |
| `js/intro.js` | The 20-second intro cutscene |
| `js/awards.js` | Baubles: the awards and the rules for earning them |
| `js/scores.js`, `js/config.js` | High scores |
| `js/share.js` | The shareable "I saved Christmas" picture |
| `tools/check-levels.mjs` | Checks every level can be finished by every character, using the game's own physics |
| `tools/encrypt.mjs` | Builds `js/locks.js` from a private file of answers |
| `tools/bump-version.mjs` | Stamps a new version on the files so phones don't use stale copies |
