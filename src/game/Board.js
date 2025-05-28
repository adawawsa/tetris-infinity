import { GAME_CONFIG } from '../config/GameConfig.js';

export class Board {
    constructor() {
        this.width = GAME_CONFIG.BOARD_WIDTH;
        this.height = GAME_CONFIG.BOARD_HEIGHT;
        this.grid = [];
        this.init();
    }
    
    init() {
        // Create empty grid
        this.grid = Array(this.height).fill(null).map(() => 
            Array(this.width).fill(0)
        );
    }
    
    clear() {
        this.init();
    }
    
    isValidPosition(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }
    
    getCell(x, y) {
        if (!this.isValidPosition(x, y)) return 1; // Treat out of bounds as occupied
        const value = this.grid[y][x];
        return value;
    }
    
    setCell(x, y, value) {
        if (this.isValidPosition(x, y)) {
            this.grid[y][x] = value;
        }
    }
    
    addPiece(piece) {
        const shape = piece.getShape();
        const typeValue = piece.typeId || 1;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const boardX = piece.x + col;
                    const boardY = piece.y + row;
                    
                    if (this.isValidPosition(boardX, boardY)) {
                        this.grid[boardY][boardX] = typeValue;
                    }
                }
            }
        }
    }
    
    clearLines() {
        const clearedLines = [];
        
        // Check each line from bottom to top
        for (let y = this.height - 1; y >= 0; y--) {
            if (this.isLineFull(y)) {
                clearedLines.push(y);
            }
        }
        
        // Remove cleared lines
        if (clearedLines.length > 0) {
            this.removeLines(clearedLines);
        }
        
        return clearedLines;
    }
    
    isLineFull(y) {
        for (let x = 0; x < this.width; x++) {
            if (this.grid[y][x] === 0) {
                return false;
            }
        }
        return true;
    }
    
    removeLines(lines) {
        // Sort lines in descending order
        lines.sort((a, b) => b - a);
        
        // Remove each line
        for (const line of lines) {
            this.grid.splice(line, 1);
            // Add empty line at top
            this.grid.unshift(Array(this.width).fill(0));
        }
    }
    
    getFilledCells() {
        const cells = [];
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] > 0) {
                    cells.push({
                        x: x,
                        y: y,
                        type: this.grid[y][x]
                    });
                }
            }
        }
        
        return cells;
    }
    
    getHeight() {
        // Find the highest occupied row
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] > 0) {
                    return this.height - y;
                }
            }
        }
        return 0;
    }
    
    // Special methods for power-ups
    clearBottomLines(count) {
        const clearedLines = [];
        
        for (let i = 0; i < count && i < this.height; i++) {
            const y = this.height - 1 - i;
            clearedLines.push(y);
        }
        
        if (clearedLines.length > 0) {
            this.removeLines(clearedLines);
        }
        
        return clearedLines;
    }
    
    addGarbageLines(count, gap = -1) {
        // Remove top lines to make room
        for (let i = 0; i < count; i++) {
            this.grid.shift();
        }
        
        // Add garbage lines at bottom
        for (let i = 0; i < count; i++) {
            const garbageLine = Array(this.width).fill(8); // 8 = garbage block
            
            // Add gap if specified
            if (gap >= 0 && gap < this.width) {
                garbageLine[gap] = 0;
            } else {
                // Random gap
                const randomGap = Math.floor(Math.random() * this.width);
                garbageLine[randomGap] = 0;
            }
            
            this.grid.push(garbageLine);
        }
    }
    
    // For AI analysis
    getColumnHeights() {
        const heights = Array(this.width).fill(0);
        
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                if (this.grid[y][x] > 0) {
                    heights[x] = this.height - y;
                    break;
                }
            }
        }
        
        return heights;
    }
    
    getHoles() {
        let holes = 0;
        
        for (let x = 0; x < this.width; x++) {
            let blockFound = false;
            
            for (let y = 0; y < this.height; y++) {
                if (this.grid[y][x] > 0) {
                    blockFound = true;
                } else if (blockFound) {
                    holes++;
                }
            }
        }
        
        return holes;
    }
    
    getBumpiness() {
        const heights = this.getColumnHeights();
        let bumpiness = 0;
        
        for (let i = 0; i < heights.length - 1; i++) {
            bumpiness += Math.abs(heights[i] - heights[i + 1]);
        }
        
        return bumpiness;
    }
    
    // Serialization for multiplayer
    serialize() {
        return {
            width: this.width,
            height: this.height,
            grid: this.grid.map(row => [...row])
        };
    }
    
    deserialize(data) {
        this.width = data.width;
        this.height = data.height;
        this.grid = data.grid.map(row => [...row]);
    }
}