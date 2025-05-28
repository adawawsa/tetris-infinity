export class MenuManager {
    constructor(app) {
        this.app = app;
        this.currentMenu = 'main';
        this.selectedIndex = 0;
        
        this.init();
    }
    
    init() {
        this.setupMenuAnimations();
        this.setupKeyboardNavigation();
    }
    
    setupMenuAnimations() {
        // Add hover effects to menu buttons
        const menuButtons = document.querySelectorAll('.menu-btn');
        
        menuButtons.forEach((btn, index) => {
            btn.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.updateSelection();
                this.app.audioManager.play('menuHover');
            });
            
            btn.addEventListener('click', () => {
                this.app.audioManager.play('menuSelect');
            });
        });
    }
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (this.app.currentScreen !== 'main-menu') return;
            
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigate(-1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigate(1);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.navigate(-2);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.navigate(2);
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    this.selectCurrent();
                    break;
            }
        });
    }
    
    navigate(direction) {
        const buttons = document.querySelectorAll('.menu-btn');
        const numButtons = buttons.length;
        
        this.selectedIndex = (this.selectedIndex + direction + numButtons) % numButtons;
        this.updateSelection();
        
        this.app.audioManager.play('menuHover');
    }
    
    updateSelection() {
        const buttons = document.querySelectorAll('.menu-btn');
        
        buttons.forEach((btn, index) => {
            if (index === this.selectedIndex) {
                btn.classList.add('selected');
                btn.focus();
            } else {
                btn.classList.remove('selected');
            }
        });
    }
    
    selectCurrent() {
        const buttons = document.querySelectorAll('.menu-btn');
        const selectedButton = buttons[this.selectedIndex];
        
        if (selectedButton) {
            selectedButton.click();
        }
    }
    
    showModeSelect(callback) {
        // Create mode selection overlay
        const overlay = document.createElement('div');
        overlay.className = 'overlay active';
        overlay.innerHTML = `
            <div class="mode-select-container">
                <h2>Select Game Mode</h2>
                <div class="mode-options">
                    <div class="mode-option" data-mode="marathon">
                        <h3>Marathon ∞</h3>
                        <p>Classic endless mode. Test your endurance!</p>
                    </div>
                    <div class="mode-option" data-mode="sprint">
                        <h3>Sprint 40</h3>
                        <p>Clear 40 lines as fast as possible!</p>
                    </div>
                    <div class="mode-option" data-mode="blitz">
                        <h3>Blitz 2:00</h3>
                        <p>Score attack! Get the highest score in 2 minutes!</p>
                    </div>
                    <div class="mode-option" data-mode="zen">
                        <h3>Zen Mode</h3>
                        <p>No pressure. Just relax and play.</p>
                    </div>
                </div>
                <button class="btn secondary" id="mode-back">Back</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Add event listeners
        overlay.querySelectorAll('.mode-option').forEach(option => {
            option.addEventListener('click', () => {
                const mode = option.dataset.mode;
                this.app.audioManager.play('menuSelect');
                document.body.removeChild(overlay);
                callback(mode);
            });
        });
        
        overlay.querySelector('#mode-back').addEventListener('click', () => {
            this.app.audioManager.play('menuBack');
            document.body.removeChild(overlay);
        });
    }
    
    showPlayerInfo() {
        const stats = this.app.statsManager.getPlayerStats();
        
        const overlay = document.createElement('div');
        overlay.className = 'overlay active';
        overlay.innerHTML = `
            <div class="player-info-container">
                <h2>Player Statistics</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Total Score</h3>
                        <p class="stat-value">${stats.totalScore.toLocaleString()}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Lines Cleared</h3>
                        <p class="stat-value">${stats.totalLines.toLocaleString()}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Games Played</h3>
                        <p class="stat-value">${stats.gamesPlayed}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Best Score</h3>
                        <p class="stat-value">${stats.bestScore.toLocaleString()}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Play Time</h3>
                        <p class="stat-value">${this.formatTime(stats.totalPlayTime)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Level</h3>
                        <p class="stat-value">${stats.playerLevel}</p>
                    </div>
                </div>
                <div class="achievements">
                    <h3>Recent Achievements</h3>
                    <div class="achievement-list">
                        ${this.renderAchievements(stats.recentAchievements)}
                    </div>
                </div>
                <button class="btn primary" id="stats-close">Close</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        overlay.querySelector('#stats-close').addEventListener('click', () => {
            this.app.audioManager.play('menuBack');
            document.body.removeChild(overlay);
        });
    }
    
    formatTime(milliseconds) {
        const hours = Math.floor(milliseconds / 3600000);
        const minutes = Math.floor((milliseconds % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    }
    
    renderAchievements(achievements) {
        if (!achievements || achievements.length === 0) {
            return '<p class="no-achievements">No achievements yet!</p>';
        }
        
        return achievements.map(achievement => `
            <div class="achievement-item">
                <span class="achievement-icon">${achievement.icon}</span>
                <div class="achievement-info">
                    <h4>${achievement.name}</h4>
                    <p>${achievement.description}</p>
                </div>
            </div>
        `).join('');
    }
}