import { Game } from './game/Game.js';
import { MenuManager } from './ui/MenuManager.js';
import { SettingsManager } from './ui/SettingsManager.js';
import { AudioManager } from './audio/AudioManager.js';
import { InputManager } from './core/InputManager.js';
import { Renderer } from './core/Renderer.js';
import { NetworkManager } from './network/NetworkManager.js';
import { StatsManager } from './utils/StatsManager.js';

class TetrisInfinityEX {
    constructor() {
        this.game = null;
        this.menuManager = null;
        this.settingsManager = null;
        this.audioManager = null;
        this.inputManager = null;
        this.renderer = null;
        this.networkManager = null;
        this.statsManager = null;
        
        this.currentScreen = 'main-menu';
        this.gameMode = null;
    }
    
    async init() {
        try {
            this.showLoadingScreen(true);
            
            // Initialize managers
            this.audioManager = new AudioManager();
            this.inputManager = new InputManager();
            this.settingsManager = new SettingsManager();
            this.statsManager = new StatsManager();
            this.renderer = new Renderer('game-canvas', 'effects-canvas');
            this.networkManager = new NetworkManager();
            
            // Initialize UI managers
            this.menuManager = new MenuManager(this);
            
            // Load saved settings
            await this.settingsManager.loadSettings();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize audio
            await this.audioManager.init();
            
            this.showLoadingScreen(false);
            this.showScreen('main-menu');
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showError('Failed to initialize game. Please refresh the page.');
        }
    }
    
    setupEventListeners() {
        // Menu button clicks
        document.querySelectorAll('.menu-btn[data-mode]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.startGame(mode);
            });
        });
        
        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showScreen('settings-screen');
        });
        
        // Save settings button
        document.getElementById('save-settings').addEventListener('click', () => {
            this.settingsManager.saveSettings();
            this.showScreen('main-menu');
        });
        
        // Reset settings button
        document.getElementById('reset-settings').addEventListener('click', () => {
            this.settingsManager.resetToDefault();
        });
        
        // Game over buttons
        document.getElementById('retry-btn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('menu-btn').addEventListener('click', () => {
            this.returnToMenu();
        });
        
        // Pause button
        document.getElementById('pause-btn').addEventListener('click', () => {
            if (this.game) {
                this.game.togglePause();
            }
        });
        
        // Settings tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSettingsTab(e.currentTarget.dataset.tab);
            });
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            if (this.renderer) {
                this.renderer.handleResize();
            }
        });
        
        // Prevent context menu on game canvas
        document.getElementById('game-canvas').addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
    
    async startGame(mode) {
        this.gameMode = mode;
        this.showScreen('game-screen');
        
        // Add game mode class to game screen
        const gameScreen = document.getElementById('game-screen');
        gameScreen.className = `screen active game-mode-${mode}`;
        
        // Import appropriate game mode
        let GameMode;
        switch(mode) {
            case 'marathon':
                const { InfinityMode } = await import('./game/modes/InfinityMode.js');
                GameMode = InfinityMode;
                break;
            case 'battle':
                const { BattleMode } = await import('./game/modes/BattleMode.js');
                GameMode = BattleMode;
                break;
            default:
                GameMode = Game;
        }
        
        // Create new game instance
        this.game = new GameMode(this, mode);
        this.game.init();
        
        // Play game start sound
        this.audioManager.play('gameStart');
        
        // Start background music
        this.audioManager.playBGM('game');
    }
    
    restartGame() {
        if (this.game) {
            this.game.reset();
            this.game.start();
            document.getElementById('gameover-screen').classList.remove('active');
        }
    }
    
    returnToMenu() {
        if (this.game) {
            this.game.destroy();
            this.game = null;
        }
        
        this.audioManager.stopBGM();
        this.audioManager.playBGM('menu');
        
        document.getElementById('gameover-screen').classList.remove('active');
        this.showScreen('main-menu');
    }
    
    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
        }
    }
    
    showLoadingScreen(show) {
        const loadingScreen = document.getElementById('loading-screen');
        if (show) {
            loadingScreen.classList.add('active');
        } else {
            loadingScreen.classList.remove('active');
        }
    }
    
    showError(message) {
        // Create error overlay
        const errorOverlay = document.createElement('div');
        errorOverlay.className = 'overlay active';
        errorOverlay.innerHTML = `
            <div class="error-container">
                <h2>Error</h2>
                <p>${message}</p>
                <button class="btn primary" onclick="location.reload()">Reload</button>
            </div>
        `;
        document.body.appendChild(errorOverlay);
    }
    
    switchSettingsTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }
    
    showGameOver(stats) {
        // Update final stats
        document.getElementById('final-score').textContent = stats.score.toLocaleString();
        document.getElementById('final-lines').textContent = stats.lines;
        document.getElementById('final-time').textContent = stats.time;
        document.getElementById('final-combo').textContent = stats.maxCombo;
        
        // Show game over screen
        document.getElementById('gameover-screen').classList.add('active');
        
        // Play game over sound
        this.audioManager.play('gameOver');
        
        // Save stats
        this.statsManager.saveGameStats(this.gameMode, stats);
        
        // Update user level if needed
        this.updateUserLevel();
    }
    
    updateUserLevel() {
        const level = this.statsManager.getUserLevel();
        document.getElementById('user-level').textContent = level;
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new TetrisInfinityEX();
    game.init();
    
    // Make game instance globally accessible for debugging
    window.tetrisGame = game;
});