/* ==========================================================================
   Network Module (Supabase Multiplayer)
   - Handles room creation, joining, lobby management, and state synchronization
   ========================================================================== */

const Network = {
    roomId: null,
    isHost: false,
    playerId: null, // local player index in state.players
    channel: null,
    
    // Generate a random 6-character room code
    generateRoomCode: () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    },

    // 1. Create a new room (Host)
    createRoom: async (cfg) => {
        if (!db) {
            alert("Supabase not configured!");
            return null;
        }
        
        const code = Network.generateRoomCode();
        Network.roomId = code;
        Network.isHost = true;
        Network.playerId = 0; // Host is always index 0
        
        // Host configuration from the settings UI is used
        // Make sure the first player is the Host profile, others are removed until they join
        const hostPlayer = cfg.players[0];
        cfg.players = [hostPlayer]; // Only Host is in the room initially
        
        // Initialize local state
        state.gameConfig = cfg;
        state.players = []; // will be populated by initGame or manually
        // We shouldn't call initGame yet because we are in Lobby!
        // Actually, we just store the config in DB.
        
        // Generate shared random board for this session
        const randomBoard = generateRandomBoard();
        const randomTiles = generateRandomTileEffects();
        
        const initialState = {
            gameConfig: cfg,
            boardData: {
                snakes: randomBoard.snakes,
                ladders: randomBoard.ladders,
                tiles: randomTiles
            },
            players: [{
                id: 'p1',
                name: hostPlayer.name,
                color: hostPlayer.color,
                isBot: false,
                isHost: true,
                position: 1,
                luck: 0,
                powerup: null,
                skipTurns: 0,
                profileAvatar: window.Profile ? window.Profile.data.avatar : 'user'
            }],
            turnCounter: 0,
            currentPlayerIndex: 0,
            status: 'lobby'
        };
        
        // Push initial state to DB
        const { data, error } = await db
            .from('rooms')
            .insert([{ id: code, game_state: initialState, status: 'waiting' }]);
            
        if (error) {
            console.error("Error creating room:", error);
            alert("Failed to create room.");
            return null;
        }

        // Show Lobby
        document.getElementById('modal-lobby').classList.remove('hidden');
        document.getElementById('modal-lobby').classList.add('flex');
        document.getElementById('lobby-code-display').innerText = code;
        document.getElementById('btn-lobby-start').classList.remove('hidden');
        document.getElementById('lobby-waiting-msg').classList.add('hidden');
        
        Network.renderLobby(initialState.players);
        Network.subscribeToRoom();
        return code;
    },

    // 2. Join an existing room (Client)
    joinRoom: async (code) => {
        if (!db) {
            alert("Supabase not configured!");
            return false;
        }
        
        code = code.toUpperCase();
        
        // Fetch current room state
        const { data, error } = await db
            .from('rooms')
            .select('*')
            .eq('id', code)
            .single();
            
        if (error || !data) {
            console.error("Room not found:", error);
            alert("Room not found or invalid code!");
            return false;
        }
        
        if (data.status !== 'waiting') {
            alert("Match has already started or room is full!");
            return false;
        }

        const gameState = data.game_state;
        const maxPlayers = gameState.gameConfig.playerCount || 6; // We didn't save max explicitly, but let's assume 6
        
        if (gameState.players.length >= 6) {
            alert("Room is full!");
            return false;
        }

        // Append this client to the players array
        const myIndex = gameState.players.length;
        const myProfile = window.Profile ? window.Profile.data : { name: "Player", avatar: "user", colorHex: PLAYER_COLORS[1].hex };
        const myColor = PLAYER_COLORS.find(c => c.hex === myProfile.colorHex) || PLAYER_COLORS[myIndex % PLAYER_COLORS.length];
        
        const newPlayer = {
            id: `p${myIndex + 1}`,
            name: myProfile.name,
            color: myColor,
            isBot: false,
            isHost: false,
            position: 1,
            luck: 0,
            powerup: null,
            skipTurns: 0,
            profileAvatar: myProfile.avatar
        };
        
        gameState.players.push(newPlayer);
        
        // Update DB
        const { error: updateError } = await db
            .from('rooms')
            .update({ game_state: gameState })
            .eq('id', code);
            
        if (updateError) {
            console.error("Error joining room:", updateError);
            alert("Failed to join room.");
            return false;
        }
        
        Network.roomId = code;
        Network.isHost = false;
        Network.playerId = myIndex;
        
        // Show Lobby
        document.getElementById('modal-join-room').classList.add('hidden');
        document.getElementById('modal-join-room').classList.remove('flex');
        
        document.getElementById('modal-lobby').classList.remove('hidden');
        document.getElementById('modal-lobby').classList.add('flex');
        document.getElementById('lobby-code-display').innerText = code;
        document.getElementById('btn-lobby-start').classList.add('hidden');
        document.getElementById('lobby-waiting-msg').classList.remove('hidden');
        
        Network.renderLobby(gameState.players);
        Network.subscribeToRoom();
        return true;
    },

    // 3. Render Lobby UI
    renderLobby: (players) => {
        const listEl = document.getElementById('lobby-players-list');
        const countEl = document.getElementById('lobby-count');
        const startBtn = document.getElementById('btn-lobby-start');
        
        if (!listEl) return;
        
        listEl.innerHTML = '';
        countEl.innerText = players.length;
        
        players.forEach((p, idx) => {
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-700';
            
            const left = document.createElement('div');
            left.className = 'flex items-center gap-3';
            
            const avatar = document.createElement('div');
            avatar.className = 'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold';
            avatar.style.backgroundColor = p.color.hex;
            avatar.innerHTML = ICONS[p.profileAvatar] || ICONS.user;
            
            const name = document.createElement('span');
            name.className = 'font-bold text-slate-200';
            name.innerText = p.name;
            
            if (p.isHost) {
                const badge = document.createElement('span');
                badge.className = 'ml-2 text-[10px] uppercase tracking-widest bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded';
                badge.innerText = 'Host';
                name.appendChild(badge);
            } else if (idx === Network.playerId) {
                const badge = document.createElement('span');
                badge.className = 'ml-2 text-[10px] uppercase tracking-widest bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded';
                badge.innerText = 'You';
                name.appendChild(badge);
            }
            
            left.appendChild(avatar);
            left.appendChild(name);
            row.appendChild(left);
            
            // Kick button for host (cannot kick self)
            if (Network.isHost && !p.isHost) {
                const kickBtn = document.createElement('button');
                kickBtn.className = 'text-xs bg-red-950/50 hover:bg-red-900 text-red-500 hover:text-white px-3 py-1.5 rounded border border-red-900 transition-colors';
                kickBtn.innerText = 'Kick';
                kickBtn.onclick = () => Network.kickPlayer(idx);
                row.appendChild(kickBtn);
            }
            
            listEl.appendChild(row);
        });
        
        // Host start game logic
        if (Network.isHost && startBtn) {
            if (players.length > 1) {
                startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                startBtn.disabled = false;
            } else {
                startBtn.classList.add('opacity-50', 'cursor-not-allowed');
                startBtn.disabled = true;
            }
        }
    },
    
    // 4. Kick Player (Host only)
    kickPlayer: async (idx) => {
        if (!Network.isHost || !db) return;
        
        const { data } = await db.from('rooms').select('game_state').eq('id', Network.roomId).single();
        if (data && data.game_state) {
            let gs = data.game_state;
            gs.players.splice(idx, 1);
            // Reassign IDs and check positions (though positions don't matter in lobby)
            await db.from('rooms').update({ game_state: gs }).eq('id', Network.roomId);
        }
    },

    // Subscribe to realtime changes
    subscribeToRoom: () => {
        if (!Network.roomId || !db) return;
        
        Network.channel = db.channel(`room:${Network.roomId}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'rooms', 
                filter: `id=eq.${Network.roomId}` 
            }, (payload) => {
                const incomingState = payload.new.game_state;
                const status = payload.new.status;
                
                if (status === 'waiting' && incomingState.status === 'lobby') {
                    // Check if I was kicked
                    if (!Network.isHost && incomingState.players.length <= Network.playerId) {
                        alert("You were kicked from the lobby.");
                        handleCancelRoom();
                        return;
                    }
                    Network.renderLobby(incomingState.players);
                } 
                else if (status === 'playing') {
                    // Game Started!
                    if (document.getElementById('modal-lobby').classList.contains('flex')) {
                        document.getElementById('modal-lobby').classList.add('hidden');
                        document.getElementById('modal-lobby').classList.remove('flex');
                        
                        // Local State Init
                        state.gameConfig = incomingState.gameConfig;
                        state.players = incomingState.players;
                        state.status = 'playing';
                        state.turnCounter = incomingState.turnCounter || 0;
                        state.currentPlayerIndex = incomingState.currentPlayerIndex || 0;
                        state.traps = {};
                        state.trapCooldowns = {};
                        state.activeEffects = { doubleDice: false };
                        state.isAnimating = false;
                        state.isPaused = false;
                        
                        // Apply shared board data
                        Object.assign(SNAKES, incomingState.boardData.snakes);
                        Object.keys(SNAKES).forEach(key => { if (!incomingState.boardData.snakes.hasOwnProperty(key)) delete SNAKES[key]; });
                        Object.assign(LADDERS, incomingState.boardData.ladders);
                        Object.keys(LADDERS).forEach(key => { if (!incomingState.boardData.ladders.hasOwnProperty(key)) delete LADDERS[key]; });
                        state.tileEffects = incomingState.boardData.tiles;
                        
                        DOM.actionLog.innerHTML = '<div class="text-slate-500 italic text-center text-[10px] mt-2 tracking-widest uppercase">Online match connected.</div>';
                        
                        navTo('screen-game');
                        buildBoard();
                        
                        setTimeout(() => {
                            drawConnections();
                            updateUI();
                            if (Network.playerId === 0) { // Host kicks off first turn timer
                                startTurnTimer();
                            }
                        }, 50);
                    } else {
                        // Regular in-game state sync
                        if (incomingState && incomingState.turnCounter !== state.turnCounter) {
                            Object.assign(state, incomingState);
                            updateUI();
                        }
                    }
                }
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'rooms',
                filter: `id=eq.${Network.roomId}`
            }, () => {
                // Room deleted (Host left)
                if (!Network.isHost) {
                    alert("The host closed the room.");
                    handleCancelRoom();
                }
            })
            .subscribe();
    },

    // Sync local state to Supabase (during game)
    syncState: async () => {
        if (!Network.roomId || !db) return;
        const stateCopy = JSON.parse(JSON.stringify(state));
        await db.from('rooms').update({ game_state: stateCopy }).eq('id', Network.roomId);
    },

    // Leave room
    leaveRoom: async () => {
        if (Network.channel && db) {
            db.removeChannel(Network.channel);
        }
        if (Network.roomId && Network.isHost && db) {
            await db.from('rooms').delete().eq('id', Network.roomId);
        } else if (Network.roomId && !Network.isHost && db) {
            // Remove self from lobby if waiting
            const { data } = await db.from('rooms').select('game_state, status').eq('id', Network.roomId).single();
            if (data && data.status === 'waiting') {
                let gs = data.game_state;
                gs.players.splice(Network.playerId, 1);
                await db.from('rooms').update({ game_state: gs }).eq('id', Network.roomId);
            }
        }
        Network.roomId = null;
        Network.isHost = false;
        Network.playerId = null;
    }
};

window.Network = Network;

// Start Game Handler (called by UI)
async function handleStartOnlineGame() {
    if (!Network.isHost || !db || !Network.roomId) return;
    
    // Switch status to playing
    const { error } = await db.from('rooms').update({ status: 'playing' }).eq('id', Network.roomId);
    if (!error) {
        document.getElementById('modal-lobby').classList.add('hidden');
        document.getElementById('modal-lobby').classList.remove('flex');
        navTo('screen-game');
        
        // Host needs to pull latest state or just use local, wait we didn't store players locally
        // fetch from DB to be safe
        const { data } = await db.from('rooms').select('game_state').eq('id', Network.roomId).single();
        if (data) {
            const incomingState = data.game_state;
            state.gameConfig = incomingState.gameConfig;
            state.players = incomingState.players;
            state.status = 'playing';
            state.turnCounter = incomingState.turnCounter || 0;
            state.currentPlayerIndex = incomingState.currentPlayerIndex || 0;
            state.traps = {};
            state.trapCooldowns = {};
            state.activeEffects = { doubleDice: false };
            state.isAnimating = false;
            state.isPaused = false;
            
            // Apply shared board data
            Object.assign(SNAKES, incomingState.boardData.snakes);
            Object.keys(SNAKES).forEach(key => { if (!incomingState.boardData.snakes.hasOwnProperty(key)) delete SNAKES[key]; });
            Object.assign(LADDERS, incomingState.boardData.ladders);
            Object.keys(LADDERS).forEach(key => { if (!incomingState.boardData.ladders.hasOwnProperty(key)) delete LADDERS[key]; });
            state.tileEffects = incomingState.boardData.tiles;
            
            DOM.actionLog.innerHTML = '<div class="text-slate-500 italic text-center text-[10px] mt-2 tracking-widest uppercase">Online match connected.</div>';
            
            buildBoard();
            setTimeout(() => {
                drawConnections();
                updateUI();
                startTurnTimer();
            }, 50);
        }
    }
}
window.handleStartOnlineGame = handleStartOnlineGame;
