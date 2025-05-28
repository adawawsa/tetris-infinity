export class InputManager {
    constructor() {
        this.keyBindings = {
            ArrowLeft: 'moveLeft',
            ArrowRight: 'moveRight',
            ArrowDown: 'softDrop',
            ArrowUp: 'rotateCW',
            ' ': 'hardDrop',
            z: 'rotateCCW',
            Z: 'rotateCCW',
            x: 'rotateCW',
            X: 'rotateCW',
            a: 'rotate180',
            A: 'rotate180',
            c: 'hold',
            C: 'hold',
            Shift: 'hold',
            Escape: 'pause',
            p: 'pause',
            P: 'pause',
            Enter: 'confirm',
            Backspace: 'back',
            // Skills
            q: 'skill1',
            Q: 'skill1',
            w: 'skill2',
            W: 'skill2',
            e: 'skill3',
            E: 'skill3',
            // Items
            '1': 'item1',
            '2': 'item2',
            '3': 'item3'
        };
        
        this.listeners = {
            keydown: [],
            keyup: [],
            moveLeft: [],
            moveRight: [],
            softDrop: [],
            hardDrop: [],
            rotateCW: [],
            rotateCCW: [],
            rotate180: [],
            hold: [],
            pause: [],
            confirm: [],
            back: [],
            skill1: [],
            skill2: [],
            skill3: [],
            item1: [],
            item2: [],
            item3: []
        };
        
        this.isListening = false;
        this.bindingKey = null;
        
        this.init();
    }
    
    init() {
        // Keyboard events
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Touch events for mobile
        this.initTouchControls();
        
        // Gamepad support
        this.initGamepadSupport();
        
        // Load custom bindings from storage
        this.loadCustomBindings();
    }
    
    handleKeyDown(e) {
        // Prevent default for game keys
        if (this.keyBindings[e.key] || e.key === ' ') {
            e.preventDefault();
        }
        
        // Handle key binding mode
        if (this.isListening) {
            this.handleKeyBinding(e.key);
            return;
        }
        
        const action = this.keyBindings[e.key];
        if (action) {
            // Trigger action listeners
            this.emit(action, e);
            
            // Also emit generic keydown
            this.emit('keydown', action);
        }
    }
    
    handleKeyUp(e) {
        const action = this.keyBindings[e.key];
        if (action) {
            this.emit('keyup', action);
        }
    }
    
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }
    
    off(event, callback) {
        if (this.listeners[event]) {
            const index = this.listeners[event].indexOf(callback);
            if (index > -1) {
                this.listeners[event].splice(index, 1);
            }
        }
    }
    
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
    
    removeAllListeners() {
        Object.keys(this.listeners).forEach(event => {
            this.listeners[event] = [];
        });
    }
    
    // Custom key binding
    startKeyBinding(action) {
        this.isListening = true;
        this.bindingKey = action;
        
        // Update UI to show binding mode
        const keyBindButtons = document.querySelectorAll('.key-bind');
        keyBindButtons.forEach(btn => {
            if (btn.dataset.action === action) {
                btn.classList.add('binding');
                btn.textContent = 'Press any key...';
            }
        });
    }
    
    handleKeyBinding(key) {
        if (!this.bindingKey) return;
        
        // Remove old binding for this key
        Object.keys(this.keyBindings).forEach(k => {
            if (this.keyBindings[k] === this.bindingKey) {
                delete this.keyBindings[k];
            }
        });
        
        // Set new binding
        this.keyBindings[key] = this.bindingKey;
        
        // Update UI
        const keyBindButtons = document.querySelectorAll('.key-bind');
        keyBindButtons.forEach(btn => {
            if (btn.dataset.action === this.bindingKey) {
                btn.classList.remove('binding');
                btn.textContent = this.getKeyDisplay(key);
            }
        });
        
        // Save custom bindings
        this.saveCustomBindings();
        
        // Reset binding mode
        this.isListening = false;
        this.bindingKey = null;
    }
    
    getKeyDisplay(key) {
        const displayNames = {
            ' ': 'Space',
            'ArrowUp': '↑',
            'ArrowDown': '↓',
            'ArrowLeft': '←',
            'ArrowRight': '→',
            'Escape': 'ESC',
            'Shift': 'Shift',
            'Control': 'Ctrl',
            'Alt': 'Alt',
            'Enter': 'Enter',
            'Backspace': 'Back'
        };
        
        return displayNames[key] || key.toUpperCase();
    }
    
    // Touch controls for mobile
    initTouchControls() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        
        const gameArea = document.getElementById('game-canvas');
        if (!gameArea) return;
        
        gameArea.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
        });
        
        gameArea.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            const deltaX = e.touches[0].clientX - touchStartX;
            const deltaY = e.touches[0].clientY - touchStartY;
            
            // Swipe detection
            if (Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    this.emit('moveRight');
                } else {
                    this.emit('moveLeft');
                }
                touchStartX = e.touches[0].clientX;
            }
            
            if (deltaY > 50) {
                this.emit('softDrop');
                touchStartY = e.touches[0].clientY;
            }
        });
        
        gameArea.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - touchStartTime;
            const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX);
            const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY);
            
            // Tap detection
            if (touchDuration < 200 && deltaX < 10 && deltaY < 10) {
                this.emit('rotateCW');
            }
            
            // Double tap for hold
            if (this.lastTapTime && Date.now() - this.lastTapTime < 300) {
                this.emit('hold');
            }
            this.lastTapTime = Date.now();
        });
    }
    
    // Gamepad support
    initGamepadSupport() {
        this.gamepads = {};
        this.gamepadMapping = {
            0: 'hardDrop',    // A button
            1: 'rotateCW',    // B button
            2: 'rotateCCW',   // X button
            3: 'hold',        // Y button
            9: 'pause',       // Start button
            12: 'moveUp',     // D-pad up
            13: 'softDrop',   // D-pad down
            14: 'moveLeft',   // D-pad left
            15: 'moveRight'   // D-pad right
        };
        
        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected:', e.gamepad.id);
            this.gamepads[e.gamepad.index] = e.gamepad;
            this.pollGamepads();
        });
        
        window.addEventListener('gamepaddisconnected', (e) => {
            console.log('Gamepad disconnected:', e.gamepad.id);
            delete this.gamepads[e.gamepad.index];
        });
    }
    
    pollGamepads() {
        const gamepads = navigator.getGamepads();
        
        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            if (!gamepad) continue;
            
            // Check buttons
            gamepad.buttons.forEach((button, index) => {
                const action = this.gamepadMapping[index];
                if (action && button.pressed) {
                    if (!this.gamepads[i].buttons[index].pressed) {
                        this.emit(action);
                    }
                }
            });
            
            // Check analog sticks
            const deadzone = 0.5;
            if (Math.abs(gamepad.axes[0]) > deadzone) {
                if (gamepad.axes[0] < -deadzone) {
                    this.emit('moveLeft');
                } else {
                    this.emit('moveRight');
                }
            }
            
            if (gamepad.axes[1] > deadzone) {
                this.emit('softDrop');
            }
            
            // Store current state
            this.gamepads[i] = gamepad;
        }
        
        // Continue polling
        if (Object.keys(this.gamepads).length > 0) {
            requestAnimationFrame(() => this.pollGamepads());
        }
    }
    
    // Settings persistence
    saveCustomBindings() {
        localStorage.setItem('tetris-keybindings', JSON.stringify(this.keyBindings));
    }
    
    loadCustomBindings() {
        const saved = localStorage.getItem('tetris-keybindings');
        if (saved) {
            try {
                const bindings = JSON.parse(saved);
                Object.assign(this.keyBindings, bindings);
            } catch (e) {
                console.error('Failed to load custom key bindings:', e);
            }
        }
    }
    
    resetToDefault() {
        this.keyBindings = {
            ArrowLeft: 'moveLeft',
            ArrowRight: 'moveRight',
            ArrowDown: 'softDrop',
            ArrowUp: 'rotateCW',
            ' ': 'hardDrop',
            z: 'rotateCCW',
            Z: 'rotateCCW',
            x: 'rotateCW',
            X: 'rotateCW',
            c: 'hold',
            C: 'hold',
            Shift: 'hold',
            Escape: 'pause',
            p: 'pause',
            P: 'pause'
        };
        
        this.saveCustomBindings();
    }
}