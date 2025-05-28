/**
 * InfinityModeRefactored - Infinity mode with refactored architecture
 * Features skills, items, and infinite progression
 */
import { GameModeRefactored } from './GameModeRefactored.js';
import { SkillSystem } from '../skills/SkillSystem.js';
import { ItemSystem } from '../items/ItemSystem.js';
import { EventTypes, GameEvent } from '../../core/EventSystem.js';
import { SkillCommand, ItemCommand } from '../../core/CommandSystem.js';

export class InfinityModeRefactored extends GameModeRefactored {
    constructor(app, config = {}) {
        super(app, {
            ...config,
            mode: 'infinity',
            modeSettings: {
                startLevel: 1,
                maxLevel: Infinity,
                linesPerLevel: 10,
                scoreMultiplier: 1.5,
                gravityMultiplier: 1,
                lockDelayFrames: 30,
                enableHold: true,
                enableGhost: true,
                nextPiecesCount: 5,
                ...config.modeSettings
            }
        });
        
        // Mode metadata
        this.modeName = 'infinity';
        this.modeDescription = 'Endless mode with skills and items';
        
        // Infinity mode systems
        this.skillSystem = new SkillSystem(this);
        this.itemSystem = new ItemSystem(this);
        
        // Infinity mode state
        this.infinityState = {
            infinityLevel: 1,
            experiencePoints: 0,
            nextLevelExp: 1000,
            difficultyMultiplier: 1,
            speedCap: 20,
            perfectClearBonus: 5000,
            allClearCount: 0,
            itemDropChance: 0.1,
            sessionAchievements: []
        };
        
        // Add to game state for synchronization
        this.gameState.infinityState = this.infinityState;
    }
    
    /**
     * Initialize infinity mode specific features
     */
    onModeInit() {
        // Setup skill and item controls
        this.setupInfinityControls();
        
        // Initialize systems
        this.skillSystem.initialize();
        this.itemSystem.initialize();
        
        // Setup infinity-specific event handlers
        this.setupInfinityEventHandlers();
        
        // Emit mode start event
        this.eventDispatcher.emit(new GameEvent(EventTypes.MODE_START, {
            mode: 'infinity',
            infinityLevel: this.infinityState.infinityLevel
        }));
    }
    
    setupInfinityControls() {
        const inputManager = this.app.inputManager;
        
        // Skill controls
        inputManager.on('skill1', () => this.queueCommand(new SkillCommand({ skillIndex: 0 })));
        inputManager.on('skill2', () => this.queueCommand(new SkillCommand({ skillIndex: 1 })));
        inputManager.on('skill3', () => this.queueCommand(new SkillCommand({ skillIndex: 2 })));
        
        // Item controls
        inputManager.on('item1', () => this.queueCommand(new ItemCommand({ itemIndex: 0 })));
        inputManager.on('item2', () => this.queueCommand(new ItemCommand({ itemIndex: 1 })));
        inputManager.on('item3', () => this.queueCommand(new ItemCommand({ itemIndex: 2 })));
    }
    
    setupInfinityEventHandlers() {
        // Experience and leveling
        this.eventDispatcher.on(EventTypes.SCORE_UPDATE, this.onScoreUpdate.bind(this));
        this.eventDispatcher.on(EventTypes.LINES_CLEAR, this.onInfinityLinesClear.bind(this));
        this.eventDispatcher.on(EventTypes.PIECE_LOCK, this.onPieceLock.bind(this));
        
        // Skill and item events
        this.eventDispatcher.on(EventTypes.SKILL_USE, this.onSkillUse.bind(this));
        this.eventDispatcher.on(EventTypes.ITEM_USE, this.onItemUse.bind(this));
        this.eventDispatcher.on(EventTypes.ITEM_PICKUP, this.onItemPickup.bind(this));
    }
    
    /**
     * Update mode-specific logic
     */
    updateModeLogic() {
        // Update systems
        if (this.gameState.gameStatus === 'playing') {
            this.skillSystem.update(this.frameTime);
            this.itemSystem.update(this.frameTime);
            
            // Check for special conditions
            this.checkInfinityMechanics();
        }
    }
    
    /**
     * Override gravity calculation for infinity mode
     */
    getGravityFrames() {
        const level = Math.min(this.gameState.level, this.infinityState.speedCap);
        const baseFrames = Math.max(60 - (level - 1) * 3, 1);
        
        // Apply difficulty and item multipliers
        const difficultyMultiplier = this.infinityState.difficultyMultiplier;
        const itemMultipliers = this.itemSystem.getActiveMultipliers();
        
        return Math.max(Math.round(baseFrames / (difficultyMultiplier * itemMultipliers.speed)), 1);
    }
    
    /**
     * Handle score updates for experience
     */
    onScoreUpdate(event) {
        const scoreGain = event.data.scoreGain || 0;
        this.addExperience(Math.floor(scoreGain / 10));
    }
    
    /**
     * Handle infinity-specific line clear logic
     */
    onInfinityLinesClear(event) {
        const numLines = event.data.count;
        const lines = event.data.lines;
        
        // Check for perfect clear
        const isPerfectClear = this.checkPerfectClear();
        
        if (isPerfectClear) {
            this.infinityState.allClearCount++;
            
            // Award perfect clear bonus
            const bonus = this.infinityState.perfectClearBonus * this.infinityState.infinityLevel;
            this.gameState.score += bonus;
            
            // Emit perfect clear event
            this.eventDispatcher.emit(new GameEvent(EventTypes.PERFECT_CLEAR, {
                bonus: bonus,
                totalClears: this.infinityState.allClearCount
            }));
            
            // Grant item
            this.itemSystem.grantRandomItem();
        }
        
        // Experience for line clears
        const expGain = numLines * 100 * this.infinityState.infinityLevel;
        this.addExperience(expGain);
        
        // Chance for item drop
        if (Math.random() < this.infinityState.itemDropChance * numLines) {
            this.itemSystem.grantRandomItem();
        }
    }
    
    /**
     * Handle piece lock for item chances
     */
    onPieceLock(event) {
        // Small chance for item on any piece placement
        if (Math.random() < this.infinityState.itemDropChance * 0.1) {
            this.itemSystem.grantRandomItem();
        }
    }
    
    /**
     * Add experience and handle leveling
     */
    addExperience(amount) {
        this.infinityState.experiencePoints += amount;
        
        // Check for level up
        while (this.infinityState.experiencePoints >= this.infinityState.nextLevelExp) {
            this.infinityState.experiencePoints -= this.infinityState.nextLevelExp;
            this.levelUpInfinity();
        }
        
        // Update UI
        this.updateInfinityUI();
    }
    
    /**
     * Level up infinity level
     */
    levelUpInfinity() {
        this.infinityState.infinityLevel++;
        
        // Increase exp requirement
        this.infinityState.nextLevelExp = Math.floor(this.infinityState.nextLevelExp * 1.2);
        
        // Increase difficulty
        this.infinityState.difficultyMultiplier *= 1.05;
        
        // Grant skill points
        this.skillSystem.addSkillPoints(1);
        
        // Emit level up event
        this.eventDispatcher.emit(new GameEvent(EventTypes.INFINITY_LEVEL_UP, {
            level: this.infinityState.infinityLevel,
            nextExp: this.infinityState.nextLevelExp
        }));
        
        // Achievement check
        this.checkInfinityAchievements();
    }
    
    /**
     * Check for perfect clear
     */
    checkPerfectClear() {
        for (let row = 0; row < this.gameState.board.length; row++) {
            for (let col = 0; col < this.gameState.board[row].length; col++) {
                if (this.gameState.board[row][col] !== 0) {
                    return false;
                }
            }
        }
        return true;
    }
    
    /**
     * Check infinity-specific mechanics
     */
    checkInfinityMechanics() {
        // Progressive difficulty increase
        if (this.currentFrame % 3600 === 0) { // Every minute
            this.infinityState.difficultyMultiplier *= 1.01;
        }
        
        // Update skill cooldowns
        this.skillSystem.updateCooldowns(this.frameTime);
        
        // Update item durations
        this.itemSystem.updateDurations(this.frameTime);
    }
    
    /**
     * Check and unlock achievements
     */
    checkInfinityAchievements() {
        const achievements = [];
        
        // Level achievements
        if (this.infinityState.infinityLevel === 10) {
            achievements.push('infinity_level_10');
        } else if (this.infinityState.infinityLevel === 25) {
            achievements.push('infinity_level_25');
        } else if (this.infinityState.infinityLevel === 50) {
            achievements.push('infinity_level_50');
        }
        
        // Perfect clear achievements
        if (this.infinityState.allClearCount === 5) {
            achievements.push('perfect_clear_5');
        } else if (this.infinityState.allClearCount === 10) {
            achievements.push('perfect_clear_10');
        }
        
        // Emit achievement events
        achievements.forEach(achievement => {
            if (!this.infinityState.sessionAchievements.includes(achievement)) {
                this.infinityState.sessionAchievements.push(achievement);
                this.eventDispatcher.emit(new GameEvent(EventTypes.ACHIEVEMENT_UNLOCK, {
                    achievement: achievement,
                    timestamp: Date.now()
                }));
            }
        });
    }
    
    /**
     * Update infinity-specific UI
     */
    updateInfinityUI() {
        // Update infinity level display
        const infinityLevelEl = document.getElementById('infinity-level');
        if (infinityLevelEl) {
            infinityLevelEl.textContent = this.infinityState.infinityLevel;
        }
        
        // Update experience bar
        const expBarEl = document.getElementById('exp-bar');
        if (expBarEl) {
            const percentage = (this.infinityState.experiencePoints / this.infinityState.nextLevelExp) * 100;
            expBarEl.style.width = `${percentage}%`;
        }
        
        // Update skill cooldowns
        this.skillSystem.updateUI();
        
        // Update item slots
        this.itemSystem.updateUI();
    }
    
    /**
     * Override UI update to include infinity elements
     */
    updateUI() {
        super.updateUI();
        this.updateInfinityUI();
    }
    
    /**
     * Event handlers
     */
    onSkillUse(event) {
        const { skillIndex, success } = event.data;
        if (success) {
            // Visual feedback
            this.effectsManager.playSkillEffect(skillIndex);
            this.app.audioManager.play('skill');
        }
    }
    
    onItemUse(event) {
        const { itemIndex, itemType, success } = event.data;
        if (success) {
            // Visual feedback
            this.effectsManager.playItemEffect(itemType);
            this.app.audioManager.play('item');
        }
    }
    
    onItemPickup(event) {
        const { itemType } = event.data;
        this.effectsManager.playPickupEffect();
        this.app.audioManager.play('pickup');
    }
    
    /**
     * Get game statistics including infinity-specific data
     */
    getGameStats() {
        const baseStats = super.getGameStats();
        return {
            ...baseStats,
            infinityLevel: this.infinityState.infinityLevel,
            experience: this.infinityState.experiencePoints,
            perfectClears: this.infinityState.allClearCount,
            skillsUsed: this.skillSystem.getUsageStats(),
            itemsCollected: this.itemSystem.getCollectionStats(),
            achievements: this.infinityState.sessionAchievements
        };
    }
}