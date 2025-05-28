/**
 * BattleRoyaleMode - 99-player battle royale mode
 * Last player standing wins
 */
import { GameMode } from './GameMode.js';
import { EventTypes } from '../../core/EventSystem.js';

export class BattleRoyaleMode extends GameMode {
    constructor(game, config = {}) {
        super(game, config);
        
        this.name = 'battle_royale';
        this.description = '99-player battle royale';
        
        // Battle Royale specific settings
        this.settings = {
            ...this.settings,
            maxPlayers: 99,
            targetingModes: ['random', 'badges', 'attackers', 'kos'],
            garbageMultiplier: 1.5,
            koBonus: true,
            badgeSystem: true
        };
        
        // Battle state
        this.players = new Map();
        this.localPlayerId = config.playerId || 'local';
        this.targetingMode = 'random';
        this.currentTarget = null;
        this.attackers = new Set();
        
        // Statistics
        this.statistics = {
            kos: 0,
            damage: 0,
            survived: 0,
            placement: 99,
            badges: 0
        };
        
        // Garbage queue
        this.incomingGarbage = [];
        this.garbageTimer = 0;
        this.garbageDelay = 3000; // 3 seconds
    }
    
    initialize() {
        super.initialize();
        
        // Initialize player list
        this.initializePlayers();
        
        // Setup targeting UI
        this.setupTargetingUI();
    }
    
    initializePlayers() {
        // Add local player
        this.players.set(this.localPlayerId, {
            id: this.localPlayerId,
            alive: true,
            lines: 0,
            kos: 0,
            badges: 0,
            isLocal: true
        });
        
        // In real implementation, other players would be added via network
    }
    
    setupEventHandlers() {
        // Handle line clears to send garbage
        this.game.eventDispatcher.on(EventTypes.LINES_CLEAR, (event) => {
            this.handleLineClears(event.data);
        });
        
        // Handle incoming garbage
        this.game.eventDispatcher.on(EventTypes.GARBAGE_RECEIVE, (event) => {
            this.queueIncomingGarbage(event.data);
        });
        
        // Handle player eliminations
        this.game.eventDispatcher.on('player:eliminated', (event) => {
            this.handlePlayerEliminated(event.data);
        });
        
        // Handle targeting changes
        this.game.eventDispatcher.on('targeting:change', (event) => {
            this.changeTargeting(event.data.mode);
        });
    }
    
    setupVictoryConditions() {
        this.victoryConditions.push({
            name: 'last_standing',
            check: () => {
                const alivePlayers = Array.from(this.players.values())
                    .filter(p => p.alive).length;
                return alivePlayers === 1 && this.players.get(this.localPlayerId).alive;
            }
        });
    }
    
    setupDefeatConditions() {
        super.setupDefeatConditions();
        
        this.defeatConditions.push({
            name: 'eliminated',
            check: () => !this.players.get(this.localPlayerId).alive
        });
    }
    
    handleLineClears(data) {
        const lines = data.count;
        
        // Calculate garbage to send
        let garbage = this.calculateGarbage(lines);
        
        // Apply badges multiplier
        const badges = this.players.get(this.localPlayerId).badges;
        garbage = Math.floor(garbage * (1 + badges * 0.25));
        
        // Send to target
        if (this.currentTarget && this.currentTarget !== this.localPlayerId) {
            this.sendGarbage(this.currentTarget, garbage);
            this.statistics.damage += garbage;
        }
    }
    
    calculateGarbage(lines) {
        // Battle Royale garbage calculation
        const baseGarbage = {
            1: 0,
            2: 1,
            3: 2,
            4: 4
        }[lines] || 0;
        
        // T-Spin bonus
        if (this.game.gameState.lastAction?.tSpin) {
            return baseGarbage * 2;
        }
        
        // Combo bonus
        const combo = this.game.gameState.combo;
        if (combo > 1) {
            return baseGarbage + Math.floor(combo / 2);
        }
        
        return baseGarbage;
    }
    
    sendGarbage(targetId, lines) {
        // In real implementation, this would send over network
        this.game.eventDispatcher.emit({
            type: 'network:send',
            data: {
                type: EventTypes.GARBAGE_SEND,
                target: targetId,
                lines: lines,
                source: this.localPlayerId
            }
        });
    }
    
    queueIncomingGarbage(data) {
        this.incomingGarbage.push({
            lines: data.lines,
            source: data.source,
            timestamp: Date.now()
        });
        
        // Track attacker
        this.attackers.add(data.source);
    }
    
    updateMode(deltaTime) {
        // Process garbage queue
        this.updateGarbageQueue(deltaTime);
        
        // Update targeting
        this.updateTargeting();
        
        // Update player count UI
        this.updatePlayerCount();
    }
    
    updateGarbageQueue(deltaTime) {
        if (this.incomingGarbage.length === 0) return;
        
        this.garbageTimer += deltaTime;
        
        if (this.garbageTimer >= this.garbageDelay) {
            this.garbageTimer = 0;
            
            // Apply oldest garbage
            const garbage = this.incomingGarbage.shift();
            this.applyGarbage(garbage.lines);
        }
    }
    
    applyGarbage(lines) {
        const board = this.game.gameState.board;
        const width = board[0].length;
        
        // Shift board up
        for (let i = 0; i < lines; i++) {
            board.shift();
            
            // Create garbage line with one hole
            const garbageLine = new Array(width).fill(8); // Gray blocks
            const holePosition = Math.floor(Math.random() * width);
            garbageLine[holePosition] = 0;
            
            board.push(garbageLine);
        }
        
        // Check if current piece is now invalid
        if (this.game.gameState.currentPiece) {
            // Force piece up if needed
            // Implementation would check collision and adjust
        }
    }
    
    updateTargeting() {
        switch (this.targetingMode) {
            case 'random':
                this.targetRandom();
                break;
            case 'badges':
                this.targetMostBadges();
                break;
            case 'attackers':
                this.targetAttackers();
                break;
            case 'kos':
                this.targetNearKO();
                break;
        }
    }
    
    targetRandom() {
        const alivePlayers = Array.from(this.players.values())
            .filter(p => p.alive && p.id !== this.localPlayerId);
        
        if (alivePlayers.length > 0) {
            const random = Math.floor(Math.random() * alivePlayers.length);
            this.currentTarget = alivePlayers[random].id;
        }
    }
    
    targetMostBadges() {
        const targets = Array.from(this.players.values())
            .filter(p => p.alive && p.id !== this.localPlayerId)
            .sort((a, b) => b.badges - a.badges);
        
        if (targets.length > 0) {
            this.currentTarget = targets[0].id;
        }
    }
    
    targetAttackers() {
        if (this.attackers.size > 0) {
            // Target random attacker
            const attackerArray = Array.from(this.attackers);
            const random = Math.floor(Math.random() * attackerArray.length);
            this.currentTarget = attackerArray[random];
        } else {
            this.targetRandom();
        }
    }
    
    targetNearKO() {
        // In real implementation, would target players close to elimination
        // For now, just use random
        this.targetRandom();
    }
    
    changeTargeting(mode) {
        this.targetingMode = mode;
        this.updateTargeting();
        
        // Update UI
        this.updateTargetingUI();
    }
    
    handlePlayerEliminated(data) {
        const playerId = data.playerId;
        const player = this.players.get(playerId);
        
        if (player) {
            player.alive = false;
            
            // If we eliminated them, get KO bonus
            if (data.eliminatedBy === this.localPlayerId) {
                this.statistics.kos++;
                
                // Award badge
                const localPlayer = this.players.get(this.localPlayerId);
                localPlayer.kos++;
                
                // Badge thresholds: 2, 5, 10, 20 KOs
                const badgeThresholds = [2, 5, 10, 20];
                const newBadges = badgeThresholds.filter(t => localPlayer.kos >= t).length;
                
                if (newBadges > localPlayer.badges) {
                    localPlayer.badges = newBadges;
                    this.statistics.badges = newBadges;
                    
                    this.game.eventDispatcher.emit({
                        type: 'effect:trigger',
                        data: {
                            effect: 'badge_earned',
                            badges: newBadges
                        }
                    });
                }
            }
            
            // Update placement
            const alivePlayers = Array.from(this.players.values())
                .filter(p => p.alive).length;
            
            if (playerId === this.localPlayerId) {
                this.statistics.placement = alivePlayers + 1;
            }
        }
    }
    
    setupTargetingUI() {
        // Create targeting mode buttons
        const targetingUI = document.getElementById('targeting-modes');
        if (!targetingUI) return;
        
        const modes = ['random', 'badges', 'attackers', 'kos'];
        
        modes.forEach(mode => {
            const button = document.createElement('button');
            button.textContent = mode.toUpperCase();
            button.className = 'targeting-button';
            button.onclick = () => this.changeTargeting(mode);
            targetingUI.appendChild(button);
        });
    }
    
    updateTargetingUI() {
        const buttons = document.querySelectorAll('.targeting-button');
        buttons.forEach(button => {
            button.classList.toggle('active', 
                button.textContent.toLowerCase() === this.targetingMode);
        });
    }
    
    updatePlayerCount() {
        const alivePlayers = Array.from(this.players.values())
            .filter(p => p.alive).length;
        
        const counter = document.getElementById('player-count');
        if (counter) {
            counter.textContent = `${alivePlayers} / ${this.settings.maxPlayers}`;
        }
    }
    
    getEndStats() {
        return {
            ...super.getEndStats(),
            ...this.statistics,
            finalPlacement: this.statistics.placement,
            eliminations: this.statistics.kos,
            damageDealt: this.statistics.damage,
            badges: this.statistics.badges
        };
    }
    
    onVictory(results) {
        // Battle Royale victory - show special animation
        this.game.effectsManager.playVictoryRoyale();
    }
    
    onDefeat(results) {
        // Show placement
        const placement = this.statistics.placement;
        const message = placement <= 10 ? 
            `Top ${placement}!` : 
            `Placed ${placement}th`;
        
        this.game.effectsManager.showPlacement(message);
    }
}

export default BattleRoyaleMode;