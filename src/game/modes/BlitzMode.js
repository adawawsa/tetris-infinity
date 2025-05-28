/**
 * BlitzMode - Time attack mode
 */
import { GameMode } from './GameMode.js';

export class BlitzMode extends GameMode {
    constructor(game, config = {}) {
        super(game, config);
        
        this.name = 'blitz';
        this.description = '2-minute time attack';
        
        this.settings = {
            ...this.settings,
            timeLimit: 120000, // 2 minutes in ms
            startLevel: 1,
            maxLevel: 99
        };
        
        this.timeRemaining = this.settings.timeLimit;
    }
    
    setupVictoryConditions() {
        // No victory in blitz - just survive the time
    }
    
    setupDefeatConditions() {
        super.setupDefeatConditions();
        
        this.defeatConditions.push({
            name: 'time_up',
            check: () => this.timeRemaining <= 0
        });
    }
    
    updateMode(deltaTime) {
        this.timeRemaining -= deltaTime;
        
        // Update timer display
        const seconds = Math.max(0, Math.floor(this.timeRemaining / 1000));
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        
        const timerDisplay = document.getElementById('blitz-timer');
        if (timerDisplay) {
            timerDisplay.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
            
            // Add urgency effect in last 10 seconds
            if (seconds <= 10) {
                timerDisplay.classList.add('urgent');
            }
        }
    }
    
    calculateScore(lines, level, combo) {
        // Blitz mode has higher score multiplier
        return super.calculateScore(lines, level, combo) * 1.5;
    }
}

export default BlitzMode;