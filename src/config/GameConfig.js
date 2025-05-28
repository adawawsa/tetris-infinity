export const GAME_CONFIG = {
    // Board dimensions
    BOARD_WIDTH: 10,
    BOARD_HEIGHT: 20,
    VISIBLE_HEIGHT: 20,
    BUFFER_HEIGHT: 4,
    
    // Timing
    LOCK_DELAY: 500, // milliseconds
    MAX_LOCK_MOVES: 15,
    DAS_DEFAULT: 133, // milliseconds
    ARR_DEFAULT: 10, // milliseconds
    
    // Graphics
    CELL_SIZE: 30,
    GRID_COLOR: '#333333',
    GHOST_OPACITY: 0.3,
    
    // Game mechanics
    SOFT_DROP_SPEED: 20, // 20x gravity
    LEVELS: 15,
    LINES_PER_LEVEL: 10,
    
    // Scoring
    POINTS_SOFT_DROP: 1,
    POINTS_HARD_DROP: 2
};

// Tetromino definitions
export const TETROMINOS = {
    I: {
        id: 1,
        color: '#00ffff',
        shape: [[1, 1, 1, 1]],
        rotations: [
            [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
            [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
            [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
            [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]]
        ]
    },
    O: {
        id: 2,
        color: '#ffff00',
        shape: [[1, 1], [1, 1]],
        rotations: [
            [[1, 1], [1, 1]],
            [[1, 1], [1, 1]],
            [[1, 1], [1, 1]],
            [[1, 1], [1, 1]]
        ]
    },
    T: {
        id: 3,
        color: '#ff00ff',
        shape: [[0, 1, 0], [1, 1, 1]],
        rotations: [
            [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
            [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
            [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
            [[0, 1, 0], [1, 1, 0], [0, 1, 0]]
        ]
    },
    S: {
        id: 4,
        color: '#00ff00',
        shape: [[0, 1, 1], [1, 1, 0]],
        rotations: [
            [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
            [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
            [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
            [[1, 0, 0], [1, 1, 0], [0, 1, 0]]
        ]
    },
    Z: {
        id: 5,
        color: '#ff0000',
        shape: [[1, 1, 0], [0, 1, 1]],
        rotations: [
            [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
            [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
            [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
            [[0, 1, 0], [1, 1, 0], [1, 0, 0]]
        ]
    },
    J: {
        id: 6,
        color: '#0000ff',
        shape: [[1, 0, 0], [1, 1, 1]],
        rotations: [
            [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
            [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
            [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
            [[0, 1, 0], [0, 1, 0], [1, 1, 0]]
        ]
    },
    L: {
        id: 7,
        color: '#ff9900',
        shape: [[0, 0, 1], [1, 1, 1]],
        rotations: [
            [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
            [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
            [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
            [[1, 1, 0], [0, 1, 0], [0, 1, 0]]
        ]
    }
};

// Wall kick data (SRS)
export const WALL_KICKS = {
    JLSTZ: {
        '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
        '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
        '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
        '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
        '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
        '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
        '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
        '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
    },
    I: {
        '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
        '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
        '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
        '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
        '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
        '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
        '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
        '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
    }
};

// Colors for different elements
export const COLORS = {
    GHOST: 'rgba(255, 255, 255, 0.3)',
    GRID_LINE: '#333333',
    BACKGROUND: '#000000',
    GARBAGE: '#808080',
    FLASH: '#ffffff',
    DANGER: '#ff0000'
};

// Game modes configuration
export const GAME_MODES = {
    MARATHON: {
        name: 'Marathon',
        description: 'Classic endless mode',
        startLevel: 1,
        endLevel: null,
        targetLines: null,
        timeLimit: null
    },
    SPRINT: {
        name: 'Sprint',
        description: 'Clear 40 lines as fast as possible',
        startLevel: 1,
        endLevel: null,
        targetLines: 40,
        timeLimit: null
    },
    BLITZ: {
        name: 'Blitz',
        description: 'Score as high as possible in 2 minutes',
        startLevel: 1,
        endLevel: null,
        targetLines: null,
        timeLimit: 120000 // 2 minutes in milliseconds
    },
    BATTLE: {
        name: 'Battle',
        description: 'Compete against opponents',
        startLevel: 1,
        endLevel: null,
        targetLines: null,
        timeLimit: null,
        hasGarbage: true
    },
    COOP: {
        name: 'Co-op',
        description: 'Work together with a partner',
        startLevel: 1,
        endLevel: null,
        targetLines: null,
        timeLimit: null,
        sharedBoard: true
    }
};

// Special effects configuration
export const EFFECTS = {
    LINE_CLEAR: {
        duration: 500,
        particleCount: 20,
        particleSpeed: 200
    },
    TETRIS: {
        duration: 800,
        flashDuration: 200,
        shakeIntensity: 5
    },
    LEVEL_UP: {
        duration: 2000,
        textSize: 72,
        glowIntensity: 30
    },
    COMBO: {
        duration: 1000,
        bounceHeight: 20
    }
};

// Skills configuration
export const SKILLS = {
    FREEZE: {
        name: 'Freeze',
        description: 'Freeze falling piece for 3 seconds',
        cooldown: 30000,
        duration: 3000,
        icon: '❄️'
    },
    BOMB: {
        name: 'Bomb',
        description: 'Clear bottom 3 lines',
        cooldown: 45000,
        effect: 'clearLines',
        lines: 3,
        icon: '💣'
    },
    GRAVITY: {
        name: 'Gravity',
        description: 'Pull all blocks down',
        cooldown: 60000,
        effect: 'gravity',
        icon: '⬇️'
    },
    SWAP: {
        name: 'Swap',
        description: 'Change current piece',
        cooldown: 20000,
        effect: 'swap',
        icon: '🔄'
    },
    SHIELD: {
        name: 'Shield',
        description: 'Block incoming garbage for 10 seconds',
        cooldown: 40000,
        duration: 10000,
        icon: '🛡️'
    }
};

// Items configuration
export const ITEMS = {
    DOUBLE_SCORE: {
        name: 'Double Score',
        description: '2x score for 30 seconds',
        duration: 30000,
        multiplier: 2,
        icon: '⭐'
    },
    SLOW_FALL: {
        name: 'Slow Fall',
        description: 'Pieces fall 50% slower',
        duration: 20000,
        speedMultiplier: 0.5,
        icon: '🐌'
    },
    PREVIEW_EXTEND: {
        name: 'Preview+',
        description: 'See 2 extra next pieces',
        duration: 60000,
        extraPreviews: 2,
        icon: '👁️'
    },
    GHOST_SOLID: {
        name: 'Solid Ghost',
        description: 'Ghost piece is more visible',
        duration: 45000,
        opacity: 0.7,
        icon: '👻'
    }
};