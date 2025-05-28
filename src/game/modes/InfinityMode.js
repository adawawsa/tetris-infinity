import { Game } from '../Game.js';
import { SkillSystem } from '../skills/SkillSystem.js';
import { ItemSystem } from '../items/ItemSystem.js';

export class InfinityMode extends Game {
    constructor(app) {
        super(app, 'infinity');
        
        // Infinity mode specific features
        this.skillSystem = new SkillSystem(this);
        this.itemSystem = new ItemSystem(this);
        
        // Special infinity mode properties
        this.infinityLevel = 1;
        this.experiencePoints = 0;
        this.nextLevelExp = 1000;
        
        // Difficulty scaling
        this.difficultyMultiplier = 1;
        this.speedCap = 20; // Max speed at level 20
        
        // Special mechanics
        this.perfectClearBonus = 5000;
        this.allClearCount = 0;
        
        // Achievements tracking
        this.sessionAchievements = [];
        
        // Power-up chances
        this.itemDropChance = 0.1; // 10% base chance
        
        this.setupInfinityControls();
    }
    
    setupInfinityControls() {
        // Skill controls
        this.app.inputManager.on('skill1', () => this.useSkill(0));
        this.app.inputManager.on('skill2', () => this.useSkill(1));
        this.app.inputManager.on('skill3', () => this.useSkill(2));
        
        // Item controls
        this.app.inputManager.on('item1', () => this.useItem(0));
        this.app.inputManager.on('item2', () => this.useItem(1));
        this.app.inputManager.on('item3', () => this.useItem(2));
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        if (!this.isPaused && !this.gameOver) {
            // Update systems
            this.skillSystem.update(deltaTime);
            this.itemSystem.update(deltaTime);
            
            // Check for special conditions
            this.checkInfinityMechanics();
        }
    }
    
    getDropSpeed() {
        // Custom drop speed for infinity mode
        const baseSpeed = 1000;
        const level = Math.min(this.level, this.speedCap);
        
        // Apply difficulty scaling
        const speedMultiplier = Math.pow(0.85, level - 1) * this.difficultyMultiplier;
        
        // Apply item effects
        const itemMultipliers = this.itemSystem.getActiveMultipliers();
        const finalSpeed = baseSpeed * speedMultiplier * itemMultipliers.speed;
        
        return Math.max(finalSpeed, 20); // Minimum 20ms
    }
    
    handleLineClears(lines) {
        const numLines = lines.length;
        
        // Update stats
        this.lines += numLines;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        
        // Check for perfect clear
        const isPerfectClear = this.gameLogic.checkPerfectClear(this.board);
        
        // Calculate score with infinity mode bonuses
        let scoreGain = this.scoreSystem.calculateScore(
            numLines, 
            this.level, 
            this.combo,
            false, // T-spin check would go here
            false, // Mini T-spin
            isPerfectClear
        );
        
        // Apply active item multipliers
        const multipliers = this.itemSystem.getActiveMultipliers();
        scoreGain *= multipliers.score;
        
        this.score += scoreGain;
        
        // Award experience
        this.awardExperience(scoreGain / 10 + numLines * 50);
        
        // Perfect clear bonus
        if (isPerfectClear) {
            this.allClearCount++;
            this.score += this.perfectClearBonus * this.level;
            this.effectsManager.showPerfectClear();
        }
        
        // Update level (different from infinity level)
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.effectsManager.playLevelUp(this.level);
        }
        
        // Chance to spawn item on line clear
        if (Math.random() < this.itemDropChance * numLines) {
            this.itemSystem.spawnRandomItem();
        }
        
        // Play effects
        this.effectsManager.playLineClear(lines);
        
        // Play sounds
        if (numLines === 4) {
            this.app.audioManager.play('tetris');
        } else {
            this.app.audioManager.play('lineClear');
        }
        
        // Show combo
        if (this.combo > 1) {
            this.effectsManager.showCombo(this.combo);
        }
        
        this.updateUI();
    }
    
    awardExperience(exp) {
        this.experiencePoints += Math.floor(exp);
        
        // Check for infinity level up
        while (this.experiencePoints >= this.nextLevelExp) {
            this.experiencePoints -= this.nextLevelExp;
            this.infinityLevel++;
            this.nextLevelExp = Math.floor(this.nextLevelExp * 1.5);
            
            // Infinity level up rewards
            this.onInfinityLevelUp();
        }
        
        this.updateInfinityUI();
    }
    
    onInfinityLevelUp() {
        // Show special level up effect
        const levelUpDiv = document.createElement('div');
        levelUpDiv.className = 'infinity-level-up';
        levelUpDiv.innerHTML = `
            <div class="infinity-icon">∞</div>
            <div class="infinity-text">INFINITY LEVEL ${this.infinityLevel}</div>
            <div class="infinity-reward">New Skills Unlocked!</div>
        `;
        document.getElementById('special-effects').appendChild(levelUpDiv);
        
        setTimeout(() => {
            levelUpDiv.remove();
        }, 3000);
        
        // Increase difficulty
        this.difficultyMultiplier *= 1.05;
        
        // Unlock new skills/items at certain levels
        if (this.infinityLevel % 5 === 0) {
            // Every 5 levels, increase item drop chance
            this.itemDropChance = Math.min(0.3, this.itemDropChance + 0.02);
        }
        
        if (this.infinityLevel % 10 === 0) {
            // Every 10 levels, unlock special rewards
            this.unlockSpecialReward();
        }
    }
    
    unlockSpecialReward() {
        // Could unlock new skills, skins, music, etc.
        console.log('Special reward unlocked at infinity level', this.infinityLevel);
    }
    
    checkInfinityMechanics() {
        // Check for special infinity mode conditions
        
        // Danger zone mechanic
        if (this.board.getHeight() > 15) {
            if (!this.inDangerZone) {
                this.inDangerZone = true;
                this.app.audioManager.playBGM('danger');
                document.querySelector('.game-area').classList.add('danger-zone');
            }
        } else if (this.inDangerZone) {
            this.inDangerZone = false;
            this.app.audioManager.playBGM('game');
            document.querySelector('.game-area').classList.remove('danger-zone');
        }
    }
    
    useSkill(slotIndex) {
        if (this.skillSystem.useSkill(slotIndex)) {
            // Skill used successfully
            this.updateUI();
        }
    }
    
    useItem(slotIndex) {
        if (this.itemSystem.useItem(slotIndex)) {
            // Item used successfully
            this.updateUI();
        }
    }
    
    updateUI() {
        super.updateUI();
        this.updateInfinityUI();
    }
    
    updateInfinityUI() {
        // Update infinity-specific UI elements
        const infinityLevel = document.getElementById('infinity-level');
        const expBar = document.getElementById('exp-bar');
        
        if (infinityLevel) {
            infinityLevel.textContent = `∞ ${this.infinityLevel}`;
        }
        
        if (expBar) {
            const expPercent = (this.experiencePoints / this.nextLevelExp) * 100;
            expBar.style.width = `${expPercent}%`;
        }
    }
    
    endGame() {
        super.endGame();
        
        // Save infinity mode specific stats
        const infinityStats = {
            infinityLevel: this.infinityLevel,
            allClearCount: this.allClearCount,
            skillsUsed: this.skillSystem.totalSkillsUsed || 0,
            itemsUsed: this.itemSystem.totalItemsUsed || 0
        };
        
        // Could save to leaderboard or achievements
        console.log('Infinity mode stats:', infinityStats);
    }
    
    reset() {
        super.reset();
        
        // Reset infinity mode specifics
        this.infinityLevel = 1;
        this.experiencePoints = 0;
        this.nextLevelExp = 1000;
        this.difficultyMultiplier = 1;
        this.allClearCount = 0;
        this.itemDropChance = 0.1;
        
        // Reset systems
        this.skillSystem.reset();
        this.itemSystem.reset();
        
        this.updateInfinityUI();
    }
}