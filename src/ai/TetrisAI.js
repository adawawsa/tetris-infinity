export class TetrisAI {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        
        // AI parameters based on difficulty
        this.params = this.getAIParams(difficulty);
        
        // AI state
        this.thinkingTime = 0;
        this.targetMove = null;
        this.moveQueue = [];
        
        // Performance tracking
        this.movesEvaluated = 0;
        this.bestScore = -Infinity;
    }
    
    getAIParams(difficulty) {
        const params = {
            easy: {
                thinkDelay: 800,
                mistakeChance: 0.3,
                evaluationDepth: 0,
                weights: {
                    height: -0.5,
                    holes: -1.0,
                    bumpiness: -0.2,
                    lines: 1.0,
                    perfectClear: 5.0
                }
            },
            medium: {
                thinkDelay: 400,
                mistakeChance: 0.1,
                evaluationDepth: 1,
                weights: {
                    height: -0.8,
                    holes: -3.0,
                    bumpiness: -0.5,
                    lines: 2.0,
                    perfectClear: 10.0,
                    tetris: 5.0
                }
            },
            hard: {
                thinkDelay: 200,
                mistakeChance: 0.02,
                evaluationDepth: 2,
                weights: {
                    height: -1.0,
                    holes: -5.0,
                    bumpiness: -0.8,
                    lines: 3.0,
                    perfectClear: 20.0,
                    tetris: 8.0,
                    tSpin: 6.0
                }
            },
            extreme: {
                thinkDelay: 50,
                mistakeChance: 0,
                evaluationDepth: 3,
                weights: {
                    height: -1.5,
                    holes: -10.0,
                    bumpiness: -1.0,
                    lines: 4.0,
                    perfectClear: 30.0,
                    tetris: 10.0,
                    tSpin: 8.0,
                    combo: 2.0
                }
            }
        };
        
        return params[difficulty] || params.medium;
    }
    
    update(deltaTime, game) {
        this.thinkingTime += deltaTime;
        
        // Only think after delay (simulates human reaction time)
        if (this.thinkingTime < this.params.thinkDelay) {
            return;
        }
        
        // If we don't have a target move, calculate one
        if (!this.targetMove && game.currentPiece) {
            this.targetMove = this.findBestMove(game);
            this.generateMoveSequence(game);
        }
        
        // Execute moves from queue
        if (this.moveQueue.length > 0) {
            const move = this.moveQueue.shift();
            this.executeMove(move, game);
        }
    }
    
    findBestMove(game) {
        if (!game.currentPiece) return null;
        
        const board = game.board;
        const piece = game.currentPiece;
        const gameLogic = game.gameLogic;
        
        // Get all possible placements
        const placements = gameLogic.getAllPossiblePlacements(piece, board);
        
        let bestPlacement = null;
        let bestScore = -Infinity;
        this.movesEvaluated = 0;
        
        // Evaluate each placement
        for (const placement of placements) {
            const score = this.evaluatePlacement(placement, board, game);
            this.movesEvaluated++;
            
            if (score > bestScore) {
                bestScore = score;
                bestPlacement = placement;
            }
        }
        
        // Add random mistakes based on difficulty
        if (Math.random() < this.params.mistakeChance && placements.length > 1) {
            // Pick a random placement instead
            const randomIndex = Math.floor(Math.random() * Math.min(5, placements.length));
            bestPlacement = placements[randomIndex];
        }
        
        this.bestScore = bestScore;
        return bestPlacement;
    }
    
    evaluatePlacement(placement, board, game) {
        // Clone board to test placement
        const testBoard = this.cloneBoard(board);
        
        // Place piece on test board
        this.placePieceOnBoard(placement, testBoard);
        
        // Clear lines and get count
        const clearedLines = this.getClearedLines(testBoard);
        const numCleared = clearedLines.length;
        
        // Remove cleared lines from test board
        this.removeLines(testBoard, clearedLines);
        
        // Calculate board metrics
        const metrics = this.calculateBoardMetrics(testBoard);
        
        // Calculate score based on weights
        let score = 0;
        const weights = this.params.weights;
        
        score += metrics.aggregateHeight * weights.height;
        score += metrics.holes * weights.holes;
        score += metrics.bumpiness * weights.bumpiness;
        score += numCleared * weights.lines;
        
        // Bonus for special clears
        if (numCleared === 4 && weights.tetris) {
            score += weights.tetris;
        }
        
        if (metrics.isPerfectClear && weights.perfectClear) {
            score += weights.perfectClear;
        }
        
        // Look ahead evaluation for higher difficulties
        if (this.params.evaluationDepth > 0 && game.nextPieces.length > 0) {
            score += this.lookAheadEvaluation(testBoard, game, this.params.evaluationDepth);
        }
        
        return score;
    }
    
    lookAheadEvaluation(board, game, depth) {
        if (depth <= 0 || !game.nextPieces[0]) return 0;
        
        // Simplified look-ahead: evaluate best placement for next piece
        const nextPiece = game.nextPieces[0];
        const placements = game.gameLogic.getAllPossiblePlacements(nextPiece, board);
        
        let bestScore = -Infinity;
        
        for (const placement of placements) {
            const testBoard = this.cloneBoard(board);
            this.placePieceOnBoard(placement, testBoard);
            
            const metrics = this.calculateBoardMetrics(testBoard);
            const score = this.calculateMetricScore(metrics);
            
            if (score > bestScore) {
                bestScore = score;
            }
        }
        
        return bestScore * 0.5; // Discount future rewards
    }
    
    calculateBoardMetrics(board) {
        const heights = this.getColumnHeights(board);
        const aggregateHeight = heights.reduce((sum, h) => sum + h, 0);
        const holes = this.countHoles(board);
        const bumpiness = this.calculateBumpiness(heights);
        const isPerfectClear = this.isPerfectClear(board);
        
        return {
            aggregateHeight,
            holes,
            bumpiness,
            isPerfectClear,
            maxHeight: Math.max(...heights)
        };
    }
    
    calculateMetricScore(metrics) {
        const weights = this.params.weights;
        let score = 0;
        
        score += metrics.aggregateHeight * weights.height;
        score += metrics.holes * weights.holes;
        score += metrics.bumpiness * weights.bumpiness;
        
        if (metrics.isPerfectClear) {
            score += weights.perfectClear;
        }
        
        return score;
    }
    
    generateMoveSequence(game) {
        if (!this.targetMove || !game.currentPiece) {
            this.moveQueue = [];
            return;
        }
        
        this.moveQueue = [];
        const current = game.currentPiece;
        const target = this.targetMove;
        
        // Calculate rotation moves
        const rotationDiff = (target.rotation - current.rotation + 4) % 4;
        for (let i = 0; i < rotationDiff; i++) {
            this.moveQueue.push({ type: 'rotate', direction: 1 });
        }
        
        // Calculate horizontal moves
        const horizontalDiff = target.x - current.x;
        const moveDirection = horizontalDiff > 0 ? 'right' : 'left';
        const moveCount = Math.abs(horizontalDiff);
        
        for (let i = 0; i < moveCount; i++) {
            this.moveQueue.push({ type: 'move', direction: moveDirection });
        }
        
        // Add hard drop
        this.moveQueue.push({ type: 'drop' });
        
        // Reset for next piece
        this.targetMove = null;
        this.thinkingTime = 0;
    }
    
    executeMove(move, game) {
        switch (move.type) {
            case 'move':
                if (move.direction === 'left') {
                    game.moveLeft();
                } else {
                    game.moveRight();
                }
                break;
            case 'rotate':
                game.rotate(move.direction);
                break;
            case 'drop':
                game.hardDrop();
                break;
        }
    }
    
    // Utility methods
    cloneBoard(board) {
        return {
            width: board.width,
            height: board.height,
            grid: board.grid.map(row => [...row])
        };
    }
    
    placePieceOnBoard(placement, board) {
        const shape = this.getShapeForRotation(placement.piece, placement.rotation);
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const boardX = placement.x + col;
                    const boardY = placement.y + row;
                    
                    if (boardY >= 0 && boardY < board.height && 
                        boardX >= 0 && boardX < board.width) {
                        board.grid[boardY][boardX] = shape[row][col];
                    }
                }
            }
        }
    }
    
    getShapeForRotation(pieceType, rotation) {
        // This would need access to the actual piece shapes
        // For now, return a placeholder
        const shapes = {
            'I': [[[1,1,1,1]], [[1],[1],[1],[1]]],
            'O': [[[1,1],[1,1]]],
            'T': [[[0,1,0],[1,1,1]], [[1,0],[1,1],[1,0]]],
            // ... etc
        };
        
        return shapes[pieceType]?.[rotation % 2] || [[1]];
    }
    
    getClearedLines(board) {
        const clearedLines = [];
        
        for (let y = 0; y < board.height; y++) {
            let full = true;
            for (let x = 0; x < board.width; x++) {
                if (board.grid[y][x] === 0) {
                    full = false;
                    break;
                }
            }
            if (full) {
                clearedLines.push(y);
            }
        }
        
        return clearedLines;
    }
    
    removeLines(board, lines) {
        lines.sort((a, b) => b - a);
        
        for (const line of lines) {
            board.grid.splice(line, 1);
            board.grid.unshift(Array(board.width).fill(0));
        }
    }
    
    getColumnHeights(board) {
        const heights = Array(board.width).fill(0);
        
        for (let x = 0; x < board.width; x++) {
            for (let y = 0; y < board.height; y++) {
                if (board.grid[y][x] > 0) {
                    heights[x] = board.height - y;
                    break;
                }
            }
        }
        
        return heights;
    }
    
    countHoles(board) {
        let holes = 0;
        
        for (let x = 0; x < board.width; x++) {
            let blockFound = false;
            
            for (let y = 0; y < board.height; y++) {
                if (board.grid[y][x] > 0) {
                    blockFound = true;
                } else if (blockFound) {
                    holes++;
                }
            }
        }
        
        return holes;
    }
    
    calculateBumpiness(heights) {
        let bumpiness = 0;
        
        for (let i = 0; i < heights.length - 1; i++) {
            bumpiness += Math.abs(heights[i] - heights[i + 1]);
        }
        
        return bumpiness;
    }
    
    isPerfectClear(board) {
        for (let y = 0; y < board.height; y++) {
            for (let x = 0; x < board.width; x++) {
                if (board.grid[y][x] > 0) {
                    return false;
                }
            }
        }
        return true;
    }
    
    // Debug info
    getDebugInfo() {
        return {
            difficulty: this.difficulty,
            movesEvaluated: this.movesEvaluated,
            bestScore: this.bestScore.toFixed(2),
            queueLength: this.moveQueue.length
        };
    }
}