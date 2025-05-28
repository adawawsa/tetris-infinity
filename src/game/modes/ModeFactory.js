/**
 * ModeFactory - Factory for creating and managing game modes
 */
import { MarathonMode } from './MarathonMode.js';
import { BattleRoyaleMode } from './BattleRoyaleMode.js';
import { BlitzMode } from './BlitzMode.js';
import { PuzzleMode } from './PuzzleMode.js';
import { CoopMode } from './CoopMode.js';

export class ModeFactory {
    constructor() {
        this.modes = new Map();
        this.registerDefaultModes();
    }
    
    /**
     * Register default game modes
     */
    registerDefaultModes() {
        this.register('marathon', MarathonMode, {
            name: 'Marathon',
            description: 'Clear 150 lines to win',
            icon: '🏃',
            category: 'single',
            unlocked: true
        });
        
        this.register('marathon_endless', MarathonMode, {
            name: 'Endless Marathon',
            description: 'Play forever, chase high scores',
            icon: '♾️',
            category: 'single',
            unlocked: true,
            config: { endless: true }
        });
        
        this.register('battle_royale', BattleRoyaleMode, {
            name: 'Battle Royale 99',
            description: '99 players, last one standing wins',
            icon: '👑',
            category: 'multiplayer',
            unlocked: true,
            requiresNetwork: true
        });
        
        this.register('blitz', BlitzMode, {
            name: '2-Minute Blitz',
            description: 'Score as high as possible in 2 minutes',
            icon: '⚡',
            category: 'single',
            unlocked: true
        });
        
        this.register('puzzle', PuzzleMode, {
            name: 'Puzzle Challenge',
            description: 'Solve pre-made puzzles',
            icon: '🧩',
            category: 'single',
            unlocked: true
        });
        
        this.register('coop', CoopMode, {
            name: 'Co-op Duo',
            description: 'Work together on one board',
            icon: '🤝',
            category: 'multiplayer',
            unlocked: false,
            requiresNetwork: true
        });
    }
    
    /**
     * Register a game mode
     */
    register(id, ModeClass, metadata = {}) {
        this.modes.set(id, {
            id,
            class: ModeClass,
            metadata: {
                name: metadata.name || id,
                description: metadata.description || '',
                icon: metadata.icon || '🎮',
                category: metadata.category || 'single',
                unlocked: metadata.unlocked !== false,
                requiresNetwork: metadata.requiresNetwork || false,
                config: metadata.config || {}
            }
        });
    }
    
    /**
     * Create a game mode instance
     */
    create(modeId, game, config = {}) {
        const modeInfo = this.modes.get(modeId);
        if (!modeInfo) {
            throw new Error(`Unknown game mode: ${modeId}`);
        }
        
        // Merge default config with provided config
        const finalConfig = {
            ...modeInfo.metadata.config,
            ...config
        };
        
        return new modeInfo.class(game, finalConfig);
    }
    
    /**
     * Get all available modes
     */
    getAllModes() {
        return Array.from(this.modes.values()).map(mode => ({
            id: mode.id,
            ...mode.metadata
        }));
    }
    
    /**
     * Get modes by category
     */
    getModesByCategory(category) {
        return this.getAllModes().filter(mode => mode.category === category);
    }
    
    /**
     * Get unlocked modes
     */
    getUnlockedModes() {
        return this.getAllModes().filter(mode => mode.unlocked);
    }
    
    /**
     * Check if mode requires network
     */
    requiresNetwork(modeId) {
        const modeInfo = this.modes.get(modeId);
        return modeInfo ? modeInfo.metadata.requiresNetwork : false;
    }
    
    /**
     * Unlock a mode
     */
    unlockMode(modeId) {
        const modeInfo = this.modes.get(modeId);
        if (modeInfo) {
            modeInfo.metadata.unlocked = true;
        }
    }
}


// Export singleton instance
export const modeFactory = new ModeFactory();

export default modeFactory;