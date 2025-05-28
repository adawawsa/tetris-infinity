/**
 * ReplaySystem - Complete replay recording and playback system
 * Supports frame-perfect replay with compression and validation
 */
import { GameState } from './GameState.js';
import { EventRecorder, EventReplayer } from './EventSystem.js';
import { Command, CommandRegistry } from './CommandSystem.js';

export class ReplayRecorder {
    constructor() {
        this.recording = false;
        this.metadata = {};
        this.frames = [];
        this.commands = [];
        this.events = [];
        this.snapshots = new Map(); // Periodic state snapshots
        this.snapshotInterval = 600; // Every 10 seconds at 60 FPS
    }
    
    /**
     * Start recording a replay
     */
    startRecording(metadata = {}) {
        this.recording = true;
        this.metadata = {
            version: '1.0.0',
            timestamp: Date.now(),
            mode: metadata.mode || 'marathon',
            seed: metadata.seed || 0,
            playerId: metadata.playerId || 'anonymous',
            playerName: metadata.playerName || 'Player',
            ...metadata
        };
        
        this.frames = [];
        this.commands = [];
        this.events = [];
        this.snapshots.clear();
    }
    
    /**
     * Stop recording and return replay data
     */
    stopRecording() {
        this.recording = false;
        this.metadata.endTimestamp = Date.now();
        this.metadata.duration = this.metadata.endTimestamp - this.metadata.timestamp;
        this.metadata.frameCount = this.frames.length;
        
        return this.compress();
    }
    
    /**
     * Record a frame of gameplay
     */
    recordFrame(frameNumber, gameState, commands = []) {
        if (!this.recording) return;
        
        // Record commands for this frame
        if (commands.length > 0) {
            this.commands.push({
                frame: frameNumber,
                commands: commands.map(cmd => cmd.serialize())
            });
        }
        
        // Take periodic snapshots for faster seeking
        if (frameNumber % this.snapshotInterval === 0) {
            this.snapshots.set(frameNumber, gameState.createSnapshot());
        }
        
        // Record frame data (delta compression)
        const frameData = this.createFrameDelta(frameNumber, gameState);
        if (frameData) {
            this.frames.push(frameData);
        }
    }
    
    /**
     * Record a game event
     */
    recordEvent(event) {
        if (!this.recording) return;
        
        this.events.push({
            frame: event.frame,
            type: event.type,
            data: event.data
        });
    }
    
    /**
     * Create delta between current and previous frame
     */
    createFrameDelta(frameNumber, gameState) {
        // For first frame or snapshot frames, store full state
        if (frameNumber === 0 || frameNumber % this.snapshotInterval === 0) {
            return null; // Handled by snapshots
        }
        
        // Otherwise, store only what changed
        const delta = {
            frame: frameNumber
        };
        
        // Check what changed
        if (gameState.score !== this.lastScore) {
            delta.score = gameState.score;
            this.lastScore = gameState.score;
        }
        
        if (gameState.lines !== this.lastLines) {
            delta.lines = gameState.lines;
            this.lastLines = gameState.lines;
        }
        
        if (gameState.level !== this.lastLevel) {
            delta.level = gameState.level;
            this.lastLevel = gameState.level;
        }
        
        // Only store if something changed
        return Object.keys(delta).length > 1 ? delta : null;
    }
    
    /**
     * Compress replay data
     */
    compress() {
        const replayData = {
            metadata: this.metadata,
            snapshots: Array.from(this.snapshots.entries()).map(([frame, snapshot]) => ({
                frame,
                state: snapshot.state
            })),
            commands: this.commands,
            events: this.events,
            frames: this.frames
        };
        
        // Convert to JSON and compress (in production, would use actual compression)
        const json = JSON.stringify(replayData);
        
        return {
            format: 'TIE_REPLAY_V1',
            compressed: false, // Would be true with real compression
            size: json.length,
            data: json,
            checksum: this.calculateChecksum(json)
        };
    }
    
    /**
     * Calculate checksum for validation
     */
    calculateChecksum(data) {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
}

export class ReplayPlayer {
    constructor(eventDispatcher) {
        this.eventDispatcher = eventDispatcher;
        this.playing = false;
        this.paused = false;
        this.replayData = null;
        this.currentFrame = 0;
        this.speed = 1.0;
        this.gameState = new GameState();
        
        // Playback state
        this.snapshots = new Map();
        this.commands = [];
        this.events = [];
        this.commandIndex = 0;
        this.eventIndex = 0;
        
        // Timing
        this.startTime = 0;
        this.pauseTime = 0;
        this.frameTime = 1000 / 60; // 60 FPS
    }
    
    /**
     * Load replay data
     */
    load(replayFile) {
        try {
            // Parse replay file
            const data = JSON.parse(replayFile.data);
            
            // Validate format
            if (replayFile.format !== 'TIE_REPLAY_V1') {
                throw new Error('Invalid replay format');
            }
            
            // Validate checksum
            const checksum = this.calculateChecksum(replayFile.data);
            if (checksum !== replayFile.checksum) {
                console.warn('Replay checksum mismatch');
            }
            
            // Load data
            this.replayData = data;
            this.metadata = data.metadata;
            
            // Load snapshots
            this.snapshots.clear();
            for (let snapshot of data.snapshots) {
                this.snapshots.set(snapshot.frame, snapshot.state);
            }
            
            // Load commands and events
            this.commands = data.commands || [];
            this.events = data.events || [];
            
            // Initialize to first frame
            this.seek(0);
            
            return true;
            
        } catch (error) {
            console.error('Failed to load replay:', error);
            return false;
        }
    }
    
    /**
     * Start playback
     */
    play(speed = 1.0) {
        if (!this.replayData || this.playing) return;
        
        this.playing = true;
        this.paused = false;
        this.speed = speed;
        this.startTime = performance.now() - (this.currentFrame * this.frameTime / this.speed);
        
        this.playbackLoop();
    }
    
    /**
     * Pause playback
     */
    pause() {
        this.paused = true;
        this.pauseTime = performance.now();
    }
    
    /**
     * Resume playback
     */
    resume() {
        if (!this.paused) return;
        
        this.paused = false;
        const pauseDuration = performance.now() - this.pauseTime;
        this.startTime += pauseDuration;
        
        this.playbackLoop();
    }
    
    /**
     * Stop playback
     */
    stop() {
        this.playing = false;
        this.paused = false;
        this.seek(0);
    }
    
    /**
     * Main playback loop
     */
    playbackLoop() {
        if (!this.playing || this.paused) return;
        
        const currentTime = performance.now();
        const targetFrame = Math.floor((currentTime - this.startTime) * this.speed / this.frameTime);
        
        // Process frames up to target
        while (this.currentFrame < targetFrame && this.currentFrame < this.metadata.frameCount) {
            this.processFrame(this.currentFrame);
            this.currentFrame++;
        }
        
        // Check if replay finished
        if (this.currentFrame >= this.metadata.frameCount) {
            this.stop();
            this.eventDispatcher.emit({ type: 'replay:finished' });
            return;
        }
        
        // Continue playback
        requestAnimationFrame(() => this.playbackLoop());
    }
    
    /**
     * Process a single frame
     */
    processFrame(frameNumber) {
        // Apply any commands for this frame
        while (this.commandIndex < this.commands.length && 
               this.commands[this.commandIndex].frame === frameNumber) {
            const frameCommands = this.commands[this.commandIndex];
            
            for (let cmdData of frameCommands.commands) {
                const command = Command.deserialize(cmdData);
                command.execute(this.gameState);
            }
            
            this.commandIndex++;
        }
        
        // Emit any events for this frame
        while (this.eventIndex < this.events.length &&
               this.events[this.eventIndex].frame === frameNumber) {
            const event = this.events[this.eventIndex];
            
            this.eventDispatcher.emit({
                type: event.type,
                data: event.data,
                source: 'replay'
            });
            
            this.eventIndex++;
        }
        
        // Update game state
        this.gameState.advanceFrame();
        
        // Emit frame update
        this.eventDispatcher.emit({
            type: 'replay:frame',
            data: {
                frame: frameNumber,
                state: this.gameState.serialize()
            }
        });
    }
    
    /**
     * Seek to specific frame
     */
    seek(targetFrame) {
        // Find nearest snapshot before target
        let snapshotFrame = 0;
        let snapshotState = null;
        
        for (let [frame, state] of this.snapshots) {
            if (frame <= targetFrame && frame > snapshotFrame) {
                snapshotFrame = frame;
                snapshotState = state;
            }
        }
        
        // Restore from snapshot
        if (snapshotState) {
            this.gameState.deserialize(snapshotState);
            this.currentFrame = snapshotFrame;
        } else {
            // Start from beginning
            this.gameState.initialize({
                seed: this.metadata.seed,
                width: 10,
                height: 20
            });
            this.currentFrame = 0;
        }
        
        // Reset command and event indices
        this.commandIndex = this.commands.findIndex(cmd => cmd.frame > snapshotFrame);
        if (this.commandIndex === -1) this.commandIndex = this.commands.length;
        
        this.eventIndex = this.events.findIndex(evt => evt.frame > snapshotFrame);
        if (this.eventIndex === -1) this.eventIndex = this.events.length;
        
        // Process frames up to target
        while (this.currentFrame < targetFrame) {
            this.processFrame(this.currentFrame);
            this.currentFrame++;
        }
    }
    
    /**
     * Get current playback info
     */
    getPlaybackInfo() {
        return {
            playing: this.playing,
            paused: this.paused,
            currentFrame: this.currentFrame,
            totalFrames: this.metadata?.frameCount || 0,
            speed: this.speed,
            currentTime: this.currentFrame * this.frameTime / 1000,
            totalTime: (this.metadata?.frameCount || 0) * this.frameTime / 1000
        };
    }
    
    /**
     * Set playback speed
     */
    setSpeed(speed) {
        this.speed = Math.max(0.25, Math.min(4.0, speed));
        
        if (this.playing && !this.paused) {
            // Adjust start time to maintain current position
            this.startTime = performance.now() - (this.currentFrame * this.frameTime / this.speed);
        }
    }
    
    /**
     * Export current state as snapshot
     */
    exportSnapshot() {
        return {
            frame: this.currentFrame,
            state: this.gameState.serialize(),
            metadata: this.metadata
        };
    }
    
    calculateChecksum(data) {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
}

/**
 * Replay Manager - Handles replay storage and retrieval
 */
export class ReplayManager {
    constructor() {
        this.replays = new Map();
        this.maxReplays = 100;
        this.storageKey = 'tetris_infinity_replays';
        
        this.loadFromStorage();
    }
    
    /**
     * Save a replay
     */
    saveReplay(replayData, metadata = {}) {
        const id = this.generateReplayId();
        
        const replay = {
            id,
            name: metadata.name || `Replay ${new Date().toLocaleString()}`,
            timestamp: Date.now(),
            ...metadata,
            data: replayData
        };
        
        this.replays.set(id, replay);
        
        // Cleanup old replays if needed
        if (this.replays.size > this.maxReplays) {
            const oldestId = Array.from(this.replays.keys())[0];
            this.replays.delete(oldestId);
        }
        
        this.saveToStorage();
        
        return id;
    }
    
    /**
     * Load a replay
     */
    loadReplay(id) {
        return this.replays.get(id);
    }
    
    /**
     * Delete a replay
     */
    deleteReplay(id) {
        this.replays.delete(id);
        this.saveToStorage();
    }
    
    /**
     * Get all replays
     */
    getAllReplays() {
        return Array.from(this.replays.values()).map(replay => ({
            id: replay.id,
            name: replay.name,
            timestamp: replay.timestamp,
            mode: replay.data.metadata.mode,
            score: replay.data.metadata.finalScore,
            duration: replay.data.metadata.duration
        }));
    }
    
    /**
     * Generate unique replay ID
     */
    generateReplayId() {
        return `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Save to local storage
     */
    saveToStorage() {
        try {
            const data = Array.from(this.replays.entries());
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save replays to storage:', error);
        }
    }
    
    /**
     * Load from local storage
     */
    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const entries = JSON.parse(data);
                this.replays = new Map(entries);
            }
        } catch (error) {
            console.error('Failed to load replays from storage:', error);
        }
    }
    
    /**
     * Export replay to file
     */
    exportReplay(id) {
        const replay = this.replays.get(id);
        if (!replay) return null;
        
        const blob = new Blob([JSON.stringify(replay.data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${replay.name.replace(/[^a-z0-9]/gi, '_')}.tie-replay`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * Import replay from file
     */
    async importReplay(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Validate replay format
            if (data.format !== 'TIE_REPLAY_V1') {
                throw new Error('Invalid replay format');
            }
            
            return this.saveReplay(data, {
                name: file.name.replace('.tie-replay', ''),
                imported: true
            });
            
        } catch (error) {
            console.error('Failed to import replay:', error);
            return null;
        }
    }
}

export default {
    ReplayRecorder,
    ReplayPlayer,
    ReplayManager
};