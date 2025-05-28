/**
 * NetworkManagerRefactored - WebSocket-based networking with gRPC-Web support
 * Implements proper client-server architecture for multiplayer
 */
export class NetworkManagerRefactored {
    constructor(config = {}) {
        this.config = {
            serverUrl: config.serverUrl || 'wss://api.tetris-infinity.com',
            reconnectDelay: 1000,
            maxReconnectDelay: 30000,
            heartbeatInterval: 5000,
            timeout: 10000,
            ...config
        };
        
        this.socket = null;
        this.connected = false;
        this.connecting = false;
        this.authenticated = false;
        
        // Player info
        this.playerId = null;
        this.sessionId = null;
        this.roomId = null;
        
        // Message handling
        this.messageQueue = [];
        this.pendingMessages = new Map();
        this.messageId = 0;
        this.handlers = new Map();
        
        // Reconnection
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.currentReconnectDelay = this.config.reconnectDelay;
        
        // Heartbeat
        this.heartbeatTimer = null;
        this.lastPingTime = 0;
        this.latency = 0;
        
        // Event emitter
        this.listeners = new Map();
    }
    
    /**
     * Connect to game server
     */
    async connect(authToken) {
        if (this.connected || this.connecting) return;
        
        this.connecting = true;
        
        try {
            // Create WebSocket connection
            this.socket = new WebSocket(this.config.serverUrl);
            this.socket.binaryType = 'arraybuffer';
            
            // Setup event handlers
            this.socket.onopen = () => this.onOpen(authToken);
            this.socket.onmessage = (event) => this.onMessage(event);
            this.socket.onclose = () => this.onClose();
            this.socket.onerror = (error) => this.onError(error);
            
        } catch (error) {
            console.error('Failed to connect:', error);
            this.connecting = false;
            this.scheduleReconnect();
        }
    }
    
    /**
     * Disconnect from server
     */
    disconnect() {
        this.connected = false;
        this.connecting = false;
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
    
    /**
     * Send message to server
     */
    send(type, data = {}, options = {}) {
        const message = {
            id: ++this.messageId,
            type: type,
            data: data,
            timestamp: Date.now()
        };
        
        if (this.connected) {
            this.sendMessage(message);
        } else {
            // Queue message for when connected
            this.messageQueue.push(message);
        }
        
        // Return promise for response if requested
        if (options.expectResponse) {
            return new Promise((resolve, reject) => {
                this.pendingMessages.set(message.id, {
                    resolve,
                    reject,
                    timeout: setTimeout(() => {
                        this.pendingMessages.delete(message.id);
                        reject(new Error('Request timeout'));
                    }, options.timeout || this.config.timeout)
                });
            });
        }
    }
    
    /**
     * Send raw message
     */
    sendMessage(message) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }
        
        try {
            // Serialize message (could use protobuf for efficiency)
            const data = JSON.stringify(message);
            this.socket.send(data);
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    }
    
    /**
     * WebSocket opened
     */
    async onOpen(authToken) {
        console.log('Connected to server');
        this.connecting = false;
        this.connected = true;
        this.reconnectAttempts = 0;
        this.currentReconnectDelay = this.config.reconnectDelay;
        
        // Authenticate
        try {
            const response = await this.send('auth', { token: authToken }, { expectResponse: true });
            this.authenticated = true;
            this.playerId = response.playerId;
            this.sessionId = response.sessionId;
            
            // Start heartbeat
            this.startHeartbeat();
            
            // Process queued messages
            this.processMessageQueue();
            
            // Emit connected event
            this.emit('connected', { playerId: this.playerId });
            
        } catch (error) {
            console.error('Authentication failed:', error);
            this.disconnect();
        }
    }
    
    /**
     * Handle incoming message
     */
    onMessage(event) {
        try {
            const message = JSON.parse(event.data);
            
            // Handle response to pending request
            if (message.responseId && this.pendingMessages.has(message.responseId)) {
                const pending = this.pendingMessages.get(message.responseId);
                clearTimeout(pending.timeout);
                this.pendingMessages.delete(message.responseId);
                
                if (message.error) {
                    pending.reject(new Error(message.error));
                } else {
                    pending.resolve(message.data);
                }
                return;
            }
            
            // Handle specific message types
            switch (message.type) {
                case 'pong':
                    this.handlePong(message);
                    break;
                    
                case 'room:joined':
                    this.handleRoomJoined(message);
                    break;
                    
                case 'game:state':
                    this.handleGameState(message);
                    break;
                    
                case 'game:event':
                    this.handleGameEvent(message);
                    break;
                    
                case 'player:update':
                    this.handlePlayerUpdate(message);
                    break;
                    
                default:
                    // Emit to listeners
                    this.emit(message.type, message.data);
            }
            
        } catch (error) {
            console.error('Failed to handle message:', error);
        }
    }
    
    /**
     * WebSocket closed
     */
    onClose() {
        console.log('Disconnected from server');
        this.connected = false;
        this.authenticated = false;
        
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        
        this.emit('disconnected');
        
        // Schedule reconnection
        this.scheduleReconnect();
    }
    
    /**
     * WebSocket error
     */
    onError(error) {
        console.error('WebSocket error:', error);
        this.emit('error', error);
    }
    
    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectTimer) return;
        
        this.reconnectAttempts++;
        
        // Exponential backoff
        this.currentReconnectDelay = Math.min(
            this.currentReconnectDelay * 2,
            this.config.maxReconnectDelay
        );
        
        console.log(`Reconnecting in ${this.currentReconnectDelay}ms (attempt ${this.reconnectAttempts})`);
        
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, this.currentReconnectDelay);
    }
    
    /**
     * Process queued messages
     */
    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.sendMessage(message);
        }
    }
    
    /**
     * Start heartbeat to maintain connection
     */
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            this.lastPingTime = Date.now();
            this.send('ping');
        }, this.config.heartbeatInterval);
    }
    
    /**
     * Handle pong response
     */
    handlePong(message) {
        this.latency = Date.now() - this.lastPingTime;
        this.emit('latency', this.latency);
    }
    
    /**
     * Handle room joined
     */
    handleRoomJoined(message) {
        this.roomId = message.data.roomId;
        this.emit('room:joined', message.data);
    }
    
    /**
     * Handle game state update
     */
    handleGameState(message) {
        this.emit('game:state', message.data);
    }
    
    /**
     * Handle game event
     */
    handleGameEvent(message) {
        this.emit('game:event', message.data);
    }
    
    /**
     * Handle player update
     */
    handlePlayerUpdate(message) {
        this.emit('player:update', message.data);
    }
    
    // Room management
    async createRoom(options = {}) {
        return await this.send('room:create', options, { expectResponse: true });
    }
    
    async joinRoom(roomId) {
        return await this.send('room:join', { roomId }, { expectResponse: true });
    }
    
    async leaveRoom() {
        if (!this.roomId) return;
        return await this.send('room:leave', { roomId: this.roomId }, { expectResponse: true });
    }
    
    // Matchmaking
    async findMatch(mode, options = {}) {
        return await this.send('match:find', {
            mode,
            ...options
        }, { expectResponse: true });
    }
    
    async cancelMatch() {
        return await this.send('match:cancel', {}, { expectResponse: true });
    }
    
    // Game actions
    sendGameEvent(event) {
        this.send('game:event', event);
    }
    
    sendGameState(state) {
        this.send('game:state', state);
    }
    
    // Event emitter methods
    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(handler);
    }
    
    off(event, handler) {
        if (!this.listeners.has(event)) return;
        
        const handlers = this.listeners.get(event);
        const index = handlers.indexOf(handler);
        if (index !== -1) {
            handlers.splice(index, 1);
        }
    }
    
    emit(event, data) {
        if (!this.listeners.has(event)) return;
        
        const handlers = this.listeners.get(event);
        for (const handler of handlers) {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        }
    }
    
    // Utility methods
    getLatency() {
        return this.latency;
    }
    
    isConnected() {
        return this.connected && this.authenticated;
    }
    
    getPlayerId() {
        return this.playerId;
    }
    
    getRoomId() {
        return this.roomId;
    }
}

/**
 * Message Protocol Types
 */
export const MessageTypes = {
    // Authentication
    AUTH: 'auth',
    AUTH_SUCCESS: 'auth:success',
    AUTH_FAILURE: 'auth:failure',
    
    // Connection
    PING: 'ping',
    PONG: 'pong',
    
    // Room Management
    ROOM_CREATE: 'room:create',
    ROOM_JOIN: 'room:join',
    ROOM_LEAVE: 'room:leave',
    ROOM_UPDATE: 'room:update',
    
    // Matchmaking
    MATCH_FIND: 'match:find',
    MATCH_FOUND: 'match:found',
    MATCH_CANCEL: 'match:cancel',
    MATCH_READY: 'match:ready',
    
    // Game State
    GAME_START: 'game:start',
    GAME_STATE: 'game:state',
    GAME_EVENT: 'game:event',
    GAME_END: 'game:end',
    
    // Player
    PLAYER_UPDATE: 'player:update',
    PLAYER_READY: 'player:ready',
    
    // Chat
    CHAT_MESSAGE: 'chat:message',
    CHAT_EMOJI: 'chat:emoji'
};

/**
 * Room Configuration
 */
export class RoomConfig {
    constructor(options = {}) {
        this.name = options.name || 'Tetris Room';
        this.maxPlayers = options.maxPlayers || 2;
        this.mode = options.mode || 'versus';
        this.private = options.private || false;
        this.password = options.password || null;
        this.settings = {
            startLevel: options.startLevel || 1,
            garbage: options.garbage !== false,
            items: options.items || false,
            timeLimit: options.timeLimit || 0,
            ...options.settings
        };
    }
}

export default NetworkManagerRefactored;