import { SKILLS } from '../../config/GameConfig.js';

export class SkillSystem {
    constructor(game) {
        this.game = game;
        this.activeSkills = [];
        this.cooldowns = {};
        this.equippedSkills = ['FREEZE', 'BOMB', 'GRAVITY']; // Default skills
        
        this.init();
    }
    
    init() {
        // Initialize cooldowns
        this.equippedSkills.forEach(skillId => {
            this.cooldowns[skillId] = 0;
        });
        
        // Setup skill UI
        this.updateSkillUI();
    }
    
    update(deltaTime) {
        // Update cooldowns
        Object.keys(this.cooldowns).forEach(skillId => {
            if (this.cooldowns[skillId] > 0) {
                this.cooldowns[skillId] = Math.max(0, this.cooldowns[skillId] - deltaTime);
                this.updateSkillCooldownUI(skillId);
            }
        });
        
        // Update active skill effects
        this.activeSkills = this.activeSkills.filter(skill => {
            skill.duration -= deltaTime;
            
            if (skill.duration <= 0) {
                this.deactivateSkill(skill);
                return false;
            }
            
            skill.update(deltaTime);
            return true;
        });
    }
    
    useSkill(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.equippedSkills.length) return;
        
        const skillId = this.equippedSkills[slotIndex];
        const skill = SKILLS[skillId];
        
        if (!skill || this.cooldowns[skillId] > 0) {
            return false;
        }
        
        // Apply skill effect
        this.activateSkill(skillId, skill);
        
        // Set cooldown
        this.cooldowns[skillId] = skill.cooldown;
        
        // Update UI
        this.updateSkillUI();
        
        // Play skill effect
        this.game.app.effectsManager.playSkillEffect(skillId.toLowerCase());
        
        return true;
    }
    
    activateSkill(skillId, skillConfig) {
        switch (skillId) {
            case 'FREEZE':
                this.activateFreeze(skillConfig);
                break;
            case 'BOMB':
                this.activateBomb(skillConfig);
                break;
            case 'GRAVITY':
                this.activateGravity(skillConfig);
                break;
            case 'SWAP':
                this.activateSwap(skillConfig);
                break;
            case 'SHIELD':
                this.activateShield(skillConfig);
                break;
        }
    }
    
    activateFreeze(config) {
        const freezeEffect = {
            id: 'freeze',
            duration: config.duration,
            update: (deltaTime) => {
                // Freeze the current piece
                if (this.game.currentPiece) {
                    this.game.dropTimer = 0; // Reset drop timer to prevent falling
                }
            }
        };
        
        this.activeSkills.push(freezeEffect);
        
        // Visual effect
        const overlay = document.createElement('div');
        overlay.className = 'skill-effect-overlay skill-freeze active';
        document.getElementById('special-effects').appendChild(overlay);
        
        setTimeout(() => {
            overlay.remove();
        }, config.duration);
    }
    
    activateBomb(config) {
        // Clear bottom lines
        const clearedLines = this.game.board.clearBottomLines(config.lines);
        
        if (clearedLines.length > 0) {
            this.game.handleLineClears(clearedLines);
            
            // Explosion effect
            const effectsManager = this.game.app.effectsManager;
            clearedLines.forEach(line => {
                for (let x = 0; x < this.game.board.width; x++) {
                    const pixelX = x * 30 + 15;
                    const pixelY = line * 30 + 15;
                    effectsManager.createPowerUpEffect(pixelX, pixelY, 'bomb');
                }
            });
        }
    }
    
    activateGravity(config) {
        // Pull all floating blocks down
        let blocksDropped = false;
        
        for (let x = 0; x < this.game.board.width; x++) {
            let writePos = this.game.board.height - 1;
            
            // Scan from bottom to top
            for (let y = this.game.board.height - 1; y >= 0; y--) {
                if (this.game.board.grid[y][x] > 0) {
                    if (y !== writePos) {
                        this.game.board.grid[writePos][x] = this.game.board.grid[y][x];
                        this.game.board.grid[y][x] = 0;
                        blocksDropped = true;
                    }
                    writePos--;
                }
            }
        }
        
        if (blocksDropped) {
            // Check for line clears after gravity
            const clearedLines = this.game.board.clearLines();
            if (clearedLines.length > 0) {
                this.game.handleLineClears(clearedLines);
            }
            
            // Visual effect
            this.game.app.effectsManager.screenShake(3, 300);
        }
    }
    
    activateSwap(config) {
        if (!this.game.currentPiece || this.game.nextPieces.length === 0) return;
        
        // Swap current piece with next piece
        const temp = this.game.currentPiece;
        this.game.currentPiece = this.game.nextPieces[0];
        this.game.nextPieces[0] = temp;
        
        // Reset position
        this.game.currentPiece.x = Math.floor((this.game.board.width - this.game.currentPiece.getWidth()) / 2);
        this.game.currentPiece.y = 0;
        
        // Check if new position is valid
        if (!this.game.isValidPosition()) {
            // Swap back if invalid
            const temp2 = this.game.currentPiece;
            this.game.currentPiece = this.game.nextPieces[0];
            this.game.nextPieces[0] = temp2;
        }
    }
    
    activateShield(config) {
        const shieldEffect = {
            id: 'shield',
            duration: config.duration,
            update: (deltaTime) => {
                // Shield is checked in garbage receiving logic
            }
        };
        
        this.activeSkills.push(shieldEffect);
        
        // Visual indicator
        const shieldIcon = document.createElement('div');
        shieldIcon.className = 'shield-indicator active';
        shieldIcon.innerHTML = '🛡️';
        document.getElementById('special-effects').appendChild(shieldIcon);
        
        setTimeout(() => {
            shieldIcon.remove();
        }, config.duration);
    }
    
    deactivateSkill(skill) {
        // Cleanup any skill-specific effects
        switch (skill.id) {
            case 'freeze':
                // Resume normal game speed
                break;
            case 'shield':
                // Remove shield protection
                break;
        }
    }
    
    hasActiveSkill(skillId) {
        return this.activeSkills.some(skill => skill.id === skillId);
    }
    
    equipSkill(skillId, slot) {
        if (SKILLS[skillId] && slot >= 0 && slot < 3) {
            this.equippedSkills[slot] = skillId;
            this.cooldowns[skillId] = 0;
            this.updateSkillUI();
        }
    }
    
    updateSkillUI() {
        this.equippedSkills.forEach((skillId, index) => {
            const skill = SKILLS[skillId];
            const slotElement = document.getElementById(`skill-${index + 1}`);
            
            if (slotElement && skill) {
                const iconElement = slotElement.querySelector('.skill-icon');
                const cooldownElement = slotElement.querySelector('.skill-cooldown');
                
                iconElement.textContent = skill.icon;
                iconElement.title = `${skill.name}: ${skill.description}`;
                
                if (this.cooldowns[skillId] > 0) {
                    slotElement.classList.add('on-cooldown');
                    const cooldownPercent = (this.cooldowns[skillId] / skill.cooldown) * 100;
                    cooldownElement.style.height = `${cooldownPercent}%`;
                } else {
                    slotElement.classList.remove('on-cooldown');
                    cooldownElement.style.height = '0%';
                }
            }
        });
    }
    
    updateSkillCooldownUI(skillId) {
        const slotIndex = this.equippedSkills.indexOf(skillId);
        if (slotIndex === -1) return;
        
        const skill = SKILLS[skillId];
        const slotElement = document.getElementById(`skill-${slotIndex + 1}`);
        
        if (slotElement && skill) {
            const cooldownElement = slotElement.querySelector('.skill-cooldown');
            
            if (this.cooldowns[skillId] > 0) {
                slotElement.classList.add('on-cooldown');
                const cooldownPercent = (this.cooldowns[skillId] / skill.cooldown) * 100;
                cooldownElement.style.height = `${cooldownPercent}%`;
            } else {
                slotElement.classList.remove('on-cooldown');
                cooldownElement.style.height = '0%';
            }
        }
    }
    
    reset() {
        // Reset all cooldowns
        Object.keys(this.cooldowns).forEach(skillId => {
            this.cooldowns[skillId] = 0;
        });
        
        // Clear active skills
        this.activeSkills = [];
        
        // Update UI
        this.updateSkillUI();
    }
}