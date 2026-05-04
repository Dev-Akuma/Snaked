/* ==========================================================================
   5. RENDERING & UI
   ========================================================================== */

function updateUI() {
    if(state.status === 'menu') return;
    const cp = state.players[state.currentPlayerIndex];
    
    renderLeaderboard();
    // renderPlayerChips() - removed (top panel deleted)
    renderTokensOnBoard();
    renderTraps();
    highlightActivePlayerTile();
    updateControlStates(cp);

    DOM.statusBanner.innerHTML = `<span style="color: ${cp.color.hex}; filter: drop-shadow(0 0 4px ${cp.color.hex});">●</span> ${cp.name}'s Turn <span class="opacity-30 mx-1">|</span> <span id="timer-display" class="font-mono"></span>`;
    DOM.statusBanner.style.borderBottomColor = cp.color.hex;
    updateTimerDisplay();
}

function updateControlStates(cp) {
    if (state.isAnimating || state.isPaused) {
        DOM.btnRoll.disabled = true;
        DOM.btnPowerup.disabled = true;
        return;
    }

    if (cp.isBot) {
        DOM.btnRoll.disabled = true;
        DOM.btnPowerup.disabled = true;
        DOM.actionPrompt.innerHTML = `<span class="flex items-center justify-center gap-2 w-full">${ICONS.bot} <strong class="tracking-wide">Bot is thinking...</strong></span>`;
        DOM.actionPrompt.className = "text-xs font-semibold text-blue-400 mb-3 p-3 bg-gradient-to-br from-blue-950/60 to-blue-900/40 rounded-xl border border-blue-800/50 text-center shadow-inner flex items-center justify-center animate-pulse shrink-0";
        return;
    }

    if (state.status === 'playing') {
        DOM.btnRoll.disabled = false;
        DOM.actionPrompt.classList.add('hidden');
        
        if (cp.powerup) {
            DOM.btnPowerup.disabled = false;
            DOM.btnPowerup.classList.remove('hidden');
            DOM.btnPowerup.innerHTML = `<span class="flex items-center justify-center gap-2">${getPowerupIcon(cp.powerup)} Use ${formatPowerupName(cp.powerup)}</span>`;
        } else {
            DOM.btnPowerup.classList.add('hidden');
        }
    } else if (state.status === 'trap_placement') {
        DOM.btnRoll.disabled = true;
        DOM.btnPowerup.innerHTML = `<span class="flex items-center justify-center gap-2">${ICONS.x} Cancel</span>`;
        DOM.btnPowerup.className = `btn-3d flex-1 bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-bold py-3.5 px-2 rounded-xl border-slate-800 shadow-lg text-sm tracking-wide shrink-0 transition-all`;
        
        DOM.actionPrompt.innerHTML = `<span class="flex items-center justify-center gap-2 w-full">${ICONS.crosshair} <strong class="tracking-wide">Target Mode:</strong> Click valid tile.</span>`;
        DOM.actionPrompt.className = "text-xs font-semibold text-orange-400 mb-3 p-3 bg-gradient-to-br from-orange-950/60 to-orange-900/40 rounded-xl border border-orange-800/50 text-center shadow-inner flex items-center justify-center shrink-0";
    }
}

function renderLeaderboard() {
    DOM.leaderboardContainer.innerHTML = '';
    
    const sortedPlayers = [...state.players].sort((a, b) => b.position - a.position);
    
    sortedPlayers.forEach((p, index) => {
        const isActive = p.id === state.currentPlayerIndex;
        const isLeader = index === 0 && p.position > 1; 
        
        const card = document.createElement('div');
        card.id = `player-card-${p.id}`; 
        
        card.className = `relative flex items-stretch p-2.5 rounded-xl border-l-4 transition-all duration-300 ${isActive ? 'bg-slate-700/80 shadow-lg scale-105 z-10 ring-1 ring-white/10' : 'bg-slate-800/50 opacity-80 border-transparent hover:opacity-100'}`;
        if(isActive) card.style.borderLeftColor = p.color.hex;
        
        const luckBars = Array(6).fill(0).map((_, i) => `<div class="h-2 w-1.5 rounded-sm transition-colors duration-500 ${i < p.luck ? 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.8)]' : 'bg-slate-900 shadow-inner border border-slate-800/50'}"></div>`).join('');
        
        const statusIcon = p.skipTurns > 0 ? `<span class="text-cyan-400 w-3 h-3 drop-shadow-[0_0_3px_rgba(6,182,212,0.5)]">${ICONS.iceSmall}</span>` : (p.isBot ? `<span class="text-slate-500 w-3 h-3">${ICONS.bot}</span>` : '');

        card.innerHTML = `
           <div class="flex-shrink-0 w-7 font-black text-sm flex items-center justify-center ${isLeader ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]' : 'text-slate-500'}">#${index + 1}</div>
           
           <div class="flex-1 min-w-0 px-2 flex flex-col justify-center">
               <div class="flex items-center gap-2">
                   <div class="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style="background-color: ${p.color.hex}; color: ${p.color.hex}"></div>
                   <span class="font-bold text-xs text-white truncate tracking-wide">${p.name}</span>
                   ${statusIcon}
                   ${isLeader ? `<span class="text-yellow-400 w-3 h-3 drop-shadow-[0_0_3px_rgba(250,204,21,0.5)]">${ICONS.trophySmall}</span>` : ''}
               </div>
               
               <div class="flex items-center gap-3 mt-1.5">
                   <div class="flex gap-0.5">
                       ${luckBars}
                   </div>
                   ${p.powerup ? `<span class="text-purple-400 w-3.5 h-3.5 drop-shadow-[0_0_5px_rgba(168,85,247,0.6)]">${getPowerupIcon(p.powerup)}</span>` : `<span class="text-slate-700 w-3 h-3">${ICONS.powerup}</span>`}
               </div>
           </div>

           <div class="flex-shrink-0 flex flex-col items-end justify-center pl-2 border-l border-slate-700/50">
               <span class="text-[9px] uppercase tracking-widest text-slate-500 font-black">Tile</span>
               <span class="text-xl font-black leading-none ${isActive ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'text-slate-300 drop-shadow-md'} mt-0.5">${p.position}</span>
           </div>
        `;
        DOM.leaderboardContainer.appendChild(card);
    });
}

// DEPRECATED: renderPlayerChips() - top player panel removed
// Function kept as reference but no longer called
/*
function renderPlayerChips() {
    DOM.playersContainer.innerHTML = '';
    state.players.forEach((p, index) => {
        const isActive = index === state.currentPlayerIndex;
        const card = document.createElement('div');
        
        card.className = `flex items-center gap-2.5 p-2 px-3 rounded-xl border-b-2 sm:border-b-4 transition-all duration-300 shrink-0 ${isActive ? 'bg-slate-800/90 shadow-lg shadow-black/50 scale-105 z-10' : 'bg-slate-800/50 opacity-60'} border-slate-950`;
        if(isActive) card.style.borderBottomColor = p.color.hex;
        
        const luckBars = Array(6).fill(0).map((_, i) => `<div class="h-3 w-1 rounded-sm transition-colors duration-500 ${i < p.luck ? 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.6)]' : 'bg-slate-900 shadow-inner'}"></div>`).join('');
        
        const statusIcon = p.skipTurns > 0 ? `<span class="text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]" title="Frozen">${ICONS.iceSmall}</span>` : (p.isBot ? `<span class="text-slate-400 opacity-60">${ICONS.bot}</span>` : '');
        const powerIcon = p.powerup ? `<span class="text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">${getPowerupIcon(p.powerup)}</span>` : `<span class="text-slate-600 opacity-30">${ICONS.powerup}</span>`;

        card.innerHTML = `
            <div class="flex flex-col gap-0.5 min-w-[70px]">
                <div class="font-bold flex items-center gap-1.5 text-white text-[10px] sm:text-xs whitespace-nowrap tracking-wide">
                    <div class="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)]" style="background-color: ${p.color.hex}"></div>
                    ${p.name} ${statusIcon}
                </div>
                <div class="flex items-center gap-1.5 bg-slate-900/50 rounded px-1.5 py-0.5 w-fit border border-slate-700/50">
                    <span class="text-[8px] text-slate-500 font-black tracking-widest">POS</span>
                    <span class="text-[10px] text-emerald-400 font-black">${p.position}</span>
                </div>
            </div>
            <div class="h-6 w-px bg-slate-700 mx-0.5"></div>
            <div class="flex flex-col gap-1 items-center">
                <div class="flex gap-0.5 mt-1">${luckBars}</div>
            </div>
            <div class="h-6 w-px bg-slate-700 mx-0.5"></div>
            <div class="flex items-center justify-center min-w-[24px]">
                ${powerIcon}
            </div>
        `;
        DOM.playersContainer.appendChild(card);
    });
}
*/
// END DEPRECATED FUNCTION

function renderTokensOnBoard() {
    for (let i = 1; i <= BOARD_SIZE; i++) {
        const container = document.getElementById(`tokens-${i}`);
        if(container) container.innerHTML = '';
    }
    state.players.forEach(p => {
        const container = document.getElementById(`tokens-${p.position}`);
        if (container) {
            const token = document.createElement('div');
            token.className = `token ${state.isAnimating ? '' : 'anim-pop'}`; 
            token.style.backgroundColor = p.color.hex;
            container.appendChild(token);
        }
    });
}

function getTileEffectIconMarkup(effectType) {
    if (effectType === 'up') {
        return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l-7 7h4v9h6v-9h4z"></path></svg>`;
    }
    if (effectType === 'down') {
        return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20l7-7h-4V4H9v9H5z"></path></svg>`;
    }
    if (effectType === 'left') {
        return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l7-7v4h9v6h-9v4z"></path></svg>`;
    }
    if (effectType === 'right') {
        return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12l-7 7v-4H4V9h9V5z"></path></svg>`;
    }
    if (effectType === 'freeze') {
        return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1"></path></svg>`;
    }
    if (effectType === 'bear_trap') {
        return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"></path><path d="M12 20V12"></path><path d="M8 12l-2-6h12l-2 6"></path><path d="M9 12l-1.5 2.5"></path><path d="M12 12l0 2.8"></path><path d="M15 12l1.5 2.5"></path></svg>`;
    }
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l7 4v8l-7 4-7-4V8z"></path><path d="M12 8v8"></path></svg>`;
}

function renderTraps() {
    for (let i = 1; i <= BOARD_SIZE; i++) {
        const trapEl = document.getElementById(`trap-${i}`);
        const cellEl = document.getElementById(`cell-${i}`);
        
        trapEl.classList.add('hidden');
        cellEl.classList.remove(
            'trap-cell-bear',
            'trap-cell-ice',
            'trap-cell-snake',
            'trap-placement-mode',
            'tile-effect-up',
            'tile-effect-down',
            'tile-effect-left',
            'tile-effect-right',
            'tile-effect-freeze',
            'tile-effect-trap',
            'tile-effect-snake'
        );
        cellEl.style.boxShadow = '';
        
        if (state.traps[i]) {
            trapEl.classList.remove('hidden');
            const trapType = state.traps[i].type;
            const trapStrength = state.traps[i].strength || 0;
            
            if (trapType === 'bear_trap') {
                trapEl.innerHTML = ICONS.trapLarge;
                trapEl.className = 'absolute top-1 right-1 text-orange-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10';
                cellEl.classList.add('trap-cell-bear');
            } else if (trapType === 'dry_ice') {
                trapEl.innerHTML = ICONS.iceLarge;
                trapEl.className = 'absolute top-1 right-1 text-cyan-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10';
                cellEl.classList.add('trap-cell-ice');
            } else if (trapType === 'down_snake') {
                // ===== VISUAL STACK FEEDBACK =====
                // Add numeric badge and colored glow based on stack strength
                const maxStack = getMaxDownSnakeStack(i);
                const strengthPercent = Math.round((trapStrength / maxStack) * 100);
                let glowIntensity = 'rgba(244, 63, 94, 0.2)'; // Base glow
                
                if (trapStrength >= maxStack * 0.75) {
                    glowIntensity = 'rgba(244, 63, 94, 0.6)'; // DANGER: 75%+ full
                } else if (trapStrength >= maxStack * 0.5) {
                    glowIntensity = 'rgba(244, 63, 94, 0.4)'; // WARNING: 50%+ full
                }
                
                // Create stack indicator badge
                const stackBadge = `<div class="absolute bottom-0 right-0 w-6 h-6 bg-rose-600 rounded-full flex items-center justify-center text-white text-xs font-black" style="box-shadow: 0 0 8px ${glowIntensity};">x${trapStrength}</div>`;
                
                trapEl.innerHTML = ICONS.downSnakeLarge + stackBadge;
                trapEl.className = 'absolute top-1 right-1 text-rose-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10';
                cellEl.classList.add('trap-cell-snake');
                
                // Apply glow to cell based on stack danger level
                cellEl.style.boxShadow = `inset 0 0 12px ${glowIntensity}`;
            }
        }
        
        // ===== TILE EFFECT RENDERING =====
        if (state.tileEffects[i]) {
            const effect = state.tileEffects[i];
            const effectEl = trapEl; // Reuse same element
            const effectClassMap = {
                up: 'tile-effect-up',
                down: 'tile-effect-down',
                left: 'tile-effect-left',
                right: 'tile-effect-right',
                freeze: 'tile-effect-freeze',
                bear_trap: 'tile-effect-trap',
                down_snake: 'tile-effect-snake'
            };
            
            effectEl.classList.remove('hidden');
            cellEl.classList.remove('trap-cell-bear', 'trap-cell-ice', 'trap-cell-snake');
            
            const effectClass = effectClassMap[effect.type] || 'tile-effect-freeze';
            const iconWrapClassMap = {
                up: 'tile-effect-icon tile-effect-icon-up',
                down: 'tile-effect-icon tile-effect-icon-down',
                left: 'tile-effect-icon tile-effect-icon-left',
                right: 'tile-effect-icon tile-effect-icon-right',
                freeze: 'tile-effect-icon tile-effect-icon-freeze',
                bear_trap: 'tile-effect-icon tile-effect-icon-trap',
                down_snake: 'tile-effect-icon tile-effect-icon-snake'
            };

            effectEl.innerHTML = `<div class="${iconWrapClassMap[effect.type] || iconWrapClassMap.freeze}">${getTileEffectIconMarkup(effect.type)}</div>`;
            effectEl.className = 'absolute inset-0 z-10 pointer-events-none tile-effect-overlay';
            cellEl.classList.add(effectClass);
        }
        
        const cp = state.players[state.currentPlayerIndex];
        if (state.status === 'trap_placement' && !cp.isBot && isValidTrapTile(i, cp.powerup)) {
            cellEl.classList.add('trap-placement-mode');
        }
    }
}

function highlightActivePlayerTile() {
    document.querySelectorAll('.active-player-cell').forEach(el => el.classList.remove('active-player-cell'));
    if (state.status === 'playing' || state.status === 'trap_placement') {
        const pos = state.players[state.currentPlayerIndex].position;
        const cell = document.getElementById(`cell-${pos}`);
        if (cell) cell.classList.add('active-player-cell');
    }
}

function updateTimerDisplay(forceClear = false) {
    const timerEls = document.querySelectorAll('#timer-display, #timer-display-right');
    timerEls.forEach(timerEl => {
        if(forceClear || state.players[state.currentPlayerIndex].isBot) {
            timerEl.innerHTML = '';
        } else {
            timerEl.innerHTML = `⏳ <span class="${state.timeRemaining <= 3 ? 'text-red-400 animate-pulse font-black' : 'text-slate-300'}">${state.timeRemaining}s</span>`;
        }
    });
}

function updateGlobalTimerDisplay(forceClear = false) {
    const container = document.getElementById('global-timer');
    const textEl = document.getElementById('global-timer-text');
    if (!container || !textEl) return;
    
    if (forceClear || state.gameTimeRemaining == null) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    
    const m = Math.floor(state.gameTimeRemaining / 60);
    const s = state.gameTimeRemaining % 60;
    textEl.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    
    if (state.gameTimeRemaining <= 30) {
        textEl.className = 'text-red-400 animate-pulse font-black';
    } else if (state.gameTimeRemaining <= 60) {
        textEl.className = 'text-orange-400 font-bold';
    } else {
        textEl.className = 'text-slate-300';
    }
}

function logMessage(msg, customClass = '') {
    const entry = document.createElement('div');
    entry.className = `border-b border-slate-700/50 pb-1.5 ${customClass}`;
    entry.innerHTML = msg;
    DOM.actionLog.appendChild(entry);
    DOM.actionLog.scrollTop = DOM.actionLog.scrollHeight;
}
