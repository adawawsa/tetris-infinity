import { GAME_CONFIG, COLORS, TETROMINOS } from '../config/GameConfig.js';

export class Renderer {
    constructor(canvasId, effectsCanvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.effectsCanvas = document.getElementById(effectsCanvasId);
        this.effectsCtx = this.effectsCanvas.getContext('2d');
        
        this.cellSize = GAME_CONFIG.CELL_SIZE;
        this.boardWidth = GAME_CONFIG.BOARD_WIDTH;
        this.boardHeight = GAME_CONFIG.BOARD_HEIGHT;
        
        this.holdCanvas = document.getElementById('hold-canvas');
        this.holdCtx = this.holdCanvas.getContext('2d');
        
        this.nextCanvas = document.getElementById('next-canvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.init();
    }
    
    init() {
        // Set canvas dimensions
        this.canvas.width = this.boardWidth * this.cellSize;
        this.canvas.height = this.boardHeight * this.cellSize;
        
        this.effectsCanvas.width = this.canvas.width;
        this.effectsCanvas.height = this.canvas.height;
        
        // Enable image smoothing
        this.ctx.imageSmoothingEnabled = true;
        this.effectsCtx.imageSmoothingEnabled = true;
        
        // Set default styles
        this.ctx.strokeStyle = COLORS.GRID_LINE;
        this.ctx.lineWidth = 1;
    }
    
    clear() {
        this.ctx.fillStyle = COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.effectsCtx.clearRect(0, 0, this.effectsCanvas.width, this.effectsCanvas.height);
    }
    
    drawBoard(board) {
        // Draw grid lines if enabled
        if (this.shouldDrawGrid()) {
            this.drawGrid();
        }
        
        // Draw filled cells
        for (let y = 0; y < this.boardHeight; y++) {
            for (let x = 0; x < this.boardWidth; x++) {
                const cellValue = board.getCell(x, y);
                if (cellValue > 0) {
                    this.drawCell(x, y, this.getColor(cellValue));
                }
            }
        }
    }
    
    drawPiece(piece) {
        const shape = piece.getShape();
        const color = this.getColor(piece.typeId || piece.type);
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const x = piece.x + col;
                    const y = piece.y + row;
                    
                    if (y >= 0) { // Only draw visible parts
                        this.drawCell(x, y, color);
                    }
                }
            }
        }
    }
    
    drawGhostPiece(piece, ghostY) {
        const shape = piece.getShape();
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const x = piece.x + col;
                    const y = ghostY + row;
                    
                    if (y >= 0) {
                        this.drawGhostCell(x, y);
                    }
                }
            }
        }
    }
    
    drawCell(x, y, color) {
        const pixelX = x * this.cellSize;
        const pixelY = y * this.cellSize;
        
        // Main block
        this.ctx.fillStyle = color;
        this.ctx.fillRect(pixelX, pixelY, this.cellSize, this.cellSize);
        
        // Highlight (top and left edges)
        this.ctx.fillStyle = this.lightenColor(color, 30);
        this.ctx.fillRect(pixelX, pixelY, this.cellSize, 2);
        this.ctx.fillRect(pixelX, pixelY, 2, this.cellSize);
        
        // Shadow (bottom and right edges)
        this.ctx.fillStyle = this.darkenColor(color, 30);
        this.ctx.fillRect(pixelX, pixelY + this.cellSize - 2, this.cellSize, 2);
        this.ctx.fillRect(pixelX + this.cellSize - 2, pixelY, 2, this.cellSize);
        
        // Inner border
        this.ctx.strokeStyle = this.darkenColor(color, 50);
        this.ctx.strokeRect(pixelX + 0.5, pixelY + 0.5, this.cellSize - 1, this.cellSize - 1);
    }
    
    drawGhostCell(x, y) {
        const pixelX = x * this.cellSize;
        const pixelY = y * this.cellSize;
        
        this.ctx.strokeStyle = COLORS.GHOST;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pixelX + 1, pixelY + 1, this.cellSize - 2, this.cellSize - 2);
        this.ctx.lineWidth = 1;
    }
    
    drawGrid() {
        this.ctx.strokeStyle = COLORS.GRID_LINE;
        this.ctx.lineWidth = 0.5;
        
        // Vertical lines
        for (let x = 1; x < this.boardWidth; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.cellSize, 0);
            this.ctx.lineTo(x * this.cellSize, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 1; y < this.boardHeight; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.cellSize);
            this.ctx.lineTo(this.canvas.width, y * this.cellSize);
            this.ctx.stroke();
        }
        
        this.ctx.lineWidth = 1;
    }
    
    drawHeldPiece(piece, disabled = false) {
        this.holdCtx.fillStyle = COLORS.BACKGROUND;
        this.holdCtx.fillRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
        
        if (!piece) return;
        
        const shape = piece.getShape();
        const color = disabled ? '#666666' : this.getColor(piece.typeId || piece.type);
        const blockSize = 20;
        
        // Center the piece
        const offsetX = (this.holdCanvas.width - shape[0].length * blockSize) / 2;
        const offsetY = (this.holdCanvas.height - shape.length * blockSize) / 2;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const x = offsetX + col * blockSize;
                    const y = offsetY + row * blockSize;
                    
                    this.holdCtx.fillStyle = color;
                    this.holdCtx.fillRect(x, y, blockSize, blockSize);
                    
                    this.holdCtx.strokeStyle = this.darkenColor(color, 50);
                    this.holdCtx.strokeRect(x + 0.5, y + 0.5, blockSize - 1, blockSize - 1);
                }
            }
        }
        
        // Draw disabled overlay
        if (disabled) {
            this.holdCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.holdCtx.fillRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
        }
    }
    
    drawNextPieces(pieces) {
        this.nextCtx.fillStyle = COLORS.BACKGROUND;
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        const blockSize = 20;
        const pieceHeight = 80;
        
        pieces.slice(0, 5).forEach((piece, index) => {
            const shape = piece.getShape();
            const color = this.getColor(piece.typeId || piece.type);
            
            const offsetX = (this.nextCanvas.width - shape[0].length * blockSize) / 2;
            const offsetY = index * pieceHeight + (pieceHeight - shape.length * blockSize) / 2;
            
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        const x = offsetX + col * blockSize;
                        const y = offsetY + row * blockSize;
                        
                        this.nextCtx.fillStyle = color;
                        this.nextCtx.fillRect(x, y, blockSize, blockSize);
                        
                        this.nextCtx.strokeStyle = this.darkenColor(color, 50);
                        this.nextCtx.strokeRect(x + 0.5, y + 0.5, blockSize - 1, blockSize - 1);
                    }
                }
            }
        });
    }
    
    // Effect rendering methods
    drawLineClearEffect(lines) {
        lines.forEach(y => {
            const pixelY = y * this.cellSize;
            
            // Flash effect
            const gradient = this.effectsCtx.createLinearGradient(0, pixelY, this.canvas.width, pixelY);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            this.effectsCtx.fillStyle = gradient;
            this.effectsCtx.fillRect(0, pixelY, this.canvas.width, this.cellSize);
        });
    }
    
    drawParticle(x, y, radius, color, alpha = 1) {
        this.effectsCtx.save();
        this.effectsCtx.globalAlpha = alpha;
        this.effectsCtx.fillStyle = color;
        this.effectsCtx.beginPath();
        this.effectsCtx.arc(x, y, radius, 0, Math.PI * 2);
        this.effectsCtx.fill();
        this.effectsCtx.restore();
    }
    
    // Utility methods
    getColor(type) {
        if (typeof type === 'string') {
            return TETROMINOS[type]?.color || '#ffffff';
        }
        
        // For numeric types (from board)
        const types = ['', 'I', 'O', 'T', 'S', 'Z', 'J', 'L', 'garbage'];
        return TETROMINOS[types[type]]?.color || '#808080';
    }
    
    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    }
    
    darkenColor(color, percent) {
        return this.lightenColor(color, -percent);
    }
    
    shouldDrawGrid() {
        // Check settings for grid preference
        return document.getElementById('grid-lines')?.checked || false;
    }
    
    handleResize() {
        // Recalculate cell size based on window size
        const maxWidth = window.innerWidth * 0.4;
        const maxHeight = window.innerHeight * 0.8;
        
        const widthBasedSize = Math.floor(maxWidth / this.boardWidth);
        const heightBasedSize = Math.floor(maxHeight / this.boardHeight);
        
        this.cellSize = Math.min(widthBasedSize, heightBasedSize, GAME_CONFIG.CELL_SIZE);
        
        this.init();
    }
}