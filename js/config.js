/* ==========================================================================
   2. GAME CONFIGURATION & CONSTANTS
   ========================================================================== */

const BOARD_SIZE = 100;

const SNAKES = { 
    25: 5, 
    34: 1, 
    47: 19, 
    65: 52, 
    87: 57, 
    91: 61, 
    99: 69 
};

const LADDERS = { 
    3: 22, 
    8: 26, 
    20: 41, 
    36: 55, 
    43: 77, 
    50: 89, 
    71: 92 
};

/**
 * Tile Effect Types enum
 */
const TILE_EFFECT_TYPES = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right',
    FREEZE: 'freeze',
    BEAR_TRAP: 'bear_trap',
    DOWN_SNAKE: 'down_snake'
};

const TILE_EFFECT_POWERUPS = ['up_tile', 'down_tile', 'left_tile', 'right_tile', 'freeze_tile'];
const POWERUPS = ['bear_trap', 'double_dice', 'switch_up', ...TILE_EFFECT_POWERUPS];

const TILE_EFFECT_POWERUP_TO_TYPE = {
    up_tile: TILE_EFFECT_TYPES.UP,
    down_tile: TILE_EFFECT_TYPES.DOWN,
    left_tile: TILE_EFFECT_TYPES.LEFT,
    right_tile: TILE_EFFECT_TYPES.RIGHT,
    freeze_tile: TILE_EFFECT_TYPES.FREEZE
};

const PLAYER_COLORS = [
    { name: 'Red', hex: '#ef4444' },    
    { name: 'Blue', hex: '#3b82f6' },   
    { name: 'Green', hex: '#10b981' },  
    { name: 'Yellow', hex: '#eab308' },
    { name: 'Purple', hex: '#a855f7' },
    { name: 'Orange', hex: '#f97316' },
    { name: 'Cyan', hex: '#06b6d4' },
    { name: 'Pink', hex: '#ec4899' }
];

// Utility functions
const delay = ms => new Promise(res => setTimeout(res, ms));

function formatPowerupName(key) {
    if (key === 'bear_trap') return 'Bear Trap';
    if (key === 'down_tile') return 'Down Tile';
    if (key === 'double_dice') return '2x Dice';
    if (key === 'switch_up') return 'Switch';
    if (key === 'up_tile') return 'Up Tile';
    if (key === 'left_tile') return 'Left Tile';
    if (key === 'right_tile') return 'Right Tile';
    if (key === 'freeze_tile') return 'Freeze Tile';
    return 'Unknown';
}

function getPowerupIcon(key) {
    if (key === 'bear_trap') return ICONS.trap;
    if (key === 'double_dice') return ICONS.doubleDice;
    if (key === 'switch_up') return ICONS.switch;
    if (key === 'up_tile') return `<span class="inline-block w-4 h-4">${ICONS.upTile}</span>`;
    if (key === 'down_tile') return `<span class="inline-block w-4 h-4">${ICONS.downTile}</span>`;
    if (key === 'left_tile') return `<span class="inline-block w-4 h-4">${ICONS.leftTile}</span>`;
    if (key === 'right_tile') return `<span class="inline-block w-4 h-4">${ICONS.rightTile}</span>`;
    if (key === 'freeze_tile') return `<span class="inline-block w-4 h-4">${ICONS.freezeTile}</span>`;
    return ICONS.powerup;
}

function isTileEffectPowerup(key) {
    return TILE_EFFECT_POWERUPS.includes(key);
}

function getTileEffectTypeFromPowerup(key) {
    return TILE_EFFECT_POWERUP_TO_TYPE[key] || key;
}

/* ==========================================================================
   GRID POSITION HELPERS - For Down-Snake Vertical Drop System
   ========================================================================== */

/**
 * Convert a tile number to its board position (row and column)
 * Accounts for the snake-pattern layout where rows alternate direction
 * @param {number} tile - Tile number (1-100)
 * @returns {object} { boardRow, boardCol } in the internal board coordinate system
 */
function getTilePosition(tile) {
    const boardRow = Math.floor((tile - 1) / 10);
    const col = (tile - 1) % 10;
    
    let boardCol;
    if (boardRow % 2 === 1) {
        // Odd rows (1, 3, 5, 7, 9) go right to left
        boardCol = 9 - col;
    } else {
        // Even rows (0, 2, 4, 6, 8) go left to right
        boardCol = col;
    }
    
    return { boardRow, boardCol };
}

/**
 * Convert board position (row, col) to a tile number
 * Respects the snake-pattern layout
 * @param {number} boardRow - Board row (0-9)
 * @param {number} boardCol - Board column (0-9)
 * @returns {number} Tile number (1-100)
 */
function getTileFromBoardPosition(boardRow, boardCol) {
    if (boardRow % 2 === 1) {
        // Odd rows go right to left
        return boardRow * 10 + (10 - boardCol);
    } else {
        // Even rows go left to right
        return boardRow * 10 + boardCol + 1;
    }
}

/**
 * Get the tile one row down from the current tile
 * Maintains the same column (vertical drop) while respecting snake-pattern
 * @param {number} tile - Current tile number
 * @returns {number} Tile number one row down (or same if at bottom row)
 */
function getDownTile(tile) {
    const { boardRow, boardCol } = getTilePosition(tile);
    
    // Move down one row (decrease boardRow since board is reversed visually)
    const newBoardRow = boardRow - 1;
    
    // If already at bottom row (boardRow 0 = tiles 1-10), stay at same tile
    if (newBoardRow < 0) {
        return tile;
    }
    
    // Convert back to tile number
    return getTileFromBoardPosition(newBoardRow, boardCol);
}

/* ==========================================================================
   RANDOM BOARD GENERATION
   ========================================================================== */

/**
 * Generate randomized snakes and ladders for each game
 * - Ensures uniqueness and fairness each session
 * - Prevents hardcoded patterns
 * @returns {object} { snakes: {...}, ladders: {...} }
 */
function generateRandomBoard() {
    const snakes = {};
    const ladders = {};
    const usedTiles = new Set([1, 100]); // Forbidden tiles
    
    const minDistance = 3; // Min tile distance between structures
    const minStructures = 4;
    const maxStructures = 6;
    const numSnakes = minStructures + Math.floor(Math.random() * (maxStructures - minStructures + 1));
    const numLadders = minStructures + Math.floor(Math.random() * (maxStructures - minStructures + 1));

    const makeRange = (start, end) => {
        const range = [];
        for (let tile = start; tile <= end; tile++) range.push(tile);
        return range;
    };

    const shuffle = (values) => {
        const result = values.slice();
        for (let index = result.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
        }
        return result;
    };
    
    /**
     * Check if a tile is valid for placement (not too close to others)
     */
    const isValidPlacement = (tile) => {
        if (usedTiles.has(tile)) return false;
        for (let used of usedTiles) {
            if (Math.abs(tile - used) < minDistance) return false;
        }
        return true;
    };

    const getCandidatePairs = (type) => {
        const pairs = [];
        const startTiles = type === 'ladder'
            ? makeRange(2, 81)
            : makeRange(20, 95);

        for (const start of shuffle(startTiles)) {
            if (!isValidPlacement(start)) continue;

            const endTiles = type === 'ladder'
                ? makeRange(start + 5, Math.min(100, start + 35))
                : makeRange(Math.max(2, start - 35), start - 5);

            for (const end of shuffle(endTiles)) {
                if (type === 'ladder' && end <= start) continue;
                if (type === 'snake' && end >= start) continue;
                if (!isValidPlacement(end)) continue;
                pairs.push({ start, end });
            }
        }

        return shuffle(pairs);
    };

    const placeStructures = (collection, type, targetCount) => {
        let safety = 0;

        while (Object.keys(collection).length < targetCount && safety < 200) {
            safety++;

            const pairs = getCandidatePairs(type);
            if (!pairs.length) break;

            const { start, end } = pairs[Math.floor(Math.random() * pairs.length)];
            collection[start] = end;
            usedTiles.add(start);
            usedTiles.add(end);
        }

        return Object.keys(collection).length;
    };
    
    // Place the minimum first so every board has at least 4 of each.
    placeStructures(ladders, 'ladder', minStructures);
    placeStructures(snakes, 'snake', minStructures);

    // Add a few extra random structures when space allows.
    placeStructures(ladders, 'ladder', numLadders);
    placeStructures(snakes, 'snake', numSnakes);
    
    return { snakes, ladders };
}

/* ==========================================================================
   TILE EFFECT SYSTEM - DIRECTIONAL MOVEMENT
   ========================================================================== */

/**
 * Get the tile one row UP from the current tile
 * Reverses getDownTile() movement - moves player visually up on board
 * @param {number} tile - Current tile number
 * @returns {number} Tile number one row up (or same if at top row)
 */
function getTileUp(tile) {
    const { boardRow, boardCol } = getTilePosition(tile);
    const newBoardRow = boardRow + 1;
    if (newBoardRow > 9) return tile; // At top, stay
    return getTileFromBoardPosition(newBoardRow, boardCol);
}

/**
 * Get the tile one position LEFT in the current row
 * Respects snake-pattern row direction
 * @param {number} tile - Current tile number
 * @returns {number} Tile number one position left (or same if at edge)
 */
function getTileLeft(tile) {
    const { boardRow, boardCol } = getTilePosition(tile);
    const newCol = boardCol - 1;
    if (newCol < 0 || newCol > 9) return tile; // At edge, stay
    return getTileFromBoardPosition(boardRow, newCol);
}

/**
 * Get the tile one position RIGHT in the current row
 * Respects snake-pattern row direction
 * @param {number} tile - Current tile number
 * @returns {number} Tile number one position right (or same if at edge)
 */
function getTileRight(tile) {
    const { boardRow, boardCol } = getTilePosition(tile);
    const newCol = boardCol + 1;
    if (newCol < 0 || newCol > 9) return tile; // At edge, stay
    return getTileFromBoardPosition(boardRow, newCol);
}

/* ==========================================================================
   TILE EFFECT GENERATION
   ========================================================================== */

/**
 * Tile effects are player-placed, so the board starts empty.
 * @returns {object} {}
 */
function generateRandomTileEffects() {
    return {};
}
