/**
 * GameMode - Base class for all game modes
 * Provides common interface and functionality
 */
import { EventTypes } from '../../core/EventSystem.js';

export class GameMode {
    constructor(game, config = {}) {
        this.game = game;
        this.config = config;
        this.name = 'base';
        this.description = 'Base game mode';
        
        // Mode-specific settings
        this.settings = {
            startLevel: 1,
            maxLevel: 20,
            linesPerLevel: 10,
            scoreMultiplier: 1,
            gravityMultiplier: 1,
            lockDelayFrames: 30,
            ...config.settings
        };
        
        // Victory/defeat conditions
        this.victoryConditions = [];
        this.defeatConditions = [];
        
        // Mode state
        this.started = false;
        this.ended = false;
        this.startTime = 0;
        this.endTime = 0;
    }
    
    /**
     * Initialize the game mode
     */
    initialize() {
        this.setupEventHandlers();
        this.setupVictoryConditions();
        this.setupDefeatConditions();
        
        // Apply mode-specific settings
        this.game.gameState.level = this.settings.startLevel;
    }
    
    /**
     * Setup event handlers for the mode
     */
    setupEventHandlers() {
        // Override in subclasses
    }
    
    /**
     * Setup victory conditions
     */
    setupVictoryConditions() {
        // Override in subclasses
    }
    
    /**
     * Setup defeat conditions
     */
    setupDefeatConditions() {
        // Default defeat condition
        this.defeatConditions.push({
            name: 'blocked_spawn',
            check: () => this.game.gameState.gameStatus === 'gameover'
        });
    }
    
    /**
     * Start the game mode
     */
    start() {
        this.started = true;
        this.startTime = Date.now();
        
        this.game.eventDispatcher.emit({
            type: EventTypes.GAME_START,
            data: {
                mode: this.name,
                settings: this.settings
            }
        });
    }
    
    /**
     * Update mode-specific logic
     */
    update(deltaTime) {
        if (!this.started || this.ended) return;
        
        // Check victory conditions
        for (let condition of this.victoryConditions) {
            if (condition.check()) {
                this.handleVictory(condition.name);
                return;
            }
        }
        
        // Check defeat conditions
        for (let condition of this.defeatConditions) {
            if (condition.check()) {
                this.handleDefeat(condition.name);
                return;
            }
        }
        
        // Update mode-specific logic
        this.updateMode(deltaTime);
    }
    
    /**
     * Mode-specific update logic
     */
    updateMode(deltaTime) {
        // Override in subclasses
    }
    
    /**
     * Handle line clears
     */
    onLinesCleared(lines) {
        // Base implementation - can be overridden
        const count = lines.length;
        this.game.gameState.lines += count;
        
        // Check for level up
        const newLevel = Math.floor(this.game.gameState.lines / this.settings.linesPerLevel) + this.settings.startLevel;
        if (newLevel > this.game.gameState.level && newLevel <= this.settings.maxLevel) {
            this.game.gameState.level = newLevel;
            this.onLevelUp(newLevel);
        }
    }
    
    /**
     * Handle level up
     */
    onLevelUp(level) {
        this.game.eventDispatcher.emit({
            type: EventTypes.LEVEL_UP,
            data: { level }
        });
    }
    
    /**
     * Calculate score for line clears
     */
    calculateScore(lines, level, combo) {
        // Base scoring formula
        const baseScore = {
            1: 100,
            2: 300,
            3: 500,
            4: 800
        }[lines] || 0;
        
        return baseScore * level * this.settings.scoreMultiplier * (1 + combo * 0.5);
    }
    
    /**
     * Get gravity speed for current level
     */
    getGravityFrames() {
        const level = this.game.gameState.level;
        const baseFrames = 60; // 1 second at level 1
        const reduction = (level - 1) * 2.5;
        
        return Math.max(1, baseFrames - reduction) * this.settings.gravityMultiplier;
    }
    
    /**
     * Handle victory
     */
    handleVictory(reason) {
        this.ended = true;
        this.endTime = Date.now();
        
        const results = {
            victory: true,
            reason: reason,
            score: this.game.gameState.score,
            lines: this.game.gameState.lines,
            level: this.game.gameState.level,
            duration: this.endTime - this.startTime,
            stats: this.getEndStats()
        };
        
        this.game.eventDispatcher.emit({
            type: EventTypes.GAME_OVER,
            data: results
        });
        
        this.onVictory(results);
    }
    
    /**
     * Handle defeat
     */
    handleDefeat(reason) {
        this.ended = true;
        this.endTime = Date.now();
        
        const results = {
            victory: false,
            reason: reason,
            score: this.game.gameState.score,
            lines: this.game.gameState.lines,
            level: this.game.gameState.level,
            duration: this.endTime - this.startTime,
            stats: this.getEndStats()
        };
        
        this.game.eventDispatcher.emit({
            type: EventTypes.GAME_OVER,
            data: results
        });
        
        this.onDefeat(results);
    }
    
    /**
     * Get end game statistics
     */
    getEndStats() {
        return {
            mode: this.name,
            maxCombo: this.game.gameState.maxCombo || 0,
            piecesPlaced: this.game.gameState.piecesPlaced || 0,
            holdCount: this.game.gameState.holdCount || 0
        };
    }
    
    /**
     * Mode-specific victory handler
     */
    onVictory(results) {
        // Override in subclasses
    }
    
    /**
     * Mode-specific defeat handler
     */
    onDefeat(results) {
        // Override in subclasses
    }
    
    /**
     * Reset the mode
     */
    reset() {
        this.started = false;
        this.ended = false;
        this.startTime = 0;
        this.endTime = 0;
    }
    
    /**
     * Get mode configuration
     */
    getConfig() {
        return {
            name: this.name,
            description: this.description,
            settings: this.settings
        };
    }
}

export default GameMode;