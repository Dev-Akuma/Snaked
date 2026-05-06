/* ==========================================================================
   6. TRAP & BOT LOGIC
   ========================================================================== */

/**
 * Calculate maximum Down-Snake stack based on tile's current row
 * Stack equals number of rows above the tile's current position
 * @param {number} tileNum - Tile number (1-100)
 * @returns {number} Maximum stack depth possible from that tile
 */
function getMaxDownSnakeStack(tileNum) {
    const { boardRow } = getTilePosition(tileNum);
    // Max stack = how many rows above this tile
    // boardRow 0 (tiles 1-10): max = 0 (already at bottom)
    // boardRow 1 (tiles 11-20): max = 1 (can drop 1 row)
    // boardRow 9 (tiles 91-100): max = 9 (can drop 9 rows)
    return Math.max(0, boardRow);
}

function isValidTrapTile(tileNum, trapType) {
    if (tileNum === 1 || tileNum === 100) return false;
    
    // ===== TILE EFFECT SYSTEM CHECK =====
    // Disallow placement on tiles with existing effects
    if (state.tileEffects[tileNum]) {
        return false; // Tile has effect, cannot place trap
    }
    
    // ===== TRAP PLACEMENT RESTRICTIONS =====
    const { boardRow, boardCol } = getTilePosition(tileNum);
    
    if (trapType === 'left_tile' && boardCol === 0) return false;
    if (trapType === 'right_tile' && boardCol === 9) return false;
    if ((trapType === 'down_tile' || trapType === 'down_snake') && boardRow === 0) return false;
    if (trapType === 'up_tile' && boardRow === 9) return false;

    // Disallow placement on snake heads (snake START tiles)
    if (SNAKES.hasOwnProperty(tileNum)) {
        return false; // Cannot place trap on tile with snake head
    }
    
    // Disallow placement on ladder bases (ladder START tiles)
    if (LADDERS.hasOwnProperty(tileNum)) {
        return false; // Cannot place trap on tile with ladder base
    }
    
    // Trap already exists handling
    if (state.traps[tileNum]) {
        // Down-Snake can stack up to row-based maximum
        if (trapType === 'down_snake' && state.traps[tileNum].type === 'down_snake') {
            const maxStack = getMaxDownSnakeStack(tileNum);
            if (state.traps[tileNum].strength < maxStack) {
                // Check if it's on cooldown for stacking
                if (state.trapCooldowns[tileNum] && state.turnCounter < state.trapCooldowns[tileNum]) return false;
                return true; 
            }
        }
        return false; 
    }
    
    // Standard Cooldown check
    if (state.trapCooldowns[tileNum] && state.turnCounter < state.trapCooldowns[tileNum]) return false;
    
    return true;
}

async function runBotSequence() {
    const cp = state.players[state.currentPlayerIndex];
    if (!cp.isBot || state.status === 'game_over') return;
    
    // Only the Host (or Offline) should decide bot actions!
    if (typeof Network !== 'undefined' && Network.roomId && !Network.isHost) return;
    
    state.isAnimating = true; 
    updateUI();

    await delay(800 + Math.random() * 500);
    while(state.isPaused) await delay(500); 

    if (cp.powerup && Math.random() > 0.5) {
        if (['bear_trap', 'dry_ice'].includes(cp.powerup) || isTileEffectPowerup(cp.powerup)) {
            let placed = false;
            let opponents = state.players.filter(p => p.id !== cp.id);
            
            for(let i=0; i<5; i++) {
                let targetOpp = opponents[Math.floor(Math.random() * opponents.length)];
                let targetTile = targetOpp.position + Math.floor(Math.random() * 6) + 1;
                
                if (targetTile < 100 && isValidTrapTile(targetTile, cp.powerup)) {
                    if (typeof Network !== 'undefined' && Network.roomId) {
                        Network.broadcastEvent({ type: 'EXECUTE_POWERUP', tileIndex: targetTile, powerupType: cp.powerup });
                    } else {
                        executePowerup(targetTile, cp.powerup);
                    }
                    placed = true;
                    await delay(1200);
                    break;
                }
            }
            if(!placed) logMessage(`<span class="log-icon text-slate-500">${ICONS.bot}</span> ${cp.name} saved trap (no spots).`, 'text-slate-500');
        
        } else if (cp.powerup === 'double_dice') {
            if (typeof Network !== 'undefined' && Network.roomId) {
                Network.broadcastEvent({ type: 'EXECUTE_POWERUP', tileIndex: null, powerupType: cp.powerup });
            } else {
                executePowerup(null, cp.powerup);
            }
            await delay(1200);
        } else if (cp.powerup === 'switch_up') {
            const opponents = state.players.filter(p => p.id !== cp.id);
            const target = opponents[Math.floor(Math.random() * opponents.length)];
            if (typeof Network !== 'undefined' && Network.roomId) {
                Network.broadcastEvent({ type: 'EXECUTE_POWERUP', tileIndex: null, powerupType: cp.powerup, targetId: target.id });
            } else {
                executePowerup(null, cp.powerup, target.id);
            }
            await delay(1800);
        }
    }

    while(state.isPaused) await delay(500);
    state.isAnimating = false; 
    
    // Trigger roll
    let roll1 = Math.floor(Math.random() * 6) + 1;
    let roll2 = state.activeEffects.doubleDice ? Math.floor(Math.random() * 6) + 1 : null;
    const pool = (state.gameConfig && Array.isArray(state.gameConfig.enabledPowerups) && state.gameConfig.enabledPowerups.length)
        ? state.gameConfig.enabledPowerups
        : ['bear_trap', 'dry_ice', 'switch_up', 'double_dice', 'up_snake_tile', 'down_ladder_tile'];
    const rouletteReward = pool[Math.floor(Math.random() * pool.length)];

    if (typeof Network !== 'undefined' && Network.roomId) {
        Network.broadcastEvent({ type: 'EXECUTE_ROLL', roll1, roll2, rouletteReward });
    } else {
        executeRoll(roll1, roll2, rouletteReward);
    }
}
