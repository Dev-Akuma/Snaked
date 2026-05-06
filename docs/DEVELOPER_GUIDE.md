# Snaked Developer Guide

## Purpose

Snaked is a browser-based board game built with HTML, Tailwind CSS, and vanilla JavaScript. The codebase is organized around a screen-based UI, a modular game state model, a reusable render pipeline, and a synthetic audio system. The core gameplay is stable, but the project is designed to keep evolving: local play, pass-and-play, bot play, tile effects, traps, and multiplayer hooks already exist in the architecture.

This document is intended as a comprehensive reference for future developers, AI agents, and maintainers.

## High-Level Architecture

The application is a single-page game with multiple screen states embedded in `index.html`. JavaScript modules are loaded globally and cooperate through shared globals such as `state`, `DOM`, `ICONS`, `AudioSys`, and `Network`.

The runtime can be understood as four layers:

1. Presentation layer: HTML screens and CSS styling in `index.html` and `css/styles.css`.
2. Shared constants/helpers: configuration, tile math, icon helpers, and utility functions in `js/config.js`.
3. State and navigation: central state object and screen switching in `js/state.js`.
4. Gameplay systems: board rendering, turn logic, traps, tile effects, multiplayer, audio, profile, and UI rendering.

The code is intentionally framework-free. There is no React, Vue, or build pipeline. The game runs directly in the browser via static files.

## File Map

### `index.html`

The root document defines the full UI structure and loads every JavaScript module. It contains:

- The main menu screen.
- Solo setup screen.
- Pass-and-play setup screen.
- Game settings screen.
- Game screen and overlays.
- Multiplayer modals such as create/join room and lobby UI.
- The board container and SVG connection layer.
- Reusable DOM hooks used by scripts.

It also loads Tailwind from CDN, the custom CSS file, Google Fonts, and all JS modules in the order required by the app.

### `css/styles.css`

This file contains the full custom visual system:

- Board sizing and cell visuals.
- Trap and tile effect theming.
- 3D button utilities.
- Screen transitions.
- Menu styling and animations.
- Tooltip styling for settings power-ups.
- Utility animations such as pop, shake, flash, and pulse.
- Scrollbar styling.
- Layout refinements for the game board and side panels.

The CSS is layered so shared utilities come first, then component-specific styles, then menu/game polish.

### `js/config.js`

This file is the foundation for shared constants and helper functions. It defines:

- Board size.
- Static snakes and ladders.
- Tile effect types.
- Power-up lists and mappings.
- Player colors.
- Utility delay helper.
- Power-up naming and icon mapping.
- Board position math helpers.
- Tile movement helpers for the snake-pattern grid.

This file is one of the most important modules because other systems depend on its constants and helpers.

### `js/state.js`

This file owns global runtime state and the navigation helper. It defines:

- The `state` object.
- The `turnTimerInterval` handle.
- Cached DOM references in `DOM`.
- `navTo(screenId)` for screen switching.

The state object is the central source of truth for game mode, players, timers, traps, tile effects, and animation flags.

### `js/main.js`

This file handles game startup, timers, pause logic, and top-level multiplayer room actions. It includes:

- `initGame(modeOrConfig)`.
- `exitToMenu()`.
- `togglePause()`.
- `startTurnTimer()`.
- `clearTurnTimer()`.
- `startGameTimer()`.
- `clearGameTimer()`.
- `handleCreateRoom()`.
- `handleCancelRoom()` and related room/lobby helpers.

This module bridges settings/configuration into actual gameplay.

### `js/game.js`

This file contains the core turn-based gameplay loop and resolution logic:

- Dice rolls.
- Player movement.
- Overshoot handling.
- Snake and ladder resolution.
- Trap resolution.
- Tile effect resolution.
- Power-up triggers.
- Win handling.
- AI/bot interaction hooks.

This is the main rules engine for each turn.

### `js/board.js`

This file renders the board and board connections:

- Generates the 10x10 grid.
- Maps tile number to board coordinates.
- Draws snakes and ladders as SVG.
- Calculates tile center positions for SVG lines.
- Builds the clickable tile grid.
- Controls token container placement.

It is the visual and geometric foundation for the board.

### `js/traps.js`

This file manages trap placement validation, bot trap behavior, and Down-Snake constraints:

- `getMaxDownSnakeStack()`.
- `isValidTrapTile()`.
- `runBotSequence()`.

It ensures trap placement follows board rules and respects tile boundaries and cooldowns.

### `js/gameConfig.js`

This file renders the settings screen and converts UI state into a usable game config:

- `defaultGameConfig`.
- `openSettings(mode)`.
- `renderSettingsUI(mode)`.
- `renderSlots()`.
- `renderPowerups()`.
- `startMatchFromConfig(cfg)`.

It is responsible for the player count, player type selectors, power-up toggles, and the tooltip descriptions shown on hover.

### `js/ui.js`

This file renders the in-game UI and responds to state changes:

- Leaderboard.
- Current turn/status banner.
- Buttons and prompts.
- Token rendering.
- Trap and tile effect visuals.
- Action log and control updates.
- Helper rendering for effect icons.

It is the presentation layer for gameplay state.

### `js/audio.js`

This file contains a synthetic Web Audio-based sound system:

- `init()`.
- `toggleMute()`.
- `playTone()`.
- Turn and gameplay sound effects.
- `menuHover()` and `menuClick()`.
- `startBGM()`.

All game sounds are generated procedurally, so there are no external audio assets.

### `js/icons.js`

This file stores the SVG icon dictionary and injects icons into DOM placeholders on page load.

It is used throughout the UI for buttons, status icons, traps, tiles, and menu elements.

### `js/profile.js`

This file manages the player profile panel on the menu screen:

- Loads and saves profile data from localStorage.
- Renders the name field, avatar selector, and color picker.
- Keeps the profile visible and usable before multiplayer features.

It is especially important for online room creation/joining.

### `js/network.js`

This file contains the multiplayer implementation using Supabase:

- Room creation.
- Room joining.
- Lobby rendering.
- Game-state synchronization.
- Event broadcasting.
- Host/client role logic.

This module is the multiplayer bridge, but the game can still run offline without it.

### `js/supabaseConfig.js`

This file initializes the Supabase client when credentials and the CDN are available.

It is a configuration shim only. The actual network behavior lives in `network.js`.

## Screen and Flow Model

The game uses a screen-based model rather than routing.

### Screen States

- `screen-main-menu`
- `screen-setup-solo`
- `screen-setup-passplay`
- `screen-game-settings`
- `screen-game`
- Multiplayer modal overlays such as lobby, create room, join room, and pause/game over dialogs.

### Navigation

`navTo(screenId)` hides every element with the `.screen` class and reveals the requested one by removing `.hidden-screen`.

### Main Menu Flow

- The user starts at the menu.
- `Play` opens the settings screen in solo mode.
- Multiplayer buttons open/create room flows.
- The profile panel is shown directly on the menu.
- The mute button stays available on the menu.

### Settings Flow

- The settings screen lets the user set timer values, player count, player types, and enabled power-ups.
- Hovering a power-up card shows a descriptive tooltip.
- Starting the match stores the config into `state.gameConfig` and calls `initGame(cfg)`.

### Game Flow

- `initGame()` builds state from config.
- A randomized board and randomized tile effects are generated.
- The board is rendered and connections are drawn.
- UI is updated.
- Timers begin.
- Player turns alternate until a win or time expiry.

## Global Data Model

### `state`

The `state` object in `js/state.js` is the runtime model.

Key fields:

- `status`: current high-level mode such as `menu`, `playing`, `trap_placement`, or `game_over`.
- `mode`: game mode label.
- `players`: active player array.
- `currentPlayerIndex`: turn pointer.
- `turnCounter`: used for cooldowns and sequencing.
- `traps`: tile-indexed trap data.
- `tileEffects`: tile-indexed tile effect data.
- `trapCooldowns`: cooldown map for trap placement.
- `activeEffects`: transient effect flags such as double dice.
- `isAnimating`: locks input during animations.
- `isAwaitingHost`: multiplayer turn synchronization flag.
- `isPaused`: pause state.
- `timeRemaining`: per-turn countdown.
- `turnStartTime`: timer anchor.

### Player Model

Players are created from config and then normalized in `initGame()` into objects that include:

- `id`
- `name`
- `color`
- `position`
- `luck`
- `powerup`
- `skipTurns`
- `isBot`

Online players may also include profile avatar and host metadata.

### Game Config Model

A game config includes:

- `gameTime`
- `turnTime`
- `players`
- `enabledPowerups`

This is the object passed from settings into gameplay.

## Board Model

The board is a snake-pattern 10x10 grid covering tiles 1 to 100.

### Tile Coordinate Rules

- Rows alternate direction.
- Even rows flow left to right.
- Odd rows flow right to left.
- The visual top of the board contains higher tile numbers.

### Board Elements

Each cell contains:

- A visible tile number.
- Cosmetic snake/ladder hints.
- A trap layer placeholder.
- A token container for players.

### Connection Rendering

Snakes and ladders are drawn with SVG lines/paths on a connection layer.

- Ladders use a dashed green line with glow.
- Snakes use a curved red path with highlight.
- The SVG viewBox is recalculated based on board size.

## Gameplay Systems

### Dice and Movement

The core turn loop is handled by `handleRollClick()` and `executeRoll()` in `js/game.js`.

Behavior:

- Offline play rolls dice locally.
- Multiplayer requests are broadcast to the host.
- Dice rolls animate in the UI.
- Movement occurs step-by-step so it feels physical.
- Overshooting tile 100 requires exact landing.
- A six increases luck and can trigger roulette rewards.

### Snakes and Ladders

After movement, `resolveCascadesVisually()` checks the current tile for:

- Snake heads.
- Ladder bases.
- Trap collisions.
- Tile effects.

These can cascade, meaning a player can move multiple times in a single turn until the board state stabilizes.

### Trap System

Trap types currently include:

- `bear_trap`
- `dry_ice` in legacy trap handling
- `down_snake`

Trap placement is validated in `js/traps.js` to avoid illegal tiles, overlaps, and cooldown violations.

### Tile Effect System

Tile effects are one of the project’s most important gameplay systems.

Supported effect types:

- `up`
- `down`
- `left`
- `right`
- `freeze`
- `bear_trap`
- `down_snake`

These are mapped from power-ups through `TILE_EFFECT_POWERUP_TO_TYPE` and resolved in `resolveCascadesVisually()`.

### Power-Ups

Power-ups are chosen from the enabled pool in the settings screen and roulette.

Current setup includes:

- `bear_trap`
- `double_dice`
- `switch_up`
- `up_tile`
- `down_tile`
- `left_tile`
- `right_tile`
- `freeze_tile`

`dry_ice` has been removed from the setup pool and is no longer part of the current creation flow.

### Bot Behavior

Bots can:

- Place traps or tile effects.
- Use double dice.
- Use switch-up.
- Roll and play automatically.

Bot behavior is deliberately lightweight and based on simple heuristics, not pathfinding.

### Timer System

There are two timers:

- Global match timer.
- Per-turn timer.

They are controlled from `main.js` and displayed in the UI.

### Pause and Game Over

The game can be paused if the match is active.
The game-over state is handled by overlays and return-to-menu logic.

## UI System

### Menu UI

The menu is styled to feel like a real game entry point:

- Large title.
- Subtitle.
- Play button.
- Multiplayer buttons.
- Profile panel.
- Sound toggle.
- Animated background.

### Game UI

`ui.js` owns:

- Leaderboard cards.
- Active turn banner.
- Dice display.
- Action log.
- Current control enable/disable state.
- Tile overlays and player tokens.

### Settings UI

The settings screen includes:

- Game time.
- Turn time.
- Player count.
- Player type toggles.
- Color pickers.
- Enabled power-up cards.
- Power-up hover descriptions.

### Visual Language

The visual style combines:

- Dark slate surfaces.
- Emerald, blue, purple, and orange accent colors.
- 3D button shadows.
- Glassmorphism and soft glows.
- SVG iconography instead of emoji.

## Audio System

The game uses synthesized Web Audio tones rather than audio files.

### General Sounds

- Roll tick.
- Roll result.
- Step movement.
- Ladder climb.
- Snake slide.
- Trap trigger.
- Power-up trigger.
- Win fanfare.

### Menu Sounds

- `menuHover()` for hover feedback.
- `menuClick()` for click feedback.

### Mute Behavior

Mute is global and affects game and menu sounds.
The mute button is exposed on both menu and game screens.

## Multiplayer and Network

The multiplayer system is built on Supabase but is still modular enough to keep offline play stable.

### Flow

- Host creates room.
- Shared game state and board seed are stored remotely.
- Client joins room by code.
- Lobby is rendered.
- Host starts the match.
- Events are broadcast between host and client.

### Important Notes

- Multiplayer depends on Supabase being configured.
- If Supabase is not initialized, network functions alert the user and stop safely.
- Profile data is used to label host and joiner entries.

### Multiplayer Deep Dive

The multiplayer flow is split into three phases: room creation, lobby management, and in-game synchronization.

#### 1. Room Creation

When the host clicks create room, `handleCreateRoom()` opens the online-host settings screen. From there, `Network.createRoom(cfg)` does the actual room setup.

What happens in order:

- A 6-character room code is generated.
- `Network.roomId`, `Network.isHost`, and `Network.playerId` are set.
- The host's settings config is reduced to the host player only.
- A random board seed is generated through `generateRandomBoard()` and `generateRandomTileEffects()`.
- An initial room row is inserted into Supabase with:
	- `gameConfig`
	- `boardData` (snakes, ladders, tile effects)
	- one host player in `players`
	- `turnCounter = 0`
	- `currentPlayerIndex = 0`
	- `status = 'lobby'`

At this point the host is not yet in the actual game screen. The app is waiting in the lobby while more players join.

#### 2. Lobby Join Flow

The join flow starts from the join-room modal.

`Network.joinRoom(code)` does the following:

- Uppercases the room code.
- Reads the room row from Supabase.
- Rejects the request if the room does not exist.
- Rejects the request if `status !== 'waiting'`.
- Rejects the request if the room already has 6 players.
- Appends the joining player to `game_state.players`.
- Updates the room row in Supabase.
- Sets local multiplayer flags:
	- `Network.roomId`
	- `Network.isHost = false`
	- `Network.playerId = index of the joining player`
- Switches the user into the lobby modal.
- Subscribes to the room channel.

This means joining is database-driven, not peer-to-peer. The Supabase row is treated as the shared lobby state.

#### 3. Lobby Rendering

`Network.renderLobby(players)` is responsible for the lobby UI.

It shows:

- The number of connected players.
- Player name and avatar.
- A host badge for the room creator.
- A `You` badge for the local client.
- Kick buttons for the host against non-host players.

The host can start the game only when more than one player is connected.

#### 4. Starting the Match

The lobby start button calls `handleStartOnlineGame()`.

That function:

- Requires the local user to be the host.
- Updates the room row `status` from `waiting` to `playing`.
- Hides the lobby.
- Navigates to the game screen.
- Fetches the latest `game_state` from Supabase.
- Loads the shared board seed, players, timers, and tile effects into local state.
- Builds the board and starts the first turn timer.

Clients do not start the match themselves. They wait for the room status change and then initialize from the shared room state.

#### 5. Realtime Subscription Model

`Network.subscribeToRoom()` listens to three kinds of room updates:

- Supabase `UPDATE` events on the room row.
- Supabase `DELETE` events on the room row.
- Broadcast `game_action` events.

For `UPDATE` events:

- If the room is still waiting and the lobby state changed, the lobby UI is refreshed.
- If the room status becomes `playing`, the client initializes its local game state from the shared room snapshot.
- During active play, if the turn counter changes, the client copies the latest incoming state into local state and refreshes the UI.

For `DELETE` events:

- If the host deleted the room, non-host clients are sent back to the menu.

For broadcast events:

- Turn requests, roll execution, power-up execution, turn-start signals, and rejection responses are processed through `Network.handleBroadcast()`.

#### 6. Action Broadcast Model

The broadcast system is host-authoritative.

Clients do not directly decide movement or power-up results. Instead they send a request:

- `REQUEST_ROLL`
- `REQUEST_POWERUP`

The host validates the request, generates the authoritative result, and rebroadcasts:

- `EXECUTE_ROLL`
- `EXECUTE_POWERUP`

The broadcast payload is tagged with `actionId` and `turnId` so duplicate processing can be ignored.

#### 7. State Snapshotting

The host also calls `Network.syncState()` at turn boundaries.

That snapshot writes the current `state` object back into the room row, which keeps the database in sync with the latest board and player state.

This is important because broadcast events handle immediate gameplay, but the Supabase row is the persistent source of truth for new subscribers and post-turn recovery.

### Known Multiplayer Fragility Points

These are the main places where errors are most likely to appear.

#### Join Races

`joinRoom()` reads the row, appends the player locally, and writes the whole game state back.

If two players join at nearly the same time, both can read the same pre-join state and then overwrite each other. There is no transaction or server-side lock, so room joins are not atomic.

#### Kick Index Drift

Kicking a player uses the array index from the lobby list.

That works only if everyone’s local index mapping stays aligned. After a kick, later players shift left in the array, but their `Network.playerId` values are not automatically reassigned. This can cause incorrect lobby labels or kicked-player detection.

#### Kicked-Player Detection Is Coarse

The kicked-client check currently compares `incomingState.players.length <= Network.playerId`.

That catches some removals, but it does not precisely identify a removed player in the middle of the array. It is not a robust identity-based kick check.

#### Late Joiners Are Not Supported Midgame

The join path only allows `status === 'waiting'`.

Once a game is in progress, joining is rejected. There is no reconnection or spectator logic.

#### Host Departure Deletes the Room

`leaveRoom()` deletes the room row if the host leaves.

That is a clean shutdown path, but it means there is no persistence for a host reconnect or room recovery.

#### Turn-State Persistence Happens at Boundaries

The host snapshots state after turn transitions, not after every micro-animation step.

That is usually fine because live gameplay is handled by broadcasts, but it means the database snapshot may lag slightly behind the visible animation.

#### Unbounded Processed-Action Set

`processedActions` prevents duplicate event handling, but it is never pruned.

That is acceptable for short sessions, but long sessions could slowly accumulate old IDs.

### Practical Debugging Rule

If multiplayer breaks, check these layers in order:

- Supabase room row status and `game_state`.
- Lobby host/client flags (`Network.roomId`, `Network.isHost`, `Network.playerId`).
- Broadcast handling in `Network.handleBroadcast()`.
- Host snapshot timing in `Network.syncState()`.
- Local game initialization on the `playing` update path.

That sequence usually isolates whether the bug is in room setup, lobby sync, turn broadcast, or state reconciliation.

## Profile System

The profile panel on the main menu lets players set:

- Display name.
- Avatar icon.
- Color selection.

This data is stored in localStorage and reused for online room creation and joining.

## Icons and Visual Assets

All icons are SVG strings stored in `js/icons.js`.

This makes the UI:

- Easy to recolor.
- Easy to resize.
- Consistent across devices.
- Independent of external icon libraries.

## Extension Points

If you need to extend the project, these are the main stable entry points:

- Add new power-ups in `js/config.js`.
- Add new effects in `js/game.js` and `js/ui.js`.
- Update trap validation in `js/traps.js`.
- Add menu or settings controls in `index.html` and `js/gameConfig.js`.
- Add visuals in `css/styles.css`.
- Add sounds in `js/audio.js`.
- Add multiplayer changes in `js/network.js`.

## Current Design Constraints

The current codebase intentionally avoids overengineering:

- No framework.
- No bundler.
- No build step.
- No assets required for audio.
- No gameplay logic changes when improving UI.

That keeps the game easy to reason about and fast to load.

## Known Quirks and Compatibility Notes

- Tailwind is loaded from the CDN, so browser console warnings about production usage are expected.
- `AudioSys.toggleMute()` assumes the relevant mute buttons exist in the DOM.
- Some legacy trap names still exist in gameplay paths for compatibility, even when the creation UI has been cleaned up.
- Multiplayer relies on external Supabase configuration.

## Planning Notes

If future work is being planned, the safest priorities are:

1. Keep gameplay rules in `game.js`, `traps.js`, and `board.js`.
2. Keep UI refinement in `ui.js`, `gameConfig.js`, `index.html`, and `css/styles.css`.
3. Keep multiplayer isolation in `network.js`.
4. Keep constants and mappings in `config.js`.

## Suggested Maintenance Practice

When adding features:

- Update the relevant helper mapping in `config.js` first.
- Add render logic in the owning module.
- Add CSS last for visual polish.
- Validate with a quick browser pass.
- Avoid duplicating effect names or power-up entries across modules.

## Summary

Snaked is a modular single-page board game with a clear division between configuration, state, board rendering, gameplay logic, audio, UI, and multiplayer. The architecture is simple enough to extend safely, but detailed enough to support advanced effects such as down-snakes, tile effects, randomized board generation, and network play.

This guide should be treated as the canonical overview for future development and planning.

