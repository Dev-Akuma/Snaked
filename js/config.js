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
    
    const minDistance = 5; // Min tile distance between structures
    const numSnakes = 6 + Math.floor(Math.random() * 3); // 6-8 snakes
    const numLadders = 6 + Math.floor(Math.random() * 3); // 6-8 ladders
    
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
    
    // Generate SNAKES (high tile → low tile, going DOWN)
    let snakesCreated = 0;
    let attempts = 0;
    while (snakesCreated < numSnakes && attempts < 100) {
        attempts++;
        const start = 11 + Math.floor(Math.random() * 80); // 11-90
        
        if (!isValidPlacement(start)) continue;
        
        // End must be significantly lower
        const drop = 5 + Math.floor(Math.random() * 30); // Drop 5-35 tiles
        const end = Math.max(2, start - drop);
        
        if (isValidPlacement(end) && !snakes[start] && !snakes[end] && start > end) {
            snakes[start] = end;
            usedTiles.add(start);
            usedTiles.add(end);
            snakesCreated++;
        }
    }
    
    // Generate LADDERS (low tile → high tile, going UP)
    let laddersCreated = 0;
    attempts = 0;
    while (laddersCreated < numLadders && attempts < 100) {
        attempts++;
        const start = 2 + Math.floor(Math.random() * 80); // 2-81
        
        if (!isValidPlacement(start)) continue;
        
        // End must be significantly higher
        const climb = 5 + Math.floor(Math.random() * 30); // Climb 5-35 tiles
        const end = Math.min(100, start + climb);
        
        if (isValidPlacement(end) && !ladders[start] && !ladders[end] && start < end) {
            ladders[start] = end;
            usedTiles.add(start);
            usedTiles.add(end);
            laddersCreated++;
        }
    }
    
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
