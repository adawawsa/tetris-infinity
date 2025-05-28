/**
 * SprintModeRefactored - Sprint mode with refactored architecture
 * Clear 40 lines as fast as possible
 */
import { GameModeRefactored } from './GameModeRefactored.js';
import { EventTypes, GameEvent } from '../../core/EventSystem.js';

export class SprintModeRefactored extends GameModeRefactored {
    constructor(app, config = {}) {
        super(app, {
            ...config,
            mode: 'sprint',
            modeSettings: {
                startLevel: 1,
                maxLevel: 1, // Fixed level for sprint
                linesPerLevel: Infinity, // No level progression
                scoreMultiplier: 1,
                gravityMultiplier: 0.5, // Faster drops allowed
                lockDelayFrames: 30,
                enableHold: true,
                enableGhost: true,
                nextPiecesCount: 5,
                ...config.modeSettings
            },
            modeState: {
                targetLines: 40, // Sprint to 40 lines
                ...config.modeState
            }
        });
        
        // Mode metadata
        this.modeName = 'sprint';
        this.modeDescription = 'Clear 40 lines as fast as possible';
        
        // Sprint state
        this.sprintState = {
            targetLines: 40,
            startTime: null,
            endTime: null,
            finalTime: null,
            bestTime: this.loadBestTime()
        };
    }
    
    /**
     * Initialize sprint mode
     */
    onModeInit() {
        // Record start time
        this.sprintState.startTime = Date.now();
        
        // Show sprint UI
        this.showSprintUI();
        
        // Emit mode start event
        this.eventDispatcher.emit(new GameEvent(EventTypes.MODE_START, {
            mode: 'sprint',
            targetLines: this.sprintState.targetLines
        }));
    }
    
    /**
     * Setup victory conditions
     */
    setupVictoryConditions() {
        // Win when target lines are cleared
        this.victoryConditions.push((gameState, modeState) => {
            if (gameState.lines >= this.sprintState.targetLines) {
                return 'target_reached';
            }
            return null;
        });
    }
    
    /**
     * Handle victory with time tracking
     */
    onVictory(reason) {
        this.sprintState.endTime = Date.now();
        this.sprintState.finalTime = this.sprintState.endTime - this.sprintState.startTime;
        
        // Check for new record
        const isNewRecord = !this.sprintState.bestTime || 
                          this.sprintState.finalTime < this.sprintState.bestTime;
        
        if (isNewRecord) {
            this.sprintState.bestTime = this.sprintState.finalTime;
            this.saveBestTime(this.sprintState.bestTime);
        }
        
        // Call parent victory handler
        super.onVictory(reason);
        
        // Show sprint results
        this.showSprintResults(isNewRecord);
    }
    
    /**
     * Show sprint-specific UI
     */
    showSprintUI() {
        const sprintUI = document.getElementById('sprint-ui');
        if (sprintUI) {
            sprintUI.classList.add('active');
        }
        
        // Show target lines
        const targetDisplay = document.getElementById('sprint-target');
        if (targetDisplay) {
            targetDisplay.textContent = `${this.sprintState.targetLines} lines`;
        }
        
        // Show best time
        const bestTimeDisplay = document.getElementById('sprint-best-time');
        if (bestTimeDisplay && this.sprintState.bestTime) {
            bestTimeDisplay.textContent = this.formatTime(this.sprintState.bestTime);
        }
    }
    
    /**
     * Update sprint UI
     */
    updateSprintUI() {
        // Update lines remaining
        const remaining = Math.max(0, this.sprintState.targetLines - this.gameState.lines);
        const remainingDisplay = document.getElementById('sprint-remaining');
        if (remainingDisplay) {
            remainingDisplay.textContent = remaining;
        }
        
        // Update timer
        if (this.sprintState.startTime && !this.sprintState.endTime) {
            const elapsed = Date.now() - this.sprintState.startTime;
            const timerDisplay = document.getElementById('sprint-timer');
            if (timerDisplay) {
                timerDisplay.textContent = this.formatTime(elapsed);
            }
        }
        
        // Update pace indicator
        this.updatePaceIndicator();
    }
    
    /**
     * Update pace indicator
     */
    updatePaceIndicator() {
        if (!this.sprintState.bestTime || !this.sprintState.startTime) return;
        
        const elapsed = Date.now() - this.sprintState.startTime;
        const linesCleared = this.gameState.lines;
        const targetLines = this.sprintState.targetLines;
        
        // Calculate current pace
        const currentPace = elapsed / Math.max(1, linesCleared);
        const projectedTime = currentPace * targetLines;
        
        // Compare to best time
        const paceIndicator = document.getElementById('sprint-pace');
        if (paceIndicator) {
            if (projectedTime < this.sprintState.bestTime) {
                paceIndicator.textContent = 'Ahead of PB';
                paceIndicator.className = 'pace-ahead';
            } else {
                const behind = projectedTime - this.sprintState.bestTime;
                paceIndicator.textContent = `+${this.formatTime(behind)}`;
                paceIndicator.className = 'pace-behind';
            }
        }
    }
    
    /**
     * Show sprint results
     */
    showSprintResults(isNewRecord) {
        const resultsUI = document.getElementById('sprint-results');
        if (!resultsUI) return;
        
        // Update final time
        const finalTimeEl = document.getElementById('sprint-final-time');
        if (finalTimeEl) {
            finalTimeEl.textContent = this.formatTime(this.sprintState.finalTime);
        }
        
        // Show record indicator
        if (isNewRecord) {
            const recordEl = document.getElementById('sprint-new-record');
            if (recordEl) {
                recordEl.classList.add('active');
            }
        }
        
        // Calculate statistics
        const pps = this.gameState.statistics.piecesPlaced / 
                   (this.sprintState.finalTime / 1000);
        const lps = this.sprintState.targetLines / 
                   (this.sprintState.finalTime / 1000);
        
        // Update statistics
        const ppsEl = document.getElementById('sprint-pps');
        if (ppsEl) {
            ppsEl.textContent = pps.toFixed(2);
        }
        
        const lpsEl = document.getElementById('sprint-lps');
        if (lpsEl) {
            lpsEl.textContent = lps.toFixed(2);
        }
    }
    
    /**
     * Format time in MM:SS.mmm
     */
    formatTime(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        const ms = milliseconds % 1000;
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
    
    /**
     * Load best time from storage
     */
    loadBestTime() {
        const saved = localStorage.getItem('tetris_sprint_best');
        return saved ? parseInt(saved) : null;
    }
    
    /**
     * Save best time to storage
     */
    saveBestTime(time) {
        localStorage.setItem('tetris_sprint_best', time.toString());
    }
    
    /**
     * Override UI update
     */
    updateUI() {
        super.updateUI();
        this.updateSprintUI();
    }
    
    /**
     * Get game statistics
     */
    getGameStats() {
        const baseStats = super.getGameStats();
        return {
            ...baseStats,
            targetLines: this.sprintState.targetLines,
            finalTime: this.sprintState.finalTime,
            bestTime: this.sprintState.bestTime,
            piecesPerSecond: baseStats.piecesPlaced / (this.sprintState.finalTime / 1000),
            linesPerSecond: this.sprintState.targetLines / (this.sprintState.finalTime / 1000)
        };
    }
}