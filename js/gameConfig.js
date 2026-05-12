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

const POWERUP_DESCRIPTIONS = {
    bear_trap: 'Places a bear trap on the board. The next player who lands there loses their turn.',
    double_dice: 'Gives the player an extra dice roll for a faster burst of movement.',
    switch_up: 'Swaps player positions and can completely reshape the race.',
    up_tile: 'Launches a player forward to a higher tile when triggered.',
    down_tile: 'Drops a player backward to a lower tile when triggered.',
    left_tile: 'Moves a player sideways to the left on the board.',
    right_tile: 'Moves a player sideways to the right on the board.',
    freeze_tile: 'Freezes the player in place and skips their next movement.'
};

function openSettings(mode) {
    // mode is 'solo' or 'passplay' or undefined
    navTo('screen-game-settings');
    renderSettingsUI(mode);
}

function renderSettingsUI(mode) {
    // Make a deep copy to manipulate state locally
    const cfg = JSON.parse(JSON.stringify(defaultGameConfig));
    
    // Fill in color object properly
    cfg.players = cfg.players.map((p, i) => ({
        ...p,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length]
    }));

    const playerCountEl = document.getElementById('cfg-player-count');
    const gameTimeEl = document.getElementById('cfg-game-time');
    const turnTimeEl = document.getElementById('cfg-turn-time');
    const slotsEl = document.getElementById('cfg-player-slots');
    const powerupsEl = document.getElementById('cfg-powerups');
    const powerupTooltipEl = document.getElementById('cfg-powerup-tooltip');

    const showPowerupTooltip = (title, description) => {
        if (!powerupTooltipEl) return;
        powerupTooltipEl.innerHTML = `<div class="text-[10px] uppercase tracking-[0.2em] text-orange-300 font-black mb-1">${title}</div><div>${description}</div>`;
        powerupTooltipEl.classList.remove('hidden');
        powerupTooltipEl.classList.add('visible');
    };

    const hidePowerupTooltip = () => {
        if (!powerupTooltipEl) return;
        powerupTooltipEl.classList.remove('visible');
        powerupTooltipEl.classList.add('hidden');
        powerupTooltipEl.innerHTML = '';
    };

    if (mode === 'solo') {
        cfg.players = [ { type: 'human', color: PLAYER_COLORS[0] }, { type: 'cpu', color: PLAYER_COLORS[1] } ];
    } else if (mode === 'passplay') {
        cfg.players = [ { type: 'human', color: PLAYER_COLORS[0] }, { type: 'human', color: PLAYER_COLORS[1] } ];
    } else if (mode === 'online_host') {
        // Enforce the local player's profile in slot 1
        const p = window.Profile ? window.Profile.data : { name: "Host", colorHex: PLAYER_COLORS[0].hex };
        const colorObj = window.Profile ? window.Profile.getColorObj() : PLAYER_COLORS[0];
        cfg.players = [ 
            { type: 'human', name: p.name, color: colorObj, isHost: true }, 
            { type: 'online', name: 'Waiting...', color: PLAYER_COLORS[1] } 
        ];
    }

    gameTimeEl.value = cfg.gameTime;
    turnTimeEl.value = cfg.turnTime;
    playerCountEl.value = cfg.players.length;
    
    // Disable player count if we want to lock it, but let's allow up to 6 players in online mode
    playerCountEl.disabled = false;

    function renderSlots() {
        const count = parseInt(playerCountEl.value, 10);
        while (cfg.players.length < count) {
            cfg.players.push({ type: 'cpu', color: PLAYER_COLORS[cfg.players.length % PLAYER_COLORS.length] });
        }
        cfg.players = cfg.players.slice(0, count);

        slotsEl.innerHTML = '';
        cfg.players.forEach((p, i) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex flex-col gap-2.5 p-3.5 bg-slate-950/50 rounded-xl border border-slate-700/50 shadow-inner';
            
            // Header row
            const header = document.createElement('div');
            header.className = 'flex justify-between items-center';
            
            if (mode === 'online_host') {
                if (i === 0) {
                    header.innerHTML = `<span class="text-emerald-400 font-black tracking-wide text-sm">Host (You)</span>`;
                    const typeBadge = document.createElement('div');
                    typeBadge.className = 'bg-emerald-500/20 text-emerald-400 px-3 py-1.5 text-xs font-black rounded-md flex items-center gap-1.5 shadow-sm';
                    typeBadge.innerHTML = `<img src="${window.getAvatarAsset('user')}" alt="" style="width:0.95rem;height:0.95rem;object-fit:contain;display:block;"> ${p.name || 'HUMAN'}`;
                    header.appendChild(typeBadge);
                } else {
                    header.innerHTML = `<span class="text-slate-400 font-black tracking-wide text-sm">Opponent ${i}</span>`;
                    const typeBadge = document.createElement('div');
                    typeBadge.className = 'bg-slate-800 text-slate-500 px-3 py-1.5 text-xs font-black rounded-md flex items-center gap-1.5 border border-slate-700';
                    typeBadge.innerHTML = `<span class="w-3.5 h-3.5">${ICONS.users}</span> ONLINE`;
                    header.appendChild(typeBadge);
                }
            } else {
                header.innerHTML = `<span class="text-slate-300 font-black tracking-wide text-sm">Player ${i+1}</span>`;
                
                // Type toggle
                const toggleWrapper = document.createElement('div');
                toggleWrapper.className = 'flex bg-slate-800 rounded-lg p-1 select-none border border-slate-700';
                
                const btnHuman = document.createElement('div');
                btnHuman.className = `cursor-pointer px-3 py-1.5 text-xs font-black rounded-md flex items-center gap-1.5 transition-all ${p.type === 'human' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`;
                btnHuman.innerHTML = `<img src="${window.getAvatarAsset('user')}" alt="" style="width:0.95rem;height:0.95rem;object-fit:contain;display:block;"> HUMAN`;
                
                const btnCpu = document.createElement('div');
                btnCpu.className = `cursor-pointer px-3 py-1.5 text-xs font-black rounded-md flex items-center gap-1.5 transition-all ${p.type === 'cpu' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`;
                btnCpu.innerHTML = `<img src="${window.getAvatarAsset('bot')}" alt="" style="width:0.95rem;height:0.95rem;object-fit:contain;display:block;"> CPU`;
                
                btnHuman.onclick = () => { p.type = 'human'; renderSlots(); };
                btnCpu.onclick = () => { p.type = 'cpu'; renderSlots(); };
                
                toggleWrapper.appendChild(btnHuman);
                toggleWrapper.appendChild(btnCpu);
                header.appendChild(toggleWrapper);
            }
            wrapper.appendChild(header);
            
            // Color picker row
            const colorContainer = document.createElement('div');
            colorContainer.className = 'flex flex-wrap gap-2 mt-1';
            PLAYER_COLORS.forEach(c => {
                const dot = document.createElement('div');
                const isSelected = p.color.hex === c.hex;
                dot.className = `w-6 h-6 rounded-full cursor-pointer transition-all ${isSelected ? 'scale-125 ring-2 ring-white shadow-[0_0_10px_rgba(255,255,255,0.3)] z-10' : 'opacity-40 hover:opacity-100 hover:scale-110'}`;
                dot.style.backgroundColor = c.hex;
                dot.onclick = () => { p.color = c; renderSlots(); };
                colorContainer.appendChild(dot);
            });
            wrapper.appendChild(colorContainer);
            
            slotsEl.appendChild(wrapper);
        });
    }

    function renderPowerups() {
        powerupsEl.innerHTML = '';
        POWERUPS.forEach(p => {
            const isEnabled = cfg.enabledPowerups.includes(p);
            const powerupName = formatPowerupName(p);
            const powerupDescription = POWERUP_DESCRIPTIONS[p] || 'Toggles a gameplay modifier during match setup.';
            const card = document.createElement('div');
            card.className = `cursor-pointer flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all select-none ${isEnabled ? 'bg-slate-800 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-slate-950/50 border-slate-800/50 opacity-40 hover:opacity-70'}`;
            card.title = `${powerupName}: ${powerupDescription}`;
            
            // Make SVG slightly bigger
            let iconMarkup = getPowerupIcon(p);
            if(iconMarkup.includes('w-4 h-4')) iconMarkup = iconMarkup.replace('w-4 h-4', 'w-6 h-6');
            
            card.innerHTML = `
                <div class="${isEnabled ? 'text-purple-400' : 'text-slate-500'} flex items-center justify-center h-8">${iconMarkup}</div>
                <span class="text-[10px] sm:text-xs font-black text-center uppercase tracking-wider ${isEnabled ? 'text-slate-200' : 'text-slate-500'}">${powerupName}</span>
            `;
            card.addEventListener('mouseenter', () => showPowerupTooltip(powerupName, powerupDescription));
            card.addEventListener('focus', () => showPowerupTooltip(powerupName, powerupDescription));
            card.addEventListener('mousemove', () => showPowerupTooltip(powerupName, powerupDescription));
            card.addEventListener('mouseleave', hidePowerupTooltip);
            card.addEventListener('blur', hidePowerupTooltip);
            card.onclick = () => {
                if (isEnabled) cfg.enabledPowerups = cfg.enabledPowerups.filter(x => x !== p);
                else cfg.enabledPowerups.push(p);
                renderPowerups();
            };
            powerupsEl.appendChild(card);
        });
    }

    renderSlots();
    renderPowerups();

    playerCountEl.onchange = () => renderSlots();

    const startBtn = document.getElementById('cfg-start-btn');
    if (mode === 'online_host') {
        startBtn.innerText = "GENERATE ROOM CODE";
    } else {
        startBtn.innerText = "START MATCH";
    }

    startBtn.onclick = async () => {
        cfg.gameTime = Math.max(0, parseInt(gameTimeEl.value || '0', 10));
        cfg.turnTime = Math.max(0, parseInt(turnTimeEl.value || '0', 10));
        
        if (mode === 'online_host') {
            const code = await Network.createRoom(cfg);
            if (code) {
                // Return to main menu screen logic since settings is full screen 
                // but Network module will pop the lobby modal
            }
        } else {
            startMatchFromConfig(cfg);
        }
    };
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
