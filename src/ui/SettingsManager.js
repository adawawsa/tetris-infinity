export class SettingsManager {
    constructor() {
        this.settings = {
            controls: {
                das: 133,
                arr: 10,
                softDropSpeed: 20
            },
            audio: {
                master: 70,
                bgm: 50,
                sfx: 80
            },
            graphics: {
                particleQuality: 'high',
                ghostPiece: true,
                gridLines: false,
                screenShake: true,
                colorMode: 'normal' // normal, deuteranopia, protanopia, tritanopia
            },
            gameplay: {
                startingLevel: 1,
                showKeyHints: true,
                showStats: true,
                autoRepeat: true
            }
        };
        
        this.defaultSettings = JSON.parse(JSON.stringify(this.settings));
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateUI();
    }
    
    setupEventListeners() {
        // Audio settings
        const masterVolume = document.getElementById('master-volume');
        const bgmVolume = document.getElementById('bgm-volume');
        const sfxVolume = document.getElementById('sfx-volume');
        
        if (masterVolume) {
            masterVolume.addEventListener('input', (e) => {
                this.settings.audio.master = parseInt(e.target.value);
                this.updateVolumeDisplay(e.target);
            });
        }
        
        if (bgmVolume) {
            bgmVolume.addEventListener('input', (e) => {
                this.settings.audio.bgm = parseInt(e.target.value);
                this.updateVolumeDisplay(e.target);
            });
        }
        
        if (sfxVolume) {
            sfxVolume.addEventListener('input', (e) => {
                this.settings.audio.sfx = parseInt(e.target.value);
                this.updateVolumeDisplay(e.target);
            });
        }
        
        // Graphics settings
        const particleQuality = document.getElementById('particle-quality');
        const ghostPiece = document.getElementById('ghost-piece');
        const gridLines = document.getElementById('grid-lines');
        
        if (particleQuality) {
            particleQuality.addEventListener('change', (e) => {
                this.settings.graphics.particleQuality = e.target.value;
            });
        }
        
        if (ghostPiece) {
            ghostPiece.addEventListener('change', (e) => {
                this.settings.graphics.ghostPiece = e.target.checked;
            });
        }
        
        if (gridLines) {
            gridLines.addEventListener('change', (e) => {
                this.settings.graphics.gridLines = e.target.checked;
            });
        }
        
        // Gameplay settings
        const dasDelay = document.getElementById('das-delay');
        const arrDelay = document.getElementById('arr-delay');
        const softDropSpeed = document.getElementById('soft-drop-speed');
        
        if (dasDelay) {
            dasDelay.addEventListener('input', (e) => {
                this.settings.controls.das = parseInt(e.target.value);
            });
        }
        
        if (arrDelay) {
            arrDelay.addEventListener('input', (e) => {
                this.settings.controls.arr = parseInt(e.target.value);
            });
        }
        
        if (softDropSpeed) {
            softDropSpeed.addEventListener('change', (e) => {
                const value = e.target.value;
                this.settings.controls.softDropSpeed = value === 'inf' ? Infinity : parseInt(value);
            });
        }
        
        // Key bindings
        document.querySelectorAll('.key-bind').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (window.tetrisGame?.inputManager) {
                    window.tetrisGame.inputManager.startKeyBinding(action);
                }
            });
        });
    }
    
    updateVolumeDisplay(slider) {
        const display = slider.parentElement.querySelector('.value-display');
        if (display) {
            display.textContent = slider.value + '%';
        }
    }
    
    updateUI() {
        // Update audio sliders
        const masterVolume = document.getElementById('master-volume');
        const bgmVolume = document.getElementById('bgm-volume');
        const sfxVolume = document.getElementById('sfx-volume');
        
        if (masterVolume) {
            masterVolume.value = this.settings.audio.master;
            this.updateVolumeDisplay(masterVolume);
        }
        
        if (bgmVolume) {
            bgmVolume.value = this.settings.audio.bgm;
            this.updateVolumeDisplay(bgmVolume);
        }
        
        if (sfxVolume) {
            sfxVolume.value = this.settings.audio.sfx;
            this.updateVolumeDisplay(sfxVolume);
        }
        
        // Update graphics settings
        const particleQuality = document.getElementById('particle-quality');
        const ghostPiece = document.getElementById('ghost-piece');
        const gridLines = document.getElementById('grid-lines');
        
        if (particleQuality) {
            particleQuality.value = this.settings.graphics.particleQuality;
        }
        
        if (ghostPiece) {
            ghostPiece.checked = this.settings.graphics.ghostPiece;
        }
        
        if (gridLines) {
            gridLines.checked = this.settings.graphics.gridLines;
        }
        
        // Update gameplay settings
        const dasDelay = document.getElementById('das-delay');
        const arrDelay = document.getElementById('arr-delay');
        const softDropSpeed = document.getElementById('soft-drop-speed');
        
        if (dasDelay) {
            dasDelay.value = this.settings.controls.das;
        }
        
        if (arrDelay) {
            arrDelay.value = this.settings.controls.arr;
        }
        
        if (softDropSpeed) {
            if (this.settings.controls.softDropSpeed === Infinity) {
                softDropSpeed.value = 'inf';
            } else {
                softDropSpeed.value = this.settings.controls.softDropSpeed.toString();
            }
        }
    }
    
    async saveSettings() {
        try {
            localStorage.setItem('tetris-settings', JSON.stringify(this.settings));
            
            // Apply settings
            if (window.tetrisGame) {
                this.applySettings();
            }
            
            return true;
        } catch (e) {
            console.error('Failed to save settings:', e);
            return false;
        }
    }
    
    async loadSettings() {
        try {
            const saved = localStorage.getItem('tetris-settings');
            if (saved) {
                const loadedSettings = JSON.parse(saved);
                // Deep merge with defaults to ensure all properties exist
                this.settings = this.deepMerge(this.defaultSettings, loadedSettings);
            }
            
            this.updateUI();
            this.applySettings();
            
            return true;
        } catch (e) {
            console.error('Failed to load settings:', e);
            return false;
        }
    }
    
    resetToDefault() {
        this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
        this.updateUI();
        this.saveSettings();
    }
    
    applySettings() {
        // Apply audio settings
        if (window.tetrisGame?.audioManager) {
            const audio = window.tetrisGame.audioManager;
            audio.setMasterVolume(this.settings.audio.master / 100);
            audio.setBGMVolume(this.settings.audio.bgm / 100);
            audio.setSFXVolume(this.settings.audio.sfx / 100);
        }
        
        // Apply graphics settings
        if (window.tetrisGame?.renderer) {
            // Renderer will check settings when drawing
        }
        
        // Apply control settings
        if (window.tetrisGame?.game) {
            // Game will use these settings
        }
    }
    
    deepMerge(target, source) {
        const output = Object.assign({}, target);
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        
        return output;
    }
    
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }
    
    getSetting(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.settings);
    }
    
    setSetting(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => obj[key], this.settings);
        target[lastKey] = value;
    }
}