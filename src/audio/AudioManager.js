export class AudioManager {
    constructor() {
        this.context = null;
        this.sounds = {};
        this.bgm = {};
        this.currentBGM = null;
        
        this.masterVolume = 0.7;
        this.bgmVolume = 0.5;
        this.sfxVolume = 0.8;
        
        this.initialized = false;
    }
    
    async init() {
        try {
            // Create audio context on user interaction
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume context if suspended
            if (this.context.state === 'suspended') {
                await this.context.resume();
            }
            
            // Create master gain node
            this.masterGain = this.context.createGain();
            this.masterGain.connect(this.context.destination);
            this.masterGain.gain.value = this.masterVolume;
            
            // Create separate gain nodes for BGM and SFX
            this.bgmGain = this.context.createGain();
            this.bgmGain.connect(this.masterGain);
            this.bgmGain.gain.value = this.bgmVolume;
            
            this.sfxGain = this.context.createGain();
            this.sfxGain.connect(this.masterGain);
            this.sfxGain.gain.value = this.sfxVolume;
            
            // Load sounds
            await this.loadSounds();
            
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize audio:', error);
        }
    }
    
    async loadSounds() {
        // Define sound effects
        const soundEffects = {
            move: { frequency: 200, duration: 0.05, type: 'square' },
            rotate: { frequency: 300, duration: 0.1, type: 'sine' },
            hardDrop: { frequency: 150, duration: 0.2, type: 'triangle' },
            lineClear: { frequency: 800, duration: 0.3, type: 'sine' },
            tetris: { frequency: 1000, duration: 0.5, type: 'sine', modulation: true },
            hold: { frequency: 400, duration: 0.1, type: 'sine' },
            levelUp: { frequency: 600, duration: 0.8, type: 'sine', sweep: true },
            gameOver: { frequency: 200, duration: 1.5, type: 'sawtooth', sweep: true, reverse: true },
            menuHover: { frequency: 500, duration: 0.05, type: 'sine' },
            menuSelect: { frequency: 600, duration: 0.1, type: 'square' },
            menuBack: { frequency: 400, duration: 0.1, type: 'square' },
            combo: { frequency: 700, duration: 0.2, type: 'sine' },
            skill: { frequency: 900, duration: 0.3, type: 'sine', modulation: true },
            item: { frequency: 550, duration: 0.2, type: 'triangle' },
            pause: { frequency: 300, duration: 0.15, type: 'sine' },
            countdown: { frequency: 440, duration: 0.2, type: 'square' },
            warning: { frequency: 250, duration: 0.4, type: 'sawtooth' }
        };
        
        // Generate procedural sounds
        for (const [name, params] of Object.entries(soundEffects)) {
            this.sounds[name] = this.generateSound(params);
        }
        
        // Generate background music patterns
        this.generateBGMPatterns();
    }
    
    generateSound(params) {
        return () => {
            if (!this.context || !this.initialized) return;
            
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            oscillator.type = params.type;
            oscillator.frequency.setValueAtTime(params.frequency, this.context.currentTime);
            
            // Apply frequency sweep if specified
            if (params.sweep) {
                const endFrequency = params.reverse ? params.frequency / 4 : params.frequency * 2;
                oscillator.frequency.exponentialRampToValueAtTime(
                    endFrequency,
                    this.context.currentTime + params.duration
                );
            }
            
            // Apply modulation if specified
            if (params.modulation) {
                const lfo = this.context.createOscillator();
                const lfoGain = this.context.createGain();
                
                lfo.frequency.value = 10;
                lfoGain.gain.value = 50;
                
                lfo.connect(lfoGain);
                lfoGain.connect(oscillator.frequency);
                
                lfo.start();
                lfo.stop(this.context.currentTime + params.duration);
            }
            
            // Envelope
            gainNode.gain.setValueAtTime(0, this.context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, this.context.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + params.duration);
            
            oscillator.start(this.context.currentTime);
            oscillator.stop(this.context.currentTime + params.duration);
        };
    }
    
    generateBGMPatterns() {
        // Menu theme - calm and atmospheric
        this.bgm.menu = this.createBGMLoop([
            { note: 'C4', duration: 0.5 },
            { note: 'E4', duration: 0.5 },
            { note: 'G4', duration: 0.5 },
            { note: 'E4', duration: 0.5 },
            { note: 'C4', duration: 1.0 },
            { rest: true, duration: 0.5 }
        ], 80, 'sine');
        
        // Game theme - energetic and rhythmic
        this.bgm.game = this.createBGMLoop([
            { note: 'E5', duration: 0.25 },
            { note: 'B4', duration: 0.25 },
            { note: 'C5', duration: 0.25 },
            { note: 'D5', duration: 0.25 },
            { note: 'C5', duration: 0.25 },
            { note: 'B4', duration: 0.25 },
            { note: 'A4', duration: 0.5 },
            { note: 'A4', duration: 0.25 },
            { note: 'C5', duration: 0.25 },
            { note: 'E5', duration: 0.5 },
            { note: 'D5', duration: 0.25 },
            { note: 'C5', duration: 0.25 },
            { note: 'B4', duration: 0.75 }
        ], 140, 'square');
        
        // Danger theme - intense and fast
        this.bgm.danger = this.createBGMLoop([
            { note: 'C5', duration: 0.125 },
            { note: 'C5', duration: 0.125 },
            { note: 'G4', duration: 0.125 },
            { note: 'G4', duration: 0.125 },
            { note: 'E4', duration: 0.125 },
            { note: 'E4', duration: 0.125 },
            { note: 'C4', duration: 0.25 }
        ], 180, 'sawtooth');
    }
    
    createBGMLoop(pattern, bpm, waveform) {
        const beatDuration = 60 / bpm;
        
        return {
            pattern,
            bpm,
            waveform,
            play: () => this.playBGMPattern(pattern, beatDuration, waveform)
        };
    }
    
    playBGMPattern(pattern, beatDuration, waveform) {
        if (!this.context || !this.initialized) return;
        
        let currentTime = this.context.currentTime;
        const loopDuration = pattern.reduce((sum, note) => sum + note.duration * beatDuration, 0);
        
        const playPattern = () => {
            pattern.forEach(item => {
                if (!item.rest) {
                    const frequency = this.noteToFrequency(item.note);
                    this.playNote(frequency, item.duration * beatDuration, currentTime, waveform);
                }
                currentTime += item.duration * beatDuration;
            });
        };
        
        // Play pattern initially
        playPattern();
        
        // Set up looping
        this.bgmInterval = setInterval(() => {
            if (this.currentBGM) {
                currentTime = this.context.currentTime;
                playPattern();
            }
        }, loopDuration * 1000);
    }
    
    playNote(frequency, duration, startTime, waveform = 'sine') {
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.bgmGain);
        
        oscillator.type = waveform;
        oscillator.frequency.setValueAtTime(frequency, startTime);
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
        gainNode.gain.setValueAtTime(0.2, startTime + duration - 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }
    
    noteToFrequency(note) {
        const notes = {
            'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
            'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
            'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46,
            'G5': 783.99, 'A5': 880.00, 'B5': 987.77
        };
        return notes[note] || 440;
    }
    
    play(soundName) {
        if (this.sounds[soundName] && this.initialized) {
            this.sounds[soundName]();
        }
    }
    
    playBGM(trackName) {
        this.stopBGM();
        
        if (this.bgm[trackName] && this.initialized) {
            this.currentBGM = trackName;
            this.bgm[trackName].play();
        }
    }
    
    stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
        this.currentBGM = null;
    }
    
    setMasterVolume(value) {
        this.masterVolume = Math.max(0, Math.min(1, value));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }
    
    setBGMVolume(value) {
        this.bgmVolume = Math.max(0, Math.min(1, value));
        if (this.bgmGain) {
            this.bgmGain.gain.value = this.bgmVolume;
        }
    }
    
    setSFXVolume(value) {
        this.sfxVolume = Math.max(0, Math.min(1, value));
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxVolume;
        }
    }
    
    // Resume audio context if suspended (iOS fix)
    async resume() {
        if (this.context && this.context.state === 'suspended') {
            await this.context.resume();
        }
    }
}