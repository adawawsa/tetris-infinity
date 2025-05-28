# Tetris Infinity EX

A modern, feature-rich implementation of Tetris with infinite gameplay possibilities.

## Features

### Core Gameplay
- Classic Tetris mechanics with SRS (Super Rotation System)
- Multiple game modes: Marathon, Sprint, Blitz, Battle, and Infinity
- Smooth controls with customizable DAS/ARR settings
- Ghost piece and next piece preview

### Infinity Mode Exclusive
- **Skills System**: Use powerful abilities like Freeze, Bomb, and Gravity
- **Items System**: Collect and use items for temporary power-ups
- **Infinity Levels**: Progress through endless levels with increasing difficulty
- **Experience System**: Gain XP and unlock new features

### Battle Mode
- **AI Opponents**: Face off against intelligent AI with multiple difficulty levels
- **Garbage System**: Send and receive garbage lines
- **Attack & Defense**: Strategic gameplay with shields and counters
- **Real-time Display**: See your opponent's board in real-time

### Technical Features
- **Web Audio API**: Procedurally generated sound effects and music
- **Particle Effects**: Beautiful visual effects for line clears and combos
- **Responsive Design**: Works on desktop and mobile devices
- **Local Storage**: Save your progress and settings
- **Achievements System**: Unlock achievements as you play

## How to Play

### Controls
- **Arrow Keys**: Move left/right, soft drop
- **Up Arrow / X**: Rotate clockwise
- **Z**: Rotate counter-clockwise
- **Space**: Hard drop
- **C / Shift**: Hold piece
- **ESC / P**: Pause

### Skills (Infinity Mode)
- **Q**: Skill 1
- **W**: Skill 2
- **E**: Skill 3

### Items (Infinity Mode)
- **1**: Use Item 1
- **2**: Use Item 2
- **3**: Use Item 3

## Installation

1. Clone the repository:
```bash
git clone https://github.com/adawawsa/tetris-infinity-ex.git
cd tetris-infinity-ex
```

2. Start a local server:
```bash
python3 -m http.server 8000
```

3. Open your browser and navigate to:
```
http://localhost:8000
```

## Development

The game is built with vanilla JavaScript and uses ES6 modules. No build process is required.

### Project Structure
```
tetris-infinity-ex/
├── index.html          # Main HTML file
├── styles/            # CSS files
├── src/               # JavaScript source files
│   ├── main.js        # Entry point
│   ├── game/          # Game logic
│   ├── ai/            # AI system
│   ├── audio/         # Audio manager
│   ├── core/          # Core systems
│   ├── effects/       # Visual effects
│   ├── network/       # Multiplayer (future)
│   └── ui/            # User interface
└── assets/            # Images and fonts
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Inspired by the original Tetris by Alexey Pajitnov
- SRS rotation system based on official Tetris guidelines
- Built with love for the Tetris community