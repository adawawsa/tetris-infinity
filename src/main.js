import { Game } from './game/Game.js';
import { GameRefactored } from './game/GameRefactored.js';
import { MenuManager } from './ui/MenuManager.js';
import { SettingsManager } from './ui/SettingsManager.js';
import { AudioManager } from './audio/AudioManager.js';
import { InputManager } from './core/InputManager.js';
import { Renderer } from './core/Renderer.js';
import { NetworkManager } from './network/NetworkManager.js';
import { StatsManager } from './utils/StatsManager.js';

// Configuration flag to use refactored version
const USE_REFACTORED_VERSION = true;

export class TetrisInfinityEX {
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
            console.log('Starting initialization...');
            this.showLoadingScreen(true);
            
            // Initialize managers
            console.log('Initializing AudioManager...');
            this.audioManager = new AudioManager();
            
            console.log('Initializing InputManager...');
            this.inputManager = new InputManager();
            
            console.log('Initializing SettingsManager...');
            this.settingsManager = new SettingsManager();
            
            console.log('Initializing StatsManager...');
            this.statsManager = new StatsManager();
            
            console.log('Initializing Renderer...');
            this.renderer = new Renderer('game-canvas', 'effects-canvas');
            
            console.log('Initializing NetworkManager...');
            this.networkManager = new NetworkManager();
            
            // Initialize UI managers
            console.log('Initializing MenuManager...');
            this.menuManager = new MenuManager(this);
            
            // Load saved settings
            console.log('Loading settings...');
            await this.settingsManager.loadSettings();
            
            // Setup event listeners
            console.log('Setting up event listeners...');
            this.setupEventListeners();
            
            // Initialize audio
            console.log('Initializing audio...');
            await this.audioManager.init();
            
            console.log('Initialization complete!');
            this.showLoadingScreen(false);
            this.showScreen('main-menu');
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            console.error('Stack trace:', error.stack);
            this.showLoadingScreen(false);
            this.showError(`Failed to initialize game: ${error.message}`);
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
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showScreen('settings-screen');
            });
        }
        
        // Save settings button
        const saveSettingsBtn = document.getElementById('save-settings');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.settingsManager.saveSettings();
                this.showScreen('main-menu');
            });
        }
        
        // Reset settings button
        const resetSettingsBtn = document.getElementById('reset-settings');
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => {
                this.settingsManager.resetToDefault();
            });
        }
        
        // Game over buttons
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.restartGame();
            });
        }
        
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                this.returnToMenu();
            });
        }
        
        // Pause button
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                if (this.game) {
                    this.game.togglePause();
                }
            });
        }
        
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
        const gameCanvas = document.getElementById('game-canvas');
        if (gameCanvas) {
            gameCanvas.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
        }
    }
    
    async startGame(mode) {
        this.gameMode = mode;
        this.showScreen('game-screen');
        
        // Add game mode class to game screen
        const gameScreen = document.getElementById('game-screen');
        gameScreen.className = `screen active game-mode-${mode}`;
        
        // Import appropriate game mode
        let GameMode;
        let useRefactored = USE_REFACTORED_VERSION;
        
        switch(mode) {
            case 'marathon':
                if (USE_REFACTORED_VERSION) {
                    const { InfinityModeRefactored } = await import('./game/modes/InfinityModeRefactored.js');
                    GameMode = InfinityModeRefactored;
                } else {
                    const { InfinityMode } = await import('./game/modes/InfinityMode.js');
                    GameMode = InfinityMode;
                }
                break;
            case 'battle':
                if (USE_REFACTORED_VERSION) {
                    const { BattleModeRefactored } = await import('./game/modes/BattleModeRefactored.js');
                    GameMode = BattleModeRefactored;
                } else {
                    const { BattleMode } = await import('./game/modes/BattleMode.js');
                    GameMode = BattleMode;
                }
                break;
            case 'sprint':
                if (USE_REFACTORED_VERSION) {
                    const { SprintModeRefactored } = await import('./game/modes/SprintModeRefactored.js');
                    GameMode = SprintModeRefactored;
                } else {
                    // Fall back to base game for now
                    GameMode = Game;
                }
                break;
            case 'blitz':
                if (USE_REFACTORED_VERSION) {
                    const { BlitzModeRefactored } = await import('./game/modes/BlitzModeRefactored.js');
                    GameMode = BlitzModeRefactored;
                } else {
                    // Fall back to base game for now
                    GameMode = Game;
                }
                break;
            default:
                if (USE_REFACTORED_VERSION) {
                    const { MarathonModeRefactored } = await import('./game/modes/MarathonModeRefactored.js');
                    GameMode = MarathonModeRefactored;
                } else {
                    GameMode = Game;
                }
        }
        
        // Create new game instance
        if (useRefactored) {
            // Use refactored version
            this.game = new GameMode(this, {
                mode: mode,
                seed: Date.now(),
                playerId: 'local',
                isMultiplayer: false
            });
            this.game.start();
        } else {
            // Use original version
            this.game = new GameMode(this, mode);
            this.game.init();
        }
        
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
        const userLevelEl = document.getElementById('user-level');
        if (userLevelEl) {
            userLevelEl.textContent = level;
        }
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new TetrisInfinityEX();
    game.init();
    
    // Make game instance globally accessible for debugging
    window.tetrisGame = game;
});