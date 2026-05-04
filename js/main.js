/* ==========================================================================
   4. GAME INITIALIZATION & TIMERS
   ========================================================================== */
let gameTimerInterval = null;

function initGame(modeOrConfig) {
    AudioSys.startBGM();
    AudioSys.toggleMute();
    AudioSys.toggleMute();

    clearTurnTimer();
    clearGameTimer();
    document.getElementById('btn-pause-game').innerHTML = ICONS.pause;

    // Build state.players from either legacy mode string or config object
    let cfg = null;
    if (typeof modeOrConfig === 'object') {
        cfg = modeOrConfig;
    } else {
        // Backwards compatible defaults
        if (modeOrConfig === 'passplay') {
            const humanCount = parseInt(document.getElementById('pp-player-count').value || '2', 10);
            cfg = {
                gameTime: 0,
                turnTime: 10,
                players: Array.from({ length: humanCount }, () => ({ type: 'human' })),
                enabledPowerups: [...POWERUPS]
            };
        } else {
            // solo
            const botCount = parseInt(document.getElementById('solo-bot-count').value || '1', 10);
            const players = [{ type: 'human' }];
            for (let i = 0; i < botCount; i++) players.push({ type: 'cpu' });
            cfg = { gameTime: 0, turnTime: 10, players, enabledPowerups: [...POWERUPS] };
        }
    }

    // Save config to global state
    state.gameConfig = cfg;

    state.mode = 'playing';
    state.players = cfg.players.map((p, i) => ({
        id: i,
        name: p.name || (p.type === 'human' ? `Player ${i + 1}` : `Bot ${i + 1}`),
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        position: 1,
        luck: 0,
        powerup: null,
        skipTurns: 0,
        isBot: p.type === 'cpu'
    }));

    state.status = 'playing';
    state.currentPlayerIndex = 0;
    state.turnCounter = 0;
    state.traps = {};
    state.trapCooldowns = {};
    state.tileEffects = {}; // Initialize tile effects
    state.activeEffects = { doubleDice: false };
    state.isAnimating = false;
    state.isPaused = false;

    DOM.actionLog.innerHTML = '<div class="text-slate-500 italic text-center text-[10px] mt-2 tracking-widest uppercase">Game initialized.</div>';

    // ===== GENERATE RANDOMIZED BOARD =====
    const randomBoard = generateRandomBoard();
    const randomTiles = generateRandomTileEffects();
    // Override global SNAKES and LADDERS for this game session
    Object.assign(SNAKES, randomBoard.snakes);
    Object.keys(SNAKES).forEach(key => {
        if (!randomBoard.snakes.hasOwnProperty(key)) delete SNAKES[key];
    });
    Object.assign(LADDERS, randomBoard.ladders);
    Object.keys(LADDERS).forEach(key => {
        if (!randomBoard.ladders.hasOwnProperty(key)) delete LADDERS[key];
    });
    // Apply generated tile effects
    state.tileEffects = randomTiles;

    navTo('screen-game');
    buildBoard();

    setTimeout(() => {
        drawConnections();
        updateUI();
        logMessage('<strong>Game started</strong>!', 'text-emerald-400');

        // Start global game timer if configured
        startGameTimer();

        if (state.players[0].isBot) runBotSequence();
        else startTurnTimer();
    }, 50);
}

function exitToMenu() {
    state.status = 'menu';
    clearTurnTimer();
    DOM.pauseModal.classList.replace('flex', 'hidden');
    DOM.gameOverModal.classList.replace('flex', 'hidden');
    navTo('screen-main-menu');
}

function togglePause() {
    if (state.status !== 'playing' && state.status !== 'trap_placement') return;
    state.isPaused = !state.isPaused;
    document.getElementById('btn-pause-game').innerHTML = state.isPaused ? ICONS.resume : ICONS.pause;
    
    if (state.isPaused) {
        clearTurnTimer(); 
        DOM.pauseModal.classList.remove('hidden');
        DOM.pauseModal.classList.add('flex');
    } else {
        DOM.pauseModal.classList.remove('flex');
        DOM.pauseModal.classList.add('hidden');
        
        const cp = state.players[state.currentPlayerIndex];
        if (!cp.isBot && !state.isAnimating) {
            startTurnTimer(); 
        }
    }
}

function startTurnTimer() {
    clearTurnTimer();
    if (state.status !== 'playing' && state.status !== 'trap_placement') return;
    const cp = state.players[state.currentPlayerIndex];
    if (cp.isBot || state.isAnimating || state.isPaused) return;

    // Use configured per-turn time (0 = no limit)
    const turnLimit = (state.gameConfig && typeof state.gameConfig.turnTime === 'number') ? state.gameConfig.turnTime : 10;
    if (!turnLimit || turnLimit <= 0) {
        // No per-turn limit
        state.timeRemaining = 0;
        updateTimerDisplay(true);
        return;
    }

    state.timeRemaining = turnLimit;
    updateTimerDisplay();

    turnTimerInterval = setInterval(() => {
        if (state.isPaused || state.isAnimating) return;
        state.timeRemaining--;
        updateTimerDisplay();

        if (state.timeRemaining <= 0) {
            clearTurnTimer();
            if (state.status === 'trap_placement') {
                state.status = 'playing';
                updateUI();
                setTimeout(() => handleRollClick(), 100);
            } else {
                handleRollClick();
            }
        }
    }, 1000);
}

function clearTurnTimer() {
    if (turnTimerInterval) clearInterval(turnTimerInterval);
    turnTimerInterval = null;
    updateTimerDisplay(true); 
}

function startGameTimer() {
    // global game timer (leader wins on expiry)
    clearGameTimer();
    if (!state.gameConfig || !state.gameConfig.gameTime || state.gameConfig.gameTime <= 0) return;
    state.gameTimeRemaining = state.gameConfig.gameTime;
    gameTimerInterval = setInterval(() => {
        if (state.isPaused || state.isAnimating || state.status !== 'playing') return;
        state.gameTimeRemaining--;
        // Optionally expose somewhere in UI via updateUI()
        if (state.gameTimeRemaining <= 0) {
            clearGameTimer();
            // Determine leader (highest position, tie-breaker by position then id)
            const leader = [...state.players].sort((a,b) => b.position - a.position || a.id - b.id)[0];
            handleWin(leader);
        }
    }, 1000);
}

function clearGameTimer() {
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    gameTimerInterval = null;
    state.gameTimeRemaining = null;
}
