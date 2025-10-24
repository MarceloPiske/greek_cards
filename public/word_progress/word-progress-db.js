/**
 * Word Progress Database Operations
 * Handles all CRUD operations for word progress with IndexedDB
 */

<<<<<<< HEAD
<<<<<<<< HEAD:public/word_progress/word-progress-db.js
import { initVocabularyDB } from '../vocabulary/vocabulary-db.js?v=1.1';
========
import { initVocabularyDB } from '../vocabulary-db.js';
>>>>>>>> 485a7111651673321d36bac1405974bd151865fc:public/cards/word_progress/word-progress-db.js
=======
import { initVocabularyDB } from '../vocabulary/vocabulary-db.js';
>>>>>>> 485a7111651673321d36bac1405974bd151865fc

// Database store for word progress
const STORE_USER_PROGRESS = 'wordProgress';

/**
<<<<<<< HEAD
 * Get current user ID or 'anonymous' if not logged in
 */
function getCurrentUserId() {
    if (window.firebaseAuth?.isAuthenticated()) {
        return window.firebaseAuth.getCurrentUser()?.uid || 'anonymous';
    }
    return 'anonymous';
}

/**
 * Create composite key for user-specific data
 */
function createUserKey(wordId, userId = null) {
    const uid = userId || getCurrentUserId();
    return `${uid}_${wordId}`;
}

/**
=======
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
 * Create or update word progress in IndexedDB
 */
export async function saveWordProgressDB(wordId, progressData) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_USER_PROGRESS, 'readwrite');
        const store = tx.objectStore(STORE_USER_PROGRESS);

<<<<<<< HEAD
        const userId = getCurrentUserId();
        const userKey = createUserKey(wordId, userId);

        // Get current progress if it exists
        const currentProgress = await new Promise((resolve, reject) => {
            const request = store.get(userKey);
=======
        // Get current progress if it exists
        const currentProgress = await new Promise((resolve, reject) => {
            const request = store.get(wordId);
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        // Merge with existing data
        const newProgress = {
<<<<<<< HEAD
            id: userKey,
            wordId,
            userId,
=======
            wordId,
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
            status: progressData.status || 'unread',
            reviewCount: progressData.reviewCount || (currentProgress?.reviewCount || 0),
            lastReviewed: progressData.lastReviewed || null,
            createdAt: currentProgress?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            syncedAt: null, // Mark as needing sync
            ...progressData
        };

        // Increment review count if status changed
        if (progressData.status && progressData.status !== currentProgress?.status) {
            newProgress.reviewCount = (currentProgress?.reviewCount || 0) + 1;
            newProgress.lastReviewed = new Date().toISOString();
        }

        return new Promise((resolve, reject) => {
            const request = store.put(newProgress);
            request.onsuccess = () => resolve(newProgress);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error saving word progress in DB:', error);
        throw error;
    }
}

/**
 * Get word progress by wordId from IndexedDB
 */
export async function getWordProgressDB(wordId) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_USER_PROGRESS, 'readonly');
        const store = tx.objectStore(STORE_USER_PROGRESS);

<<<<<<< HEAD
        const userId = getCurrentUserId();
        const userKey = createUserKey(wordId, userId);

        return new Promise((resolve, reject) => {
            const request = store.get(userKey);
            request.onsuccess = () => {
                const result = request.result || {
                    id: userKey,
                    wordId,
                    userId,
=======
        return new Promise((resolve, reject) => {
            const request = store.get(wordId);
            request.onsuccess = () => {
                const result = request.result || {
                    wordId,
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
                    status: 'unread',
                    reviewCount: 0,
                    lastReviewed: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    syncedAt: null
                };
                resolve(result);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting word progress from DB:', error);
        throw error;
    }
}

/**
<<<<<<< HEAD
 * Get all word progress records for current user from IndexedDB
=======
 * Get all word progress records from IndexedDB
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
 */
export async function getAllWordProgressDB() {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_USER_PROGRESS, 'readonly');
        const store = tx.objectStore(STORE_USER_PROGRESS);

<<<<<<< HEAD
        const userId = getCurrentUserId();

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const allResults = request.result || [];
                // Filter by current user
                const userResults = allResults.filter(item => item.userId === userId);
                // Sort by most recently updated
                userResults.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                resolve(userResults);
=======
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const results = request.result || [];
                // Sort by most recently updated
                results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                resolve(results);
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting all word progress from DB:', error);
        return [];
    }
}

/**
 * Delete word progress from IndexedDB
 */
export async function deleteWordProgressDB(wordId) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_USER_PROGRESS, 'readwrite');
        const store = tx.objectStore(STORE_USER_PROGRESS);

<<<<<<< HEAD
        const userId = getCurrentUserId();
        const userKey = createUserKey(wordId, userId);

        return new Promise((resolve, reject) => {
            const request = store.delete(userKey);
=======
        return new Promise((resolve, reject) => {
            const request = store.delete(wordId);
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error deleting word progress from DB:', error);
        throw error;
    }
}

/**
 * Get word progress count
 */
export async function getWordProgressCountDB() {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_USER_PROGRESS, 'readonly');
        const store = tx.objectStore(STORE_USER_PROGRESS);

        return new Promise((resolve, reject) => {
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting word progress count from DB:', error);
        return 0;
    }
}

/**
 * Get word progress by status
 */
export async function getWordProgressByStatusDB(status) {
    try {
        const allProgress = await getAllWordProgressDB();
        return allProgress.filter(progress => progress.status === status);
    } catch (error) {
        console.error('Error getting word progress by status from DB:', error);
        return [];
    }
}

/**
 * Get word progress statistics
 */
export async function getWordProgressStatsDB() {
    try {
        const allProgress = await getAllWordProgressDB();
        
        const stats = {
            total: allProgress.length,
            unread: 0,
            reading: 0,
            familiar: 0,
            memorized: 0,
            totalReviews: 0
        };

        allProgress.forEach(progress => {
            stats[progress.status] = (stats[progress.status] || 0) + 1;
            stats.totalReviews += progress.reviewCount || 0;
        });

        return stats;
    } catch (error) {
        console.error('Error getting word progress stats from DB:', error);
        return {
            total: 0,
            unread: 0,
            reading: 0,
            familiar: 0,
            memorized: 0,
            totalReviews: 0
        };
    }
}

/**
 * Mark word progress as synced
 */
export async function markWordProgressAsSyncedDB(wordId, syncedAt = null) {
    try {
        const progress = await getWordProgressDB(wordId);
        if (!progress) return null;

        const syncTimestamp = syncedAt || new Date().toISOString();
        
        return await saveWordProgressDB(wordId, {
            ...progress,
            syncedAt: syncTimestamp
        });
    } catch (error) {
        console.error('Error marking word progress as synced:', error);
        throw error;
    }
}

/**
 * Get word progress that needs synchronization
 */
export async function getWordProgressNeedingSyncDB() {
    try {
        const allProgress = await getAllWordProgressDB();

        return allProgress.filter(progress => {
            // No sync timestamp means never synced
            if (!progress.syncedAt) {
                return true;
            }

            // Updated after last sync
            const updatedDate = new Date(progress.updatedAt);
            const syncedDate = new Date(progress.syncedAt);
            return updatedDate > syncedDate;
        });
    } catch (error) {
        console.error('Error getting word progress needing sync:', error);
        return [];
    }
}

/**
 * Bulk update multiple word progress records
 */
export async function bulkUpdateWordProgressDB(updates) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_USER_PROGRESS, 'readwrite');
        const store = tx.objectStore(STORE_USER_PROGRESS);

        const promises = updates.map(({ wordId, data }) => {
            return new Promise(async (resolve, reject) => {
                try {
                    // Get current progress
                    const current = await getWordProgressDB(wordId);
                    
                    // Merge and update
                    const updatedProgress = {
                        ...current,
                        ...data,
                        wordId,
                        updatedAt: new Date().toISOString()
                    };

                    const putRequest = store.put(updatedProgress);
                    putRequest.onsuccess = () => resolve(updatedProgress);
                    putRequest.onerror = () => reject(putRequest.error);
                } catch (error) {
                    reject(error);
                }
            });
        });

        return await Promise.all(promises);
    } catch (error) {
        console.error('Error bulk updating word progress:', error);
        throw error;
    }
}

/**
 * Clear all word progress (for testing/reset purposes)
 */
export async function clearAllWordProgressDB() {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_USER_PROGRESS, 'readwrite');
        const store = tx.objectStore(STORE_USER_PROGRESS);

        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error clearing all word progress from DB:', error);
        throw error;
    }
}