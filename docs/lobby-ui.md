# Lobby in-room player UI

ProAvalon now supports two in-room player layouts inside a game room.

## Modern player cards

The default layout is the **modern player card** view.

- Each player is shown as an Avalon-style card instead of a large portrait/avatar.
- The card uses a translucent alliance watermark for **Resistance** or **Spy**.
- Public state stays visible on the card via compact chips, including leader, hammer, claim, team, away, and shot.
- Public cards such as Lady / Ref / Sire still appear on the card.

## Legacy in-room layout

Players can still switch back to the older avatar-based in-room layout.

Open the **options cog** in the lobby, then go to **Display** and use:

- **Use modern player cards (uncheck for legacy in-room layout)**

That setting is persistent via the existing `optionDisplayRoomPlayerCards` cookie.

## Avatar settings interaction

The **Use original avatars (hide custom avatars)** option only matters for the **legacy avatar-based layout**.

The modern player cards do not render the large avatar image at all.
