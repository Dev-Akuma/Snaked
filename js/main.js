/* ==========================================================================
   4. GAME INITIALIZATION & TIMERS
   ========================================================================== */
let gameTimerInterval = null;

// Real-time timer timestamps
state.turnEndTime = null;
state.gameEndTime = null;
state.pauseStartedAt = null;

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
                gameTime: 300,
                turnTime: 10,
                players: Array.from({ length: humanCount }, () => ({ type: 'human' })),
                enabledPowerups: [...POWERUPS]
            };
        } else {
            // solo
            const botCount = parseInt(document.getElementById('solo-bot-count').value || '1', 10);
            const players = [{ type: 'human' }];
            for (let i = 0; i < botCount; i++) players.push({ type: 'cpu' });
            cfg = { gameTime: 300, turnTime: 10, players, enabledPowerups: [...POWERUPS] };
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
        state.pauseStartedAt = Date.now();
        clearTurnTimer(); 
        DOM.pauseModal.classList.remove('hidden');
        DOM.pauseModal.classList.add('flex');
    } else {
        const pausedDuration =
        Date.now() - state.pauseStartedAt;

        if (state.turnEndTime) {
            state.turnEndTime += pausedDuration;
        }

        if (state.gameEndTime) {
            state.gameEndTime += pausedDuration;
        }
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

    if (cp.isBot || state.isPaused) return;

    // Configured turn limit
    const turnLimit =
        (state.gameConfig &&
        typeof state.gameConfig.turnTime === 'number')
            ? state.gameConfig.turnTime
            : 10;

    // No limit
    if (!turnLimit || turnLimit <= 0) {
        state.timeRemaining = 0;
        updateTimerDisplay(true);
        return;
    }

    // Create absolute end timestamp
    state.turnEndTime = Date.now() + (turnLimit * 1000);

    turnTimerInterval = setInterval(() => {

        if (state.isPaused) return;

        const remainingMs = state.turnEndTime - Date.now();

        state.timeRemaining =
            Math.max(0, Math.ceil(remainingMs / 1000));

        updateTimerDisplay();

        if (state.timeRemaining <= 0) {

            clearTurnTimer();

            if (
                typeof Network !== 'undefined' &&
                Network.roomId &&
                !Network.isHost
            ) {
                // Clients wait for host
            } else {

                if (state.status === 'trap_placement') {
                    state.status = 'playing';
                    updateUI();

                    setTimeout(() => {
                        handleRollClick();
                    }, 100);

                } else {
                    handleRollClick();
                }
            }
        }

    }, 250); // smoother updates
}

function clearTurnTimer() {
    if (turnTimerInterval) clearInterval(turnTimerInterval);
    turnTimerInterval = null;
    updateTimerDisplay(true); 
}

function startGameTimer() {

    clearGameTimer();

    if (
        !state.gameConfig ||
        !state.gameConfig.gameTime ||
        state.gameConfig.gameTime <= 0
    ) {
        updateGlobalTimerDisplay(true);
        return;
    }

    // Absolute game end timestamp
    state.gameEndTime =
        Date.now() + (state.gameConfig.gameTime * 1000);

    gameTimerInterval = setInterval(() => {

        if (state.isPaused || state.status !== 'playing') return;

        const remainingMs =
            state.gameEndTime - Date.now();

        state.gameTimeRemaining =
            Math.max(0, Math.ceil(remainingMs / 1000));

        updateGlobalTimerDisplay();

        if (state.gameTimeRemaining <= 0) {

            clearGameTimer();

            const leader = [...state.players].sort(
                (a, b) =>
                    b.position - a.position ||
                    a.id - b.id
            )[0];

            handleWin(leader);
        }

    }, 250);
}
function clearGameTimer() {
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    gameTimerInterval = null;
    state.gameTimeRemaining = null;
    updateGlobalTimerDisplay(true);
}

// ==========================================
// Multiplayer UI Handlers
// ==========================================

function handleCreateRoom() {
    // Instead of instantly creating a room, open settings first
    openSettings('online_host');
}

async function handleCancelRoom() {
    if (Network.joinInterval) clearInterval(Network.joinInterval);
    await Network.leaveRoom();
    document.getElementById('modal-create-room').classList.add('hidden');
    document.getElementById('modal-create-room').classList.remove('flex');
}

async function handleJoinRoomSubmit() {
    const code = document.getElementById('join-room-input').value.trim();
    if (code.length === 6) {
        const success = await Network.joinRoom(code);
        if (success) {
            document.getElementById('modal-join-room').classList.add('hidden');
            document.getElementById('modal-join-room').classList.remove('flex');
            navTo('screen-game');
        }
    } else {
        alert("Please enter a valid 6-character room code.");
    }
}
