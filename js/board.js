/* ==========================================================================
   4. BOARD RENDERING & CONNECTIONS (ENHANCED)
   ========================================================================== */

/**
 * BOARD LAYOUT SYSTEM:
 * - 10x10 grid, tiles numbered 1-100
 * - Top-left (visual): tile 100, Bottom-right (visual): tile 1
 * - Alternating row pattern: even rows (0-based) go left→right,
 *   odd rows go right→left (snake pattern on a board)
 */

/**
 * Calculate tile position (boardRow, boardCol) from tile number (1-100)
 */
function getTilePosition(tile) {
    if (tile < 1 || tile > 100) return { boardRow: 0, boardCol: 0 };
    const row = Math.floor((tile - 1) / 10);  // 0-9
    const col = (tile - 1) % 10;              // 0-9 before reversal
    const isReverseRow = row % 2 === 1;      // odd rows go right-to-left
    const finalCol = isReverseRow ? 9 - col : col;
    return { boardRow: row, boardCol: finalCol };
}

/**
 * Get tile number from grid position (for reverse lookup)
 */
function getTileFromBoardPosition(boardRow, boardCol) {
    if (boardRow < 0 || boardRow > 9 || boardCol < 0 || boardCol > 9) return 0;
    const isReverseRow = boardRow % 2 === 1;
    const col = isReverseRow ? 9 - boardCol : boardCol;
    return boardRow * 10 + col + 1;
}

/**
 * Build the visual board grid (10x10 cells)
 */
function buildBoard() {
    // Clear existing cells but preserve SVG layer
    Array.from(DOM.board.children).forEach(child => {
        if (child.id !== 'connections-layer') child.remove();
    });

    const rows = [];
    // Create rows: visual top = high tile numbers, visual bottom = low tile numbers
    for (let r = 0; r < 10; r++) {
        let row = [];
        for (let c = 1; c <= 10; c++) row.push(r * 10 + c);
        if (r % 2 === 1) row.reverse(); // Alternate direction
        rows.push(row);
    }
    rows.reverse(); // Top of display = highest numbers

    // Create DOM cells
    rows.forEach((row, r) => {
        row.forEach((num, c) => {
            const cell = document.createElement('div');
            cell.className = 'board-cell';
            cell.id = `cell-${num}`;

            // Checkerboard pattern
            if ((r % 2 === 0) ? (c % 2 === 0) : (c % 2 !== 0)) {
                cell.classList.add('cell-dark');
            } else {
                cell.classList.add('cell-light');
            }

            // Tile number and connection indicators (small, faded)
            let innerHTML = `<span class="opacity-25 absolute top-1.5 left-2 text-[0.65rem] sm:text-[0.75rem] font-black">${num}</span>`;

            // Add small icons to indicate snakes/ladders (cosmetic only)
            if (SNAKES[num]) innerHTML += `<div class="absolute bottom-1 right-1 text-red-500 opacity-20 text-xs">${ICONS.snake}</div>`;
            if (LADDERS[num]) innerHTML += `<div class="absolute bottom-1 right-1 text-emerald-500 opacity-20 text-xs">${ICONS.ladder}</div>`;

            // Trap placement layer (hidden by default)
            innerHTML += `<div id="trap-${num}" class="hidden"></div>`;

            // Token container (for player pieces)
            innerHTML += `<div id="tokens-${num}" class="token-container"></div>`;

            cell.innerHTML = innerHTML;
            cell.addEventListener('click', () => {
                const cp = state.players[state.currentPlayerIndex];
                if (!cp.isBot) handleTileClick(num);
            });
            DOM.board.appendChild(cell);
        });
    });
}

/**
 * Calculate exact SVG coordinates for a tile's center
 * This is called after DOM is fully rendered
 */
function getTileCenterInSVG(tileNum) {
    const cell = document.getElementById(`cell-${tileNum}`);
    if (!cell) return { x: 0, y: 0 };

    const boardRect = DOM.board.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();

    // Calculate relative to board's top-left
    const x = cellRect.left - boardRect.left + cellRect.width / 2;
    const y = cellRect.top - boardRect.top + cellRect.height / 2;

    return { x, y };
}

/**
 * Draw enhanced snakes and ladders with proper curves and styling
 */
function drawConnections() {
    const svg = DOM.connectionsLayer;
    svg.innerHTML = '';

    // Set SVG viewBox and sizing for crisp rendering
    const boardRect = DOM.board.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${boardRect.width} ${boardRect.height}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    // LADDERS: thick green lines with dashed pattern (like rope)
    Object.entries(LADDERS).forEach(([start, end]) => {
        const p1 = getTileCenterInSVG(parseInt(start, 10));
        const p2 = getTileCenterInSVG(parseInt(end, 10));

        // Main ladder stroke
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', p1.x);
        line.setAttribute('y1', p1.y);
        line.setAttribute('x2', p2.x);
        line.setAttribute('y2', p2.y);
        line.setAttribute('stroke', 'url(#ladderGradient)');
        line.setAttribute('stroke-width', '6');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('stroke-dasharray', '4, 6');
        line.setAttribute('opacity', '0.7');
        svg.appendChild(line);

        // Secondary glow effect
        const glowLine = line.cloneNode();
        glowLine.setAttribute('stroke', 'rgba(34, 197, 94, 0.3)');
        glowLine.setAttribute('stroke-width', '14');
        glowLine.setAttribute('opacity', '0.3');
        glowLine.setAttribute('stroke-dasharray', '4, 6');
        svg.insertBefore(glowLine, line);
    });

    // SNAKES: curved red paths with wave effect
    Object.entries(SNAKES).forEach(([start, end]) => {
        const p1 = getTileCenterInSVG(parseInt(start, 10));
        const p2 = getTileCenterInSVG(parseInt(end, 10));

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate bezier curve control points for a smooth snake path
        const curveIntensity = Math.min(distance * 0.35, 100);
        const sign = (parseInt(start, 10) % 2 === 0) ? 1 : -1;

        // Control points for cubic bezier
        const cx1 = p1.x + dx * 0.25 + dy * 0.15 * sign * curveIntensity / 50;
        const cy1 = p1.y + dy * 0.25 - dx * 0.15 * sign * curveIntensity / 50;
        const cx2 = p1.x + dx * 0.75 - dy * 0.15 * sign * curveIntensity / 50;
        const cy2 = p1.y + dy * 0.75 + dx * 0.15 * sign * curveIntensity / 50;

        // Glow effect (darker, wider)
        const glowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        glowPath.setAttribute('d', `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`);
        glowPath.setAttribute('stroke', 'rgba(239, 68, 68, 0.25)');
        glowPath.setAttribute('stroke-width', '16');
        glowPath.setAttribute('fill', 'none');
        glowPath.setAttribute('stroke-linecap', 'round');
        glowPath.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(glowPath);

        // Main snake path with gradient
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`);
        path.setAttribute('stroke', 'url(#snakeGradient)');
        path.setAttribute('stroke-width', '7');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('opacity', '0.85');
        svg.appendChild(path);

        // Highlight/shine effect (lighter top edge)
        const shinePath = path.cloneNode();
        shinePath.setAttribute('stroke', 'rgba(254, 226, 226, 0.4)');
        shinePath.setAttribute('stroke-width', '2');
        shinePath.setAttribute('opacity', '0.6');
        svg.appendChild(shinePath);
    });

    // Add gradient definitions to SVG
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    const ladderGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    ladderGrad.setAttribute('id', 'ladderGradient');
    ladderGrad.setAttribute('x1', '0%');
    ladderGrad.setAttribute('y1', '0%');
    ladderGrad.setAttribute('x2', '100%');
    ladderGrad.setAttribute('y2', '0%');
    const ladderStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    ladderStop1.setAttribute('offset', '0%');
    ladderStop1.setAttribute('stop-color', '#10b981');
    ladderStop1.setAttribute('stop-opacity', '1');
    const ladderStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    ladderStop2.setAttribute('offset', '100%');
    ladderStop2.setAttribute('stop-color', '#34d399');
    ladderStop2.setAttribute('stop-opacity', '0.9');
    ladderGrad.appendChild(ladderStop1);
    ladderGrad.appendChild(ladderStop2);
    defs.appendChild(ladderGrad);

    const snakeGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    snakeGrad.setAttribute('id', 'snakeGradient');
    snakeGrad.setAttribute('x1', '0%');
    snakeGrad.setAttribute('y1', '0%');
    snakeGrad.setAttribute('x2', '100%');
    snakeGrad.setAttribute('y2', '0%');
    const snakeStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    snakeStop1.setAttribute('offset', '0%');
    snakeStop1.setAttribute('stop-color', '#ef4444');
    snakeStop1.setAttribute('stop-opacity', '1');
    const snakeStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    snakeStop2.setAttribute('offset', '100%');
    snakeStop2.setAttribute('stop-color', '#f87171');
    snakeStop2.setAttribute('stop-opacity', '0.9');
    snakeGrad.appendChild(snakeStop1);
    snakeGrad.appendChild(snakeStop2);
    defs.appendChild(snakeGrad);

    svg.appendChild(defs);
}

/**
 * Handle window resize - recalculate tile positions and redraw
 */
let resizeTimeout = null;
function debounceResize() {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (state.status !== 'menu') drawConnections();
    }, 150);
}

window.addEventListener('resize', debounceResize);
