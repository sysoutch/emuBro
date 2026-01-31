const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const Database = require('better-sqlite3');
const log = require('electron-log');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.init();
    }

    async init() {
        try {
            // Get the app data directory
            const appDataPath = app.getPath('appData');
            const dbPath = path.join(appDataPath, 'emuBro', 'database.db');
            
            // Create directory if it doesn't exist
            const dbDir = path.dirname(dbPath);
            await fs.mkdir(dbDir, { recursive: true });
            
            // Initialize database
            this.db = new Database(dbPath);
            this.createTables();
            log.info('Database initialized successfully');
        } catch (error) {
            log.error('Failed to initialize database:', error);
            throw error;
        }
    }

    createTables() {
        try {
            // Create games table
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS games (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    platform TEXT NOT NULL,
                    platformShortName TEXT NOT NULL,
                    filePath TEXT NOT NULL,
                    isInstalled BOOLEAN DEFAULT 1,
                    rating INTEGER DEFAULT 0,
                    genre TEXT,
                    releaseDate TEXT,
                    description TEXT,
                    coverImage TEXT,
                    progress INTEGER DEFAULT 0,
                    lastPlayed TEXT,
                    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create emulators table
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS emulators (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    platform TEXT NOT NULL,
                    platformShortName TEXT NOT NULL,
                    filePath TEXT NOT NULL,
                    version TEXT,
                    description TEXT,
                    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create platforms table
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS platforms (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    shortName TEXT NOT NULL UNIQUE,
                    description TEXT,
                    icon TEXT,
                    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create game_emulator_mappings table for relationships
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS game_emulator_mappings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    gameId INTEGER NOT NULL,
                    emulatorId INTEGER NOT NULL,
                    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (gameId) REFERENCES games (id) ON DELETE CASCADE,
                    FOREIGN KEY (emulatorId) REFERENCES emulators (id) ON DELETE CASCADE
                )
            `);

            log.info('Database tables created successfully');
        } catch (error) {
            log.error('Failed to create database tables:', error);
            throw error;
        }
    }

    // Games methods
    async getAllGames() {
        try {
            const games = this.db.prepare('SELECT * FROM games ORDER BY name').all();
            return games;
        } catch (error) {
            log.error('Failed to get all games:', error);
            return [];
        }
    }

    async getGameById(id) {
        try {
            const game = this.db.prepare('SELECT * FROM games WHERE id = ?').get(id);
            return game;
        } catch (error) {
            log.error('Failed to get game by ID:', error);
            return null;
        }
    }

    async saveGame(gameData) {
        try {
            const existingGame = this.db.prepare('SELECT id FROM games WHERE filePath = ?').get(gameData.filePath);
            
            if (existingGame) {
                // Update existing game
                const updateStmt = this.db.prepare(`
                    UPDATE games SET 
                        name = ?, 
                        platform = ?, 
                        platformShortName = ?,
                        isInstalled = ?,
                        rating = ?,
                        genre = ?,
                        releaseDate = ?,
                        description = ?,
                        coverImage = ?,
                        progress = ?,
                        lastPlayed = ?,
                        updatedAt = CURRENT_TIMESTAMP
                    WHERE id = ?
                `);
                updateStmt.run(
                    gameData.name,
                    gameData.platform,
                    gameData.platformShortName,
                    gameData.isInstalled || 1,
                    gameData.rating || 0,
                    gameData.genre || null,
                    gameData.releaseDate || null,
                    gameData.description || null,
                    gameData.coverImage || null,
                    gameData.progress || 0,
                    gameData.lastPlayed || null,
                    existingGame.id
                );
                return existingGame.id;
            } else {
                // Insert new game
                const insertStmt = this.db.prepare(`
                    INSERT INTO games 
                        (name, platform, platformShortName, filePath, isInstalled, rating, genre, releaseDate, description, coverImage, progress, lastPlayed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                const result = insertStmt.run(
                    gameData.name,
                    gameData.platform,
                    gameData.platformShortName,
                    gameData.filePath,
                    gameData.isInstalled || 1,
                    gameData.rating || 0,
                    gameData.genre || null,
                    gameData.releaseDate || null,
                    gameData.description || null,
                    gameData.coverImage || null,
                    gameData.progress || 0,
                    gameData.lastPlayed || null
                );
                return result.lastInsertRowid;
            }
        } catch (error) {
            log.error('Failed to save game:', error);
            throw error;
        }
    }

    async removeGame(id) {
        try {
            const deleteStmt = this.db.prepare('DELETE FROM games WHERE id = ?');
            const result = deleteStmt.run(id);
            return result.changes > 0;
        } catch (error) {
            log.error('Failed to remove game:', error);
            return false;
        }
    }

    async updateGameProgress(gameId, progress) {
        try {
            const updateStmt = this.db.prepare('UPDATE games SET progress = ?, lastPlayed = CURRENT_TIMESTAMP WHERE id = ?');
            const result = updateStmt.run(progress, gameId);
            return result.changes > 0;
        } catch (error) {
            log.error('Failed to update game progress:', error);
            return false;
        }
    }

    // Emulators methods
    async getAllEmulators() {
        try {
            const emulators = this.db.prepare('SELECT * FROM emulators ORDER BY name').all();
            return emulators;
        } catch (error) {
            log.error('Failed to get all emulators:', error);
            return [];
        }
    }

    async getEmulatorById(id) {
        try {
            const emulator = this.db.prepare('SELECT * FROM emulators WHERE id = ?').get(id);
            return emulator;
        } catch (error) {
            log.error('Failed to get emulator by ID:', error);
            return null;
        }
    }

    async saveEmulator(emulatorData) {
        try {
            const existingEmulator = this.db.prepare('SELECT id FROM emulators WHERE filePath = ?').get(emulatorData.filePath);
            
            if (existingEmulator) {
                // Update existing emulator
                const updateStmt = this.db.prepare(`
                    UPDATE emulators SET 
                        name = ?, 
                        platform = ?, 
                        platformShortName = ?,
                        version = ?,
                        description = ?,
                        updatedAt = CURRENT_TIMESTAMP
                    WHERE id = ?
                `);
                updateStmt.run(
                    emulatorData.name,
                    emulatorData.platform,
                    emulatorData.platformShortName,
                    emulatorData.version || null,
                    emulatorData.description || null,
                    existingEmulator.id
                );
                return existingEmulator.id;
            } else {
                // Insert new emulator
                const insertStmt = this.db.prepare(`
                    INSERT INTO emulators 
                        (name, platform, platformShortName, filePath, version, description)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                const result = insertStmt.run(
                    emulatorData.name,
                    emulatorData.platform,
                    emulatorData.platformShortName,
                    emulatorData.filePath,
                    emulatorData.version || null,
                    emulatorData.description || null
                );
                return result.lastInsertRowid;
            }
        } catch (error) {
            log.error('Failed to save emulator:', error);
            throw error;
        }
    }

    async removeEmulator(id) {
        try {
            const deleteStmt = this.db.prepare('DELETE FROM emulators WHERE id = ?');
            const result = deleteStmt.run(id);
            return result.changes > 0;
        } catch (error) {
            log.error('Failed to remove emulator:', error);
            return false;
        }
    }

    // Platforms methods
    async getAllPlatforms() {
        try {
            const platforms = this.db.prepare('SELECT * FROM platforms ORDER BY name').all();
            return platforms;
        } catch (error) {
            log.error('Failed to get all platforms:', error);
            return [];
        }
    }

    async getPlatformByShortName(shortName) {
        try {
            const platform = this.db.prepare('SELECT * FROM platforms WHERE shortName = ?').get(shortName);
            return platform;
        } catch (error) {
            log.error('Failed to get platform by short name:', error);
            return null;
        }
    }

    async savePlatform(platformData) {
        try {
            const existingPlatform = this.db.prepare('SELECT id FROM platforms WHERE shortName = ?').get(platformData.shortName);
            
            if (existingPlatform) {
                // Update existing platform
                const updateStmt = this.db.prepare(`
                    UPDATE platforms SET 
                        name = ?, 
                        description = ?,
                        icon = ?,
                        updatedAt = CURRENT_TIMESTAMP
                    WHERE id = ?
                `);
                updateStmt.run(
                    platformData.name,
                    platformData.description || null,
                    platformData.icon || null,
                    existingPlatform.id
                );
                return existingPlatform.id;
            } else {
                // Insert new platform
                const insertStmt = this.db.prepare(`
                    INSERT INTO platforms (name, shortName, description, icon)
                    VALUES (?, ?, ?, ?)
                `);
                const result = insertStmt.run(
                    platformData.name,
                    platformData.shortName,
                    platformData.description || null,
                    platformData.icon || null
                );
                return result.lastInsertRowid;
            }
        } catch (error) {
            log.error('Failed to save platform:', error);
            throw error;
        }
    }

    // Migration methods for existing data
    async migrateFromMemory(gamesData, emulatorsData) {
        try {
            // Clear existing data (optional, depending on requirements)
            // this.db.exec('DELETE FROM games');
            // this.db.exec('DELETE FROM emulators');
            // this.db.exec('DELETE FROM platforms');

            // Save games
            for (const game of gamesData) {
                await this.saveGame(game);
            }

            // Save emulators
            for (const emulator of emulatorsData) {
                await this.saveEmulator(emulator);
            }

            log.info('Data migration completed successfully');
        } catch (error) {
            log.error('Failed to migrate data from memory:', error);
            throw error;
        }
    }

    // Utility methods
    async getDatabaseStats() {
        try {
            const gamesCount = this.db.prepare('SELECT COUNT(*) as count FROM games').get();
            const emulatorsCount = this.db.prepare('SELECT COUNT(*) as count FROM emulators').get();
            const platformsCount = this.db.prepare('SELECT COUNT(*) as count FROM platforms').get();
            
            return {
                games: gamesCount.count,
                emulators: emulatorsCount.count,
                platforms: platformsCount.count
            };
        } catch (error) {
            log.error('Failed to get database stats:', error);
            return { games: 0, emulators: 0, platforms: 0 };
        }
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

// Export singleton instance
module.exports = new DatabaseManager();