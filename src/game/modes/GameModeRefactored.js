/**
 * GameModeRefactored - Base class for all refactored game modes
 * Extends GameRefactored with mode-specific functionality
 */
import { GameRefactored } from '../GameRefactored.js';
import { EventTypes, GameEvent } from '../../core/EventSystem.js';

export class GameModeRefactored extends GameRefactored {
    constructor(app, config = {}) {
        super(app, config);
        
        // Mode metadata
        this.modeName = 'base';
        this.modeDescription = 'Base game mode';
        
        // Mode-specific settings (can be overridden by subclasses)
        this.modeSettings = {
            startLevel: 1,
            maxLevel: 20,
            linesPerLevel: 10,
            scoreMultiplier: 1,
            gravityMultiplier: 1,
            lockDelayFrames: 30,
            enableHold: true,
            enableGhost: true,
            nextPiecesCount: 5,
            ...config.modeSettings
        };
        
        // Victory/defeat conditions
        this.victoryConditions = [];
        this.defeatConditions = [];
        
        // Mode-specific state
        this.modeState = {
            started: false,
            ended: false,
            startTime: 0,
            endTime: 0,
            targetLines: null,
            targetScore: null,
            timeLimit: null,
            ...config.modeState
        };
    }
    
    /**
     * Initialize mode-specific features
     */
    initializeMode() {
        // Apply mode settings
        this.gameState.level = this.modeSettings.startLevel;
        this.lockDelayFrames = this.modeSettings.lockDelayFrames;
        
        // Setup mode-specific event handlers
        this.setupModeEventHandlers();
        
        // Initialize victory/defeat conditions
        this.setupVictoryConditions();
        this.setupDefeatConditions();
        
        // Mode-specific initialization (override in subclasses)
        this.onModeInit();
    }
    
    /**
     * Setup mode-specific event handlers
     */
    setupModeEventHandlers() {
        // Track mode progress
        this.eventDispatcher.on(EventTypes.LINES_CLEAR, this.checkVictoryConditions.bind(this));
        this.eventDispatcher.on(EventTypes.SCORE_UPDATE, this.checkVictoryConditions.bind(this));
        this.eventDispatcher.on(EventTypes.GAME_OVER, this.onModeEnd.bind(this));
    }
    
    /**
     * Override in subclasses to setup victory conditions
     */
    setupVictoryConditions() {
        // Base implementation - no victory conditions
    }
    
    /**
     * Override in subclasses to setup defeat conditions
     */
    setupDefeatConditions() {
        // Default defeat condition - topping out
        this.defeatConditions.push(() => {
            const piece = this.gameState.currentPiece;
            if (piece && piece.y <= 0) {
                return 'topped_out';
            }
            return null;
        });
    }
    
    /**
     * Check if any victory conditions are met
     */
    checkVictoryConditions() {
        if (this.modeState.ended) return;
        
        for (const condition of this.victoryConditions) {
            const result = condition(this.gameState, this.modeState);
            if (result) {
                this.onVictory(result);
                return;
            }
        }
    }
    
    /**
     * Check if any defeat conditions are met
     */
    checkDefeatConditions() {
        if (this.modeState.ended) return;
        
        for (const condition of this.defeatConditions) {
            const result = condition(this.gameState, this.modeState);
            if (result) {
                this.onDefeat(result);
                return;
            }
        }
    }
    
    /**
     * Handle victory
     */
    onVictory(reason) {
        this.modeState.ended = true;
        this.modeState.endTime = Date.now();
        this.gameState.gameStatus = 'victory';
        
        const stats = this.getGameStats();
        stats.victory = true;
        stats.victoryReason = reason;
        
        this.eventDispatcher.emit(new GameEvent(EventTypes.GAME_VICTORY, stats));
        
        // Show victory screen
        if (this.app.menuManager) {
            this.app.menuManager.showVictory(stats);
        }
    }
    
    /**
     * Handle defeat
     */
    onDefeat(reason) {
        this.modeState.ended = true;
        this.modeState.endTime = Date.now();
        this.gameState.gameStatus = 'gameover';
        
        const stats = this.getGameStats();
        stats.victory = false;
        stats.defeatReason = reason;
        
        this.eventDispatcher.emit(new GameEvent(EventTypes.GAME_OVER, stats));
    }
    
    /**
     * Get game statistics
     */
    getGameStats() {
        return {
            mode: this.modeName,
            score: this.gameState.score,
            lines: this.gameState.lines,
            level: this.gameState.level,
            duration: this.modeState.endTime - this.modeState.startTime,
            piecesPlaced: this.gameState.statistics.piecesPlaced || 0,
            holds: this.gameState.statistics.holds || 0,
            tSpins: this.gameState.statistics.tSpins || 0
        };
    }
    
    /**
     * Override GameRefactored methods
     */
    initializeState() {
        super.initializeState();
        this.initializeMode();
    }
    
    start() {
        this.modeState.started = true;
        this.modeState.startTime = Date.now();
        super.start();
    }
    
    updateGameLogic() {
        super.updateGameLogic();
        
        // Check defeat conditions
        this.checkDefeatConditions();
        
        // Update mode-specific logic
        this.updateModeLogic();
    }
    
    getGravityFrames() {
        const baseFrames = super.getGravityFrames();
        return Math.round(baseFrames / this.modeSettings.gravityMultiplier);
    }
    
    /**
     * Mode-specific methods to override in subclasses
     */
    onModeInit() {
        // Override in subclasses
    }
    
    updateModeLogic() {
        // Override in subclasses for mode-specific updates
    }
    
    onModeEnd() {
        // Override in subclasses for cleanup
    }
}