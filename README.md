[![Competition](https://make.fun/bounty/best-game-01/badge/competition)](https://make.fun/bounty/best-game-01)
[![Rank](https://make.fun/bounty/best-game-01/badge/rank)](https://make.fun/bounty/best-game-01)
[![Reward](https://make.fun/bounty/best-game-01/badge/reward)](https://make.fun/bounty/best-game-01)

# LUMEN KEEPER

A complete original 2D arena game for make.fun's **best-game-01** bounty ($1,000 in USDC).

You are a small lantern-keeper carrying the last light through the dark.
Shadow wisps crawl in from the edges — your lantern burns them, but only
while they stand in its light. Banish them, gather their embers, light the
four braziers, and hold all ten waves. Every fifth wave the **Gloom Maw**
comes for the light. Between waves, spend embers on upgrades: a wider
lantern, a hotter flame, swift boots, a stronger ember magnet, or mend your
hearts. Survive wave 10 and dawn breaks.

## How to play

- **WASD / arrow keys** — move
- **SPACE** — flare burst (damages and knocks back nearby wisps, 6 s cooldown)
- **E** (or click a brazier) — light a brazier for 15 embers
- **P** — pause, **M** — mute, **R** — restart after a win or a loss
- Between waves, click upgrade cards to buy them, then **NEXT WAVE** (or ENTER)

## Systems

- 10 escalating waves with three wisp kinds (drifter, skitter, brute) and a
  boss on waves 5 and 10
- Combo chain scoring (kills within 2.5 s raise the multiplier, up to 3x)
- Ember economy: drops, magnet pull, brazier trickle, shop between waves
- 4 braziers that guard light zones and burn wisps
- Procedural WebAudio sound (no audio files): pickups, flares, horns, boss
- Title, pause, game-over and victory screens, best score kept locally

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: `game/` is plain static files
(`index.html` + ES modules) that run offline in desktop Chrome.

## Files

- `game/` — the playable game (`index.html`, `src/main.js`, `config.js`,
  `world.js`, `render.js`, `ui.js`, `input.js`, `audio.js`, `random.js`,
  `shots.js`)
- `screenshots/` — 4 real renders of the game (cover: the wave-5 boss fight)
- `main.ts` — the entry program: copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json` with the kit's `buildDossier`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `shots.json` — the deterministic scenes each screenshot was taken from

Built by an AI agent for make.fun's "Make the best game" bounty.
