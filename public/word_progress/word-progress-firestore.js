/**
 * Word Progress Firestore Operations
 * Handles all cloud operations for word progress with Firestore
 */

import { canSyncToCloud } from '../plan-manager.js';

/**
 * Get Firestore database reference
 */
function getFirestoreDB() {
    if (!window.firebaseAuth?.db) {
        throw new Error('Firestore not available');
    }
    return window.firebaseAuth.db;
}

/**
 * Get current authenticated user
 */
function getCurrentUser() {
    if (!window.firebaseAuth?.isAuthenticated()) {
        throw new Error('User not authenticated');
    }
    return window.firebaseAuth.getCurrentUser();
}

/**
 * Save word progress to Firestore
 */
export async function saveWordProgressFirestore(wordId, progressData) {
    if (!await canSyncToCloud()) {
        throw new Error('Cloud sync not available for current plan');
    }

    try {
        const db = getFirestoreDB();
        const user = getCurrentUser();
        
        const { doc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        // Prepare progress data for Firestore
        const progressRecord = {
            ...progressData,
            wordId,
            userId: user.uid,
            updatedAt: new Date().toISOString(),
            syncedAt: new Date().toISOString()
        };

        const progressRef = doc(collection(db, 'users', user.uid, 'wordProgress'), wordId);
        await setDoc(progressRef, progressRecord, { merge: true });

        console.log(`Word progress saved to Firestore: ${wordId}`);
        return progressRecord;
    } catch (error) {
        console.error('Error saving word progress to Firestore:', error);
        throw error;
    }
}

/**
 * Get word progress by wordId from Firestore
 */
export async function getWordProgressFirestore(wordId) {
    if (!await canSyncToCloud()) {
        return null;
    }

    try {
        const db = getFirestoreDB();
        const user = getCurrentUser();
        
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const progressRef = doc(db, 'users', user.uid, 'wordProgress', wordId);
        const docSnap = await getDoc(progressRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error getting word progress from Firestore:', error);
        return null;
    }
}

/**
 * Get all word progress from Firestore
 */
export async function getAllWordProgressFirestore() {
    if (!await canSyncToCloud()) {
        return [];
    }

    try {
        const db = getFirestoreDB();
        const user = getCurrentUser();
        
        const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const progressRef = collection(db, 'users', user.uid, 'wordProgress');
        const q = query(progressRef, orderBy('updatedAt', 'desc'));
        const querySnapshot = await getDocs(q);

        const progressRecords = [];
        querySnapshot.forEach((doc) => {
            progressRecords.push(doc.data());
        });

        console.log(`Retrieved ${progressRecords.length} word progress records from Firestore`);
        return progressRecords;
    } catch (error) {
        console.error('Error getting all word progress from Firestore:', error);
        return [];
    }
}

/**
 * Delete word progress from Firestore
 */
export async function deleteWordProgressFirestore(wordId) {
    if (!await canSyncToCloud()) {
        throw new Error('Cloud sync not available for current plan');
    }

    try {
        const db = getFirestoreDB();
        const user = getCurrentUser();
        
        const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const progressRef = doc(db, 'users', user.uid, 'wordProgress', wordId);
        await deleteDoc(progressRef);

        console.log(`Word progress deleted from Firestore: ${wordId}`);
        return true;
    } catch (error) {
        console.error('Error deleting word progress from Firestore:', error);
        throw error;
    }
}

/**
 * Get word progress count from Firestore
 */
export async function getWordProgressCountFirestore() {
    if (!await canSyncToCloud()) {
        return 0;
    }

    try {
        const db = getFirestoreDB();
        const user = getCurrentUser();
        
        const { collection, getCountFromServer } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const progressRef = collection(db, 'users', user.uid, 'wordProgress');
        const snapshot = await getCountFromServer(progressRef);

        return snapshot.data().count;
    } catch (error) {
        console.error('Error getting word progress count from Firestore:', error);
        return 0;
    }
}

/**
 * Get word progress by status from Firestore
 */
export async function getWordProgressByStatusFirestore(status) {
    if (!await canSyncToCloud()) {
        return [];
    }

    try {
        const db = getFirestoreDB();
        const user = getCurrentUser();
        
        const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const progressRef = collection(db, 'users', user.uid, 'wordProgress');
        const q = query(progressRef, where('status', '==', status));
        const querySnapshot = await getDocs(q);

        const progressRecords = [];
        querySnapshot.forEach((doc) => {
            progressRecords.push(doc.data());
        });

        return progressRecords;
    } catch (error) {
        console.error('Error getting word progress by status from Firestore:', error);
        return [];
    }
}

/**
 * Get word progress statistics from Firestore
 */
export async function getWordProgressStatsFirestore() {
    if (!await canSyncToCloud()) {
        return {
            total: 0,
            unread: 0,
            reading: 0,
            familiar: 0,
            memorized: 0,
            totalReviews: 0
        };
    }

    try {
        const allProgress = await getAllWordProgressFirestore();
        
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
        console.error('Error getting word progress stats from Firestore:', error);
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
 * Bulk update multiple word progress records in Firestore
 */
export async function bulkUpdateWordProgressFirestore(updates) {
    if (!await canSyncToCloud()) {
        throw new Error('Cloud sync not available for current plan');
    }

    try {
        const db = getFirestoreDB();
        const user = getCurrentUser();
        
        const { doc, setDoc, writeBatch } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const batch = writeBatch(db);

        updates.forEach(({ wordId, data }) => {
            const progressRef = doc(db, 'users', user.uid, 'wordProgress', wordId);
            const updateData = {
                ...data,
                wordId,
                userId: user.uid,
                updatedAt: new Date().toISOString(),
                syncedAt: new Date().toISOString()
            };
            batch.set(progressRef, updateData, { merge: true });
        });

        await batch.commit();
        console.log(`Bulk updated ${updates.length} word progress records in Firestore`);

        return updates.map(({ wordId }) => wordId);
    } catch (error) {
        console.error('Error bulk updating word progress in Firestore:', error);
        throw error;
    }
}

/**
 * Check if word progress exists in Firestore
 */
export async function wordProgressExistsFirestore(wordId) {
    try {
        const progress = await getWordProgressFirestore(wordId);
        return !!progress;
    } catch (error) {
        console.error('Error checking if word progress exists in Firestore:', error);
        return false;
    }
}

/**
 * Get word progress by date range from Firestore
 */
export async function getWordProgressByDateRangeFirestore(startDate, endDate) {
    if (!await canSyncToCloud()) {
        return [];
    }

    try {
        const db = getFirestoreDB();
        const user = getCurrentUser();
        
        const { collection, query, where, getDocs, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const progressRef = collection(db, 'users', user.uid, 'wordProgress');
        const q = query(
            progressRef,
            where('updatedAt', '>=', startDate.toISOString()),
            where('updatedAt', '<=', endDate.toISOString()),
            orderBy('updatedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const progressRecords = [];
        querySnapshot.forEach((doc) => {
            progressRecords.push(doc.data());
        });

        return progressRecords;
    } catch (error) {
        console.error('Error getting word progress by date range from Firestore:', error);
        return [];
    }
}

/**
 * Sync all word progress from Firestore to local IndexedDB
 */
export async function syncAllWordProgressFromFirestore() {
    if (!await canSyncToCloud()) {
        return [];
    }

    try {
        const firestoreProgress = await getAllWordProgressFirestore();
        
        // Import IndexedDB operations
        const { bulkUpdateWordProgressDB } = await import('./word-progress-db.js');
        
        // Prepare updates for IndexedDB
        const updates = firestoreProgress.map(progress => ({
            wordId: progress.wordId,
            data: progress
        }));

        if (updates.length > 0) {
            await bulkUpdateWordProgressDB(updates);
            console.log(`Synced ${updates.length} word progress records from Firestore to local storage`);
        }

        return firestoreProgress;
    } catch (error) {
        console.error('Error syncing word progress from Firestore:', error);
        throw error;
    }
}

/**
 * Sync all local word progress that needs synchronization to Firestore
 */
export async function syncPendingWordProgressToFirestore() {
    if (!await canSyncToCloud()) {
        return [];
    }

    try {
        // Import IndexedDB operations
        const { getWordProgressNeedingSyncDB, markWordProgressAsSyncedDB } = await import('./word-progress-db.js');
        
        const pendingProgress = await getWordProgressNeedingSyncDB();
        
        if (pendingProgress.length === 0) {
            console.log('No word progress needs synchronization');
            return [];
        }

        const syncedProgress = [];

        for (const progress of pendingProgress) {
            try {
                // Check if progress exists in Firestore
                const existsInFirestore = await wordProgressExistsFirestore(progress.wordId);
                
                if (existsInFirestore) {
                    // Update existing progress
                    await saveWordProgressFirestore(progress.wordId, {
                        status: progress.status,
                        reviewCount: progress.reviewCount,
                        lastReviewed: progress.lastReviewed,
                        createdAt: progress.createdAt,
                        updatedAt: progress.updatedAt
                    });
                } else {
                    // Create new progress
                    await saveWordProgressFirestore(progress.wordId, progress);
                }

                // Mark as synced in local storage
                await markWordProgressAsSyncedDB(progress.wordId);
                syncedProgress.push(progress.wordId);

                console.log(`Synced word progress to Firestore: ${progress.wordId}`);
            } catch (error) {
                console.warn(`Failed to sync word progress ${progress.wordId}:`, error);
            }
        }

        console.log(`Synced ${syncedProgress.length} of ${pendingProgress.length} pending word progress to Firestore`);
        return syncedProgress;
    } catch (error) {
        console.error('Error syncing pending word progress to Firestore:', error);
        throw error;
    }
}

/**
 * Full bidirectional sync between Firestore and IndexedDB
 */
export async function performFullWordProgressSync() {
    if (!await canSyncToCloud()) {
        console.log('Full word progress sync skipped - cloud sync not available');
        return { downloaded: 0, uploaded: 0 };
    }

    try {
        console.log('Starting full word progress synchronization...');

        // First, sync pending local changes to Firestore
        const uploaded = await syncPendingWordProgressToFirestore();

        // Then, sync any newer changes from Firestore to local
        const downloaded = await syncAllWordProgressFromFirestore();

        console.log(`Full word progress sync completed: ${uploaded.length} uploaded, ${downloaded.length} downloaded`);
        
        return {
            uploaded: uploaded.length,
            downloaded: downloaded.length
        };
    } catch (error) {
        console.error('Error performing full word progress sync:', error);
        throw error;
    }
}
