/* ==========================================================================
   3. GAME STATE & NAVIGATION
   ========================================================================== */

let state = {
    status: 'menu',
    mode: '', 
    players: [],
    currentPlayerIndex: 0,
    turnCounter: 0, 
    traps: {}, // Format: { [tile]: { type: 'bear_trap'|'dry_ice'|'down_snake', strength: number } }
    tileEffects: {}, // New Tile Effect System: { [tile]: { type: 'up'|'down'|'left'|'right'|'freeze'|'bear_trap'|'down_snake' } }
    trapCooldowns: {},
    activeEffects: { doubleDice: false },
    isAnimating: false,
    isAwaitingHost: false,
    isPaused: false,
    timeRemaining: 10,
    turnStartTime: null
};

let turnTimerInterval = null; 

const DOM = {
    board: document.getElementById('board'),
    connectionsLayer: document.getElementById('connections-layer'),
    leaderboardContainer: document.getElementById('leaderboard-container'),
    btnRoll: document.getElementById('btn-roll'),
    btnPowerup: document.getElementById('btn-powerup'),
    diceDisplay: document.getElementById('dice-display'),
    diceDetail: document.getElementById('dice-detail'),
    actionLog: document.getElementById('action-log'),
    statusBanner: document.getElementById('game-status-banner'),
    actionPrompt: document.getElementById('action-prompt'),
    pauseModal: document.getElementById('pause-modal'),
    gameOverModal: document.getElementById('game-over-modal'),
    winnerText: document.getElementById('winner-text'),
    winnerSubtext: document.getElementById('winner-subtext')
};

function navTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden-screen'));
    document.getElementById(screenId).classList.remove('hidden-screen');
}
