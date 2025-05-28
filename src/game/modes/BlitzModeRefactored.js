/**
 * BlitzModeRefactored - Blitz mode with refactored architecture
 * Score as many points as possible in 2 minutes
 */
import { GameModeRefactored } from './GameModeRefactored.js';
import { EventTypes, GameEvent } from '../../core/EventSystem.js';

export class BlitzModeRefactored extends GameModeRefactored {
    constructor(app, config = {}) {
        super(app, {
            ...config,
            mode: 'blitz',
            modeSettings: {
                startLevel: 1,
                maxLevel: 20,
                linesPerLevel: 10,
                scoreMultiplier: 1.5, // Bonus scoring for blitz
                gravityMultiplier: 1,
                lockDelayFrames: 30,
                enableHold: true,
                enableGhost: true,
                nextPiecesCount: 5,
                ...config.modeSettings
            },
            modeState: {
                timeLimit: 120000, // 2 minutes in milliseconds
                ...config.modeState
            }
        });
        
        // Mode metadata
        this.modeName = 'blitz';
        this.modeDescription = 'Score attack - 2 minutes';
        
        // Blitz state
        this.blitzState = {
            timeLimit: 120000, // 2 minutes
            startTime: null,
            timeRemaining: 120000,
            bestScore: this.loadBestScore(),
            bonusMultiplier: 1,
            streakCounter: 0,
            maxStreak: 0
        };
    }
    
    /**
     * Initialize blitz mode
     */
    onModeInit() {
        // Record start time
        this.blitzState.startTime = Date.now();
        
        // Setup blitz-specific event handlers
        this.setupBlitzEventHandlers();
        
        // Show blitz UI
        this.showBlitzUI();
        
        // Emit mode start event
        this.eventDispatcher.emit(new GameEvent(EventTypes.MODE_START, {
            mode: 'blitz',
            timeLimit: this.blitzState.timeLimit
        }));
    }
    
    setupBlitzEventHandlers() {
        // Track streaks for bonus multiplier
        this.eventDispatcher.on(EventTypes.LINES_CLEAR, this.onBlitzLinesClear.bind(this));
        this.eventDispatcher.on(EventTypes.PIECE_LOCK, this.onBlitzPieceLock.bind(this));
    }
    
    /**
     * Setup defeat conditions
     */
    setupDefeatConditions() {
        // Parent defeat conditions
        super.setupDefeatConditions();
        
        // Time limit condition
        this.defeatConditions.push((gameState, modeState) => {
            if (this.blitzState.timeRemaining <= 0) {
                return 'time_up';
            }
            return null;
        });
    }
    
    /**
     * Update blitz-specific logic
     */
    updateModeLogic() {
        // Update timer
        if (this.blitzState.startTime && this.gameState.gameStatus === 'playing') {
            const elapsed = Date.now() - this.blitzState.startTime;
            this.blitzState.timeRemaining = Math.max(0, this.blitzState.timeLimit - elapsed);
            
            // Check time limit
            if (this.blitzState.timeRemaining <= 0) {
                this.checkDefeatConditions();
            }
        }
    }
    
    /**
     * Handle blitz line clears with combo system
     */
    onBlitzLinesClear(event) {
        const linesCleared = event.data.count;
        
        // Increase streak
        this.blitzState.streakCounter++;
        this.blitzState.maxStreak = Math.max(this.blitzState.maxStreak, this.blitzState.streakCounter);
        
        // Calculate bonus multiplier based on streak
        this.blitzState.bonusMultiplier = 1 + (this.blitzState.streakCounter * 0.1);
        
        // Apply time bonus for good plays
        if (linesCleared === 4) { // Tetris
            this.addTimeBonus(3000); // +3 seconds
        } else if (event.data.tSpin) { // T-spin
            this.addTimeBonus(2000); // +2 seconds
        } else if (event.data.perfectClear) { // Perfect clear
            this.addTimeBonus(5000); // +5 seconds
        }
        
        // Visual feedback for streak
        if (this.blitzState.streakCounter >= 5) {
            this.effectsManager.playStreakEffect(this.blitzState.streakCounter);
        }
    }
    
    /**
     * Handle piece lock - reset streak if no lines cleared
     */
    onBlitzPieceLock(event) {
        // Check if this lock cleared lines (handled by separate event)
        // Reset streak after a short delay to allow line clear event to process
        setTimeout(() => {
            const currentStreak = this.blitzState.streakCounter;
            if (currentStreak === this.blitzState.streakCounter) {
                // No line clear happened, reset streak
                this.blitzState.streakCounter = 0;
                this.blitzState.bonusMultiplier = 1;
            }
        }, 50);
    }
    
    /**
     * Add time bonus
     */
    addTimeBonus(milliseconds) {
        this.blitzState.timeRemaining = Math.min(
            this.blitzState.timeRemaining + milliseconds,
            this.blitzState.timeLimit // Cap at original time limit
        );
        
        // Visual feedback
        this.effectsManager.playTimeBonusEffect(milliseconds / 1000);
        this.app.audioManager.play('timeBonus');
    }
    
    /**
     * Calculate score with blitz bonuses
     */
    calculateScore(baseScore) {
        return Math.floor(baseScore * this.modeSettings.scoreMultiplier * this.blitzState.bonusMultiplier);
    }
    
    /**
     * Show blitz-specific UI
     */
    showBlitzUI() {
        const blitzUI = document.getElementById('blitz-ui');
        if (blitzUI) {
            blitzUI.classList.add('active');
        }
        
        // Show best score
        const bestScoreDisplay = document.getElementById('blitz-best-score');
        if (bestScoreDisplay && this.blitzState.bestScore) {
            bestScoreDisplay.textContent = this.blitzState.bestScore.toLocaleString();
        }
    }
    
    /**
     * Update blitz UI
     */
    updateBlitzUI() {
        // Update timer
        const timerDisplay = document.getElementById('blitz-timer');
        if (timerDisplay) {
            const seconds = Math.ceil(this.blitzState.timeRemaining / 1000);
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            timerDisplay.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
            
            // Change color when time is running out
            if (seconds <= 10) {
                timerDisplay.classList.add('critical');
            } else if (seconds <= 30) {
                timerDisplay.classList.add('warning');
            }
        }
        
        // Update multiplier
        const multiplierDisplay = document.getElementById('blitz-multiplier');
        if (multiplierDisplay) {
            multiplierDisplay.textContent = `×${this.blitzState.bonusMultiplier.toFixed(1)}`;
        }
        
        // Update streak
        const streakDisplay = document.getElementById('blitz-streak');
        if (streakDisplay) {
            streakDisplay.textContent = this.blitzState.streakCounter;
            if (this.blitzState.streakCounter >= 5) {
                streakDisplay.classList.add('hot');
            } else {
                streakDisplay.classList.remove('hot');
            }
        }
        
        // Update score pace
        this.updateScorePace();
    }
    
    /**
     * Update score pace indicator
     */
    updateScorePace() {
        if (!this.blitzState.bestScore || !this.blitzState.startTime) return;
        
        const elapsed = Date.now() - this.blitzState.startTime;
        const timeRatio = elapsed / this.blitzState.timeLimit;
        const projectedScore = this.gameState.score / Math.max(0.01, timeRatio);
        
        const paceIndicator = document.getElementById('blitz-pace');
        if (paceIndicator) {
            if (projectedScore > this.blitzState.bestScore) {
                paceIndicator.textContent = 'On pace for PB!';
                paceIndicator.className = 'pace-ahead';
            } else {
                const deficit = this.blitzState.bestScore - projectedScore;
                paceIndicator.textContent = `-${Math.floor(deficit).toLocaleString()}`;
                paceIndicator.className = 'pace-behind';
            }
        }
    }
    
    /**
     * Handle defeat (time up)
     */
    onDefeat(reason) {
        // Check for new high score
        const isNewRecord = !this.blitzState.bestScore || 
                           this.gameState.score > this.blitzState.bestScore;
        
        if (isNewRecord) {
            this.blitzState.bestScore = this.gameState.score;
            this.saveBestScore(this.blitzState.bestScore);
        }
        
        // Call parent defeat handler
        super.onDefeat(reason);
        
        // Show blitz results
        this.showBlitzResults(isNewRecord);
    }
    
    /**
     * Show blitz results
     */
    showBlitzResults(isNewRecord) {
        const resultsUI = document.getElementById('blitz-results');
        if (!resultsUI) return;
        
        // Show record indicator
        if (isNewRecord) {
            const recordEl = document.getElementById('blitz-new-record');
            if (recordEl) {
                recordEl.classList.add('active');
            }
        }
        
        // Update max streak
        const maxStreakEl = document.getElementById('blitz-max-streak');
        if (maxStreakEl) {
            maxStreakEl.textContent = this.blitzState.maxStreak;
        }
    }
    
    /**
     * Load best score from storage
     */
    loadBestScore() {
        const saved = localStorage.getItem('tetris_blitz_best');
        return saved ? parseInt(saved) : null;
    }
    
    /**
     * Save best score to storage
     */
    saveBestScore(score) {
        localStorage.setItem('tetris_blitz_best', score.toString());
    }
    
    /**
     * Override score calculation
     */
    onScoreUpdate(event) {
        // Apply blitz multiplier
        event.data.scoreGain = this.calculateScore(event.data.scoreGain);
        super.onScoreUpdate(event);
    }
    
    /**
     * Override UI update
     */
    updateUI() {
        super.updateUI();
        this.updateBlitzUI();
    }
    
    /**
     * Get game statistics
     */
    getGameStats() {
        const baseStats = super.getGameStats();
        return {
            ...baseStats,
            timeLimit: this.blitzState.timeLimit,
            bestScore: this.blitzState.bestScore,
            maxStreak: this.blitzState.maxStreak,
            averageMultiplier: this.calculateAverageMultiplier(),
            scorePerMinute: (baseStats.score / (this.blitzState.timeLimit / 60000))
        };
    }
    
    calculateAverageMultiplier() {
        // Simple approximation based on max streak
        return 1 + (this.blitzState.maxStreak * 0.05);
    }
}