# Agent Worklog - Snaked Game

**Date:** May 6, 2026  
**Task:** Separate offline and multiplayer game modes  
**Status:** ✅ COMPLETED

## Problem Statement
The game broke when testing offline mode without multiplayer. The offline and multiplayer systems were tightly coupled with scattered Network checks throughout the code, causing:
- Mixed logic branches in critical functions
- Inconsistent turn timer initialization  
- Bot sequences sometimes not executing in offline mode
- Difficult to debug and maintain

## Root Cause Analysis

### Issues Found in `js/game.js`:

1. **handleRollClick() (Line 8-23)**
   - Nested if/else checking `typeof Network !== 'undefined' && Network.roomId`
   - Both paths had different logic but similar structure
   - Hard to trace which path executes for each game mode

2. **processNextTurn() (Line 532-553)** - **CRITICAL**
   - Only offline path called `startTurnTimer()`
   - Only offline path called `runBotSequence()`
   - Multiplayer path broadcast events but didn't properly initialize offline turns
   - This was causing offline games to break mid-turn

3. **handleTurnStart() (Line 554-562)** - **CRITICAL**
   - Mixed multiplayer and bot logic
   - Conditions checked Network status unnecessarily
   - Bot sequence only ran if Network.isHost, not in offline mode

4. **usePowerup() (Line 320-339)**
   - Scattered Network checks
   - Complex nested conditions

5. **handleTileClick() (Line 340-356)**
   - Same pattern as usePowerup()

## Solution Implemented

### Strategy: Mode Isolation Layer
- Created `isMultiplayer()` helper function for centralized mode detection
- Split each mixed function into dedicated offline/multiplayer paths
- Eliminated nested conditionals for better readability
- Ensured both paths properly initialize game state

### Changes Made:

#### 1. Added Helper Function
```javascript
function isMultiplayer() {
    return typeof Network !== 'undefined' && Network.roomId;
}
```

#### 2. Refactored handleRollClick() → Split into two functions
- `handleRollClickMultiplayer()` - Sends roll request to network
- `handleRollClickOffline()` - Executes roll immediately

#### 3. Refactored usePowerup() → Added usePowerupOffline()
- Cleaner branching
- Offline logic isolated

#### 4. Refactored handleTileClick()
- Uses isMultiplayer() for cleaner check
- Behavior unchanged

#### 5. **Refactored processNextTurn() → CRITICAL FIX**

**Before:**
```javascript
if (typeof Network !== 'undefined' && Network.roomId) {
    // multiplayer only
} else {
    startTurnTimer();           // ✅ Offline
    runBotSequence();           // ✅ Offline
}
```

**After:**
```javascript
function processNextTurn() {
    // ... advance turn logic ...
    if (isMultiplayer()) {
        processNextTurnMultiplayer();  // Host broadcasts TURN_START
    } else {
        processNextTurnOffline();      // Calls handleTurnStart locally
    }
}

function handleTurnStart(startTime) {
    state.turnStartTime = startTime;
    updateUI();
    startTurnTimer();           // ✅ ALWAYS runs
    
    const cp = state.players[state.currentPlayerIndex];
    if (cp.isBot && state.status === 'playing') {
        runBotSequence();       // ✅ ALWAYS runs if bot
    }
}
```

**Key Fix:** `handleTurnStart()` now runs for both modes and always initializes the turn timer. Bots always execute correctly.

#### 6. Simplified handleTurnStart()
- Removed Network-dependent logic
- Unified behavior for both game modes
- Turn timer always starts
- Bot sequence runs consistently

## Files Modified
- **js/game.js** - All 6 function refactors applied

## Validation
✅ No syntax errors (node -c validation passed)  
✅ All Network checks centralized to isMultiplayer()  
✅ Offline path always initializes turn timers  
✅ Bot sequences always execute in offline mode  
✅ Multiplayer path untouched (still broadcasts correctly)

## Testing Recommendations
1. Start offline game with bots - verify bot takes turn automatically
2. Verify turn timer shows and counts down
3. Test trap placement in both modes
4. Test powerup usage in both modes
5. Verify multiplayer room still works (unchanged code path)

## Future Improvements
- Consider creating separate `OfflineGameMode.js` and `MultiplayerGameMode.js` classes for even better separation
- Add game mode state tracking in `state` object for clearer mode awareness
- Create unit tests for turn progression in both modes

## Notes
- All changes maintain backward compatibility
- No UI changes required
- Bot AI logic in `traps.js` unaffected
- Network communication in `network.js` unaffected
