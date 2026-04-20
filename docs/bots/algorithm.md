# SimpleBot algorithm

## Scope

ProAvalon now exposes **SimpleBot** as the public fallback bot for custom rooms.
It is intentionally lightweight:

- it only uses legal moves surfaced by the server
- it does not model hidden information deeply
- it exists to keep a room playable when a human leaves

## Decision loop

When a bot-controlled seat is active in a running game, the server polls bot
controllers on a short interval.

For each bot seat, the server first derives:

- which buttons are currently legal
- which player targets are legal
- how many targets are required

SimpleBot then acts with the following rules.

## Button selection

- If only one button is legal, SimpleBot presses that button.
- If both buttons are legal, SimpleBot chooses uniformly at random.
- The server removes illegal buttons before the bot sees them.

## Target selection

- If the action requires no targets, SimpleBot submits only the chosen button.
- If the action requires targets, the bot starts from the server-provided legal
  target list.
- It repeatedly removes random targets until the list length matches the
  required target count.
- Duplicate targets are therefore never produced.

## Mission vote rule

SimpleBot inherits the normal legal-action filtering, plus one explicit safety
rule already enforced by the server:

- **Resistance-aligned bots never intentionally fail missions.**

If a Resistance seat is bot-controlled during mission voting, the red/fail
action is hidden before the bot makes its choice.

## Seat takeover / restore behavior

There are two public bot modes:

1. **Standalone pregame bots**
   - added by the host before the game starts
   - occupy their own seat
   - appear as bot seats in the room UI

2. **Bot-controlled running-game seats**
   - used when the host switches a live seat to SimpleBot
   - preserve the original seat identity, role, and game slot
   - swap only the active controller from human to bot

During a running game, the host can switch a seat controller between:

- **SimpleBot**
- the **original player**
- any **currently connected spectator**

If the original player is not the current controller and reconnects:

- they join or remain in the room as a spectator
- the seat stays under its current controller
- the host must explicitly switch the seat back to the original player

If a substitute spectator disconnects, the seat becomes controller-less until
the host switches it again.

## Ranked behavior

Bot usage and live seat substitutions are allowed so games can continue, but
the room is downgraded for competitive integrity:

- the first bot add or live seat switch away from the original player flips the
  room to **unranked**
- the room stays unranked until it is restarted
- bot/substitution-involved games are excluded from rating/stat updates and
  bot-free stats

## Why the algorithm is simple

SimpleBot is not intended to be strong. It is intentionally:

- predictable in implementation
- easy to audit
- robust against illegal actions
- good enough to prevent abandoned games from stalling
