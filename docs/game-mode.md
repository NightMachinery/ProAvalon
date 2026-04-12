# Game modes

## Current state

The UI shows a **Game Mode** dropdown when creating a room, but only **Avalon** is currently available.

This is because the dropdown is populated from the server-side `GAME_MODE_NAMES` list, and that list currently only exposes `avalon`:

- `src/gameplay/gameEngine/gameModes.ts`
- `src/sockets/sockets.ts`
- `assets/scripts/lobby/sockets/sockets.js`

## Implemented game mode identifiers

The code defines two game mode identifiers:

- `avalon`
- `avalonBot`

However, only `avalon` is included in the public `GAME_MODE_NAMES` list. As a result, only **Avalon** appears in the room creation UI.

## What `avalonBot` is

`avalonBot` is **not a separate ruleset** from Avalon.

It is best understood as:

- **Avalon with bot support enabled**
- **unranked-only**
- intended for bot-capable / test-style rooms

When a room is switched into bot mode, the room still reloads the normal Avalon roles, phases, and cards. In other words, it does **not** load a different game family.

Relevant files:

- `src/gameplay/gameEngine/gameModes.ts`
- `src/gameplay/gameEngine/room.ts`
- `src/gameplay/gameEngine/game.ts`
- `src/sockets/bot.js`

## What bots actually do

The codebase contains bot infrastructure:

- `SimpleBot` exists and plays randomly.
- There is also support for API-driven bots.
- During games, bot players can be asked to initialize, make moves, and leave when the game ends.

## Why `avalonBot` is not exposed today

Although `avalonBot` exists in code, it appears to be intentionally hidden / dormant as a user-facing feature:

- it is not included in `GAME_MODE_NAMES`
- old user bot commands in `src/sockets/bot.js` are commented out
- the admin `/atestgame` path currently returns **"Bots are disabled."** before doing any setup

So enabling `avalonBot` in the dropdown alone would not create a complete public feature. It would expose a bot-capable Avalon room type, but the current codebase does not expose a normal user workflow for adding or managing bots from the UI.

## Short answer

- The dropdown currently only shows **Avalon** because that is the only public mode enabled.
- The only other defined mode is **`avalonBot`**.
- `avalonBot` is **Avalon with bot support**, not a different game.
- Bot support appears to be **partially implemented but currently disabled / hidden** for normal users.
