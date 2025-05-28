/**
 * GameRefactored - Refactored game class using event-driven architecture
 * Supports multiplayer, replay, and deterministic gameplay
 */
import { GameState } from '../core/GameState.js';
import { CommandQueue, MoveCommand, RotateCommand, HardDropCommand, HoldCommand, InputBuffer } from '../core/CommandSystem.js';
import { EventDispatcher, EventTypes, GameEvent, EventPriority } from '../core/EventSystem.js';
import { Board } from './Board.js';
import { Piece } from './Piece.js';
import { GameLogic } from './GameLogic.js';
import { ScoreSystem } from './ScoreSystem.js';
import { EffectsManager } from '../effects/EffectsManager.js';
import { GAME_CONFIG } from '../config/GameConfig.js';

export class GameRefactored {
    constructor(app, config = {}) {
        this.app = app;
        this.config = {
            mode: 'marathon',
            seed: Date.now(),
            playerId: 'local',
            isMultiplayer: false,
            ...config
        };
        
        // Core systems
        this.gameState = new GameState();
        this.eventDispatcher = new EventDispatcher();
        this.commandQueue = new CommandQueue();
        this.inputBuffer = new InputBuffer();
        
        // Game components
        this.board = new Board();
        this.gameLogic = new GameLogic(this);
        this.scoreSystem = new ScoreSystem(this);
        this.effectsManager = new EffectsManager(this.app);
        
        // Frame timing
        this.currentFrame = 0;
        this.frameTime = 1000 / 60; // 60 FPS
        this.accumulator = 0;
        this.lastTime = 0;
        
        // Animation
        this.animationId = null;
        
        // Setup event handlers
        this.setupEventHandlers();
        
        // Initialize state
        this.initializeState();
    }
    
    initializeState() {
        this.gameState.initialize({
            width: GAME_CONFIG.BOARD_WIDTH,
            height: GAME_CONFIG.BOARD_HEIGHT,
            seed: this.config.seed,
            playerId: this.config.playerId
        });
        
        // Initialize board from state
        this.board.grid = this.gameState.board;
        
        // Generate initial pieces
        this.generateNextPieces();
        this.spawnNewPiece();
        
        // Emit game start event
        this.eventDispatcher.emit(new GameEvent(EventTypes.GAME_START, {
            mode: this.config.mode,
            seed: this.config.seed
        }));
    }
    
    setupEventHandlers() {
        // Game state events
        this.eventDispatcher.on(EventTypes.PIECE_SPAWN, this.onPieceSpawn.bind(this));
        this.eventDispatcher.on(EventTypes.PIECE_LOCK, this.onPieceLock.bind(this));
        this.eventDispatcher.on(EventTypes.LINES_CLEAR, this.onLinesClear.bind(this));
        this.eventDispatcher.on(EventTypes.GAME_OVER, this.onGameOver.bind(this));
        
        // Input events
        this.eventDispatcher.on(EventTypes.INPUT_MOVE, this.onInputMove.bind(this));
        this.eventDispatcher.on(EventTypes.INPUT_ROTATE, this.onInputRotate.bind(this));
        this.eventDispatcher.on(EventTypes.INPUT_DROP, this.onInputDrop.bind(this));
        this.eventDispatcher.on(EventTypes.INPUT_HOLD, this.onInputHold.bind(this));
        
        // Multiplayer events
        if (this.config.isMultiplayer) {
            this.eventDispatcher.on(EventTypes.GARBAGE_RECEIVE, this.onGarbageReceive.bind(this));
        }
        
        // Setup input handlers
        this.setupInput();
    }
    
    setupInput() {
        const inputManager = this.app.inputManager;
        
        // Convert input to commands
        inputManager.on('moveLeft', () => this.queueCommand(new MoveCommand({ dx: -1, dy: 0 })));
        inputManager.on('moveRight', () => this.queueCommand(new MoveCommand({ dx: 1, dy: 0 })));
        inputManager.on('softDrop', () => this.queueCommand(new MoveCommand({ dx: 0, dy: 1 })));
        inputManager.on('hardDrop', () => this.queueCommand(new HardDropCommand()));
        
        inputManager.on('rotateCW', () => this.queueCommand(new RotateCommand({ direction: 1 })));
        inputManager.on('rotateCCW', () => this.queueCommand(new RotateCommand({ direction: -1 })));
        inputManager.on('rotate180', () => this.queueCommand(new RotateCommand({ direction: 2 })));
        
        inputManager.on('hold', () => this.queueCommand(new HoldCommand()));
        
        inputManager.on('pause', () => this.togglePause());
    }
    
    queueCommand(command) {
        // Assign frame to command
        command.frame = this.currentFrame + 1; // Execute on next frame
        command.playerId = this.config.playerId;
        
        // Add to queue
        this.commandQueue.add(command);
        
        // Emit input event for networking
        if (this.config.isMultiplayer) {
            this.eventDispatcher.emit(new GameEvent(
                EventTypes[`INPUT_${command.type.toUpperCase()}`],
                command.serialize(),
                { priority: EventPriority.HIGH }
            ));
        }
    }
    
    start() {
        this.gameState.gameStatus = 'playing';
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    gameLoop(currentTime = 0) {
        if (this.gameState.gameStatus === 'idle') return;
        
        const deltaTime = Math.min(currentTime - this.lastTime, 100); // Cap at 100ms
        this.lastTime = currentTime;
        
        this.accumulator += deltaTime;
        
        // Fixed timestep with interpolation
        while (this.accumulator >= this.frameTime) {
            this.update();
            this.accumulator -= this.frameTime;
        }
        
        const interpolation = this.accumulator / this.frameTime;
        this.render(interpolation);
        
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update() {
        if (this.gameState.gameStatus !== 'playing') return;
        
        // Advance frame
        this.currentFrame++;
        this.gameState.advanceFrame();
        
        // Process commands
        this.commandQueue.processPending(this.gameState, this.currentFrame);
        
        // Update game logic
        this.updateGameLogic();
        
        // Validate state (anti-cheat)
        if (!this.gameState.validate()) {
            console.error('Invalid game state detected');
            this.eventDispatcher.emit(new GameEvent(EventTypes.GAME_OVER, {
                reason: 'invalid_state'
            }));
        }
    }
    
    updateGameLogic() {
        const piece = this.gameState.currentPiece;
        if (!piece) return;
        
        // Handle gravity
        if (this.currentFrame % this.getGravityFrames() === 0) {
            const moveDown = new MoveCommand({ dx: 0, dy: 1 });
            moveDown.frame = this.currentFrame;
            
            if (!moveDown.execute(this.gameState)) {
                // Piece can't move down, start lock delay
                this.startLockDelay();
            }
        }
        
        // Handle lock delay
        if (this.lockDelayFrames > 0) {
            this.lockDelayFrames--;
            if (this.lockDelayFrames === 0) {
                this.lockPiece();
            }
        }
    }
    
    getGravityFrames() {
        // Calculate frames between drops based on level
        const level = this.gameState.level;
        return Math.max(60 - (level - 1) * 5, 1); // 60 frames at level 1, decreasing by 5 per level
    }
    
    startLockDelay() {
        if (!this.lockDelayFrames) {
            this.lockDelayFrames = 30; // 0.5 seconds at 60 FPS
        }
    }
    
    lockPiece() {
        const piece = this.gameState.currentPiece;
        if (!piece) return;
        
        // Add piece to board
        this.placePieceOnBoard(piece);
        
        // Clear current piece
        this.gameState.currentPiece = null;
        
        // Check for line clears
        const clearedLines = this.checkLineClears();
        
        // Emit events
        this.eventDispatcher.emit(new GameEvent(EventTypes.PIECE_LOCK, {
            piece: piece,
            position: { x: piece.x, y: piece.y }
        }));
        
        if (clearedLines.length > 0) {
            this.eventDispatcher.emit(new GameEvent(EventTypes.LINES_CLEAR, {
                lines: clearedLines,
                count: clearedLines.length
            }));
        }
        
        // Spawn next piece
        this.spawnNewPiece();
    }
    
    placePieceOnBoard(piece) {
        const shape = piece.getShape();
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const boardY = piece.y + y;
                    const boardX = piece.x + x;
                    if (boardY >= 0 && boardY < this.gameState.board.length &&
                        boardX >= 0 && boardX < this.gameState.board[0].length) {
                        this.gameState.board[boardY][boardX] = piece.type + 1;
                    }
                }
            }
        }
    }
    
    checkLineClears() {
        const clearedLines = [];
        
        for (let y = this.gameState.board.length - 1; y >= 0; y--) {
            if (this.gameState.board[y].every(cell => cell > 0)) {
                clearedLines.push(y);
            }
        }
        
        // Remove cleared lines
        for (let line of clearedLines) {
            this.gameState.board.splice(line, 1);
            this.gameState.board.unshift(new Array(GAME_CONFIG.BOARD_WIDTH).fill(0));
        }
        
        return clearedLines;
    }
    
    spawnNewPiece() {
        if (this.gameState.nextPieces.length < 7) {
            this.generateNextPieces();
        }
        
        const nextType = this.gameState.nextPieces.shift();
        const piece = new Piece(nextType);
        piece.x = Math.floor((GAME_CONFIG.BOARD_WIDTH - piece.shape[0].length) / 2);
        piece.y = 0;
        
        this.gameState.currentPiece = piece;
        this.lockDelayFrames = 0;
        
        // Check if valid position
        if (!this.isValidPosition(piece)) {
            this.eventDispatcher.emit(new GameEvent(EventTypes.GAME_OVER, {
                reason: 'blocked_spawn'
            }));
        }
        
        this.eventDispatcher.emit(new GameEvent(EventTypes.PIECE_SPAWN, {
            type: piece.type,
            position: { x: piece.x, y: piece.y }
        }));
    }
    
    generateNextPieces() {
        // Use seeded random for deterministic piece generation
        const pieces = this.gameLogic.generateBag(this.gameState.seed + this.gameState.frame);
        this.gameState.nextPieces.push(...pieces.map(p => p.type));
    }
    
    isValidPosition(piece, board = this.gameState.board) {
        const shape = piece.getShape();
        
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const boardY = piece.y + y;
                    const boardX = piece.x + x;
                    
                    // Check bounds
                    if (boardX < 0 || boardX >= GAME_CONFIG.BOARD_WIDTH ||
                        boardY >= GAME_CONFIG.BOARD_HEIGHT) {
                        return false;
                    }
                    
                    // Check collision
                    if (boardY >= 0 && board[boardY][boardX] > 0) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
    
    render(interpolation) {
        const renderer = this.app.renderer;
        
        // Clear canvases
        renderer.clear();
        
        // Draw board from state
        renderer.drawBoard({ grid: this.gameState.board });
        
        // Draw current piece with interpolation
        if (this.gameState.currentPiece) {
            const piece = this.gameState.currentPiece;
            const interpolatedY = piece.y + (interpolation * (1 / this.getGravityFrames()));
            
            // Draw ghost piece
            if (this.app.settingsManager.settings.graphics.ghostPiece) {
                const ghostY = this.getGhostPosition(piece);
                renderer.drawGhostPiece(piece, ghostY);
            }
            
            // Draw piece
            const renderPiece = { ...piece, y: interpolatedY };
            renderer.drawPiece(renderPiece);
        }
        
        // Draw UI elements
        renderer.drawHeldPiece(this.gameState.heldPiece);
        renderer.drawNextPieces(this.gameState.nextPieces.map(type => new Piece(type)));
        
        // Update UI
        this.updateUI();
        
        // Render effects
        this.effectsManager.render();
    }
    
    getGhostPosition(piece) {
        const testPiece = { ...piece };
        
        while (this.isValidPosition({ ...testPiece, y: testPiece.y + 1 })) {
            testPiece.y++;
        }
        
        return testPiece.y;
    }
    
    // Event handlers
    onPieceSpawn(event) {
        this.gameState.addEvent('pieceSpawn', event.data);
    }
    
    onPieceLock(event) {
        this.gameState.addEvent('pieceLock', event.data);
        this.app.audioManager.play('lock');
    }
    
    onLinesClear(event) {
        const count = event.data.count;
        
        // Update stats
        this.gameState.lines += count;
        this.gameState.combo++;
        
        // Calculate score
        const score = this.scoreSystem.calculateScore(count, this.gameState.level, this.gameState.combo);
        this.gameState.score += score;
        
        // Check level up
        const newLevel = Math.floor(this.gameState.lines / 10) + 1;
        if (newLevel > this.gameState.level) {
            this.gameState.level = newLevel;
            this.eventDispatcher.emit(new GameEvent(EventTypes.LEVEL_UP, {
                level: newLevel
            }));
        }
        
        // Effects
        this.effectsManager.playLineClear(event.data.lines);
        this.app.audioManager.play(count === 4 ? 'tetris' : 'lineClear');
        
        this.gameState.addEvent('linesClear', event.data);
    }
    
    onGameOver(event) {
        this.gameState.gameStatus = 'gameover';
        cancelAnimationFrame(this.animationId);
        
        const stats = {
            score: this.gameState.score,
            lines: this.gameState.lines,
            level: this.gameState.level,
            mode: this.config.mode,
            duration: this.currentFrame * this.frameTime
        };
        
        this.app.showGameOver(stats);
    }
    
    onInputMove(event) {
        // Handle network input
        if (event.source === 'network') {
            const command = MoveCommand.deserialize(event.data);
            this.commandQueue.add(command);
        }
    }
    
    onInputRotate(event) {
        if (event.source === 'network') {
            const command = RotateCommand.deserialize(event.data);
            this.commandQueue.add(command);
        }
    }
    
    onInputDrop(event) {
        if (event.source === 'network') {
            const command = HardDropCommand.deserialize(event.data);
            this.commandQueue.add(command);
        }
    }
    
    onInputHold(event) {
        if (event.source === 'network') {
            const command = HoldCommand.deserialize(event.data);
            this.commandQueue.add(command);
        }
    }
    
    onGarbageReceive(event) {
        const lines = event.data.lines;
        this.gameState.garbage.push(...lines);
        
        // Apply garbage on next frame
        // Implementation would add garbage lines to bottom of board
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.gameState.score.toLocaleString();
        document.getElementById('lines').textContent = this.gameState.lines;
        document.getElementById('level').textContent = this.gameState.level;
        
        const elapsed = (this.currentFrame * this.frameTime) / 1000;
        const minutes = Math.floor(elapsed / 60);
        const seconds = Math.floor(elapsed % 60);
        document.getElementById('time').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    togglePause() {
        if (this.gameState.gameStatus === 'playing') {
            this.gameState.gameStatus = 'paused';
            this.eventDispatcher.emit(new GameEvent(EventTypes.GAME_PAUSE));
        } else if (this.gameState.gameStatus === 'paused') {
            this.gameState.gameStatus = 'playing';
            this.lastTime = performance.now();
            this.eventDispatcher.emit(new GameEvent(EventTypes.GAME_RESUME));
        }
    }
    
    // Snapshot methods for rollback netcode
    createSnapshot() {
        return this.gameState.createSnapshot();
    }
    
    restoreSnapshot(snapshot) {
        this.gameState.restoreSnapshot(snapshot);
        this.board.grid = this.gameState.board;
    }
    
    // Network synchronization
    getStateDelta(previousFrame) {
        return this.gameState.generateDelta(previousFrame);
    }
    
    applyStateDelta(delta) {
        return this.gameState.applyDelta(delta);
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.eventDispatcher.clear();
        this.commandQueue.clear();
        this.app.inputManager.removeAllListeners();
    }
}

export default GameRefactored;