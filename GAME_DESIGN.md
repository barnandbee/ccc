# Christmas Card Characters: Save The Seasonal Spirit

Design notes from the interview, used as the build spec.

## Premise

January has come early and is draining the Seasonal Spirit. The characters from this year's Christmas cards have to get it back.

## Platform

- Browser game for phone and desktop.
- Keyboard controls on desktop and on-screen touch buttons on phones.
- Hosted on GitHub Pages from this repo.

## Look and sound

- Drawn in blue biro on textured card stock, like the cards.
- Lines are wobbly and redraw slightly each frame ("line boil").
- Sound effects and a jingly carol, with a mute button.

## Unlocking characters

- Each friend gets one character, and unlocks it with a question about their card.
- **Tim Ternabet (#001)**: "To unlock Tim: what is Tim's favourite food?"
- **Rex P. Majestrum (#042)**: "To unlock Rex: what is Rex's favourite egg?"
- The answers are on the cards and are deliberately not written anywhere in this repo.
- Matching is forgiving. It ignores case, spaces, punctuation, plurals and filler words.
- Each character's card details are encrypted with their answer, so nothing can be read from the page source.
- When a character is unlocked, the game shows their redrawn "Who is...?" card with all their stats.

## Characters

| Character | Card details | Abilities |
|---|---|---|
| Tim Ternabet #001 | See the card | **Throw**: lobs his favourite food at enemies. **Hair glide**: floats down slowly using his hair. |
| Rex P. Majestrum #042 | See the card | **Keirin sprint**: a burst of speed that smashes breakable walls of January gloom. |

Only these two characters for now. Adding more later should only take a new data entry plus artwork.

## Levels

Difficulty starts gentle and rises to moderate.

1. **Boxing Day Leftovers**: gentle tutorial.
2. **The Back-to-Work Commute**: rainy trains (the 07:52 to London Waterloo), emails. Ends with a boss: the **Reindeer Influencer**, who loses buzz while you look away from it, hops round to get back in front of you and lobs over-sponsored gifts. Attacking it counts as engagement and tops its buzz back up.
3. **The Gym of Resolutions**: treadmills, kettlebells, "New Year New Me" enemies. Crieff Court can be seen through one of the windows.
   - **Bonus 3½: Surf the Egg Nog Wave**: unlocked at 100 stars across levels 1–3 (most stars per level). Endless ride on a wave of egg nog; three wipeouts and it's over. Scored on distance, stars and hazards smashed.
4. **Blue Monday's Tax Office**: boss fight against the self-assessment deadline.

Early levels have generous checkpoints and respawning. Later levels add trickier jumps and tougher enemies.

## Collectibles

- **Sparks of Seasonal Spirit**: biro stars, the main collectible.
- **Hidden themed treasures**: three per level, themed on each character's card.

## Finale and extras

- End message: "Merry Christmas and a fabulous 2027", from Barnaby, Cass and Junie (puppy).
- A shareable image of the character and the player's score, for sending on WhatsApp.
- High scores come only from a **full run**: start at level 1 and finish levels 1–4 in order (the bonus counts once, between 3 and 4). Restarting the current level is fine; playing any other level ends the run. Each finished run can be submitted once.
- A shared high-score board through a free backend (Supabase or Firebase). Until that's configured, scores are stored locally.
