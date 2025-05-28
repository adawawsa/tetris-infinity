import { EFFECTS } from '../config/GameConfig.js';

export class EffectsManager {
    constructor(app) {
        this.app = app;
        this.particles = [];
        this.activeEffects = [];
        this.comboDisplay = document.getElementById('combo-display');
        this.specialEffects = document.getElementById('special-effects');
    }
    
    update(deltaTime) {
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.life -= deltaTime;
            
            if (particle.life <= 0) {
                return false;
            }
            
            // Update position
            particle.x += particle.vx * (deltaTime / 1000);
            particle.y += particle.vy * (deltaTime / 1000);
            
            // Apply gravity if specified
            if (particle.gravity) {
                particle.vy += particle.gravity * (deltaTime / 1000);
            }
            
            // Update alpha
            particle.alpha = particle.life / particle.maxLife;
            
            return true;
        });
        
        // Update active effects
        this.activeEffects = this.activeEffects.filter(effect => {
            effect.duration -= deltaTime;
            effect.update(deltaTime);
            return effect.duration > 0;
        });
    }
    
    render() {
        const renderer = this.app.renderer;
        
        // Render particles
        this.particles.forEach(particle => {
            renderer.drawParticle(
                particle.x,
                particle.y,
                particle.radius,
                particle.color,
                particle.alpha
            );
        });
        
        // Render active effects
        this.activeEffects.forEach(effect => {
            effect.render(renderer);
        });
    }
    
    playLineClear(lines) {
        // Create line clear flash effect
        lines.forEach(lineY => {
            this.createLineClearFlash(lineY);
            this.createLineClearParticles(lineY);
        });
        
        // Screen shake for tetris
        if (lines.length === 4) {
            this.screenShake(EFFECTS.TETRIS.shakeIntensity, EFFECTS.TETRIS.duration);
        }
    }
    
    createLineClearFlash(lineY) {
        const effect = {
            type: 'lineFlash',
            lineY: lineY,
            duration: EFFECTS.LINE_CLEAR.duration,
            maxDuration: EFFECTS.LINE_CLEAR.duration,
            update: function(deltaTime) {
                // Effect updates handled in render
            },
            render: function(renderer) {
                const progress = 1 - (this.duration / this.maxDuration);
                const alpha = Math.sin(progress * Math.PI);
                
                renderer.effectsCtx.save();
                renderer.effectsCtx.globalAlpha = alpha * 0.8;
                
                const y = this.lineY * renderer.cellSize;
                const gradient = renderer.effectsCtx.createLinearGradient(
                    0, y,
                    renderer.canvas.width, y
                );
                
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
                gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                renderer.effectsCtx.fillStyle = gradient;
                renderer.effectsCtx.fillRect(
                    0, y,
                    renderer.canvas.width, renderer.cellSize
                );
                
                renderer.effectsCtx.restore();
            }
        };
        
        this.activeEffects.push(effect);
    }
    
    createLineClearParticles(lineY) {
        const particleCount = EFFECTS.LINE_CLEAR.particleCount;
        const speed = EFFECTS.LINE_CLEAR.particleSpeed;
        
        for (let i = 0; i < particleCount; i++) {
            const x = Math.random() * this.app.renderer.canvas.width;
            const y = lineY * this.app.renderer.cellSize + this.app.renderer.cellSize / 2;
            
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * speed,
                vy: (Math.random() - 0.8) * speed,
                radius: Math.random() * 3 + 1,
                color: this.getRandomColor(),
                alpha: 1,
                life: 1000,
                maxLife: 1000,
                gravity: 200
            });
        }
    }
    
    showCombo(combo) {
        const comboText = this.comboDisplay.querySelector('.combo-text');
        const comboMultiplier = this.comboDisplay.querySelector('.combo-multiplier');
        
        comboText.textContent = `${combo} COMBO!`;
        comboMultiplier.textContent = `×${combo}`;
        
        this.comboDisplay.classList.add('active');
        
        // Remove after animation
        setTimeout(() => {
            this.comboDisplay.classList.remove('active');
        }, EFFECTS.COMBO.duration);
        
        // Create particle burst
        this.createComboBurst(combo);
    }
    
    createComboBurst(combo) {
        const centerX = this.app.renderer.canvas.width / 2;
        const centerY = this.app.renderer.canvas.height / 2;
        const particleCount = Math.min(combo * 10, 100);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 100 + combo * 20;
            
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 2,
                color: '#ffff00',
                alpha: 1,
                life: 800,
                maxLife: 800
            });
        }
    }
    
    playLevelUp(level) {
        // Create level up text effect
        const levelUpDiv = document.createElement('div');
        levelUpDiv.className = 'level-up-effect';
        levelUpDiv.textContent = `LEVEL ${level}!`;
        this.specialEffects.appendChild(levelUpDiv);
        
        // Remove after animation
        setTimeout(() => {
            this.specialEffects.removeChild(levelUpDiv);
        }, EFFECTS.LEVEL_UP.duration);
        
        // Create particle fountain
        this.createLevelUpFountain();
    }
    
    showPerfectClear() {
        // Create perfect clear effect
        const perfectClearDiv = document.createElement('div');
        perfectClearDiv.className = 'perfect-clear-effect';
        perfectClearDiv.innerHTML = `
            <div class="perfect-text">PERFECT</div>
            <div class="clear-text">CLEAR!</div>
        `;
        this.specialEffects.appendChild(perfectClearDiv);
        
        // Remove after animation
        setTimeout(() => {
            this.specialEffects.removeChild(perfectClearDiv);
        }, 2000);
        
        // Create rainbow particle burst
        this.createPerfectClearBurst();
        
        // Play special sound
        this.app.audioManager.play('perfectClear');
    }
    
    createPerfectClearBurst() {
        const centerX = this.app.renderer.canvas.width / 2;
        const centerY = this.app.renderer.canvas.height / 2;
        const particleCount = 100;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 200 + Math.random() * 100;
            const hue = (360 * i) / particleCount;
            
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 3,
                color: `hsl(${hue}, 100%, 50%)`,
                alpha: 1,
                life: 1500,
                maxLife: 1500,
                gravity: 0
            });
        }
    }
    
    createLevelUpFountain() {
        const fountainEffect = {
            type: 'fountain',
            duration: 1500,
            emitTimer: 0,
            update: function(deltaTime) {
                this.emitTimer += deltaTime;
                
                if (this.emitTimer > 50) {
                    this.emitTimer = 0;
                    
                    const centerX = this.app.renderer.canvas.width / 2;
                    const bottomY = this.app.renderer.canvas.height;
                    
                    for (let i = 0; i < 5; i++) {
                        this.app.effectsManager.particles.push({
                            x: centerX + (Math.random() - 0.5) * 50,
                            y: bottomY,
                            vx: (Math.random() - 0.5) * 100,
                            vy: -300 - Math.random() * 200,
                            radius: Math.random() * 3 + 2,
                            color: this.app.effectsManager.getRandomColor(),
                            alpha: 1,
                            life: 2000,
                            maxLife: 2000,
                            gravity: 400
                        });
                    }
                }
            }.bind(this),
            render: function() {
                // Particles handle their own rendering
            },
            app: this.app
        };
        
        this.activeEffects.push(fountainEffect);
    }
    
    playSkillEffect(skillType) {
        const skillOverlay = document.createElement('div');
        skillOverlay.className = `skill-effect-overlay skill-${skillType} active`;
        this.specialEffects.appendChild(skillOverlay);
        
        // Remove after animation
        setTimeout(() => {
            this.specialEffects.removeChild(skillOverlay);
        }, 1000);
        
        // Play skill sound
        this.app.audioManager.play('skill');
    }
    
    screenShake(intensity, duration) {
        if (!this.app.settingsManager.settings.graphics.screenShake) {
            return;
        }
        
        const gameArea = document.querySelector('.game-area');
        if (!gameArea) return;
        
        gameArea.classList.add('screen-shake');
        
        const shakeEffect = {
            type: 'screenShake',
            duration: duration,
            intensity: intensity,
            update: function(deltaTime) {
                const progress = 1 - (this.duration / duration);
                const currentIntensity = this.intensity * (1 - progress);
                
                const offsetX = (Math.random() - 0.5) * currentIntensity;
                const offsetY = (Math.random() - 0.5) * currentIntensity;
                
                gameArea.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            },
            render: function() {}
        };
        
        this.activeEffects.push(shakeEffect);
        
        // Reset after shake
        setTimeout(() => {
            gameArea.classList.remove('screen-shake');
            gameArea.style.transform = '';
        }, duration);
    }
    
    createPowerUpEffect(x, y, type) {
        const effect = {
            type: 'powerup',
            x: x,
            y: y,
            radius: 0,
            maxRadius: 100,
            duration: 1000,
            color: this.getPowerUpColor(type),
            update: function(deltaTime) {
                const progress = 1 - (this.duration / 1000);
                this.radius = this.maxRadius * progress;
            },
            render: function(renderer) {
                const alpha = 1 - (this.radius / this.maxRadius);
                
                renderer.effectsCtx.save();
                renderer.effectsCtx.globalAlpha = alpha * 0.5;
                renderer.effectsCtx.strokeStyle = this.color;
                renderer.effectsCtx.lineWidth = 3;
                
                renderer.effectsCtx.beginPath();
                renderer.effectsCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                renderer.effectsCtx.stroke();
                
                renderer.effectsCtx.restore();
            }
        };
        
        this.activeEffects.push(effect);
    }
    
    createScorePopup(x, y, score) {
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.textContent = `+${score}`;
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
        
        this.specialEffects.appendChild(popup);
        
        // Remove after animation
        setTimeout(() => {
            if (popup.parentNode) {
                this.specialEffects.removeChild(popup);
            }
        }, 1500);
    }
    
    // Utility methods
    getRandomColor() {
        const colors = ['#00ffff', '#ffff00', '#ff00ff', '#00ff00', '#ff0000', '#0000ff', '#ff9900'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    getPowerUpColor(type) {
        const colors = {
            freeze: '#00ffff',
            bomb: '#ff0000',
            gravity: '#ff00ff',
            swap: '#00ff00',
            shield: '#0080ff'
        };
        return colors[type] || '#ffffff';
    }
    
    clear() {
        this.particles = [];
        this.activeEffects = [];
        this.comboDisplay.classList.remove('active');
        this.specialEffects.innerHTML = '';
    }
}