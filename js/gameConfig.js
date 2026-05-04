/* ==========================================================================
   Game Configuration Module
   - Renders settings screen controls
   - Collects gameConfig and starts the match
   ========================================================================== */

// Default config
const defaultGameConfig = {
    gameTime: 300, // seconds, 0 = no limit
    turnTime: 10, // seconds, 0 = no limit
    players: [ { type: 'human' }, { type: 'human' } ], // default 2 humans
    enabledPowerups: [...POWERUPS] // by default all enabled
};

function openSettings(mode) {
    // mode is 'solo' or 'passplay' or undefined
    navTo('screen-game-settings');
    renderSettingsUI(mode);
}

function renderSettingsUI(mode) {
    const cfg = { ...defaultGameConfig };
    // Pre-fill based on mode
    const playerCountEl = document.getElementById('cfg-player-count');
    const gameTimeEl = document.getElementById('cfg-game-time');
    const turnTimeEl = document.getElementById('cfg-turn-time');
    const slotsEl = document.getElementById('cfg-player-slots');
    const powerupsEl = document.getElementById('cfg-powerups');

    // Mode-specific defaults
    if (mode === 'solo') {
        cfg.players = [ { type: 'human' }, { type: 'cpu' } ];
    } else if (mode === 'passplay') {
        cfg.players = [ { type: 'human' }, { type: 'human' } ];
    }

    // Set inputs
    gameTimeEl.value = cfg.gameTime;
    turnTimeEl.value = cfg.turnTime;
    playerCountEl.value = cfg.players.length;

    // Render player slots
    function renderSlots(count) {
        slotsEl.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex items-center gap-2 p-2 bg-slate-900 rounded';
            const label = document.createElement('div');
            label.className = 'w-6 text-slate-300 font-bold';
            label.innerText = `#${i+1}`;
            const select = document.createElement('select');
            select.className = 'p-2 rounded bg-slate-800 text-white border border-slate-700';
            select.innerHTML = `<option value="human">Human</option><option value="cpu">CPU</option>`;
            if (cfg.players[i] && cfg.players[i].type === 'cpu') select.value = 'cpu';
            wrapper.appendChild(label);
            wrapper.appendChild(select);
            slotsEl.appendChild(wrapper);
        }
    }

    renderSlots(cfg.players.length);

    playerCountEl.onchange = (e) => {
        const val = parseInt(e.target.value, 10);
        renderSlots(val);
    };

    // Render powerups
    powerupsEl.innerHTML = '';
    POWERUPS.forEach(p => {
        const id = `pu-${p}`;
        const btn = document.createElement('label');
        btn.className = 'flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-700';
        btn.innerHTML = `<input id="${id}" type="checkbox" checked class="w-4 h-4" /> <span class="text-sm text-slate-200 ml-1">${formatPowerupName(p)}</span>`;
        powerupsEl.appendChild(btn);
    });

    // Attach start handler
    const startBtn = document.getElementById('cfg-start-btn');
    startBtn.onclick = () => {
        const finalCfg = collectSettings();
        startMatchFromConfig(finalCfg);
    };
}

function collectSettings() {
    const gameTime = Math.max(0, parseInt(document.getElementById('cfg-game-time').value || '0', 10));
    const turnTime = Math.max(0, parseInt(document.getElementById('cfg-turn-time').value || '0', 10));
    const playerCount = Math.max(2, Math.min(6, parseInt(document.getElementById('cfg-player-count').value || '2', 10)));

    const slotsEl = document.getElementById('cfg-player-slots');
    const players = [];
    Array.from(slotsEl.querySelectorAll('select')).forEach((sel, idx) => {
        players.push({ type: sel.value === 'cpu' ? 'cpu' : 'human' });
    });

    const enabledPowerups = [];
    POWERUPS.forEach(p => {
        const cb = document.getElementById(`pu-${p}`);
        if (cb && cb.checked) enabledPowerups.push(p);
    });

    const cfg = {
        gameTime,
        turnTime,
        players,
        enabledPowerups
    };
    return cfg;
}

function startMatchFromConfig(cfg) {
    // Save config into global state for game code
    state.gameConfig = cfg;
    // Move to game start using existing initGame which accepts object as override
    initGame(cfg);
}

// Expose for console/debug
window.openSettings = openSettings;
window.startMatchFromConfig = startMatchFromConfig;
