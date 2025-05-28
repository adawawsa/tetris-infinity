/**
 * MarathonModeRefactored - Classic marathon mode with refactored architecture
 * Traditional endless Tetris with level progression
 */
import { GameModeRefactored } from './GameModeRefactored.js';
import { EventTypes, GameEvent } from '../../core/EventSystem.js';

export class MarathonModeRefactored extends GameModeRefactored {
    constructor(app, config = {}) {
        super(app, {
            ...config,
            mode: 'marathon',
            modeSettings: {
                startLevel: config.startLevel || 1,
                maxLevel: 20,
                linesPerLevel: 10,
                scoreMultiplier: 1,
                gravityMultiplier: 1,
                lockDelayFrames: 30,
                enableHold: true,
                enableGhost: true,
                nextPiecesCount: 3, // Classic shows 3 next pieces
                ...config.modeSettings
            }
        });
        
        // Mode metadata
        this.modeName = 'marathon';
        this.modeDescription = 'Classic endless Tetris';
        
        // Marathon state
        this.marathonState = {
            startLevel: this.modeSettings.startLevel,
            transitionLines: 0,
            speedCurve: 'classic', // or 'modern'
            bestScore: this.loadBestScore(),
            bestLines: this.loadBestLines()
        };
    }
    
    /**
     * Initialize marathon mode
     */
    onModeInit() {
        // Show marathon UI
        this.showMarathonUI();
        
        // Emit mode start event
        this.eventDispatcher.emit(new GameEvent(EventTypes.MODE_START, {
            mode: 'marathon',
            startLevel: this.marathonState.startLevel
        }));
    }
    
    /**
     * No victory conditions in marathon - play until topped out
     */
    setupVictoryConditions() {
        // Marathon has no victory condition
    }
    
    /**
     * Override gravity calculation for classic speed curve
     */
    getGravityFrames() {
        const level = this.gameState.level;
        
        if (this.marathonState.speedCurve === 'classic') {
            // Classic NES Tetris speed curve
            const gravityFrames = [
                48, 43, 38, 33, 28, 23, 18, 13, 8, 6,
                5, 5, 5, 4, 4, 4, 3, 3, 3, 2,
                2, 2, 2, 2, 2, 2, 2, 2, 2, 1
            ];
            
            return gravityFrames[Math.min(level - 1, gravityFrames.length - 1)];
        } else {
            // Modern speed curve
            return super.getGravityFrames();
        }
    }
    
    /**
     * Handle level progression
     */
    onLinesClear(event) {
        super.onLinesClear(event);
        
        // Track transition lines for level calculation
        this.marathonState.transitionLines += event.data.count;
        
        // Check for level up
        const newLevel = this.marathonState.startLevel + 
                        Math.floor(this.marathonState.transitionLines / this.modeSettings.linesPerLevel);
        
        if (newLevel > this.gameState.level && newLevel <= this.modeSettings.maxLevel) {
            this.gameState.level = newLevel;
            
            // Emit level up event
            this.eventDispatcher.emit(new GameEvent(EventTypes.LEVEL_UP, {
                level: newLevel,
                lines: this.gameState.lines
            }));
            
            // Play level up sound
            this.app.audioManager.play('levelUp');
            
            // Visual effect
            this.effectsManager.playLevelUpEffect();
        }
    }
    
    /**
     * Show marathon-specific UI
     */
    showMarathonUI() {
        const marathonUI = document.getElementById('marathon-ui');
        if (marathonUI) {
            marathonUI.classList.add('active');
        }
        
        // Show best score/lines
        const bestScoreDisplay = document.getElementById('marathon-best-score');
        if (bestScoreDisplay && this.marathonState.bestScore) {
            bestScoreDisplay.textContent = this.marathonState.bestScore.toLocaleString();
        }
        
        const bestLinesDisplay = document.getElementById('marathon-best-lines');
        if (bestLinesDisplay && this.marathonState.bestLines) {
            bestLinesDisplay.textContent = this.marathonState.bestLines;
        }
    }
    
    /**
     * Update marathon UI
     */
    updateMarathonUI() {
        // Update level progress bar
        const progressBar = document.getElementById('level-progress');
        if (progressBar) {
            const linesInLevel = this.marathonState.transitionLines % this.modeSettings.linesPerLevel;
            const progress = (linesInLevel / this.modeSettings.linesPerLevel) * 100;
            progressBar.style.width = `${progress}%`;
        }
        
        // Update lines until next level
        const nextLevelDisplay = document.getElementById('lines-to-next-level');
        if (nextLevelDisplay) {
            const linesInLevel = this.marathonState.transitionLines % this.modeSettings.linesPerLevel;
            const remaining = this.modeSettings.linesPerLevel - linesInLevel;
            nextLevelDisplay.textContent = remaining;
        }
        
        // Update score pace
        this.updateScorePace();
    }
    
    /**
     * Update score pace vs personal best
     */
    updateScorePace() {
        if (!this.marathonState.bestScore || this.gameState.lines === 0) return;
        
        const currentPPL = this.gameState.score / this.gameState.lines; // Points per line
        const bestPPL = this.marathonState.bestScore / Math.max(1, this.marathonState.bestLines);
        
        const paceIndicator = document.getElementById('marathon-pace');
        if (paceIndicator) {
            if (currentPPL > bestPPL) {
                paceIndicator.textContent = 'Ahead of PB pace';
                paceIndicator.className = 'pace-ahead';
            } else {
                const deficit = (bestPPL - currentPPL) * this.gameState.lines;
                paceIndicator.textContent = `-${Math.floor(deficit).toLocaleString()}`;
                paceIndicator.className = 'pace-behind';
            }
        }
    }
    
    /**
     * Handle game over
     */
    onGameOver(event) {
        // Check for new records
        let isNewRecord = false;
        
        if (!this.marathonState.bestScore || this.gameState.score > this.marathonState.bestScore) {
            this.marathonState.bestScore = this.gameState.score;
            this.saveBestScore(this.marathonState.bestScore);
            isNewRecord = true;
        }
        
        if (!this.marathonState.bestLines || this.gameState.lines > this.marathonState.bestLines) {
            this.marathonState.bestLines = this.gameState.lines;
            this.saveBestLines(this.marathonState.bestLines);
            isNewRecord = true;
        }
        
        // Call parent handler
        super.onGameOver(event);
        
        // Show record indicator
        if (isNewRecord) {
            const recordEl = document.getElementById('marathon-new-record');
            if (recordEl) {
                recordEl.classList.add('active');
            }
        }
    }
    
    /**
     * Load/save best score
     */
    loadBestScore() {
        const saved = localStorage.getItem('tetris_marathon_best_score');
        return saved ? parseInt(saved) : null;
    }
    
    saveBestScore(score) {
        localStorage.setItem('tetris_marathon_best_score', score.toString());
    }
    
    /**
     * Load/save best lines
     */
    loadBestLines() {
        const saved = localStorage.getItem('tetris_marathon_best_lines');
        return saved ? parseInt(saved) : null;
    }
    
    saveBestLines(lines) {
        localStorage.setItem('tetris_marathon_best_lines', lines.toString());
    }
    
    /**
     * Override UI update
     */
    updateUI() {
        super.updateUI();
        this.updateMarathonUI();
    }
    
    /**
     * Get game statistics
     */
    getGameStats() {
        const baseStats = super.getGameStats();
        return {
            ...baseStats,
            startLevel: this.marathonState.startLevel,
            endLevel: this.gameState.level,
            bestScore: this.marathonState.bestScore,
            bestLines: this.marathonState.bestLines,
            pointsPerLine: Math.floor(baseStats.score / Math.max(1, baseStats.lines))
        };
    }
}