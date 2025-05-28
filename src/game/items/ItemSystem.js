import { ITEMS } from '../../config/GameConfig.js';

export class ItemSystem {
    constructor(game) {
        this.game = game;
        this.inventory = [null, null, null]; // 3 item slots
        this.activeItems = [];
        this.itemSpawnTimer = 0;
        this.itemSpawnInterval = 30000; // Spawn item every 30 seconds
        
        this.init();
    }
    
    init() {
        this.updateItemUI();
    }
    
    update(deltaTime) {
        // Update item spawn timer
        this.itemSpawnTimer += deltaTime;
        
        if (this.itemSpawnTimer >= this.itemSpawnInterval) {
            this.itemSpawnTimer = 0;
            this.spawnRandomItem();
        }
        
        // Update active item effects
        this.activeItems = this.activeItems.filter(item => {
            item.duration -= deltaTime;
            
            if (item.duration <= 0) {
                this.deactivateItem(item);
                return false;
            }
            
            return true;
        });
    }
    
    spawnRandomItem() {
        // Find empty slot
        const emptySlot = this.inventory.findIndex(slot => slot === null);
        
        if (emptySlot !== -1) {
            // Pick random item
            const itemKeys = Object.keys(ITEMS);
            const randomItem = itemKeys[Math.floor(Math.random() * itemKeys.length)];
            
            this.addItem(randomItem, emptySlot);
            
            // Show item pickup effect
            this.showItemPickup(randomItem);
        }
    }
    
    addItem(itemId, slot = -1) {
        if (slot === -1) {
            // Find first empty slot
            slot = this.inventory.findIndex(s => s === null);
        }
        
        if (slot !== -1 && slot < this.inventory.length) {
            this.inventory[slot] = itemId;
            this.updateItemUI();
            return true;
        }
        
        return false;
    }
    
    useItem(slot) {
        if (slot < 0 || slot >= this.inventory.length) return false;
        
        const itemId = this.inventory[slot];
        if (!itemId) return false;
        
        const item = ITEMS[itemId];
        if (!item) return false;
        
        // Activate item
        this.activateItem(itemId, item);
        
        // Remove from inventory
        this.inventory[slot] = null;
        this.updateItemUI();
        
        // Play sound
        this.game.app.audioManager.play('item');
        
        return true;
    }
    
    activateItem(itemId, itemConfig) {
        const activeItem = {
            id: itemId,
            config: itemConfig,
            duration: itemConfig.duration
        };
        
        switch (itemId) {
            case 'DOUBLE_SCORE':
                this.activateDoubleScore(activeItem);
                break;
            case 'SLOW_FALL':
                this.activateSlowFall(activeItem);
                break;
            case 'PREVIEW_EXTEND':
                this.activatePreviewExtend(activeItem);
                break;
            case 'GHOST_SOLID':
                this.activateGhostSolid(activeItem);
                break;
        }
        
        this.activeItems.push(activeItem);
        this.showItemActivation(itemId);
    }
    
    activateDoubleScore(item) {
        // Score multiplier is checked in ScoreSystem
        item.originalMultiplier = this.game.scoreSystem.scoreMultiplier || 1;
        this.game.scoreSystem.scoreMultiplier = item.config.multiplier;
        
        // Visual indicator
        const indicator = document.createElement('div');
        indicator.className = 'score-multiplier-indicator';
        indicator.innerHTML = `<span>SCORE ×${item.config.multiplier}</span>`;
        document.getElementById('special-effects').appendChild(indicator);
        
        item.indicatorElement = indicator;
    }
    
    activateSlowFall(item) {
        // Store original speed multiplier
        item.originalSpeed = this.game.dropSpeedMultiplier || 1;
        this.game.dropSpeedMultiplier = item.config.speedMultiplier;
        
        // Visual effect
        const overlay = document.createElement('div');
        overlay.className = 'slow-motion-overlay';
        document.querySelector('.game-area').appendChild(overlay);
        
        item.overlayElement = overlay;
    }
    
    activatePreviewExtend(item) {
        // Extend preview in renderer
        item.originalPreviewCount = this.game.previewCount || 5;
        this.game.previewCount = item.originalPreviewCount + item.config.extraPreviews;
        
        // Update next piece display
        this.game.app.renderer.maxNextPieces = this.game.previewCount;
    }
    
    activateGhostSolid(item) {
        // Store original ghost opacity
        item.originalOpacity = this.game.ghostOpacity || 0.3;
        this.game.ghostOpacity = item.config.opacity;
        
        // Update renderer
        if (this.game.app.renderer) {
            this.game.app.renderer.ghostOpacity = item.config.opacity;
        }
    }
    
    deactivateItem(item) {
        switch (item.id) {
            case 'DOUBLE_SCORE':
                this.game.scoreSystem.scoreMultiplier = item.originalMultiplier || 1;
                if (item.indicatorElement) {
                    item.indicatorElement.remove();
                }
                break;
                
            case 'SLOW_FALL':
                this.game.dropSpeedMultiplier = item.originalSpeed || 1;
                if (item.overlayElement) {
                    item.overlayElement.remove();
                }
                break;
                
            case 'PREVIEW_EXTEND':
                this.game.previewCount = item.originalPreviewCount || 5;
                this.game.app.renderer.maxNextPieces = this.game.previewCount;
                break;
                
            case 'GHOST_SOLID':
                this.game.ghostOpacity = item.originalOpacity || 0.3;
                if (this.game.app.renderer) {
                    this.game.app.renderer.ghostOpacity = this.game.ghostOpacity;
                }
                break;
        }
    }
    
    hasActiveItem(itemId) {
        return this.activeItems.some(item => item.id === itemId);
    }
    
    getActiveMultipliers() {
        const multipliers = {
            score: 1,
            speed: 1
        };
        
        this.activeItems.forEach(item => {
            if (item.id === 'DOUBLE_SCORE') {
                multipliers.score = item.config.multiplier;
            } else if (item.id === 'SLOW_FALL') {
                multipliers.speed = item.config.speedMultiplier;
            }
        });
        
        return multipliers;
    }
    
    updateItemUI() {
        this.inventory.forEach((itemId, index) => {
            const slotElement = document.getElementById(`item-${index + 1}`);
            
            if (slotElement) {
                const iconElement = slotElement.querySelector('.item-icon');
                
                if (itemId && ITEMS[itemId]) {
                    const item = ITEMS[itemId];
                    iconElement.textContent = item.icon;
                    iconElement.title = `${item.name}: ${item.description}`;
                    slotElement.classList.add('has-item');
                } else {
                    iconElement.textContent = '';
                    iconElement.title = '';
                    slotElement.classList.remove('has-item');
                }
            }
        });
    }
    
    showItemPickup(itemId) {
        const item = ITEMS[itemId];
        if (!item) return;
        
        const popup = document.createElement('div');
        popup.className = 'item-pickup-popup';
        popup.innerHTML = `
            <span class="item-icon">${item.icon}</span>
            <span class="item-name">${item.name}</span>
        `;
        
        document.getElementById('special-effects').appendChild(popup);
        
        setTimeout(() => {
            popup.remove();
        }, 2000);
    }
    
    showItemActivation(itemId) {
        const item = ITEMS[itemId];
        if (!item) return;
        
        const activation = document.createElement('div');
        activation.className = 'item-activation-effect';
        activation.innerHTML = `
            <div class="activation-icon">${item.icon}</div>
            <div class="activation-text">ACTIVATED!</div>
        `;
        
        document.getElementById('special-effects').appendChild(activation);
        
        setTimeout(() => {
            activation.remove();
        }, 1500);
    }
    
    reset() {
        // Clear inventory
        this.inventory = [null, null, null];
        
        // Clear active items
        this.activeItems.forEach(item => {
            this.deactivateItem(item);
        });
        this.activeItems = [];
        
        // Reset spawn timer
        this.itemSpawnTimer = 0;
        
        // Update UI
        this.updateItemUI();
    }
}