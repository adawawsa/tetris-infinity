import { Board } from './Board.js';
import { Piece } from './Piece.js';
import { GameLogic } from './GameLogic.js';
import { ScoreSystem } from './ScoreSystem.js';
import { EffectsManager } from '../effects/EffectsManager.js';
import { GAME_CONFIG } from '../config/GameConfig.js';

export class Game {
    constructor(app, mode) {
        this.app = app;
        this.mode = mode;
        
        // Game components
        this.board = new Board();
        this.currentPiece = null;
        this.nextPieces = [];
        this.heldPiece = null;
        this.canHold = true;
        
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.gameOver = false;
        
        // Stats
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.combo = 0;
        this.maxCombo = 0;
        this.startTime = null;
        this.elapsedTime = 0;
        
        // Timing
        this.dropTimer = 0;
        this.lockDelay = 0;
        this.isLocking = false;
        this.lockMoves = 0;
        
        // Item-related properties
        this.dropSpeedMultiplier = 1;
        this.previewCount = 5;
        this.ghostOpacity = 0.3;
        
        // Game systems
        this.gameLogic = new GameLogic(this);
        this.scoreSystem = new ScoreSystem(this);
        this.effectsManager = new EffectsManager(this.app);
        
        // Animation
        this.lastTime = 0;
        this.animationId = null;
        
        // Input handling
        this.keys = {};
        this.dasTimer = 0;
        this.arrTimer = 0;
        this.currentDirection = null;
    }
    
    init() {
        // Initialize board
        this.board.init();
        
        // Generate initial pieces
        this.generateNextPieces();
        this.spawnNewPiece();
        
        // Setup input handlers
        this.setupInput();
        
        // Initialize UI
        this.updateUI();
        
        // Start game
        this.start();
    }
    
    start() {
        this.isRunning = true;
        this.startTime = Date.now();
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    gameLoop(currentTime = 0) {
        if (!this.isRunning) return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        if (!this.isPaused && !this.gameOver) {
            this.update(deltaTime);
        }
        
        this.render();
        
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // Update elapsed time
        if (!this.isPaused) {
            this.elapsedTime = Date.now() - this.startTime;
            this.updateTimer();
        }
        
        // Handle continuous input
        this.handleContinuousInput(deltaTime);
        
        // Update current piece
        if (this.currentPiece) {
            // Handle gravity
            this.dropTimer += deltaTime;
            const dropSpeed = this.getDropSpeed();
            
            if (this.dropTimer >= dropSpeed) {
                this.dropTimer = 0;
                this.moveDown();
            }
            
            // Handle lock delay
            if (this.isLocking) {
                this.lockDelay += deltaTime;
                if (this.lockDelay >= GAME_CONFIG.LOCK_DELAY || this.lockMoves >= GAME_CONFIG.MAX_LOCK_MOVES) {
                    this.lockPiece();
                }
            }
        }
        
        // Update effects
        this.effectsManager.update(deltaTime);
    }
    
    render() {
        const renderer = this.app.renderer;
        
        // Clear canvases
        renderer.clear();
        
        // Draw board
        renderer.drawBoard(this.board);
        
        // Draw ghost piece
        if (this.currentPiece && this.app.settingsManager.settings.graphics.ghostPiece) {
            const ghostY = this.getGhostPosition();
            renderer.drawGhostPiece(this.currentPiece, ghostY);
        }
        
        // Draw current piece
        if (this.currentPiece) {
            renderer.drawPiece(this.currentPiece);
        }
        
        // Draw held piece
        if (this.heldPiece) {
            renderer.drawHeldPiece(this.heldPiece, !this.canHold);
        }
        
        // Draw next pieces
        renderer.drawNextPieces(this.nextPieces);
        
        // Render effects
        this.effectsManager.render();
    }
    
    setupInput() {
        const inputManager = this.app.inputManager;
        
        // Movement
        inputManager.on('moveLeft', () => this.moveLeft());
        inputManager.on('moveRight', () => this.moveRight());
        inputManager.on('softDrop', () => this.startSoftDrop());
        inputManager.on('hardDrop', () => this.hardDrop());
        
        // Rotation
        inputManager.on('rotateCW', () => this.rotate(1));
        inputManager.on('rotateCCW', () => this.rotate(-1));
        inputManager.on('rotate180', () => this.rotate(2));
        
        // Hold
        inputManager.on('hold', () => this.holdPiece());
        
        // Pause
        inputManager.on('pause', () => this.togglePause());
        
        // Track key states for DAS/ARR
        inputManager.on('keydown', (key) => {
            this.keys[key] = true;
            if (key === 'moveLeft' || key === 'moveRight') {
                this.currentDirection = key;
                this.dasTimer = 0;
                this.arrTimer = 0;
            }
        });
        
        inputManager.on('keyup', (key) => {
            this.keys[key] = false;
            if (key === this.currentDirection) {
                this.currentDirection = null;
                this.dasTimer = 0;
                this.arrTimer = 0;
            }
        });
    }
    
    handleContinuousInput(deltaTime) {
        if (!this.currentDirection || !this.keys[this.currentDirection]) return;
        
        const settings = this.app.settingsManager.settings.gameplay;
        
        this.dasTimer += deltaTime;
        
        if (this.dasTimer >= settings.das) {
            this.arrTimer += deltaTime;
            
            if (this.arrTimer >= settings.arr || settings.arr === 0) {
                this.arrTimer = 0;
                
                if (this.currentDirection === 'moveLeft') {
                    this.moveLeft();
                } else if (this.currentDirection === 'moveRight') {
                    this.moveRight();
                }
            }
        }
    }
    
    moveLeft() {
        if (!this.currentPiece || this.gameOver) return;
        
        this.currentPiece.x--;
        if (!this.isValidPosition()) {
            this.currentPiece.x++;
        } else {
            this.handleLockReset();
            this.app.audioManager.play('move');
        }
    }
    
    moveRight() {
        if (!this.currentPiece || this.gameOver) return;
        
        this.currentPiece.x++;
        if (!this.isValidPosition()) {
            this.currentPiece.x--;
        } else {
            this.handleLockReset();
            this.app.audioManager.play('move');
        }
    }
    
    moveDown() {
        if (!this.currentPiece || this.gameOver) return;
        
        this.currentPiece.y++;
        if (!this.isValidPosition()) {
            this.currentPiece.y--;
            this.startLocking();
            return false;
        } else {
            this.isLocking = false;
            this.lockDelay = 0;
            return true;
        }
    }
    
    startSoftDrop() {
        if (!this.currentPiece || this.gameOver) return;
        
        while (this.moveDown()) {
            this.score += 1;
        }
    }
    
    hardDrop() {
        if (!this.currentPiece || this.gameOver) return;
        
        let dropDistance = 0;
        while (this.moveDown()) {
            dropDistance++;
        }
        
        this.score += dropDistance * 2;
        this.lockPiece();
        this.app.audioManager.play('hardDrop');
    }
    
    rotate(direction) {
        if (!this.currentPiece || this.gameOver) return;
        
        const originalRotation = this.currentPiece.rotation;
        this.currentPiece.rotate(direction);
        
        // Try basic rotation
        if (this.isValidPosition()) {
            this.handleLockReset();
            this.app.audioManager.play('rotate');
            return;
        }
        
        // Try wall kicks
        const kicks = this.gameLogic.getWallKicks(this.currentPiece.type, originalRotation, this.currentPiece.rotation);
        
        for (const [kickX, kickY] of kicks) {
            this.currentPiece.x += kickX;
            this.currentPiece.y += kickY;
            
            if (this.isValidPosition()) {
                this.handleLockReset();
                this.app.audioManager.play('rotate');
                return;
            }
            
            this.currentPiece.x -= kickX;
            this.currentPiece.y -= kickY;
        }
        
        // Rotation failed, revert
        this.currentPiece.rotation = originalRotation;
    }
    
    holdPiece() {
        if (!this.currentPiece || !this.canHold || this.gameOver) return;
        
        const temp = this.currentPiece;
        
        if (this.heldPiece) {
            this.currentPiece = new Piece(this.heldPiece.type);
            this.currentPiece.x = Math.floor((GAME_CONFIG.BOARD_WIDTH - this.currentPiece.shape[0].length) / 2);
            this.currentPiece.y = 0;
        } else {
            this.spawnNewPiece();
        }
        
        this.heldPiece = new Piece(temp.type);
        this.canHold = false;
        
        this.app.audioManager.play('hold');
    }
    
    startLocking() {
        if (!this.isLocking) {
            this.isLocking = true;
            this.lockDelay = 0;
            this.lockMoves = 0;
        }
    }
    
    handleLockReset() {
        if (this.isLocking) {
            this.lockMoves++;
            if (this.lockMoves < GAME_CONFIG.MAX_LOCK_MOVES) {
                this.lockDelay = 0;
            }
        }
    }
    
    lockPiece() {
        if (!this.currentPiece) return;
        
        // Add piece to board
        this.board.addPiece(this.currentPiece);
        
        // Check for line clears
        const clearedLines = this.board.clearLines();
        if (clearedLines.length > 0) {
            this.handleLineClears(clearedLines);
        } else {
            this.combo = 0;
        }
        
        // Reset lock state
        this.isLocking = false;
        this.lockDelay = 0;
        this.lockMoves = 0;
        
        // Spawn new piece
        this.spawnNewPiece();
        this.canHold = true;
        
        // Check game over
        if (!this.isValidPosition()) {
            this.endGame();
        }
    }
    
    handleLineClears(lines) {
        const numLines = lines.length;
        
        // Update stats
        this.lines += numLines;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        
        // Calculate score
        const scoreGain = this.scoreSystem.calculateScore(numLines, this.level, this.combo);
        this.score += scoreGain;
        
        // Update level
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.effectsManager.playLevelUp(this.level);
        }
        
        // Play effects
        this.effectsManager.playLineClear(lines);
        
        // Play sounds
        if (numLines === 4) {
            this.app.audioManager.play('tetris');
        } else {
            this.app.audioManager.play('lineClear');
        }
        
        // Show combo
        if (this.combo > 1) {
            this.effectsManager.showCombo(this.combo);
        }
        
        this.updateUI();
    }
    
    spawnNewPiece() {
        if (this.nextPieces.length < 7) {
            this.generateNextPieces();
        }
        
        this.currentPiece = this.nextPieces.shift();
        this.currentPiece.x = Math.floor((GAME_CONFIG.BOARD_WIDTH - this.currentPiece.shape[0].length) / 2);
        this.currentPiece.y = 0;
        
        this.dropTimer = 0;
    }
    
    generateNextPieces() {
        const pieces = this.gameLogic.generateBag();
        this.nextPieces.push(...pieces);
    }
    
    getGhostPosition() {
        if (!this.currentPiece) return 0;
        
        const originalY = this.currentPiece.y;
        
        while (this.isValidPosition()) {
            this.currentPiece.y++;
        }
        
        const ghostY = this.currentPiece.y - 1;
        this.currentPiece.y = originalY;
        
        return ghostY;
    }
    
    isValidPosition() {
        return this.gameLogic.isValidPosition(this.currentPiece, this.board);
    }
    
    getDropSpeed() {
        // Calculate drop speed based on level
        const baseSpeed = 1000; // 1 second at level 1
        const speedMultiplier = Math.pow(0.8, this.level - 1);
        return Math.max(baseSpeed * speedMultiplier, 50); // Minimum 50ms
    }
    
    togglePause() {
        if (this.gameOver) return;
        
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.app.audioManager.play('pause');
            // Show pause overlay
            this.showPauseOverlay();
        } else {
            this.lastTime = performance.now();
            this.startTime = Date.now() - this.elapsedTime;
            this.hidePauseOverlay();
        }
    }
    
    showPauseOverlay() {
        let overlay = document.getElementById('pause-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'pause-overlay';
            overlay.className = 'overlay';
            overlay.innerHTML = '<div class="pause-message">PAUSED</div>';
            document.getElementById('game-screen').appendChild(overlay);
        }
        overlay.classList.add('active');
    }
    
    hidePauseOverlay() {
        const overlay = document.getElementById('pause-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score.toLocaleString();
        document.getElementById('lines').textContent = this.lines;
        document.getElementById('level').textContent = this.level;
    }
    
    updateTimer() {
        const minutes = Math.floor(this.elapsedTime / 60000);
        const seconds = Math.floor((this.elapsedTime % 60000) / 1000);
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('time').textContent = timeString;
    }
    
    endGame() {
        this.gameOver = true;
        this.isRunning = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        const stats = {
            score: this.score,
            lines: this.lines,
            level: this.level,
            time: document.getElementById('time').textContent,
            maxCombo: this.maxCombo,
            mode: this.mode
        };
        
        this.app.showGameOver(stats);
    }
    
    reset() {
        this.board.clear();
        this.currentPiece = null;
        this.nextPieces = [];
        this.heldPiece = null;
        this.canHold = true;
        
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.combo = 0;
        this.maxCombo = 0;
        this.startTime = null;
        this.elapsedTime = 0;
        
        this.dropTimer = 0;
        this.lockDelay = 0;
        this.isLocking = false;
        this.lockMoves = 0;
        
        this.gameOver = false;
        this.isPaused = false;
        
        this.generateNextPieces();
        this.spawnNewPiece();
        this.updateUI();
    }
    
    destroy() {
        this.isRunning = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.app.inputManager.removeAllListeners();
    }
}