/**
 * CoopMode - Cooperative two-player mode
 */
import { GameMode } from './GameMode.js';

export class CoopMode extends GameMode {
    constructor(game, config = {}) {
        super(game, config);
        
        this.name = 'coop';
        this.description = 'Cooperative gameplay';
        
        this.settings = {
            ...this.settings,
            sharedBoard: true,
            turnBased: config.turnBased || false,
            targetLines: 300
        };
        
        this.currentPlayer = 1;
        this.players = new Map();
    }
    
    setupVictoryConditions() {
        this.victoryConditions.push({
            name: 'target_reached',
            check: () => this.game.gameState.lines >= this.settings.targetLines
        });
    }
    
    switchPlayer() {
        if (this.settings.turnBased) {
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
            
            this.game.eventDispatcher.emit({
                type: 'coop:turn_change',
                data: { player: this.currentPlayer }
            });
        }
    }
}

export default CoopMode;