import { TETROMINOS } from '../config/GameConfig.js';

export class Piece {
    constructor(type) {
        this.type = type;
        this.typeId = TETROMINOS[type].id || this.getTypeId(type);
        this.x = 0;
        this.y = 0;
        this.rotation = 0;
        this.shape = TETROMINOS[type].shape;
        this.color = TETROMINOS[type].color;
    }
    
    getTypeId(type) {
        const typeMap = {
            'I': 1, 'O': 2, 'T': 3, 'S': 4, 'Z': 5, 'J': 6, 'L': 7
        };
        return typeMap[type] || 1;
    }
    
    getShape() {
        // Return current rotation of the shape
        const rotations = TETROMINOS[this.type].rotations;
        return rotations[this.rotation];
    }
    
    rotate(direction = 1) {
        const rotations = TETROMINOS[this.type].rotations;
        this.rotation = (this.rotation + direction + rotations.length) % rotations.length;
        this.shape = rotations[this.rotation];
    }
    
    getWidth() {
        return this.getShape()[0].length;
    }
    
    getHeight() {
        return this.getShape().length;
    }
    
    getBlocks() {
        const blocks = [];
        const shape = this.getShape();
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    blocks.push({
                        x: this.x + col,
                        y: this.y + row
                    });
                }
            }
        }
        
        return blocks;
    }
    
    clone() {
        const cloned = new Piece(this.type);
        cloned.x = this.x;
        cloned.y = this.y;
        cloned.rotation = this.rotation;
        return cloned;
    }
    
    // Get bounding box
    getBounds() {
        const shape = this.getShape();
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const x = this.x + col;
                    const y = this.y + row;
                    
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        
        return { minX, maxX, minY, maxY };
    }
    
    // For AI calculations
    getBottomBlocks() {
        const shape = this.getShape();
        const bottomBlocks = [];
        
        // For each column, find the bottom-most block
        for (let col = 0; col < shape[0].length; col++) {
            for (let row = shape.length - 1; row >= 0; row--) {
                if (shape[row][col]) {
                    bottomBlocks.push({
                        x: this.x + col,
                        y: this.y + row
                    });
                    break;
                }
            }
        }
        
        return bottomBlocks;
    }
}