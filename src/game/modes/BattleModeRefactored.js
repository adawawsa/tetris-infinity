/**
 * BattleModeRefactored - Battle mode with refactored architecture
 * Features AI opponent or multiplayer battles with garbage attacks
 */
import { GameModeRefactored } from './GameModeRefactored.js';
import { TetrisAI } from '../../ai/TetrisAI.js';
import { EventTypes, GameEvent, EventPriority } from '../../core/EventSystem.js';
import { GarbageCommand } from '../../core/CommandSystem.js';
import { GameState } from '../../core/GameState.js';

export class BattleModeRefactored extends GameModeRefactored {
    constructor(app, config = {}) {
        super(app, {
            ...config,
            mode: 'battle',
            modeSettings: {
                startLevel: 1,
                maxLevel: 20,
                linesPerLevel: 10,
                scoreMultiplier: 1,
                gravityMultiplier: 1,
                lockDelayFrames: 30,
                enableHold: true,
                enableGhost: true,
                nextPiecesCount: 5,
                garbageMultiplier: 1,
                ...config.modeSettings
            }
        });
        
        // Mode metadata
        this.modeName = 'battle';
        this.modeDescription = '1v1 battle with garbage attacks';
        
        // Battle configuration
        this.battleConfig = {
            opponent: config.opponent || 'ai',
            difficulty: config.difficulty || 'medium',
            isMultiplayer: config.opponent !== 'ai',
            garbageCapacity: 20,
            attackDelay: 500, // ms before garbage appears
            ...config.battleConfig
        };
        
        // Battle state
        this.battleState = {
            garbageQueue: [],
            pendingGarbage: 0,
            attackMeter: 0,
            defenseMode: false,
            garbageSent: 0,
            garbageReceived: 0,
            attacksSent: 0,
            attacksBlocked: 0,
            counterAttackMultiplier: 1
        };
        
        // Opponent state
        this.opponentState = null;
        this.opponentGameState = null;
        
        // AI opponent
        this.ai = null;
        this.aiUpdateInterval = null;
        
        // Add battle state to game state for synchronization
        this.gameState.battleState = this.battleState;
    }
    
    /**
     * Initialize battle mode
     */
    onModeInit() {
        // Setup battle event handlers
        this.setupBattleEventHandlers();
        
        // Initialize opponent
        if (this.battleConfig.isMultiplayer) {
            this.initMultiplayerOpponent();
        } else {
            this.initAIOpponent();
        }
        
        // Show battle UI
        this.showBattleUI();
        
        // Emit mode start event
        this.eventDispatcher.emit(new GameEvent(EventTypes.MODE_START, {
            mode: 'battle',
            opponent: this.battleConfig.opponent,
            difficulty: this.battleConfig.difficulty
        }));
    }
    
    setupBattleEventHandlers() {
        // Battle-specific events
        this.eventDispatcher.on(EventTypes.LINES_CLEAR, this.onBattleLinesClear.bind(this));
        this.eventDispatcher.on(EventTypes.GARBAGE_RECEIVE, this.onGarbageReceive.bind(this));
        this.eventDispatcher.on(EventTypes.PIECE_LOCK, this.onBattlePieceLock.bind(this));
        
        // Opponent events
        this.eventDispatcher.on('opponent:lines_clear', this.onOpponentLinesClear.bind(this));
        this.eventDispatcher.on('opponent:game_over', this.onOpponentGameOver.bind(this));
    }
    
    /**
     * Initialize AI opponent
     */
    initAIOpponent() {
        // Create AI instance
        this.ai = new TetrisAI(this.battleConfig.difficulty);
        
        // Create opponent game state
        this.opponentGameState = new GameState();
        this.opponentGameState.initialize({
            width: 10,
            height: 20,
            seed: this.config.seed + 1, // Different seed
            playerId: 'ai-opponent'
        });
        
        // Start AI update loop
        this.startAILoop();
    }
    
    /**
     * Initialize multiplayer opponent
     */
    initMultiplayerOpponent() {
        // Connect to network manager
        if (this.app.networkManager) {
            this.app.networkManager.on('opponent:state', this.onOpponentStateUpdate.bind(this));
            this.app.networkManager.on('opponent:garbage', this.onNetworkGarbage.bind(this));
        }
    }
    
    /**
     * Start AI update loop
     */
    startAILoop() {
        const aiUpdateRate = 100; // ms
        
        this.aiUpdateInterval = setInterval(() => {
            if (this.gameState.gameStatus === 'playing' && this.opponentGameState) {
                this.updateAI();
            }
        }, aiUpdateRate);
    }
    
    /**
     * Update AI opponent
     */
    updateAI() {
        if (!this.ai || !this.opponentGameState.currentPiece) return;
        
        // Get AI decision
        const decision = this.ai.getNextMove(
            this.opponentGameState.board,
            this.opponentGameState.currentPiece,
            this.opponentGameState.nextPieces[0]
        );
        
        // Execute AI moves
        if (decision) {
            this.executeAIDecision(decision);
        }
        
        // Update opponent gravity
        this.updateOpponentGravity();
        
        // Check for AI line clears
        this.checkAILineClears();
    }
    
    /**
     * Execute AI decision
     */
    executeAIDecision(decision) {
        const piece = this.opponentGameState.currentPiece;
        if (!piece) return;
        
        // Move to target column
        const dx = decision.x - piece.x;
        if (dx !== 0) {
            const moveDir = dx > 0 ? 1 : -1;
            if (this.isValidAIMove(piece.x + moveDir, piece.y)) {
                piece.x += moveDir;
            }
        }
        
        // Rotate to target rotation
        if (decision.rotation !== piece.rotation) {
            const newRotation = (piece.rotation + 1) % 4;
            if (this.isValidAIRotation(piece.x, piece.y, newRotation)) {
                piece.rotation = newRotation;
            }
        }
        
        // Drop if in position
        if (dx === 0 && decision.rotation === piece.rotation) {
            this.dropAIPiece();
        }
    }
    
    /**
     * Handle battle line clears
     */
    onBattleLinesClear(event) {
        const linesCleared = event.data.count;
        
        // Calculate garbage to send
        let garbageLines = 0;
        switch (linesCleared) {
            case 1: garbageLines = 0; break;
            case 2: garbageLines = 1; break;
            case 3: garbageLines = 2; break;
            case 4: garbageLines = 4; break; // Tetris
            default: garbageLines = 4 + (linesCleared - 4);
        }
        
        // Apply multipliers
        garbageLines = Math.floor(garbageLines * this.modeSettings.garbageMultiplier);
        
        // T-spin bonuses
        if (event.data.tSpin) {
            garbageLines += 2;
        }
        
        // Perfect clear bonus
        if (event.data.perfectClear) {
            garbageLines += 6;
        }
        
        // Counter attack bonus
        if (this.battleState.defenseMode) {
            garbageLines = Math.floor(garbageLines * this.battleState.counterAttackMultiplier);
            this.battleState.defenseMode = false;
        }
        
        // Send garbage
        if (garbageLines > 0) {
            this.sendGarbage(garbageLines);
        }
        
        // Update attack meter
        this.battleState.attackMeter += linesCleared * 10;
    }
    
    /**
     * Send garbage to opponent
     */
    sendGarbage(lines) {
        this.battleState.garbageSent += lines;
        this.battleState.attacksSent++;
        
        // Emit garbage send event
        this.eventDispatcher.emit(new GameEvent(EventTypes.GARBAGE_SEND, {
            lines: lines,
            target: this.battleConfig.opponent
        }, { priority: EventPriority.HIGH }));
        
        // Send to opponent
        if (this.battleConfig.isMultiplayer) {
            // Network send
            if (this.app.networkManager) {
                this.app.networkManager.sendGarbage(lines);
            }
        } else {
            // Send to AI
            setTimeout(() => {
                this.receiveAIGarbage(lines);
            }, this.battleConfig.attackDelay);
        }
        
        // Visual feedback
        this.effectsManager.playAttackEffect(lines);
        this.app.audioManager.play('attack');
    }
    
    /**
     * Handle garbage receive
     */
    onGarbageReceive(event) {
        const lines = event.data.lines;
        this.battleState.garbageReceived += lines;
        this.battleState.pendingGarbage += lines;
        
        // Add to queue with delay
        setTimeout(() => {
            this.applyGarbage(lines);
        }, this.battleConfig.attackDelay);
        
        // Enter defense mode
        this.battleState.defenseMode = true;
        this.battleState.counterAttackMultiplier = 1.5;
        
        // Visual warning
        this.effectsManager.playWarningEffect(lines);
        this.app.audioManager.play('warning');
    }
    
    /**
     * Apply garbage lines to board
     */
    applyGarbage(lines) {
        if (this.battleState.pendingGarbage <= 0) return;
        
        const garbageToAdd = Math.min(lines, this.battleState.pendingGarbage);
        this.battleState.pendingGarbage -= garbageToAdd;
        
        // Shift board up
        for (let i = 0; i < garbageToAdd; i++) {
            // Remove top row
            this.gameState.board.shift();
            
            // Add garbage row at bottom
            const garbageRow = new Array(10).fill(8); // Gray blocks
            const hole = Math.floor(Math.random() * 10);
            garbageRow[hole] = 0; // Random hole
            
            this.gameState.board.push(garbageRow);
        }
        
        // Check if current piece is now invalid
        if (this.gameState.currentPiece) {
            const piece = this.gameState.currentPiece;
            if (!this.gameLogic.isValidPosition(piece.x, piece.y, piece.getShape())) {
                // Push piece up
                piece.y -= garbageToAdd;
                
                // If still invalid, game over
                if (!this.gameLogic.isValidPosition(piece.x, piece.y, piece.getShape())) {
                    this.eventDispatcher.emit(new GameEvent(EventTypes.GAME_OVER, {
                        reason: 'garbage_overflow'
                    }));
                }
            }
        }
    }
    
    /**
     * Show battle UI
     */
    showBattleUI() {
        const battleUI = document.getElementById('battle-ui');
        if (battleUI) {
            battleUI.classList.add('active');
        }
        
        // Show opponent board
        const opponentContainer = document.getElementById('opponent-container');
        if (opponentContainer) {
            opponentContainer.classList.add('active');
        }
        
        // Update opponent info
        this.updateOpponentUI();
    }
    
    /**
     * Update opponent UI
     */
    updateOpponentUI() {
        // Update opponent score
        const opponentScore = document.getElementById('opponent-score');
        if (opponentScore && this.opponentGameState) {
            opponentScore.textContent = this.opponentGameState.score.toLocaleString();
        }
        
        // Update opponent lines
        const opponentLines = document.getElementById('opponent-lines');
        if (opponentLines && this.opponentGameState) {
            opponentLines.textContent = this.opponentGameState.lines;
        }
        
        // Update garbage queue
        const garbageIndicator = document.getElementById('garbage-indicator');
        if (garbageIndicator) {
            garbageIndicator.textContent = this.battleState.pendingGarbage;
            garbageIndicator.classList.toggle('warning', this.battleState.pendingGarbage > 5);
        }
    }
    
    /**
     * Override UI update to include battle elements
     */
    updateUI() {
        super.updateUI();
        this.updateOpponentUI();
        
        // Update battle stats
        const attacksSent = document.getElementById('attacks-sent');
        if (attacksSent) {
            attacksSent.textContent = this.battleState.attacksSent;
        }
        
        const garbageSent = document.getElementById('garbage-sent');
        if (garbageSent) {
            garbageSent.textContent = this.battleState.garbageSent;
        }
    }
    
    /**
     * Victory conditions for battle mode
     */
    setupVictoryConditions() {
        // Win if opponent tops out
        this.victoryConditions.push((gameState, modeState) => {
            if (this.opponentGameState && this.opponentGameState.gameStatus === 'gameover') {
                return 'opponent_defeated';
            }
            return null;
        });
    }
    
    /**
     * Handle opponent game over
     */
    onOpponentGameOver(event) {
        this.checkVictoryConditions();
    }
    
    /**
     * Get game statistics including battle data
     */
    getGameStats() {
        const baseStats = super.getGameStats();
        return {
            ...baseStats,
            opponent: this.battleConfig.opponent,
            difficulty: this.battleConfig.difficulty,
            garbageSent: this.battleState.garbageSent,
            garbageReceived: this.battleState.garbageReceived,
            attacksSent: this.battleState.attacksSent,
            attacksBlocked: this.battleState.attacksBlocked
        };
    }
    
    /**
     * Cleanup
     */
    destroy() {
        if (this.aiUpdateInterval) {
            clearInterval(this.aiUpdateInterval);
            this.aiUpdateInterval = null;
        }
        
        // Hide battle UI
        const battleUI = document.getElementById('battle-ui');
        if (battleUI) {
            battleUI.classList.remove('active');
        }
        
        super.destroy();
    }
    
    // Helper methods for AI
    isValidAIMove(x, y) {
        if (!this.opponentGameState.currentPiece) return false;
        const shape = this.opponentGameState.currentPiece.getShape();
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const boardX = x + col;
                    const boardY = y + row;
                    
                    if (boardX < 0 || boardX >= 10 || boardY >= 20 ||
                        (boardY >= 0 && this.opponentGameState.board[boardY][boardX])) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    isValidAIRotation(x, y, rotation) {
        // Simplified rotation check
        return true; // TODO: Implement proper rotation validation
    }
    
    dropAIPiece() {
        const piece = this.opponentGameState.currentPiece;
        if (!piece) return;
        
        while (this.isValidAIMove(piece.x, piece.y + 1)) {
            piece.y++;
        }
        
        this.lockAIPiece();
    }
    
    lockAIPiece() {
        // Lock piece and spawn new one
        const piece = this.opponentGameState.currentPiece;
        if (!piece) return;
        
        // Add to board
        const shape = piece.getShape();
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const boardY = piece.y + row;
                    const boardX = piece.x + col;
                    if (boardY >= 0) {
                        this.opponentGameState.board[boardY][boardX] = piece.typeId || piece.type;
                    }
                }
            }
        }
        
        // Spawn new piece
        this.opponentGameState.currentPiece = this.opponentGameState.getNextPiece();
    }
    
    updateOpponentGravity() {
        // Simple gravity for AI
        if (this.currentFrame % 60 === 0) { // Every second
            const piece = this.opponentGameState.currentPiece;
            if (piece && this.isValidAIMove(piece.x, piece.y + 1)) {
                piece.y++;
            }
        }
    }
    
    checkAILineClears() {
        // Check for completed lines
        const clearedLines = [];
        
        for (let y = 0; y < 20; y++) {
            let complete = true;
            for (let x = 0; x < 10; x++) {
                if (this.opponentGameState.board[y][x] === 0) {
                    complete = false;
                    break;
                }
            }
            if (complete) {
                clearedLines.push(y);
            }
        }
        
        if (clearedLines.length > 0) {
            // Remove cleared lines
            clearedLines.forEach(y => {
                this.opponentGameState.board.splice(y, 1);
                this.opponentGameState.board.unshift(new Array(10).fill(0));
            });
            
            // Update opponent stats
            this.opponentGameState.lines += clearedLines.length;
            this.opponentGameState.score += clearedLines.length * 100;
            
            // Emit event
            this.eventDispatcher.emit(new GameEvent('opponent:lines_clear', {
                lines: clearedLines,
                count: clearedLines.length
            }));
        }
    }
    
    receiveAIGarbage(lines) {
        // AI receives garbage
        // Simple implementation - just add to a counter
        // Real implementation would affect AI board
    }
}