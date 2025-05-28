export class StatsManager {
    constructor() {
        this.stats = {
            totalScore: 0,
            totalLines: 0,
            gamesPlayed: 0,
            totalPlayTime: 0,
            bestScore: 0,
            bestLines: 0,
            bestLevel: 0,
            totalTetris: 0,
            totalTSpins: 0,
            perfectClears: 0,
            maxCombo: 0,
            achievements: [],
            playerLevel: 1,
            experience: 0,
            recentGames: []
        };
        
        this.achievements = this.defineAchievements();
        this.loadStats();
    }
    
    defineAchievements() {
        return [
            // Score achievements
            { id: 'score_1k', name: 'Getting Started', description: 'Score 1,000 points', icon: '⭐', requirement: { type: 'score', value: 1000 } },
            { id: 'score_10k', name: 'High Scorer', description: 'Score 10,000 points', icon: '🌟', requirement: { type: 'score', value: 10000 } },
            { id: 'score_100k', name: 'Master Scorer', description: 'Score 100,000 points', icon: '💫', requirement: { type: 'score', value: 100000 } },
            { id: 'score_1m', name: 'Millionaire', description: 'Score 1,000,000 points', icon: '🏆', requirement: { type: 'score', value: 1000000 } },
            
            // Lines achievements
            { id: 'lines_100', name: 'Line Clearer', description: 'Clear 100 lines', icon: '📏', requirement: { type: 'lines', value: 100 } },
            { id: 'lines_1000', name: 'Line Master', description: 'Clear 1,000 lines', icon: '📐', requirement: { type: 'lines', value: 1000 } },
            { id: 'lines_10000', name: 'Line Legend', description: 'Clear 10,000 lines', icon: '🎯', requirement: { type: 'lines', value: 10000 } },
            
            // Combo achievements
            { id: 'combo_5', name: 'Combo Starter', description: 'Achieve a 5x combo', icon: '🔥', requirement: { type: 'combo', value: 5 } },
            { id: 'combo_10', name: 'Combo Expert', description: 'Achieve a 10x combo', icon: '💥', requirement: { type: 'combo', value: 10 } },
            { id: 'combo_20', name: 'Combo God', description: 'Achieve a 20x combo', icon: '⚡', requirement: { type: 'combo', value: 20 } },
            
            // Special achievements
            { id: 'tetris_1', name: 'First Tetris', description: 'Clear your first Tetris', icon: '4️⃣', requirement: { type: 'tetris', value: 1 } },
            { id: 'tetris_100', name: 'Tetris Master', description: 'Clear 100 Tetrises', icon: '💯', requirement: { type: 'tetris', value: 100 } },
            { id: 'tspin_1', name: 'Spin Doctor', description: 'Perform your first T-Spin', icon: '🌀', requirement: { type: 'tspin', value: 1 } },
            { id: 'perfect_clear', name: 'Perfectionist', description: 'Achieve a perfect clear', icon: '✨', requirement: { type: 'perfectClear', value: 1 } },
            
            // Level achievements
            { id: 'level_10', name: 'Double Digits', description: 'Reach level 10', icon: '🔟', requirement: { type: 'level', value: 10 } },
            { id: 'level_20', name: 'Speed Demon', description: 'Reach level 20', icon: '🏃', requirement: { type: 'level', value: 20 } },
            { id: 'level_30', name: 'Gravity Defier', description: 'Reach level 30', icon: '🚀', requirement: { type: 'level', value: 30 } },
            
            // Time achievements
            { id: 'play_1h', name: 'Dedicated Player', description: 'Play for 1 hour total', icon: '⏰', requirement: { type: 'playTime', value: 3600000 } },
            { id: 'play_10h', name: 'Tetris Addict', description: 'Play for 10 hours total', icon: '🕐', requirement: { type: 'playTime', value: 36000000 } },
            { id: 'play_100h', name: 'No Life', description: 'Play for 100 hours total', icon: '⏳', requirement: { type: 'playTime', value: 360000000 } },
            
            // Game count achievements
            { id: 'games_10', name: 'Regular', description: 'Play 10 games', icon: '🎮', requirement: { type: 'games', value: 10 } },
            { id: 'games_100', name: 'Veteran', description: 'Play 100 games', icon: '🎯', requirement: { type: 'games', value: 100 } },
            { id: 'games_1000', name: 'Legend', description: 'Play 1,000 games', icon: '👑', requirement: { type: 'games', value: 1000 } }
        ];
    }
    
    loadStats() {
        const saved = localStorage.getItem('tetris-stats');
        if (saved) {
            try {
                const loaded = JSON.parse(saved);
                Object.assign(this.stats, loaded);
            } catch (e) {
                console.error('Failed to load stats:', e);
            }
        }
    }
    
    saveStats() {
        try {
            localStorage.setItem('tetris-stats', JSON.stringify(this.stats));
        } catch (e) {
            console.error('Failed to save stats:', e);
        }
    }
    
    saveGameStats(mode, gameStats) {
        // Update totals
        this.stats.totalScore += gameStats.score;
        this.stats.totalLines += gameStats.lines;
        this.stats.gamesPlayed++;
        this.stats.totalPlayTime += this.parseTime(gameStats.time);
        
        // Update bests
        if (gameStats.score > this.stats.bestScore) {
            this.stats.bestScore = gameStats.score;
        }
        if (gameStats.lines > this.stats.bestLines) {
            this.stats.bestLines = gameStats.lines;
        }
        if (gameStats.level > this.stats.bestLevel) {
            this.stats.bestLevel = gameStats.level;
        }
        if (gameStats.maxCombo > this.stats.maxCombo) {
            this.stats.maxCombo = gameStats.maxCombo;
        }
        
        // Add to recent games
        this.stats.recentGames.unshift({
            mode: mode,
            score: gameStats.score,
            lines: gameStats.lines,
            level: gameStats.level,
            time: gameStats.time,
            date: new Date().toISOString()
        });
        
        // Keep only last 20 games
        if (this.stats.recentGames.length > 20) {
            this.stats.recentGames = this.stats.recentGames.slice(0, 20);
        }
        
        // Calculate experience
        const exp = this.calculateExperience(gameStats);
        this.addExperience(exp);
        
        // Check achievements
        const newAchievements = this.checkNewAchievements(gameStats);
        if (newAchievements.length > 0) {
            this.unlockAchievements(newAchievements);
        }
        
        this.saveStats();
    }
    
    parseTime(timeString) {
        const [minutes, seconds] = timeString.split(':').map(n => parseInt(n));
        return (minutes * 60 + seconds) * 1000;
    }
    
    calculateExperience(gameStats) {
        let exp = 0;
        
        // Base experience from score
        exp += Math.floor(gameStats.score / 100);
        
        // Bonus for lines
        exp += gameStats.lines * 10;
        
        // Bonus for level
        exp += gameStats.level * 50;
        
        // Bonus for combos
        exp += gameStats.maxCombo * 20;
        
        return exp;
    }
    
    addExperience(exp) {
        this.stats.experience += exp;
        
        // Check for level up
        const newLevel = this.calculateLevel(this.stats.experience);
        if (newLevel > this.stats.playerLevel) {
            this.stats.playerLevel = newLevel;
            // Could trigger level up notification here
        }
    }
    
    calculateLevel(experience) {
        // Simple level calculation - 1000 exp per level, increasing
        let level = 1;
        let requiredExp = 1000;
        let totalRequired = 0;
        
        while (experience >= totalRequired + requiredExp) {
            totalRequired += requiredExp;
            level++;
            requiredExp = Math.floor(requiredExp * 1.2);
        }
        
        return level;
    }
    
    checkNewAchievements(gameStats) {
        const newAchievements = [];
        
        this.achievements.forEach(achievement => {
            // Skip if already unlocked
            if (this.stats.achievements.includes(achievement.id)) {
                return;
            }
            
            let unlocked = false;
            
            switch (achievement.requirement.type) {
                case 'score':
                    if (gameStats.score >= achievement.requirement.value) {
                        unlocked = true;
                    }
                    break;
                    
                case 'lines':
                    if (this.stats.totalLines >= achievement.requirement.value) {
                        unlocked = true;
                    }
                    break;
                    
                case 'combo':
                    if (gameStats.maxCombo >= achievement.requirement.value) {
                        unlocked = true;
                    }
                    break;
                    
                case 'level':
                    if (gameStats.level >= achievement.requirement.value) {
                        unlocked = true;
                    }
                    break;
                    
                case 'tetris':
                    if (this.stats.totalTetris >= achievement.requirement.value) {
                        unlocked = true;
                    }
                    break;
                    
                case 'games':
                    if (this.stats.gamesPlayed >= achievement.requirement.value) {
                        unlocked = true;
                    }
                    break;
                    
                case 'playTime':
                    if (this.stats.totalPlayTime >= achievement.requirement.value) {
                        unlocked = true;
                    }
                    break;
            }
            
            if (unlocked) {
                newAchievements.push(achievement);
            }
        });
        
        return newAchievements;
    }
    
    unlockAchievements(achievements) {
        achievements.forEach(achievement => {
            this.stats.achievements.push(achievement.id);
            
            // Could show achievement notification here
            console.log(`Achievement unlocked: ${achievement.name}`);
        });
    }
    
    getPlayerStats() {
        return {
            ...this.stats,
            recentAchievements: this.getRecentAchievements(),
            nextLevelExp: this.getExperienceToNextLevel(),
            levelProgress: this.getLevelProgress()
        };
    }
    
    getRecentAchievements() {
        return this.stats.achievements
            .slice(-5)
            .map(id => this.achievements.find(a => a.id === id))
            .filter(Boolean)
            .reverse();
    }
    
    getExperienceToNextLevel() {
        const currentLevelExp = this.getExperienceForLevel(this.stats.playerLevel - 1);
        const nextLevelExp = this.getExperienceForLevel(this.stats.playerLevel);
        return nextLevelExp - this.stats.experience;
    }
    
    getExperienceForLevel(level) {
        let totalExp = 0;
        let requiredExp = 1000;
        
        for (let i = 1; i < level; i++) {
            totalExp += requiredExp;
            requiredExp = Math.floor(requiredExp * 1.2);
        }
        
        return totalExp;
    }
    
    getLevelProgress() {
        const currentLevelExp = this.getExperienceForLevel(this.stats.playerLevel - 1);
        const nextLevelExp = this.getExperienceForLevel(this.stats.playerLevel);
        const progress = (this.stats.experience - currentLevelExp) / (nextLevelExp - currentLevelExp);
        return Math.min(Math.max(progress, 0), 1);
    }
    
    getUserLevel() {
        return this.stats.playerLevel;
    }
    
    getLeaderboard(mode = 'all', limit = 10) {
        // In a real implementation, this would fetch from a server
        // For now, return local stats
        const games = mode === 'all' 
            ? this.stats.recentGames 
            : this.stats.recentGames.filter(g => g.mode === mode);
        
        return games
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((game, index) => ({
                rank: index + 1,
                score: game.score,
                lines: game.lines,
                level: game.level,
                date: game.date,
                player: 'You'
            }));
    }
}