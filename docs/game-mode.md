# Game modes and bot support

## Current public mode

The public room flow still exposes **Avalon** as the normal game mode.

The older internal `avalonBot` identifier still exists in code for legacy
compatibility, but public bot usage no longer depends on choosing a separate
game mode.

## Public bot model

Bots are now a **room capability**, not a separate ruleset.

That means:

- the game still runs normal Avalon rules
- hosts can add **SimpleBot** seats before a game starts
- hosts can hand an absent player seat over to **SimpleBot** during a game
- reconnecting players can be restored back to human control by the host

## Ranked behavior

Bot support is available so rooms do not die when someone leaves, but the room
is no longer treated as competitive once a bot is used.

On the first bot add or seat takeover:

- the room is downgraded to **unranked**
- it stays unranked until the room is restarted
- bot-involved games are excluded from rating/stat updates and bot-free stats

## UI and commands

Hosts can manage bots through:

- the in-room **Bots** modal
- slash commands:
  - `/addbot`
  - `/rembot`
  - `/takebot`
  - `/restorehuman`

## Algorithm reference

The current public bot behavior is documented in:

- `docs/bots/algorithm.md`
