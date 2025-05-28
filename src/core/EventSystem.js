/**
 * EventSystem - Event-driven architecture for game state updates
 * Supports local and networked events with priority and queuing
 */
export class GameEvent {
    constructor(type, data = {}, options = {}) {
        this.id = this.generateId();
        this.type = type;
        this.data = data;
        this.timestamp = Date.now();
        this.frame = options.frame || null;
        this.priority = options.priority || EventPriority.NORMAL;
        this.source = options.source || 'local';
        this.targetId = options.targetId || null;
        this.processed = false;
    }

    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    serialize() {
        return {
            id: this.id,
            type: this.type,
            data: this.data,
            timestamp: this.timestamp,
            frame: this.frame,
            priority: this.priority,
            source: this.source,
            targetId: this.targetId
        };
    }

    static deserialize(data) {
        const event = new GameEvent(data.type, data.data, {
            frame: data.frame,
            priority: data.priority,
            source: data.source,
            targetId: data.targetId
        });
        event.id = data.id;
        event.timestamp = data.timestamp;
        return event;
    }
}

export const EventPriority = {
    CRITICAL: 0,    // System events, game over
    HIGH: 1,        // User inputs
    NORMAL: 2,      // Game state updates
    LOW: 3          // Visual effects, sounds
};

export const EventTypes = {
    // System Events
    GAME_START: 'game:start',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    GAME_OVER: 'game:over',
    
    // Input Events
    INPUT_MOVE: 'input:move',
    INPUT_ROTATE: 'input:rotate',
    INPUT_DROP: 'input:drop',
    INPUT_HOLD: 'input:hold',
    
    // Game Events
    PIECE_SPAWN: 'piece:spawn',
    PIECE_LOCK: 'piece:lock',
    PIECE_MOVE: 'piece:move',
    PIECE_ROTATE: 'piece:rotate',
    
    // Score Events
    LINES_CLEAR: 'lines:clear',
    SCORE_UPDATE: 'score:update',
    LEVEL_UP: 'level:up',
    
    // Multiplayer Events
    PLAYER_JOIN: 'player:join',
    PLAYER_LEAVE: 'player:leave',
    GARBAGE_SEND: 'garbage:send',
    GARBAGE_RECEIVE: 'garbage:receive',
    
    // Effect Events
    COMBO_START: 'combo:start',
    COMBO_END: 'combo:end',
    EFFECT_TRIGGER: 'effect:trigger'
};

/**
 * EventDispatcher - Manages event subscriptions and dispatching
 */
export class EventDispatcher {
    constructor() {
        this.listeners = new Map();
        this.eventQueue = [];
        this.processing = false;
    }

    /**
     * Subscribe to an event type
     */
    on(eventType, callback, context = null) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        
        const listener = {
            callback,
            context,
            id: this.generateListenerId()
        };
        
        this.listeners.get(eventType).push(listener);
        return listener.id;
    }

    /**
     * Unsubscribe from an event
     */
    off(eventType, listenerId) {
        if (!this.listeners.has(eventType)) return;
        
        const listeners = this.listeners.get(eventType);
        const index = listeners.findIndex(l => l.id === listenerId);
        if (index !== -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * Emit an event
     */
    emit(event) {
        if (!(event instanceof GameEvent)) {
            event = new GameEvent(event.type || event, event.data || {});
        }
        
        this.eventQueue.push(event);
        
        if (!this.processing) {
            this.processQueue();
        }
    }

    /**
     * Process queued events
     */
    processQueue() {
        this.processing = true;
        
        // Sort by priority
        this.eventQueue.sort((a, b) => a.priority - b.priority);
        
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            this.dispatch(event);
        }
        
        this.processing = false;
    }

    /**
     * Dispatch event to listeners
     */
    dispatch(event) {
        const listeners = this.listeners.get(event.type) || [];
        
        for (let listener of listeners) {
            try {
                if (listener.context) {
                    listener.callback.call(listener.context, event);
                } else {
                    listener.callback(event);
                }
            } catch (error) {
                console.error(`Error in event listener for ${event.type}:`, error);
            }
        }
        
        event.processed = true;
    }

    /**
     * Clear all listeners
     */
    clear() {
        this.listeners.clear();
        this.eventQueue = [];
    }

    generateListenerId() {
        return `listener-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * NetworkEventSync - Synchronizes events across network
 */
export class NetworkEventSync {
    constructor(dispatcher, networkManager) {
        this.dispatcher = dispatcher;
        this.networkManager = networkManager;
        this.pendingAcks = new Map();
        this.receivedEvents = new Set();
        
        this.setupNetworkHandlers();
    }

    setupNetworkHandlers() {
        // Send local events to network
        this.dispatcher.on('*', (event) => {
            if (event.source === 'local' && this.shouldSyncEvent(event)) {
                this.sendEvent(event);
            }
        });

        // Receive events from network
        this.networkManager.on('event', (data) => {
            this.receiveEvent(data);
        });
    }

    shouldSyncEvent(event) {
        // Determine which events should be synchronized
        const syncableTypes = [
            EventTypes.INPUT_MOVE,
            EventTypes.INPUT_ROTATE,
            EventTypes.INPUT_DROP,
            EventTypes.PIECE_LOCK,
            EventTypes.GARBAGE_SEND
        ];
        
        return syncableTypes.includes(event.type);
    }

    sendEvent(event) {
        const serialized = event.serialize();
        
        this.networkManager.send('game:event', serialized);
        
        // Track for acknowledgment
        this.pendingAcks.set(event.id, {
            event: event,
            timestamp: Date.now(),
            retries: 0
        });
        
        // Set timeout for retry
        setTimeout(() => this.checkAck(event.id), 100);
    }

    receiveEvent(data) {
        // Prevent duplicate processing
        if (this.receivedEvents.has(data.id)) {
            this.networkManager.send('game:event:ack', { id: data.id });
            return;
        }
        
        this.receivedEvents.add(data.id);
        
        // Deserialize and dispatch
        const event = GameEvent.deserialize(data);
        event.source = 'network';
        
        this.dispatcher.emit(event);
        
        // Send acknowledgment
        this.networkManager.send('game:event:ack', { id: data.id });
        
        // Cleanup old received events
        if (this.receivedEvents.size > 1000) {
            const oldEvents = Array.from(this.receivedEvents).slice(0, 500);
            oldEvents.forEach(id => this.receivedEvents.delete(id));
        }
    }

    checkAck(eventId) {
        const pending = this.pendingAcks.get(eventId);
        if (!pending) return;
        
        if (Date.now() - pending.timestamp > 1000) {
            // Timeout - retry or give up
            if (pending.retries < 3) {
                pending.retries++;
                this.sendEvent(pending.event);
            } else {
                this.pendingAcks.delete(eventId);
                console.warn(`Event ${eventId} failed to send after retries`);
            }
        }
    }

    handleAck(ackData) {
        this.pendingAcks.delete(ackData.id);
    }
}

/**
 * EventRecorder - Records events for replay system
 */
export class EventRecorder {
    constructor() {
        this.recording = false;
        this.events = [];
        this.startTime = null;
        this.metadata = {};
    }

    startRecording(metadata = {}) {
        this.recording = true;
        this.events = [];
        this.startTime = Date.now();
        this.metadata = {
            ...metadata,
            startTime: this.startTime,
            version: '1.0.0'
        };
    }

    stopRecording() {
        this.recording = false;
        this.metadata.endTime = Date.now();
        this.metadata.duration = this.metadata.endTime - this.startTime;
        
        return this.serialize();
    }

    recordEvent(event) {
        if (!this.recording) return;
        
        this.events.push({
            ...event.serialize(),
            relativeTime: Date.now() - this.startTime
        });
    }

    serialize() {
        return {
            metadata: this.metadata,
            events: this.events
        };
    }

    static deserialize(data) {
        const recorder = new EventRecorder();
        recorder.metadata = data.metadata;
        recorder.events = data.events;
        return recorder;
    }
}

/**
 * EventReplayer - Replays recorded events
 */
export class EventReplayer {
    constructor(dispatcher) {
        this.dispatcher = dispatcher;
        this.playing = false;
        this.events = [];
        this.currentIndex = 0;
        this.startTime = null;
        this.speed = 1.0;
    }

    load(recordedData) {
        this.events = recordedData.events;
        this.currentIndex = 0;
    }

    play(speed = 1.0) {
        this.playing = true;
        this.speed = speed;
        this.startTime = Date.now();
        this.processNext();
    }

    pause() {
        this.playing = false;
    }

    stop() {
        this.playing = false;
        this.currentIndex = 0;
    }

    processNext() {
        if (!this.playing || this.currentIndex >= this.events.length) {
            this.stop();
            return;
        }

        const eventData = this.events[this.currentIndex];
        const currentTime = (Date.now() - this.startTime) * this.speed;
        
        if (currentTime >= eventData.relativeTime) {
            const event = GameEvent.deserialize(eventData);
            event.source = 'replay';
            this.dispatcher.emit(event);
            this.currentIndex++;
        }
        
        requestAnimationFrame(() => this.processNext());
    }

    seek(time) {
        // Find event index closest to target time
        this.currentIndex = this.events.findIndex(e => 
            e.relativeTime >= time
        );
        if (this.currentIndex === -1) {
            this.currentIndex = this.events.length;
        }
    }
}

export default {
    GameEvent,
    EventPriority,
    EventTypes,
    EventDispatcher,
    NetworkEventSync,
    EventRecorder,
    EventReplayer
};