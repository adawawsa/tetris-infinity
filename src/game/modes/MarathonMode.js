/**
 * MarathonMode - Classic marathon mode
 * Clear 150 lines or play endless
 */
import { GameMode } from './GameMode.js';

export class MarathonMode extends GameMode {
    constructor(game, config = {}) {
        super(game, config);
        
        this.name = 'marathon';
        this.description = 'Classic marathon - clear 150 lines';
        
        // Marathon-specific settings
        this.settings = {
            ...this.settings,
            targetLines: config.targetLines || 150,
            endless: config.endless || false,
            startLevel: config.startLevel || 1,
            maxLevel: config.endless ? 99 : 15
        };
        
        // Statistics
        this.statistics = {
            singles: 0,
            doubles: 0,
            triples: 0,
            tetrises: 0,
            tSpins: 0,
            perfectClears: 0
        };
    }
    
    setupVictoryConditions() {
        if (!this.settings.endless) {
            this.victoryConditions.push({
                name: 'target_lines',
                check: () => this.game.gameState.lines >= this.settings.targetLines
            });
        }
    }
    
    setupEventHandlers() {
        // Track line clear types
        this.game.eventDispatcher.on('lines:clear', (event) => {
            this.trackLineClearType(event.data.count);
            this.checkPerfectClear();
        });
    }
    
    trackLineClearType(count) {
        switch (count) {
            case 1:
                this.statistics.singles++;
                break;
            case 2:
                this.statistics.doubles++;
                break;
            case 3:
                this.statistics.triples++;
                break;
            case 4:
                this.statistics.tetrises++;
                break;
        }
    }
    
    checkPerfectClear() {
        // Check if board is completely empty
        const board = this.game.gameState.board;
        const isEmpty = board.every(row => row.every(cell => cell === 0));
        
        if (isEmpty && this.game.gameState.lines > 0) {
            this.statistics.perfectClears++;
            this.game.gameState.score += 1000 * this.game.gameState.level;
            
            this.game.eventDispatcher.emit({
                type: 'effect:trigger',
                data: {
                    effect: 'perfect_clear',
                    bonus: 1000 * this.game.gameState.level
                }
            });
        }
    }
    
    updateMode(deltaTime) {
        // Update progress for non-endless mode
        if (!this.settings.endless) {
            const progress = Math.min(this.game.gameState.lines / this.settings.targetLines, 1);
            this.updateProgress(progress);
        }
    }
    
    updateProgress(progress) {
        // Update UI progress bar if available
        const progressBar = document.getElementById('marathon-progress');
        if (progressBar) {
            progressBar.style.width = `${progress * 100}%`;
        }
        
        const progressText = document.getElementById('marathon-lines');
        if (progressText) {
            progressText.textContent = `${this.game.gameState.lines} / ${this.settings.targetLines}`;
        }
    }
    
    getGravityFrames() {
        // Marathon-specific gravity curve
        const level = this.game.gameState.level;
        
        if (level <= 8) {
            return 48 - (level - 1) * 5;
        } else if (level == 9) {
            return 6;
        } else if (level <= 18) {
            return 5;
        } else if (level <= 28) {
            return 4;
        } else {
            return 3;
        }
    }
    
    getEndStats() {
        return {
            ...super.getEndStats(),
            ...this.statistics,
            linesPerMinute: this.calculateLPM(),
            piecesPerSecond: this.calculatePPS()
        };
    }
    
    calculateLPM() {
        const minutes = (this.endTime - this.startTime) / 60000;
        return minutes > 0 ? Math.round(this.game.gameState.lines / minutes) : 0;
    }
    
    calculatePPS() {
        const seconds = (this.endTime - this.startTime) / 1000;
        return seconds > 0 ? (this.game.gameState.piecesPlaced / seconds).toFixed(2) : 0;
    }
    
    onVictory(results) {
        // Marathon-specific victory handling
        if (!this.settings.endless) {
            // Show completion animation
            this.game.effectsManager.playVictory();
        }
    }
}

export default MarathonMode;