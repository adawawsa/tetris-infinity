import { Game } from '../Game.js';
import { TetrisAI } from '../../ai/TetrisAI.js';

export class BattleMode extends Game {
    constructor(app, opponent = 'ai') {
        super(app, 'battle');
        
        this.opponent = opponent;
        this.isMultiplayer = opponent !== 'ai';
        
        // Battle specific properties
        this.garbageQueue = [];
        this.pendingGarbage = 0;
        this.attackMeter = 0;
        this.defenseMode = false;
        
        // Opponent state
        this.opponentBoard = null;
        this.opponentScore = 0;
        this.opponentLines = 0;
        
        // AI opponent
        if (!this.isMultiplayer) {
            this.ai = new TetrisAI('medium');
            this.aiGame = null; // Will be created after init
        }
        
        // Battle stats
        this.garbageSent = 0;
        this.garbageReceived = 0;
        this.attacksSent = 0;
        this.attacksBlocked = 0;
        
        this.setupBattleUI();
    }
    
    init() {
        super.init();
        
        if (!this.isMultiplayer) {
            // Create AI opponent game instance
            this.initAIOpponent();
        } else {
            // Connect to multiplayer opponent
            this.connectToOpponent();
        }
        
        // Show battle UI
        document.getElementById('multiplayer-container').classList.add('active');
    }
    
    initAIOpponent() {
        // Create a simulated game instance for AI
        this.aiGame = {
            board: this.createEmptyBoard(),
            currentPiece: null,
            nextPieces: [],
            score: 0,
            lines: 0,
            level: 1,
            gameLogic: this.gameLogic,
            
            // Simulated methods for AI
            moveLeft: () => this.simulateAIMove('left'),
            moveRight: () => this.simulateAIMove('right'),
            rotate: (dir) => this.simulateAIMove('rotate', dir),
            hardDrop: () => this.simulateAIMove('drop')
        };
        
        // Initialize AI game
        this.aiGame.nextPieces = this.gameLogic.generateBag();
        this.spawnAIPiece();
        
        // Create opponent display
        this.createOpponentDisplay();
    }
    
    createEmptyBoard() {
        return {
            width: 10,
            height: 20,
            grid: Array(20).fill(null).map(() => Array(10).fill(0)),
            getCell: function(x, y) {
                if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 1;
                return this.grid[y][x];
            }
        };
    }
    
    createOpponentDisplay() {
        const container = document.getElementById('multiplayer-container');
        
        const opponentDiv = document.createElement('div');
        opponentDiv.className = 'opponent-board';
        opponentDiv.innerHTML = `
            <canvas id="opponent-canvas" width="150" height="300"></canvas>
            <div class="opponent-info">
                <span class="opponent-name">CPU (${this.ai.difficulty})</span>
                <span class="opponent-score">Score: <span id="opponent-score">0</span></span>
                <span class="opponent-lines">Lines: <span id="opponent-lines">0</span></span>
            </div>
        `;
        
        container.appendChild(opponentDiv);
        
        // Initialize opponent canvas
        this.opponentCanvas = document.getElementById('opponent-canvas');
        this.opponentCtx = this.opponentCanvas.getContext('2d');
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        if (!this.isPaused && !this.gameOver) {
            // Update garbage queue
            this.updateGarbageQueue(deltaTime);
            
            // Update AI opponent
            if (!this.isMultiplayer && this.aiGame) {
                this.updateAIOpponent(deltaTime);
            }
            
            // Check win conditions
            this.checkBattleStatus();
        }
    }
    
    updateAIOpponent(deltaTime) {
        // AI thinking and moves
        this.ai.update(deltaTime, this.aiGame);
        
        // Simulate gravity for AI piece
        if (this.aiGame.currentPiece) {
            this.aiGame.dropTimer = (this.aiGame.dropTimer || 0) + deltaTime;
            
            if (this.aiGame.dropTimer >= this.getAIDropSpeed()) {
                this.aiGame.dropTimer = 0;
                this.moveAIPieceDown();
            }
        }
        
        // Render opponent board
        this.renderOpponentBoard();
    }
    
    getAIDropSpeed() {
        // AI drop speed based on level
        const baseSpeed = 800;
        const level = this.aiGame.level;
        return Math.max(baseSpeed * Math.pow(0.85, level - 1), 100);
    }
    
    simulateAIMove(type, param) {
        if (!this.aiGame.currentPiece) return;
        
        switch (type) {
            case 'left':
                this.aiGame.currentPiece.x--;
                if (!this.isValidAIPosition()) {
                    this.aiGame.currentPiece.x++;
                }
                break;
                
            case 'right':
                this.aiGame.currentPiece.x++;
                if (!this.isValidAIPosition()) {
                    this.aiGame.currentPiece.x--;
                }
                break;
                
            case 'rotate':
                const oldRotation = this.aiGame.currentPiece.rotation;
                this.aiGame.currentPiece.rotate(param || 1);
                if (!this.isValidAIPosition()) {
                    this.aiGame.currentPiece.rotation = oldRotation;
                }
                break;
                
            case 'drop':
                while (this.moveAIPieceDown()) {
                    this.aiGame.score += 2;
                }
                this.lockAIPiece();
                break;
        }
    }
    
    moveAIPieceDown() {
        if (!this.aiGame.currentPiece) return false;
        
        this.aiGame.currentPiece.y++;
        if (!this.isValidAIPosition()) {
            this.aiGame.currentPiece.y--;
            return false;
        }
        
        return true;
    }
    
    isValidAIPosition() {
        const piece = this.aiGame.currentPiece;
        const shape = piece.getShape();
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const boardX = piece.x + col;
                    const boardY = piece.y + row;
                    
                    if (boardX < 0 || boardX >= 10 || boardY >= 20) {
                        return false;
                    }
                    
                    if (boardY >= 0 && this.aiGame.board.grid[boardY][boardX] > 0) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
    
    lockAIPiece() {
        if (!this.aiGame.currentPiece) return;
        
        // Add piece to board
        const shape = this.aiGame.currentPiece.getShape();
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const boardX = this.aiGame.currentPiece.x + col;
                    const boardY = this.aiGame.currentPiece.y + row;
                    
                    if (boardY >= 0 && boardY < 20 && boardX >= 0 && boardX < 10) {
                        this.aiGame.board.grid[boardY][boardX] = this.aiGame.currentPiece.typeId || 1;
                    }
                }
            }
        }
        
        // Check for line clears
        const clearedLines = this.checkAILineClears();
        if (clearedLines > 0) {
            this.handleAILineClears(clearedLines);
        }
        
        // Spawn new piece
        this.spawnAIPiece();
        
        // Check game over
        if (!this.isValidAIPosition()) {
            this.onOpponentGameOver();
        }
    }
    
    checkAILineClears() {
        let linesCleared = 0;
        
        for (let y = 19; y >= 0; y--) {
            let full = true;
            for (let x = 0; x < 10; x++) {
                if (this.aiGame.board.grid[y][x] === 0) {
                    full = false;
                    break;
                }
            }
            
            if (full) {
                this.aiGame.board.grid.splice(y, 1);
                this.aiGame.board.grid.unshift(Array(10).fill(0));
                linesCleared++;
                y++; // Check same line again
            }
        }
        
        return linesCleared;
    }
    
    handleAILineClears(numLines) {
        this.aiGame.lines += numLines;
        this.aiGame.score += numLines * 100 * this.aiGame.level;
        this.aiGame.level = Math.floor(this.aiGame.lines / 10) + 1;
        
        // Send garbage to player
        const garbageLines = this.scoreSystem.calculateGarbageLines(numLines, 0, false, false);
        if (garbageLines > 0) {
            this.receiveGarbage(garbageLines);
        }
        
        // Update UI
        document.getElementById('opponent-score').textContent = this.aiGame.score;
        document.getElementById('opponent-lines').textContent = this.aiGame.lines;
    }
    
    spawnAIPiece() {
        if (this.aiGame.nextPieces.length < 7) {
            this.aiGame.nextPieces.push(...this.gameLogic.generateBag());
        }
        
        this.aiGame.currentPiece = this.aiGame.nextPieces.shift();
        this.aiGame.currentPiece.x = 3;
        this.aiGame.currentPiece.y = 0;
    }
    
    renderOpponentBoard() {
        if (!this.opponentCtx) return;
        
        const ctx = this.opponentCtx;
        const cellSize = 15;
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 150, 300);
        
        // Draw board
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 10; x++) {
                const value = this.aiGame.board.grid[y][x];
                if (value > 0) {
                    ctx.fillStyle = this.getColorForType(value);
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
                }
            }
        }
        
        // Draw current piece
        if (this.aiGame.currentPiece) {
            const shape = this.aiGame.currentPiece.getShape();
            ctx.fillStyle = this.getColorForType(this.aiGame.currentPiece.type);
            
            for (let row = 0; row < shape.length; row++) {
                for (let col = 0; col < shape[row].length; col++) {
                    if (shape[row][col]) {
                        const x = (this.aiGame.currentPiece.x + col) * cellSize;
                        const y = (this.aiGame.currentPiece.y + row) * cellSize;
                        ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
                    }
                }
            }
        }
        
        // Draw garbage indicator
        if (this.pendingGarbage > 0) {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(0, 290, 150, 10);
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`+${this.pendingGarbage}`, 75, 299);
        }
    }
    
    getColorForType(type) {
        const colors = {
            1: '#00ffff', // I
            2: '#ffff00', // O
            3: '#ff00ff', // T
            4: '#00ff00', // S
            5: '#ff0000', // Z
            6: '#0000ff', // J
            7: '#ff9900', // L
            8: '#808080'  // Garbage
        };
        return colors[type] || '#ffffff';
    }
    
    handleLineClears(lines) {
        super.handleLineClears(lines);
        
        // Calculate and send garbage
        const garbage = this.scoreSystem.calculateGarbageLines(
            lines.length,
            this.combo,
            false, // T-spin
            this.gameLogic.checkPerfectClear(this.board)
        );
        
        if (garbage > 0) {
            this.sendGarbage(garbage);
        }
    }
    
    sendGarbage(lines) {
        this.garbageSent += lines;
        this.attacksSent++;
        
        if (!this.isMultiplayer) {
            // Send to AI opponent
            this.aiGame.pendingGarbage = (this.aiGame.pendingGarbage || 0) + lines;
            // AI receives garbage immediately
            this.addGarbageToAI(lines);
        } else {
            // Send to network opponent
            this.app.networkManager.sendGarbage(lines);
        }
        
        // Visual feedback
        this.showAttackEffect(lines);
    }
    
    receiveGarbage(lines) {
        // Check if shielded
        if (this.hasActiveShield()) {
            this.attacksBlocked++;
            this.showBlockEffect();
            return;
        }
        
        this.garbageReceived += lines;
        this.pendingGarbage += lines;
        
        // Add to queue with delay
        this.garbageQueue.push({
            lines: lines,
            delay: 1000 // 1 second delay
        });
    }
    
    updateGarbageQueue(deltaTime) {
        this.garbageQueue = this.garbageQueue.filter(garbage => {
            garbage.delay -= deltaTime;
            
            if (garbage.delay <= 0) {
                this.board.addGarbageLines(garbage.lines);
                this.pendingGarbage -= garbage.lines;
                return false;
            }
            
            return true;
        });
    }
    
    addGarbageToAI(lines) {
        // Add garbage lines to AI board
        for (let i = 0; i < lines; i++) {
            this.aiGame.board.grid.shift();
            const garbageLine = Array(10).fill(8);
            const gap = Math.floor(Math.random() * 10);
            garbageLine[gap] = 0;
            this.aiGame.board.grid.push(garbageLine);
        }
    }
    
    hasActiveShield() {
        // Check if player has active shield skill
        return false; // Would check skill system in full implementation
    }
    
    showAttackEffect(lines) {
        const effect = document.createElement('div');
        effect.className = 'attack-effect';
        effect.innerHTML = `<span>ATTACK! -${lines}</span>`;
        document.getElementById('special-effects').appendChild(effect);
        
        setTimeout(() => {
            effect.remove();
        }, 1000);
    }
    
    showBlockEffect() {
        const effect = document.createElement('div');
        effect.className = 'block-effect';
        effect.innerHTML = '<span>BLOCKED!</span>';
        document.getElementById('special-effects').appendChild(effect);
        
        setTimeout(() => {
            effect.remove();
        }, 1000);
    }
    
    checkBattleStatus() {
        // Check if either player has topped out
        if (this.gameOver) {
            this.onPlayerLose();
        }
    }
    
    onOpponentGameOver() {
        // Player wins!
        this.onPlayerWin();
    }
    
    onPlayerWin() {
        this.gameOver = true;
        
        const winDiv = document.createElement('div');
        winDiv.className = 'battle-result win';
        winDiv.innerHTML = `
            <h2>VICTORY!</h2>
            <p>Garbage Sent: ${this.garbageSent}</p>
            <p>Attacks Blocked: ${this.attacksBlocked}</p>
        `;
        
        document.getElementById('special-effects').appendChild(winDiv);
        
        // Update stats
        this.app.statsManager.saveGameStats('battle', {
            ...this.getGameStats(),
            result: 'win',
            garbageSent: this.garbageSent,
            garbageReceived: this.garbageReceived
        });
    }
    
    onPlayerLose() {
        const loseDiv = document.createElement('div');
        loseDiv.className = 'battle-result lose';
        loseDiv.innerHTML = `
            <h2>DEFEAT</h2>
            <p>Garbage Sent: ${this.garbageSent}</p>
            <p>Garbage Received: ${this.garbageReceived}</p>
        `;
        
        document.getElementById('special-effects').appendChild(loseDiv);
    }
    
    getGameStats() {
        return {
            score: this.score,
            lines: this.lines,
            level: this.level,
            time: document.getElementById('time').textContent,
            maxCombo: this.maxCombo
        };
    }
    
    destroy() {
        super.destroy();
        
        // Clean up battle UI
        document.getElementById('multiplayer-container').classList.remove('active');
        document.getElementById('multiplayer-container').innerHTML = '';
        
        if (!this.isMultiplayer) {
            // Clean up AI
            this.ai = null;
            this.aiGame = null;
        }
    }
}