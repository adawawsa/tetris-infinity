import { TETROMINOS, WALL_KICKS } from '../config/GameConfig.js';
import { Piece } from './Piece.js';

export class GameLogic {
    constructor(game) {
        this.game = game;
        this.bag = [];
    }
    
    isValidPosition(piece, board) {
        const shape = piece.getShape();
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const boardX = piece.x + col;
                    const boardY = piece.y + row;
                    
                    // Check boundaries
                    if (boardX < 0 || boardX >= board.width || boardY >= board.height) {
                        return false;
                    }
                    
                    // Check collision with existing blocks
                    if (boardY >= 0 && board.getCell(boardX, boardY) > 0) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
    
    generateBag() {
        // 7-bag randomizer
        const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        const bag = [];
        
        // Shuffle pieces
        for (let i = pieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }
        
        // Create piece objects
        for (const type of pieces) {
            bag.push(new Piece(type));
        }
        
        return bag;
    }
    
    getWallKicks(pieceType, fromRotation, toRotation) {
        if (pieceType === 'O') {
            return [[0, 0]]; // O piece doesn't need wall kicks
        }
        
        const kickTable = pieceType === 'I' ? WALL_KICKS.I : WALL_KICKS.JLSTZ;
        const kickKey = `${fromRotation}>${toRotation}`;
        
        return kickTable[kickKey] || [[0, 0]];
    }
    
    // Calculate drop location for a piece
    getDropPosition(piece, board) {
        const testPiece = piece.clone();
        
        while (this.isValidPosition(testPiece, board)) {
            testPiece.y++;
        }
        
        testPiece.y--;
        return testPiece.y;
    }
    
    // Check if a piece can be placed at a specific position
    canPlacePiece(piece, x, y, rotation, board) {
        const testPiece = piece.clone();
        testPiece.x = x;
        testPiece.y = y;
        testPiece.rotation = rotation;
        
        return this.isValidPosition(testPiece, board);
    }
    
    // Get all possible valid placements for a piece
    getAllPossiblePlacements(piece, board) {
        const placements = [];
        const pieceTypes = TETROMINOS[piece.type];
        const numRotations = pieceTypes.rotations.length;
        
        for (let rotation = 0; rotation < numRotations; rotation++) {
            const testPiece = piece.clone();
            testPiece.rotation = rotation;
            
            // Try all x positions
            for (let x = -3; x < board.width + 3; x++) {
                testPiece.x = x;
                testPiece.y = 0;
                
                // Check if piece can exist at this x position
                if (!this.isValidPosition(testPiece, board)) {
                    continue;
                }
                
                // Find drop position
                const dropY = this.getDropPosition(testPiece, board);
                
                placements.push({
                    x: x,
                    y: dropY,
                    rotation: rotation,
                    piece: piece.type
                });
            }
        }
        
        return placements;
    }
    
    // Evaluate board state (for AI)
    evaluateBoard(board) {
        const heights = board.getColumnHeights();
        const holes = board.getHoles();
        const bumpiness = board.getBumpiness();
        const maxHeight = Math.max(...heights);
        const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
        
        // Weights for different factors
        const weights = {
            holes: -10,
            bumpiness: -2,
            maxHeight: -3,
            avgHeight: -1,
            completedLines: 100
        };
        
        let score = 0;
        score += holes * weights.holes;
        score += bumpiness * weights.bumpiness;
        score += maxHeight * weights.maxHeight;
        score += avgHeight * weights.avgHeight;
        
        return score;
    }
    
    // Check for potential T-spins
    checkTSpin(piece, board, lastMoveWasRotation) {
        if (piece.type !== 'T' || !lastMoveWasRotation) {
            return { isTSpin: false, isMini: false };
        }
        
        const shape = piece.getShape();
        const centerX = piece.x + 1;
        const centerY = piece.y + 1;
        
        // Check the four corners of the T piece's 3x3 bounding box
        const corners = [
            { x: piece.x, y: piece.y },         // Top-left
            { x: piece.x + 2, y: piece.y },     // Top-right
            { x: piece.x, y: piece.y + 2 },     // Bottom-left
            { x: piece.x + 2, y: piece.y + 2 }  // Bottom-right
        ];
        
        let filledCorners = 0;
        let filledFrontCorners = 0;
        
        // Determine which corners are "front" based on rotation
        const frontCornerIndices = [
            [0, 1], // Rotation 0: top corners
            [1, 3], // Rotation 1: right corners
            [2, 3], // Rotation 2: bottom corners
            [0, 2]  // Rotation 3: left corners
        ][piece.rotation];
        
        corners.forEach((corner, index) => {
            const isFilled = !board.isValidPosition(corner.x, corner.y) || 
                           board.getCell(corner.x, corner.y) > 0;
            
            if (isFilled) {
                filledCorners++;
                if (frontCornerIndices.includes(index)) {
                    filledFrontCorners++;
                }
            }
        });
        
        // T-Spin detection rules
        const isTSpin = filledCorners >= 3;
        const isMini = isTSpin && filledFrontCorners < 2;
        
        return { isTSpin, isMini };
    }
    
    // Check for perfect clear
    checkPerfectClear(board) {
        for (let y = 0; y < board.height; y++) {
            for (let x = 0; x < board.width; x++) {
                if (board.grid[y][x] > 0) {
                    return false;
                }
            }
        }
        return true;
    }
}