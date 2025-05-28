export class NetworkManager {
    constructor() {
        this.socket = null;
        this.roomId = null;
        this.playerId = null;
        this.isConnected = false;
        this.callbacks = {};
        
        // For local demo, we'll simulate network events
        this.isLocalMode = true;
    }
    
    async connect(serverUrl) {
        if (this.isLocalMode) {
            // Simulate successful connection
            this.isConnected = true;
            this.playerId = this.generatePlayerId();
            console.log('NetworkManager: Running in local mode');
            return true;
        }
        
        try {
            // In a real implementation, connect to WebSocket server
            this.socket = new WebSocket(serverUrl);
            
            this.socket.onopen = () => {
                this.isConnected = true;
                this.emit('connected');
            };
            
            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };
            
            this.socket.onclose = () => {
                this.isConnected = false;
                this.emit('disconnected');
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('error', error);
            };
            
            return true;
        } catch (error) {
            console.error('Failed to connect:', error);
            return false;
        }
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
        this.isConnected = false;
        this.roomId = null;
    }
    
    createRoom(options = {}) {
        if (this.isLocalMode) {
            this.roomId = this.generateRoomId();
            setTimeout(() => {
                this.emit('roomCreated', {
                    roomId: this.roomId,
                    playerId: this.playerId
                });
            }, 100);
            return;
        }
        
        this.send({
            type: 'createRoom',
            data: options
        });
    }
    
    joinRoom(roomId) {
        if (this.isLocalMode) {
            this.roomId = roomId;
            setTimeout(() => {
                this.emit('roomJoined', {
                    roomId: this.roomId,
                    playerId: this.playerId,
                    players: [{ id: this.playerId, name: 'Player 1' }]
                });
            }, 100);
            return;
        }
        
        this.send({
            type: 'joinRoom',
            data: { roomId }
        });
    }
    
    leaveRoom() {
        if (this.isLocalMode) {
            this.roomId = null;
            this.emit('roomLeft');
            return;
        }
        
        this.send({
            type: 'leaveRoom'
        });
    }
    
    sendGameState(state) {
        if (this.isLocalMode) {
            // In local mode, simulate receiving opponent's state
            if (this.callbacks.opponentState) {
                setTimeout(() => {
                    this.emit('opponentState', this.generateOpponentState());
                }, 50);
            }
            return;
        }
        
        this.send({
            type: 'gameState',
            data: state
        });
    }
    
    sendGarbage(lines) {
        if (this.isLocalMode) {
            console.log(`Sending ${lines} garbage lines`);
            return;
        }
        
        this.send({
            type: 'garbage',
            data: { lines }
        });
    }
    
    sendGameOver() {
        if (this.isLocalMode) {
            console.log('Game over sent');
            return;
        }
        
        this.send({
            type: 'gameOver'
        });
    }
    
    // Event handling
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }
    
    off(event, callback) {
        if (this.callbacks[event]) {
            const index = this.callbacks[event].indexOf(callback);
            if (index > -1) {
                this.callbacks[event].splice(index, 1);
            }
        }
    }
    
    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(data));
        }
    }
    
    // Private methods
    send(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        }
    }
    
    handleMessage(message) {
        switch (message.type) {
            case 'roomCreated':
                this.roomId = message.data.roomId;
                this.emit('roomCreated', message.data);
                break;
                
            case 'roomJoined':
                this.roomId = message.data.roomId;
                this.emit('roomJoined', message.data);
                break;
                
            case 'playerJoined':
                this.emit('playerJoined', message.data);
                break;
                
            case 'playerLeft':
                this.emit('playerLeft', message.data);
                break;
                
            case 'gameState':
                this.emit('opponentState', message.data);
                break;
                
            case 'garbage':
                this.emit('garbageReceived', message.data);
                break;
                
            case 'gameStart':
                this.emit('gameStart', message.data);
                break;
                
            case 'gameOver':
                this.emit('opponentGameOver', message.data);
                break;
                
            default:
                console.warn('Unknown message type:', message.type);
        }
    }
    
    // Utility methods for local mode
    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }
    
    generateRoomId() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    
    generateOpponentState() {
        // Generate a simulated opponent state for local testing
        return {
            board: this.generateRandomBoard(),
            score: Math.floor(Math.random() * 10000),
            lines: Math.floor(Math.random() * 100),
            level: Math.floor(Math.random() * 10) + 1,
            combo: Math.floor(Math.random() * 5)
        };
    }
    
    generateRandomBoard() {
        const board = [];
        const height = 20;
        const width = 10;
        
        // Generate a partially filled board
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                if (y > height - 8 && Math.random() < 0.3) {
                    row.push(Math.floor(Math.random() * 7) + 1);
                } else {
                    row.push(0);
                }
            }
            board.push(row);
        }
        
        return board;
    }
    
    // Matchmaking
    async findMatch(mode, options = {}) {
        if (this.isLocalMode) {
            // Simulate finding a match
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        roomId: this.generateRoomId(),
                        opponent: {
                            id: this.generatePlayerId(),
                            name: 'CPU Player',
                            rating: 1000 + Math.floor(Math.random() * 500)
                        }
                    });
                }, 1000 + Math.random() * 2000);
            });
        }
        
        this.send({
            type: 'findMatch',
            data: { mode, ...options }
        });
        
        return new Promise((resolve, reject) => {
            this.once('matchFound', resolve);
            this.once('matchTimeout', reject);
        });
    }
    
    once(event, callback) {
        const wrapper = (data) => {
            this.off(event, wrapper);
            callback(data);
        };
        this.on(event, wrapper);
    }
}