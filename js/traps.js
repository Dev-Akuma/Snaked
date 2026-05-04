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
    
    state.isAnimating = true; 
    updateUI();

    await delay(800 + Math.random() * 500);
    while(state.isPaused) await delay(500); 

    if (cp.powerup && Math.random() > 0.5) {
        // Trap / tile effect logic
        if (['bear_trap', 'dry_ice'].includes(cp.powerup) || isTileEffectPowerup(cp.powerup)) {
            let placed = false;
            let opponents = state.players.filter(p => p.id !== cp.id);
            
            for(let i=0; i<5; i++) {
                let targetOpp = opponents[Math.floor(Math.random() * opponents.length)];
                let targetTile = targetOpp.position + Math.floor(Math.random() * 6) + 1;
                
                if (targetTile < 100 && isValidTrapTile(targetTile, cp.powerup)) {
                    let pName = formatPowerupName(cp.powerup);
                    
                    if (isTileEffectPowerup(cp.powerup)) {
                        state.tileEffects[targetTile] = { type: getTileEffectTypeFromPowerup(cp.powerup) };
                        logMessage(`<span class="log-icon text-emerald-400">${getPowerupIcon(cp.powerup)}</span> ${cp.name} set ${pName} on <strong>${targetTile}</strong>.`);
                    } else {
                        state.traps[targetTile] = { type: cp.powerup, strength: 0 };
                        logMessage(`<span class="log-icon text-orange-500">${getPowerupIcon(cp.powerup)}</span> ${cp.name} set ${pName} on <strong>${targetTile}</strong>.`);
                    }
                    
                    state.trapCooldowns[targetTile] = state.turnCounter + state.players.length;
                    cp.powerup = null;
                    AudioSys.trap();
                    placed = true;
                    updateUI();
                    await delay(800);
                    break;
                }
            }
            if(!placed) logMessage(`<span class="log-icon text-slate-500">${ICONS.bot}</span> ${cp.name} saved trap (no spots).`, 'text-slate-500');
        
        } else if (cp.powerup === 'double_dice') {
            state.activeEffects.doubleDice = true;
            cp.powerup = null;
            logMessage(`<span class="log-icon text-purple-400">${ICONS.doubleDice}</span> ${cp.name} activated <strong>Double Dice!</strong>`, 'text-purple-400');
            updateUI();
            await delay(800);
        } else if (cp.powerup === 'switch_up') {
            const opponents = state.players.filter(p => p.id !== cp.id);
            const target = opponents[Math.floor(Math.random() * opponents.length)];
            logMessage(`<span class="log-icon text-purple-400">${ICONS.switch}</span> <strong>Switch-Up!</strong> Swapping with ${target.name}...`, 'text-purple-400');
            AudioSys.powerup();
            await delay(800);
            const tempPos = cp.position; cp.position = target.position; target.position = tempPos;
            cp.powerup = null;
            updateUI();
            await delay(500);
        }
    }

    while(state.isPaused) await delay(500);
    state.isAnimating = false; 
    rollDice(); 
}
