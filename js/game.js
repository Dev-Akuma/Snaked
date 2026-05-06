/* ==========================================================================
   7. CORE GAMEPLAY LOGIC 
   ========================================================================== */

// Helper: Check if game is in multiplayer mode
function isMultiplayer() {
    return typeof Network !== 'undefined' && Network.roomId;
}

function handleRollClick() {
    if (state.isAwaitingHost || state.isAnimating || state.status !== 'playing' || state.isPaused) return;
    
    if (isMultiplayer()) {
        handleRollClickMultiplayer();
    } else {
        handleRollClickOffline();
    }
}

function handleRollClickMultiplayer() {
    if (state.currentPlayerIndex !== Network.playerId) {
        logMessage(`<span class="log-icon text-red-500">${ICONS.x}</span> Not your turn!`, 'text-red-400');
        return;
    }
    state.isAwaitingHost = true;
    updateUI(); // Disables button
    Network.broadcastEvent({ type: 'REQUEST_ROLL', playerIndex: Network.playerId });
}

function handleRollClickOffline() {
    let roll1 = Math.floor(Math.random() * 6) + 1;
    let roll2 = state.activeEffects.doubleDice ? Math.floor(Math.random() * 6) + 1 : null;
    
    const pool = (state.gameConfig && Array.isArray(state.gameConfig.enabledPowerups) && state.gameConfig.enabledPowerups.length)
        ? state.gameConfig.enabledPowerups
        : ['bear_trap', 'dry_ice', 'switch_up', 'double_dice', 'up_snake_tile', 'down_ladder_tile'];
    const rouletteReward = pool[Math.floor(Math.random() * pool.length)];
    
    executeRoll(roll1, roll2, rouletteReward);
}

async function animateDiceRoll(finalVal, totalSoFar, isSecondRoll) {
    DOM.diceDisplay.classList.add('anim-shake');
    DOM.diceDetail.innerText = isSecondRoll ? "Rolling 2nd die..." : "Rolling...";
    
    for(let i = 0; i < 15; i++) {
        let tempVal = Math.floor(Math.random() * 6) + 1;
        DOM.diceDisplay.innerText = tempVal;
        AudioSys.rollTick();
        await delay(40); 
    }
    
    DOM.diceDisplay.classList.remove('anim-shake');
    DOM.diceDisplay.innerText = finalVal;
    
    if (isSecondRoll) {
        DOM.diceDetail.innerHTML = `Double Dice! <span class="text-white">(${totalSoFar - finalVal} + ${finalVal} = ${totalSoFar})</span>`;
    } else {
        DOM.diceDetail.innerHTML = `Rolled a <span class="text-white">${finalVal}</span>`;
    }
    
    AudioSys.rollResult();
    DOM.diceDisplay.classList.remove('anim-dice');
    void DOM.diceDisplay.offsetWidth; 
    DOM.diceDisplay.classList.add('anim-dice');
}

async function stepMovePlayer(player, targetPos, stepDelay = 150) {
    const direction = targetPos > player.position ? 1 : -1;
    while (player.position !== targetPos) {
        player.position += direction;
        updateUI(); 
        AudioSys.moveStep();
        await delay(stepDelay);
    }
}

async function executeRoll(roll1, roll2, rouletteReward) {
    const cp = state.players[state.currentPlayerIndex];
    state.isAnimating = true;
    state.isAwaitingHost = false;
    clearTurnTimer(); 
    updateControlStates(cp);
    
    let isDouble = roll2 !== null;
    state.activeEffects.doubleDice = false; 
    
    let totalRoll = roll1;
    let logMsg = `<span class="log-icon text-slate-300">${ICONS.diceSmall}</span> <span style="color: ${cp.color.hex}; font-weight: bold;">${cp.name}</span> rolled ${roll1}`;
    
    await animateDiceRoll(roll1, totalRoll, false);
    
    if (isDouble) {
        await delay(500); 
        totalRoll += roll2;
        logMsg += ` & ${roll2} <span class="text-purple-400 font-bold">(Tot: ${totalRoll})</span>`;
        await animateDiceRoll(roll2, totalRoll, true);
    }
    
    await delay(300); 
    logMessage(logMsg);

    if (roll1 === 6 || (totalRoll - roll1 === 6)) {
        cp.luck = 6;
        logMessage(`<span class="log-icon text-yellow-400">${ICONS.star}</span> Rolled 6! Luck maxed!`, 'text-yellow-400 font-bold');
    } else {
        cp.luck = Math.min(6, cp.luck + 1);
    }

    let initialTarget = cp.position + totalRoll;
    
    if (initialTarget > BOARD_SIZE) {
        logMessage(`<span class="log-icon text-slate-500">${ICONS.x}</span> Overshot 100! Need exactly ${BOARD_SIZE - cp.position} to win. Stayed at ${cp.position}.`, 'text-slate-400 italic');
        
        if (cp.luck >= 6) {
            await delay(400); 
            await triggerRoulette(cp, rouletteReward);
        }

        state.isAnimating = false;
        await delay(200); 
        await processNextTurn(); 
        return;
    }

    await stepMovePlayer(cp, initialTarget, 200);
    await resolveCascadesVisually(cp);

    if (cp.position === BOARD_SIZE) {
        state.isAnimating = false;
        handleWin(cp);
        return;
    }

    if (cp.luck >= 6) {
        await delay(400); 
        await triggerRoulette(cp, rouletteReward);
    }

    state.isAnimating = false;
    await delay(200); 
    await processNextTurn();
}

async function resolveCascadesVisually(cp) {
    let resolved = false;
    let failsafe = 0; 
    while (!resolved && failsafe < 10) {
        failsafe++; resolved = true; 
        let currentPos = cp.position;

        if (SNAKES[currentPos]) {
            logMessage(`<span class="log-icon text-red-500">${ICONS.snake}</span> Slid Snake: ${currentPos} ➔ ${SNAKES[currentPos]}`, 'text-red-400');
            AudioSys.snake();
            await delay(400); 
            await stepMovePlayer(cp, SNAKES[currentPos], 50); 
            resolved = false; continue;
        }
        if (LADDERS[currentPos]) {
            logMessage(`<span class="log-icon text-emerald-500">${ICONS.ladder}</span> Climbed Ladder: ${currentPos} ➔ ${LADDERS[currentPos]}`, 'text-emerald-400');
            AudioSys.ladder();
            await delay(400);
            await stepMovePlayer(cp, LADDERS[currentPos], 50); 
            resolved = false; continue;
        }
        if (state.traps[currentPos]) {
            const trap = state.traps[currentPos];
            delete state.traps[currentPos];
            state.trapCooldowns[currentPos] = state.turnCounter + state.players.length;

            if (trap.type === 'bear_trap') {
                let penalty = Math.floor(Math.random() * 6) + 1;
                logMessage(`<span class="log-icon text-orange-500">${ICONS.trap}</span> Bear Trap! Back ${penalty} steps.`, 'text-orange-500 font-bold');
                AudioSys.trap();
                await delay(600); 
                let target = Math.max(1, currentPos - penalty);
                await stepMovePlayer(cp, target, 150); 
            } else if (trap.type === 'dry_ice') {
                cp.skipTurns += 1;
                logMessage(`<span class="log-icon text-cyan-400">${ICONS.ice}</span> Dry Ice! You will skip your next turn.`, 'text-cyan-400 font-bold');
                AudioSys.trap(); 
                await delay(600); 
            } else if (trap.type === 'down_snake') {
                const numRows = trap.strength || 1;
                const maxStack = getMaxDownSnakeStack(currentPos);
                const dangerLevel = numRows >= maxStack * 0.75 ? 'EXTREME' : (numRows >= maxStack * 0.5 ? 'HIGH' : 'MEDIUM');
                logMessage(`<span class="log-icon text-rose-500">${ICONS.downSnake}</span> <strong>Down-Snake (${dangerLevel})!</strong> Dropped ${numRows} ${numRows === 1 ? 'row' : 'rows'}.`, 'text-rose-500 font-bold');
                AudioSys.snake();
                await delay(600); 
                
                // Apply grid-based downward movement
                let target = currentPos;
                for (let i = 0; i < numRows; i++) {
                    target = getDownTile(target);
                }
                
                await stepMovePlayer(cp, target, 100); 
            }
            resolved = false; 
            continue;
        }
        // ===== TILE EFFECT SYSTEM =====
        if (state.tileEffects[currentPos]) {
            const effect = state.tileEffects[currentPos];
            delete state.tileEffects[currentPos];
            state.trapCooldowns[currentPos] = state.turnCounter + state.players.length;
            let newPos = currentPos;
            
            if (effect.type === 'up') {
                newPos = getTileUp(currentPos);
                logMessage(`<span class="log-icon text-emerald-400 w-4 h-4">${ICONS.upTile}</span> UP Tile! Moved up one row to <strong>${newPos}</strong>.`, 'text-emerald-400 font-bold');
                AudioSys.powerup();
                await delay(400);
                await stepMovePlayer(cp, newPos, 100);
                resolved = false;
                continue;
            } else if (effect.type === 'down') {
                newPos = getDownTile(currentPos);
                logMessage(`<span class="log-icon text-red-400 w-4 h-4">${ICONS.downTile}</span> DOWN Tile! Moved down one row to <strong>${newPos}</strong>.`, 'text-red-400 font-bold');
                AudioSys.powerup();
                await delay(400);
                await stepMovePlayer(cp, newPos, 100);
                resolved = false;
                continue;
            } else if (effect.type === 'left') {
                newPos = getTileLeft(currentPos);
                logMessage(`<span class="log-icon text-blue-400 w-4 h-4">${ICONS.leftTile}</span> LEFT Tile! Moved left to <strong>${newPos}</strong>.`, 'text-blue-400 font-bold');
                AudioSys.powerup();
                await delay(400);
                await stepMovePlayer(cp, newPos, 100);
                resolved = false;
                continue;
            } else if (effect.type === 'right') {
                newPos = getTileRight(currentPos);
                logMessage(`<span class="log-icon text-yellow-400 w-4 h-4">${ICONS.rightTile}</span> RIGHT Tile! Moved right to <strong>${newPos}</strong>.`, 'text-yellow-400 font-bold');
                AudioSys.powerup();
                await delay(400);
                await stepMovePlayer(cp, newPos, 100);
                resolved = false;
                continue;
            } else if (effect.type === 'freeze') {
                cp.skipTurns += 1;
                logMessage(`<span class="log-icon text-cyan-400 w-4 h-4">${ICONS.freezeTile}</span> FREEZE Tile! You will skip your next turn.`, 'text-cyan-400 font-bold');
                AudioSys.trap();
                await delay(600);
            } else if (effect.type === 'bear_trap') {
                let penalty = Math.floor(Math.random() * 6) + 1;
                newPos = Math.max(1, currentPos - penalty);
                logMessage(`<span class="log-icon text-orange-500 w-4 h-4">${ICONS.trap}</span> BEAR TRAP Tile! Back ${penalty} steps to <strong>${newPos}</strong>.`, 'text-orange-500 font-bold');
                AudioSys.trap();
                await delay(600);
                await stepMovePlayer(cp, newPos, 150);
                resolved = false;
                continue;
            } else if (effect.type === 'down_snake') {
                const numRows = effect.strength || 1;
                const maxStack = getMaxDownSnakeStack(currentPos);
                const dangerLevel = numRows >= maxStack * 0.75 ? 'EXTREME' : (numRows >= maxStack * 0.5 ? 'HIGH' : 'MEDIUM');
                newPos = currentPos;
                for (let i = 0; i < numRows; i++) {
                    newPos = getDownTile(newPos);
                }
                logMessage(`<span class="log-icon text-rose-500 w-4 h-4">${ICONS.downSnake}</span> DOWN-SNAKE Tile (${dangerLevel})! Dropped ${numRows} ${numRows === 1 ? 'row' : 'rows'} to <strong>${newPos}</strong>.`, 'text-rose-500 font-bold');
                AudioSys.snake();
                await delay(600);
                await stepMovePlayer(cp, newPos, 100);
                resolved = false;
                continue;
            }
        }
    }
}

async function triggerRoulette(player, forcedReward = null) {
    player.luck = 0; 
    const pool = (state.gameConfig && Array.isArray(state.gameConfig.enabledPowerups) && state.gameConfig.enabledPowerups.length)
        ? state.gameConfig.enabledPowerups
        : ['bear_trap', 'dry_ice', 'switch_up', 'double_dice', 'up_snake_tile', 'down_ladder_tile'];
    const gained = forcedReward || pool[Math.floor(Math.random() * pool.length)];
    player.powerup = gained; 
    AudioSys.powerup();
    
    const card = document.getElementById(`player-card-${player.id}`);
    if (card) {
        card.classList.remove('anim-flash'); 
        void card.offsetWidth; 
        card.classList.add('anim-flash');
    }
    
    logMessage(`<span class="log-icon text-purple-400">${ICONS.roulette}</span> <strong>Roulette!</strong> Gained <span class="text-purple-400 font-bold">${formatPowerupName(gained)}</span>.`);
    updateUI();
    await delay(600); 
}

async function usePowerup() {
    if (state.isAwaitingHost || state.isAnimating || state.isPaused) return;
    const cp = state.players[state.currentPlayerIndex];

    if (isMultiplayer() && state.currentPlayerIndex !== Network.playerId) return;
    
    if (state.status === 'trap_placement') {
        state.status = 'playing';
        updateUI();
        if (!cp.isBot && state.gameConfig.turnTime > 0) startTurnTimer();
        return;
    }

    if (!cp.powerup) return;

    if (['bear_trap', 'dry_ice'].includes(cp.powerup) || isTileEffectPowerup(cp.powerup)) {
        state.status = 'trap_placement';
        updateUI();
        return;
    }
    
    // For double_dice and switch_up
    if (isMultiplayer()) {
        state.isAwaitingHost = true;
        updateUI();
        Network.broadcastEvent({ type: 'REQUEST_POWERUP', playerIndex: Network.playerId, tileIndex: null, powerupType: cp.powerup });
    } else {
        usePowerupOffline(cp);
    }
}

function usePowerupOffline(cp) {
    if (cp.powerup === 'switch_up') {
        const opponents = state.players.filter(p => p.id !== cp.id);
        const target = opponents[Math.floor(Math.random() * opponents.length)];
        executePowerup(null, cp.powerup, target ? target.id : null);
    } else {
        executePowerup(null, cp.powerup);
    }
}

function handleTileClick(tileNum) {
    if (state.status !== 'trap_placement' || state.isAwaitingHost || state.isAnimating || state.isPaused) return;
    const cp = state.players[state.currentPlayerIndex];
    
    if (isValidTrapTile(tileNum, cp.powerup)) {
        if (isMultiplayer()) {
            state.isAwaitingHost = true;
            updateUI();
            Network.broadcastEvent({ type: 'REQUEST_POWERUP', playerIndex: Network.playerId, tileIndex: tileNum, powerupType: cp.powerup });
        } else {
            executePowerup(tileNum, cp.powerup);
        }
    } else {
        if(!cp.isBot) logMessage(`<span class="log-icon text-red-500">${ICONS.x}</span> Invalid trap tile or cooldown active.`, 'text-red-400');
    }
}

async function executePowerup(tileIndex, powerupType, targetId = null) {
    const cp = state.players[state.currentPlayerIndex];
    state.isAwaitingHost = false;
    
    if (powerupType === 'double_dice') {
        state.activeEffects.doubleDice = true;
        cp.powerup = null;
        logMessage(`<span class="log-icon text-purple-400">${ICONS.doubleDice}</span> ${cp.name} used <strong>Double Dice!</strong>`, 'text-purple-400');
        updateUI();
    } 
    else if (['bear_trap', 'dry_ice'].includes(powerupType) || isTileEffectPowerup(powerupType)) {
        if (isTileEffectPowerup(powerupType)) {
            state.tileEffects[tileIndex] = { type: getTileEffectTypeFromPowerup(powerupType) };
            logMessage(`<span class="log-icon text-emerald-400">${getPowerupIcon(powerupType)}</span> ${cp.name} set ${formatPowerupName(powerupType)} on <strong>${tileIndex}</strong>.`);
        } else {
            state.traps[tileIndex] = { type: powerupType, strength: 0 };
            logMessage(`<span class="log-icon text-orange-500">${getPowerupIcon(powerupType)}</span> ${cp.name} set ${formatPowerupName(powerupType)} on <strong>${tileIndex}</strong>.`);
        }
        state.trapCooldowns[tileIndex] = state.turnCounter + state.players.length;
        cp.powerup = null; 
        AudioSys.trap();
        state.status = 'playing';
        updateUI();
    }
    else if (powerupType === 'switch_up') {
        state.isAnimating = true; updateUI();
        const target = state.players.find(p => p.id === targetId);
        if (target) {
            logMessage(`<span class="log-icon text-purple-400">${ICONS.switch}</span> <strong>Switch-Up!</strong> Swapping with ${target.name}...`, 'text-purple-400');
            AudioSys.powerup();
            await delay(800); 
            
            const tempPos = cp.position; cp.position = target.position; target.position = tempPos;
            cp.powerup = null; updateUI();
            await delay(500);
        }
        state.isAnimating = false; updateUI();
    }
}

async function processNextTurn() {
    state.turnCounter++;
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    
    let nextPlayer = state.players[state.currentPlayerIndex];
    
    // Loop incase multiple consecutive players are frozen
    while (nextPlayer.skipTurns > 0 && state.status !== 'game_over') {
        updateUI();
        logMessage(`<span class="log-icon text-cyan-400">${ICONS.ice}</span> ${nextPlayer.name} is frozen and skips their turn!`, 'text-cyan-400 font-bold');
        nextPlayer.skipTurns--;
        
        await delay(1200);
        
        state.turnCounter++;
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
        nextPlayer = state.players[state.currentPlayerIndex];
    }
    
    updateUI();
    
    if (isMultiplayer()) {
        processNextTurnMultiplayer();
    } else {
        processNextTurnOffline();
    }
}

function processNextTurnMultiplayer() {
    if (Network.isHost) {
        const startTime = Date.now();
        Network.broadcastEvent({ type: 'TURN_START', startTime });
        handleTurnStart(startTime);
        Network.syncState(); // Snapshot
    }
}

function processNextTurnOffline() {
    const startTime = Date.now();
    handleTurnStart(startTime);
}

function handleTurnStart(startTime) {
    state.turnStartTime = startTime;
    updateUI();
    startTurnTimer();
    
    const cp = state.players[state.currentPlayerIndex];
    if (cp.isBot && state.status === 'playing') {
        runBotSequence();
    }
}

function handleWin(player) {
    state.status = 'game_over';
    clearTurnTimer();
    updateUI();
    AudioSys.win();
    logMessage(`<span class="log-icon text-yellow-400">${ICONS.trophy}</span> <strong>${player.name} wins!</strong>`, 'text-emerald-400 text-lg');
    
    DOM.winnerText.innerText = `${player.name} Wins!`;
    DOM.winnerText.style.color = player.color.hex;
    DOM.winnerSubtext.innerText = player.isBot ? "The AI has conquered the board." : "A master tactician!";
    
    DOM.gameOverModal.classList.remove('hidden');
    DOM.gameOverModal.classList.add('flex');
}
