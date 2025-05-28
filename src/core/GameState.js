/**
 * GameState - Centralized state management for deterministic gameplay
 * Supports serialization for replay and network synchronization
 */
export class GameState {
    constructor() {
        this.frame = 0;
        this.seed = null;
        this.board = null;
        this.currentPiece = null;
        this.nextPieces = [];
        this.heldPiece = null;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.combo = 0;
        this.backToBack = false;
        this.garbage = [];
        this.gameStatus = 'idle'; // idle, playing, paused, gameover
        this.players = new Map(); // For multiplayer
        this.events = []; // Frame-based event log
    }

    /**
     * Initialize state with seed for deterministic randomization
     */
    initialize(config = {}) {
        this.frame = 0;
        this.seed = config.seed || Date.now();
        this.board = new Array(config.height || 20).fill(null)
            .map(() => new Array(config.width || 10).fill(0));
        this.gameStatus = 'idle';
        this.events = [];
        this.garbage = [];
        
        // Initialize player state
        if (config.playerId) {
            this.players.set(config.playerId, {
                id: config.playerId,
                board: this.board,
                score: 0,
                lines: 0,
                alive: true
            });
        }
    }

    /**
     * Serialize state for network transmission or replay
     */
    serialize() {
        return {
            frame: this.frame,
            seed: this.seed,
            board: this.board.map(row => [...row]),
            currentPiece: this.currentPiece ? {
                type: this.currentPiece.type,
                x: this.currentPiece.x,
                y: this.currentPiece.y,
                rotation: this.currentPiece.rotation
            } : null,
            nextPieces: this.nextPieces.map(p => p.type),
            heldPiece: this.heldPiece?.type || null,
            score: this.score,
            level: this.level,
            lines: this.lines,
            combo: this.combo,
            backToBack: this.backToBack,
            garbage: [...this.garbage],
            gameStatus: this.gameStatus,
            events: this.events.slice(-100) // Keep last 100 events
        };
    }

    /**
     * Deserialize state from network or replay
     */
    deserialize(data) {
        this.frame = data.frame;
        this.seed = data.seed;
        this.board = data.board.map(row => [...row]);
        this.currentPiece = data.currentPiece;
        this.nextPieces = data.nextPieces;
        this.heldPiece = data.heldPiece;
        this.score = data.score;
        this.level = data.level;
        this.lines = data.lines;
        this.combo = data.combo;
        this.backToBack = data.backToBack;
        this.garbage = [...data.garbage];
        this.gameStatus = data.gameStatus;
        this.events = data.events || [];
    }

    /**
     * Create a snapshot for rollback/replay
     */
    createSnapshot() {
        return {
            state: this.serialize(),
            timestamp: Date.now()
        };
    }

    /**
     * Restore from snapshot
     */
    restoreSnapshot(snapshot) {
        this.deserialize(snapshot.state);
    }

    /**
     * Add event to frame-based log
     */
    addEvent(type, data) {
        this.events.push({
            frame: this.frame,
            type: type,
            data: data,
            timestamp: Date.now()
        });
        
        // Cleanup old events
        if (this.events.length > 1000) {
            this.events = this.events.slice(-500);
        }
    }

    /**
     * Get events for specific frame range
     */
    getEvents(startFrame, endFrame) {
        return this.events.filter(e => 
            e.frame >= startFrame && e.frame <= endFrame
        );
    }

    /**
     * Update frame counter
     */
    advanceFrame() {
        this.frame++;
    }

    /**
     * Check if state is valid (for anti-cheat)
     */
    validate() {
        // Check board dimensions
        if (!this.board || this.board.length === 0) return false;
        
        // Check for invalid cell values
        for (let row of this.board) {
            for (let cell of row) {
                if (cell < 0 || cell > 7) return false;
            }
        }
        
        // Check score/lines consistency
        if (this.score < 0 || this.lines < 0) return false;
        
        return true;
    }

    /**
     * Calculate state hash for verification
     */
    calculateHash() {
        const stateString = JSON.stringify({
            frame: this.frame,
            board: this.board,
            score: this.score,
            lines: this.lines
        });
        
        // Simple hash function for demo
        let hash = 0;
        for (let i = 0; i < stateString.length; i++) {
            const char = stateString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    /**
     * Apply delta update (for network sync)
     */
    applyDelta(delta) {
        if (delta.frame !== this.frame + 1) {
            console.warn('Frame mismatch in delta update');
            return false;
        }
        
        // Apply changes
        if (delta.board) this.board = delta.board;
        if (delta.currentPiece) this.currentPiece = delta.currentPiece;
        if (delta.score !== undefined) this.score = delta.score;
        if (delta.lines !== undefined) this.lines = delta.lines;
        if (delta.events) {
            this.events.push(...delta.events);
        }
        
        this.frame = delta.frame;
        return true;
    }

    /**
     * Generate delta between two frames
     */
    generateDelta(previousState) {
        const delta = {
            frame: this.frame,
            events: this.getEvents(previousState.frame + 1, this.frame)
        };
        
        // Only include changed values
        if (JSON.stringify(this.board) !== JSON.stringify(previousState.board)) {
            delta.board = this.board;
        }
        if (this.score !== previousState.score) {
            delta.score = this.score;
        }
        if (this.lines !== previousState.lines) {
            delta.lines = this.lines;
        }
        
        return delta;
    }
}

export default GameState;