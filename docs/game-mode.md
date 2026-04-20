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
- during a running game, hosts can switch a seat between **SimpleBot**, the
  **original player**, and any **connected spectator**
- reconnecting players stay available for the host to switch back in

## Ranked behavior

Bot support and live seat substitution keep rooms playable, but the room is no
longer treated as competitive once the host overrides a seat.

On the first bot add or live seat switch away from the original player:

- the room is downgraded to **unranked**
- it stays unranked until the room is restarted
- bot-involved games are excluded from rating/stat updates and bot-free stats

## UI and commands

Hosts can manage bots through:

- the in-room **Bots** modal
- slash commands:
  - `/addbot`
  - `/rembot`
  - `/switchseat`
  - `/takebot`
  - `/restorehuman`

## Algorithm reference

The current public bot behavior is documented in:

- `docs/bots/algorithm.md`
