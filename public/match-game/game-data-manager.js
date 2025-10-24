/**
 * Game Data Manager - Handles game state and statistics
 */

<<<<<<< HEAD
import { initDB } from '../indexedDB.js?v=1.1';
=======
import { initDB } from '../indexedDB.js';
>>>>>>> 485a7111651673321d36bac1405974bd151865fc

const GAME_PROGRESS_STORE = 'gameProgress';

/**
 * Save game session data
 */
export async function saveGameSession(sessionData) {
    try {
        const db = await initDB();
        const tx = db.transaction('userProgress', 'readwrite');
        const store = tx.objectStore('userProgress');
        
        const gameRecord = {
            id: `match_game_${Date.now()}`,
            gameType: 'match',
            ...sessionData,
            createdAt: new Date().toISOString()
        };
        
        return new Promise((resolve, reject) => {
            const request = store.put(gameRecord);
            
            request.onsuccess = () => {
                console.log('Game session saved');
                resolve(gameRecord);
                
                // Sync to cloud if premium user
                syncGameDataToCloud(gameRecord);
            };
            
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error saving game session:', error);
        throw error;
    }
}

/**
 * Get game statistics
 */
export async function getGameStats() {
    try {
        const db = await initDB();
        const tx = db.transaction('userProgress', 'readonly');
        const store = tx.objectStore('userProgress');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            
            request.onsuccess = () => {
                const allProgress = request.result;
                const gameRecords = allProgress.filter(record => 
                    record.id && record.id.startsWith('match_game_')
                );
                
                const stats = calculateGameStats(gameRecords);
                resolve(stats);
            };
            
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting game stats:', error);
        return {
            totalGames: 0,
            totalCorrect: 0,
            totalIncorrect: 0,
            averageAccuracy: 0,
            totalTime: 0,
            bestScore: 0
        };
    }
}

/**
 * Calculate game statistics from records
 */
function calculateGameStats(gameRecords) {
    if (!gameRecords.length) {
        return {
            totalGames: 0,
            totalCorrect: 0,
            totalIncorrect: 0,
            averageAccuracy: 0,
            totalTime: 0,
            bestScore: 0
        };
    }
    
    const stats = gameRecords.reduce((acc, record) => {
        acc.totalGames++;
        acc.totalCorrect += record.correctConnections || 0;
        acc.totalIncorrect += (record.totalConnections || 0) - (record.correctConnections || 0);
        acc.totalTime += record.timeSpent || 0;
        acc.bestScore = Math.max(acc.bestScore, record.score || 0);
        return acc;
    }, {
        totalGames: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        totalTime: 0,
        bestScore: 0
    });
    
    const totalAnswers = stats.totalCorrect + stats.totalIncorrect;
    stats.averageAccuracy = totalAnswers > 0 ? (stats.totalCorrect / totalAnswers) * 100 : 0;
    
    return stats;
}

/**
 * Sync game data to cloud
 */
async function syncGameDataToCloud(gameData) {
    try {
        if (!shouldSyncToCloud()) return;
        
        const user = window.firebaseAuth.getCurrentUser();
        if (!user || !window.firebaseAuth.db) return;
        
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const docRef = doc(window.firebaseAuth.db, 'users', user.uid, 'gameData', gameData.id);
        await setDoc(docRef, {
            ...gameData,
            syncedAt: new Date().toISOString()
        });
        
        console.log('Game data synced to cloud');
    } catch (error) {
        console.warn('Failed to sync game data to cloud:', error);
    }
}

/**
 * Check if user can sync to cloud
 */
async function shouldSyncToCloud() {
    if (typeof window === 'undefined' || !window.firebaseAuth || !window.firebaseAuth.isAuthenticated()) {
        return false;
    }
    
    try {
<<<<<<< HEAD
        const { canSyncToCloud } = await import('../plan-manager.js?v=1.1');
=======
        const { canSyncToCloud } = await import('../plan-manager.js');
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
        return canSyncToCloud();
    } catch (error) {
        console.warn('Could not check plan permissions:', error);
        return false;
    }
}