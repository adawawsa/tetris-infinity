export class ScoreSystem {
    constructor(game) {
        this.game = game;
        
        // Score multiplier for items
        this.scoreMultiplier = 1;
        
        // Score values
        this.lineScores = {
            1: 100,   // Single
            2: 300,   // Double
            3: 500,   // Triple
            4: 800    // Tetris
        };
        
        this.tSpinScores = {
            mini: {
                0: 100,
                1: 200,
                2: 400
            },
            normal: {
                0: 400,
                1: 800,
                2: 1200,
                3: 1600
            }
        };
        
        this.comboBonus = 50;
        this.softDropPoints = 1;
        this.hardDropPoints = 2;
        this.perfectClearBonus = 3000;
    }
    
    calculateScore(linesCleared, level, combo, isTSpin = false, isTSpinMini = false, isPerfectClear = false) {
        let score = 0;
        
        // Base line clear score
        if (isTSpin) {
            if (isTSpinMini) {
                score = this.tSpinScores.mini[linesCleared] || 0;
            } else {
                score = this.tSpinScores.normal[linesCleared] || 0;
            }
        } else {
            score = this.lineScores[linesCleared] || 0;
        }
        
        // Apply level multiplier
        score *= level;
        
        // Add combo bonus
        if (combo > 0) {
            score += this.comboBonus * combo * level;
        }
        
        // Add perfect clear bonus
        if (isPerfectClear) {
            score += this.perfectClearBonus * level;
        }
        
        // Apply score multiplier (from items)
        score = Math.floor(score * this.scoreMultiplier);
        
        return score;
    }
    
    calculateSoftDropScore(cells) {
        return cells * this.softDropPoints;
    }
    
    calculateHardDropScore(cells) {
        return cells * this.hardDropPoints;
    }
    
    // Special scoring for different game modes
    calculateBlitzScore(baseScore, timeRemaining) {
        // Bonus points based on time remaining
        const timeBonus = Math.floor(timeRemaining * 10);
        return baseScore + timeBonus;
    }
    
    calculateBattleScore(baseScore, garbageSent) {
        // Extra points for sending garbage lines
        const garbageBonus = garbageSent * 100;
        return baseScore + garbageBonus;
    }
    
    // Calculate garbage lines to send in multiplayer
    calculateGarbageLines(linesCleared, combo, isTSpin = false, isPerfectClear = false) {
        let garbage = 0;
        
        // Base garbage from line clears
        if (isTSpin) {
            garbage = linesCleared * 2; // T-Spins send double garbage
        } else {
            const garbageTable = {
                1: 0,
                2: 1,
                3: 2,
                4: 4
            };
            garbage = garbageTable[linesCleared] || 0;
        }
        
        // Combo garbage
        if (combo > 1) {
            const comboTable = {
                2: 1,
                3: 1,
                4: 2,
                5: 2,
                6: 3,
                7: 3,
                8: 4,
                9: 4,
                10: 4,
                11: 5
            };
            garbage += comboTable[Math.min(combo, 11)] || 5;
        }
        
        // Perfect clear bonus
        if (isPerfectClear) {
            garbage += 10;
        }
        
        return garbage;
    }
    
    // Calculate attack power for battle modes
    calculateAttackPower(action, combo = 0) {
        const attackTable = {
            single: 0,
            double: 1,
            triple: 2,
            tetris: 4,
            tSpinMini: 0,
            tSpinMiniSingle: 2,
            tSpin: 2,
            tSpinSingle: 2,
            tSpinDouble: 4,
            tSpinTriple: 6,
            perfectClear: 10
        };
        
        let attack = attackTable[action] || 0;
        
        // Add combo multiplier
        if (combo > 0) {
            attack += Math.floor(combo / 2);
        }
        
        return attack;
    }
    
    // Experience calculation for player progression
    calculateExperience(score, linesCleared, level) {
        const baseXP = Math.floor(score / 100);
        const lineBonus = linesCleared * 10;
        const levelBonus = level * 5;
        
        return baseXP + lineBonus + levelBonus;
    }
    
    // Achievement checking
    checkAchievements(stats) {
        const achievements = [];
        
        // Score achievements
        if (stats.score >= 10000 && !stats.achievements.includes('score_10k')) {
            achievements.push({ id: 'score_10k', name: 'High Scorer', description: 'Score 10,000 points' });
        }
        if (stats.score >= 100000 && !stats.achievements.includes('score_100k')) {
            achievements.push({ id: 'score_100k', name: 'Master Scorer', description: 'Score 100,000 points' });
        }
        
        // Line achievements
        if (stats.lines >= 100 && !stats.achievements.includes('lines_100')) {
            achievements.push({ id: 'lines_100', name: 'Line Clearer', description: 'Clear 100 lines' });
        }
        
        // Combo achievements
        if (stats.maxCombo >= 10 && !stats.achievements.includes('combo_10')) {
            achievements.push({ id: 'combo_10', name: 'Combo Master', description: 'Achieve a 10x combo' });
        }
        
        // Special achievements
        if (stats.tetrisCount >= 10 && !stats.achievements.includes('tetris_10')) {
            achievements.push({ id: 'tetris_10', name: 'Tetris Expert', description: 'Clear 10 Tetrises' });
        }
        
        return achievements;
    }
}