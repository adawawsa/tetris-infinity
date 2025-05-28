/**
 * PuzzleMode - Pre-made puzzle challenges
 */
import { GameMode } from './GameMode.js';

export class PuzzleMode extends GameMode {
    constructor(game, config = {}) {
        super(game, config);
        
        this.name = 'puzzle';
        this.description = 'Solve puzzles';
        
        this.currentPuzzle = null;
        this.puzzleIndex = 0;
        this.puzzles = config.puzzles || [];
    }
    
    setupVictoryConditions() {
        this.victoryConditions.push({
            name: 'puzzle_solved',
            check: () => this.isPuzzleSolved()
        });
    }
    
    loadPuzzle(puzzleData) {
        this.currentPuzzle = puzzleData;
        
        // Load board state
        this.game.gameState.board = puzzleData.board.map(row => [...row]);
        
        // Set available pieces
        this.game.gameState.nextPieces = puzzleData.pieces || [];
        
        // Set objective
        this.objective = puzzleData.objective;
    }
    
    isPuzzleSolved() {
        if (!this.currentPuzzle) return false;
        
        switch (this.objective.type) {
            case 'clear_all':
                return this.game.gameState.board.every(row => 
                    row.every(cell => cell === 0)
                );
            
            case 'clear_lines':
                return this.game.gameState.lines >= this.objective.target;
            
            case 'survive':
                return this.game.gameState.piecesPlaced >= this.objective.pieces;
            
            default:
                return false;
        }
    }
}

export default PuzzleMode;