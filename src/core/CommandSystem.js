/**
 * CommandSystem - Command pattern implementation for input handling
 * Supports rollback, replay, and network synchronization
 */
export class Command {
    constructor(type, data = {}) {
        this.type = type;
        this.data = data;
        this.frame = null;
        this.timestamp = Date.now();
        this.playerId = data.playerId || 'local';
    }

    execute(gameState) {
        throw new Error('Command.execute() must be implemented');
    }

    undo(gameState) {
        throw new Error('Command.undo() must be implemented');
    }

    serialize() {
        return {
            type: this.type,
            data: this.data,
            frame: this.frame,
            timestamp: this.timestamp,
            playerId: this.playerId
        };
    }

    static deserialize(data) {
        const CommandClass = CommandRegistry[data.type];
        if (!CommandClass) {
            throw new Error(`Unknown command type: ${data.type}`);
        }
        const command = new CommandClass(data.data);
        command.frame = data.frame;
        command.timestamp = data.timestamp;
        command.playerId = data.playerId;
        return command;
    }
}

/**
 * Movement Commands
 */
export class MoveCommand extends Command {
    constructor(data) {
        super('move', data);
    }

    execute(gameState) {
        const piece = gameState.currentPiece;
        if (!piece) return false;

        const newX = piece.x + this.data.dx;
        const newY = piece.y + this.data.dy;

        // Validate move
        if (this.isValidPosition(gameState, newX, newY, piece.rotation)) {
            piece.x = newX;
            piece.y = newY;
            gameState.addEvent('pieceMoved', { dx: this.data.dx, dy: this.data.dy });
            return true;
        }
        return false;
    }

    undo(gameState) {
        const piece = gameState.currentPiece;
        if (!piece) return;
        
        piece.x -= this.data.dx;
        piece.y -= this.data.dy;
    }

    isValidPosition(gameState, x, y, rotation) {
        // Implementation would check collision with board
        return true; // Placeholder
    }
}

export class RotateCommand extends Command {
    constructor(data) {
        super('rotate', data);
    }

    execute(gameState) {
        const piece = gameState.currentPiece;
        if (!piece) return false;

        const direction = this.data.direction || 1;
        const oldRotation = piece.rotation;
        const newRotation = (piece.rotation + direction + 4) % 4;

        // Try base rotation
        piece.rotation = newRotation;
        if (this.isValidPosition(gameState, piece.x, piece.y, newRotation)) {
            gameState.addEvent('pieceRotated', { direction });
            return true;
        }

        // Try wall kicks (SRS)
        const kicks = this.getWallKicks(piece.type, oldRotation, newRotation);
        for (let kick of kicks) {
            if (this.isValidPosition(gameState, piece.x + kick.x, piece.y + kick.y, newRotation)) {
                piece.x += kick.x;
                piece.y += kick.y;
                gameState.addEvent('pieceRotated', { direction, kick });
                return true;
            }
        }

        // Rotation failed
        piece.rotation = oldRotation;
        return false;
    }

    undo(gameState) {
        const piece = gameState.currentPiece;
        if (!piece) return;
        
        piece.rotation = (piece.rotation - this.data.direction + 4) % 4;
    }

    getWallKicks(pieceType, fromRotation, toRotation) {
        // SRS wall kick data - simplified
        return [
            { x: -1, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: -1 },
            { x: -1, y: -1 },
            { x: 1, y: -1 }
        ];
    }

    isValidPosition(gameState, x, y, rotation) {
        // Implementation would check collision with board
        return true; // Placeholder
    }
}

export class HardDropCommand extends Command {
    constructor(data) {
        super('hardDrop', data);
        this.dropDistance = 0;
    }

    execute(gameState) {
        const piece = gameState.currentPiece;
        if (!piece) return false;

        // Find landing position
        let dropY = piece.y;
        while (this.isValidPosition(gameState, piece.x, dropY + 1, piece.rotation)) {
            dropY++;
        }

        this.dropDistance = dropY - piece.y;
        piece.y = dropY;
        
        // Lock piece and spawn next
        this.lockPiece(gameState);
        gameState.addEvent('hardDrop', { distance: this.dropDistance });
        return true;
    }

    undo(gameState) {
        // Hard drop is typically not undoable
        // Would need to restore entire game state
    }

    lockPiece(gameState) {
        // Place piece on board
        // Clear lines
        // Update score
        // Spawn next piece
    }

    isValidPosition(gameState, x, y, rotation) {
        return true; // Placeholder
    }
}

export class HoldCommand extends Command {
    constructor(data) {
        super('hold', data);
        this.previousHeld = null;
    }

    execute(gameState) {
        if (!gameState.currentPiece) return false;

        this.previousHeld = gameState.heldPiece;
        const temp = gameState.heldPiece;
        gameState.heldPiece = gameState.currentPiece;
        gameState.currentPiece = temp || gameState.nextPieces.shift();
        
        // Reset position
        if (gameState.currentPiece) {
            gameState.currentPiece.x = 4;
            gameState.currentPiece.y = 0;
            gameState.currentPiece.rotation = 0;
        }
        
        gameState.addEvent('hold', {});
        return true;
    }

    undo(gameState) {
        gameState.currentPiece = gameState.heldPiece;
        gameState.heldPiece = this.previousHeld;
    }
}

/**
 * Command Queue for managing input buffering
 */
export class CommandQueue {
    constructor() {
        this.pendingCommands = [];
        this.executedCommands = [];
        this.maxHistory = 1000;
    }

    add(command) {
        this.pendingCommands.push(command);
    }

    processPending(gameState, currentFrame) {
        const toExecute = this.pendingCommands.filter(cmd => 
            cmd.frame <= currentFrame
        );

        for (let command of toExecute) {
            if (command.execute(gameState)) {
                this.executedCommands.push(command);
                if (this.executedCommands.length > this.maxHistory) {
                    this.executedCommands.shift();
                }
            }
        }

        this.pendingCommands = this.pendingCommands.filter(cmd => 
            cmd.frame > currentFrame
        );
    }

    rollback(toFrame) {
        const toUndo = this.executedCommands.filter(cmd => cmd.frame > toFrame);
        const toReplay = this.executedCommands.filter(cmd => cmd.frame <= toFrame);
        
        return {
            undo: toUndo.reverse(),
            replay: toReplay
        };
    }

    clear() {
        this.pendingCommands = [];
        this.executedCommands = [];
    }

    serialize() {
        return {
            pending: this.pendingCommands.map(cmd => cmd.serialize()),
            executed: this.executedCommands.slice(-100).map(cmd => cmd.serialize())
        };
    }
}

/**
 * Command Registry for deserialization
 */
export const CommandRegistry = {
    'move': MoveCommand,
    'rotate': RotateCommand,
    'hardDrop': HardDropCommand,
    'hold': HoldCommand
};

/**
 * Input Buffer for smooth gameplay
 */
export class InputBuffer {
    constructor(bufferSize = 5) {
        this.buffer = [];
        this.bufferSize = bufferSize;
        this.lastProcessedFrame = 0;
    }

    addInput(input, frame) {
        // Add to buffer with frame timestamp
        this.buffer.push({
            input,
            frame,
            timestamp: Date.now()
        });

        // Keep buffer size limited
        if (this.buffer.length > this.bufferSize * 2) {
            this.buffer = this.buffer.slice(-this.bufferSize);
        }
    }

    getInputsForFrame(frame) {
        const inputs = this.buffer.filter(item => 
            item.frame === frame && item.frame > this.lastProcessedFrame
        );
        
        if (inputs.length > 0) {
            this.lastProcessedFrame = frame;
        }
        
        return inputs.map(item => item.input);
    }

    clear() {
        this.buffer = [];
        this.lastProcessedFrame = 0;
    }
}

export default {
    Command,
    MoveCommand,
    RotateCommand,
    HardDropCommand,
    HoldCommand,
    CommandQueue,
    InputBuffer,
    CommandRegistry
};