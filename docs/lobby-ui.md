# Lobby and in-room player UI

ProAvalon now supports responsive lobby and game-room layouts with separate mobile and desktop behavior.

## Lobby layout

### Mobile (< 768px)

- The lobby now defaults to the **Games & Players** panel.
- A **mobile tab switcher** lets players swap between **Games & Players** and **All Chat**.
- Lobby columns stack vertically instead of forcing a 50/50 split.

### Desktop (>= 768px)

- The lobby keeps the existing wider split view for chat plus games/players.
- The mobile tab switcher is hidden.

## In-room layouts

### Modern player cards

The default in-room layout remains the **modern player card** view.

- **Desktop modern** uses centered responsive card rows instead of JS absolute positioning.
- **Mobile modern** switches to a stacked, scrollable card list with larger touch targets.
- Public state stays visible on the card via compact chips, including leader, hammer, claim, team, away, and shot.
- Public cards such as Lady / Ref / Sire still appear on the card.

### Legacy in-room layout

Players can still switch back to the older avatar-based in-room layout.

- **Desktop legacy** keeps the classic spatial avatar layout.
- **Mobile legacy** switches to a stacked avatar list instead of the desktop circular board.

Open the **options cog** in the lobby, then go to **Display** and use:

- **Use modern player cards (uncheck for legacy in-room layout)**

That setting is persistent via the existing `optionDisplayRoomPlayerCards` cookie.

## Mobile room controls

On mobile, room controls are reorganized for touch:

- A sticky **top info bar** shows Claim, timer, and player count.
- A sticky **bottom action bar** shows Back, Copy link, and Restart lobby.
- Avatar action buttons are always visible and sized for touch.

## Desktop-only display controls

These display options are still supported on desktop, but are hidden on mobile:

- **Height of avatar area**
- **Max height of avatars**
- **Two tabs**

## Removed viewport hack

The old JS viewport height rewrite has been removed.

- Mobile sizing now relies on CSS responsive layout and dynamic viewport-safe spacing.
- Layout refreshes are event-driven instead of relying on the old polling loop.

## Avatar settings interaction

The **Use original avatars (hide custom avatars)** option only matters for the **legacy avatar-based layout**.

The modern player cards do not render the large avatar image at all.
