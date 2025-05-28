/**
 * ModeFactoryRefactored - Factory for creating refactored game modes
 */
import { GameRefactored } from '../GameRefactored.js';
import { InfinityModeRefactored } from './InfinityModeRefactored.js';
import { BattleModeRefactored } from './BattleModeRefactored.js';
import { SprintModeRefactored } from './SprintModeRefactored.js';
import { BlitzModeRefactored } from './BlitzModeRefactored.js';
import { MarathonModeRefactored } from './MarathonModeRefactored.js';

export class ModeFactoryRefactored {
    static modeRegistry = {
        'marathon': InfinityModeRefactored, // Marathon uses infinity mode
        'infinity': InfinityModeRefactored,
        'sprint': SprintModeRefactored,
        'blitz': BlitzModeRefactored,
        'battle': BattleModeRefactored,
        'classic': MarathonModeRefactored
    };
    
    /**
     * Create a game mode instance
     */
    static createMode(app, modeName, config = {}) {
        const ModeClass = this.modeRegistry[modeName];
        
        if (!ModeClass) {
            console.warn(`Unknown mode: ${modeName}, falling back to classic`);
            return new GameRefactored(app, { ...config, mode: modeName });
        }
        
        return new ModeClass(app, config);
    }
    
    /**
     * Register a custom mode
     */
    static registerMode(name, ModeClass) {
        this.modeRegistry[name] = ModeClass;
    }
    
    /**
     * Get available modes
     */
    static getAvailableModes() {
        return Object.keys(this.modeRegistry);
    }
    
    /**
     * Get mode info
     */
    static getModeInfo(modeName) {
        const modes = {
            'marathon': {
                name: 'Marathon',
                description: 'Endless mode with increasing difficulty',
                icon: '♾️',
                difficulty: 'Medium'
            },
            'infinity': {
                name: 'Infinity',
                description: 'Endless mode with skills and items',
                icon: '⚡',
                difficulty: 'Hard'
            },
            'sprint': {
                name: 'Sprint',
                description: 'Clear 40 lines as fast as possible',
                icon: '🏃',
                difficulty: 'Easy'
            },
            'blitz': {
                name: 'Blitz',
                description: '2-minute score attack',
                icon: '⚡',
                difficulty: 'Medium'
            },
            'battle': {
                name: 'Battle',
                description: '1v1 battle with garbage attacks',
                icon: '⚔️',
                difficulty: 'Hard'
            },
            'classic': {
                name: 'Classic',
                description: 'Traditional Tetris gameplay',
                icon: '🎮',
                difficulty: 'Easy'
            }
        };
        
        return modes[modeName] || {
            name: modeName,
            description: 'Custom game mode',
            icon: '🎯',
            difficulty: 'Unknown'
        };
    }
}