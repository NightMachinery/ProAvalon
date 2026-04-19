# Lobby and in-room player UI

ProAvalon’s lobby and game room now share a tighter visual system without changing gameplay, sockets, or room flow.

## What changed

- A shared **spacing, type, color, radius, and shadow token set** now drives the lobby and room UI.
- The lobby and room use vendored **Inter** and **JetBrains Mono** font assets from `assets/fonts/` instead of external font requests.
- Core controls now use semantic styling tiers:
  - **Primary**: Claim, New Room, Start
  - **Secondary**: Back, Copy link, Restart lobby
  - **Danger**: red cancel / reject gameplay action
- Timer and metadata badges now use **tabular numerals** to avoid width jitter.

## Lobby layout

### Mobile (< 768px)

- The lobby still defaults to the **Games & Players** panel.
- The existing mobile tab switcher is now styled as a more polished segmented control.
- Chat and games/players panels share the same panel shell, spacing, and typography.

### Desktop (>= 768px)

- The desktop split remains the existing **chat-heavy 9/3 layout**.
- Chat and games/players now use matched panel shells so the right column feels intentional instead of sidebar-like.
- Game rows remain table-backed for compatibility, but are styled to read as compact cards.

## In-room layouts

### Shared room structure

Both modern and legacy modes now use the same room chrome:

- quiet **top utility bar** for Claim, timer, and player count
- central **room board** containing players, mission track, and overlays
- **bottom action bar** for Back, Copy link, and Restart lobby

The previous absolute-position hacks for the room bars are removed from the main flow.

### Modern player cards

- Desktop modern mode still uses the responsive centered card grid.
- Cards now share the new surface/border/shadow language.
- Decorative glow and watermark layers are toned down so player identity remains the main focus.
- Public state chips remain visible, but use softer badge treatment.

### Legacy in-room layout

- Legacy mode still keeps the classic player positioning behavior.
- Legacy player containers now use the same surrounding surface, radius, and typography cues as modern mode so both modes feel like the same product.

## Mission and action polish

- The mission strip is still centered over the room board, but is styled as a unified progress indicator.
- The current unresolved mission now gets a dedicated highlight state.
- Room action icons now use inline SVG buttons with tooltips/labels instead of raw glyphicons.
- Chat highlight state is represented by a small accent dot on the action button instead of filling the whole control.

## Theme behavior

- Lobby and room surfaces now derive from CSS variables for both light and dark mode.
- The existing site-wide dark theme toggle still works; lobby/room components now override more of their own presentation through shared tokens instead of one-off colors.

## Still supported

- **Modern** and **legacy** in-room modes
- **Two tabs** desktop room option
- **Use original avatars** option for legacy mode
- existing gameplay, chat, claim, vote, and restart flows

## Deferred work

This pass intentionally does **not** add the planned empty/loading/error states yet.
