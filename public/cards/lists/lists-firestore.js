/**
 * Word Lists Firestore Operations
 * Handles all cloud operations for word lists with Firestore
 */

import { canSyncToCloud } from '../../plan-manager.js';

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
 * Create a new word list in Firestore
 */
export async function createWordListFirestore(listData) {
    if (!await canSyncToCloud()) {
        throw new Error('Cloud sync not available for current plan');
    }

    try {
        const db = getFirestoreDB();
        const user = getCurrentUser();
        
        const { doc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        // Generate unique ID if not provided
        if (!listData.id) {
            listData.id = 'list_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        }

        // Prepare list data for Firestore
        const newList = {
            ...listData,
            userId: user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            syncedAt: new Date().toISOString(),
            wordIds: listData.wordIds || []
        };

        const listRef = doc(collection(db, 'users', user.uid, 'wordLists'), listData.id);
        await setDoc(listRef, newList);

        console.log(`Word list created in Firestore: ${listData.id}`);
        return newList;
    } catch (error) {
        console.error('Error creating word list in Firestore:', error);
        throw error;
    }
}

/**
 * Get a word list by ID from Firestore
 */
export async function getWordListFirestore(listId) {
    if (!await canSyncToCloud()) {
        return null;
    }

    try {
        const db = getFirestoreDB();
        const user = getCurrentUser();
        
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const listRef = doc(db, 'users', user.uid, 'wordLists', listId);
        const docSnap = await getDoc(listRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error getting word list from Firestore:', error);
        return null;
    }
}

/**
 * Get all word lists from Firestore
 */
export async function getAllWordListsFirestore() {
    if (!await canSyncToCloud()) {
        return [];
    }

    try {
        const db = getFirestoreDB();
        const user = getCurrentUser();
        
        const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const listsRef = collection(db, 'users', user.uid, 'wordLists');
        const q = query(listsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        const lists = [];
        querySnapshot.forEach((doc) => {
            lists.push(doc.data());
        });

        console.log(`Retrieved ${lists.length} word lists from Firestore`);
        return lists;
    } catch (error) {
        console.error('Error getting all word lists from Firestore:', error);
        return [];
    }
}

/**
 * Update a word list in Firestore
 */
export async function updateWordListFirestore(listId, updateData) {
    if (!await canSyncToCloud()) {
        throw new Error('Cloud sync not available for current plan');
    }

    try {
        const db = getFirestoreDB();
        const user = getCurrentUser();
        
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const updatePayload = {
            ...updateData,
            updatedAt: new Date().toISOString(),
            syncedAt: new Date().toISOString()
        };

        // Remove undefined values
        Object.keys(updatePayload).forEach(key => {
            if (updatePayload[key] === undefined) {
                delete updatePayload[key];
            }
        });

        const listRef = doc(db, 'users', user.uid, 'wordLists', listId);
        await updateDoc(listRef, updatePayload);

        console.log(`Word list updated in Firestore: ${listId}`);
        
        // Return the updated data
        const updatedList = await getWordListFirestore(listId);
        return updatedList;
    } catch (error) {
        console.error('Error updating word list in Firestore:', error);
        throw error;
    }
}

/**
 * Delete a word list from Firestore
 */
export async function deleteWordListFirestore(listId) {
    if (!await canSyncToCloud()) {
        throw new Error('Cloud sync not available for current plan');
    }

    try {
        const db = getFirestoreDB();
        const user = getCurrentUser();
        
        const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const listRef = doc(db, 'users', user.uid, 'wordLists', listId);
        await deleteDoc(listRef);

        console.log(`Word list deleted from Firestore: ${listId}`);
        return true;
    } catch (error) {
        console.error('Error deleting word list from Firestore:', error);
        throw error;
    }
}

/**
 * Add words to a word list in Firestore
 */
export async function addWordsToListFirestore(listId, wordIds) {
    try {
        const currentList = await getWordListFirestore(listId);

        if (!currentList) {
            throw new Error('List not found');
        }

        // Add new words that aren't already in the list
        const existingWordIds = currentList.wordIds || [];
        const uniqueWordIds = [...new Set([...existingWordIds, ...wordIds])];

        return await updateWordListFirestore(listId, {
            wordIds: uniqueWordIds
        });
    } catch (error) {
        console.error('Error adding words to list in Firestore:', error);
        throw error;
    }
}

/**
 * Remove words from a word list in Firestore
 */
export async function removeWordsFromListFirestore(listId, wordIds) {
    try {
        const currentList = await getWordListFirestore(listId);

        if (!currentList) {
            throw new Error('List not found');
        }

        // Remove specified words
        const filteredWordIds = (currentList.wordIds || []).filter(id => !wordIds.includes(id));

        return await updateWordListFirestore(listId, {
            wordIds: filteredWordIds
        });
    } catch (error) {
        console.error('Error removing words from list in Firestore:', error);
        throw error;
    }
}

/**
 * Get word list count from Firestore
 */
export async function getWordListCountFirestore() {
    if (!await canSyncToCloud()) {
        return 0;
    }

    try {
        const db = getFirestoreDB();
        const user = getCurrentUser();
        
        const { collection, getCountFromServer } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const listsRef = collection(db, 'users', user.uid, 'wordLists');
        const snapshot = await getCountFromServer(listsRef);

        return snapshot.data().count;
    } catch (error) {
        console.error('Error getting word list count from Firestore:', error);
        return 0;
    }
}

/**
 * Check if a word list exists in Firestore
 */
export async function wordListExistsFirestore(listId) {
    try {
        const list = await getWordListFirestore(listId);
        return !!list;
    } catch (error) {
        console.error('Error checking if word list exists in Firestore:', error);
        return false;
    }
}

/**
 * Get word lists by creation date range from Firestore
 */
export async function getWordListsByDateRangeFirestore(startDate, endDate) {
    if (!await canSyncToCloud()) {
        return [];
    }

    try {
        const db = getFirestoreDB();
        const user = getCurrentUser();
        
        const { collection, query, where, getDocs, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const listsRef = collection(db, 'users', user.uid, 'wordLists');
        const q = query(
            listsRef,
            where('createdAt', '>=', startDate.toISOString()),
            where('createdAt', '<=', endDate.toISOString()),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const lists = [];
        querySnapshot.forEach((doc) => {
            lists.push(doc.data());
        });

        return lists;
    } catch (error) {
        console.error('Error getting word lists by date range from Firestore:', error);
        return [];
    }
}

/**
 * Search word lists by name or description in Firestore
 */
export async function searchWordListsFirestore(searchTerm) {
    if (!await canSyncToCloud()) {
        return [];
    }

    try {
        // Note: Firestore doesn't support full-text search natively
        // This is a simple implementation that gets all lists and filters client-side
        // For production, consider using Algolia or similar service
        
        const allLists = await getAllWordListsFirestore();
        const lowerSearchTerm = searchTerm.toLowerCase();

        return allLists.filter(list => {
            const nameMatch = list.name?.toLowerCase().includes(lowerSearchTerm);
            const descriptionMatch = list.description?.toLowerCase().includes(lowerSearchTerm);
            return nameMatch || descriptionMatch;
        });
    } catch (error) {
        console.error('Error searching word lists in Firestore:', error);
        return [];
    }
}

/**
 * Bulk create/update multiple lists in Firestore (useful for sync operations)
 */
export async function bulkUpdateWordListsFirestore(updates) {
    if (!await canSyncToCloud()) {
        throw new Error('Cloud sync not available for current plan');
    }

    try {
        const db = getFirestoreDB();
        const user = getCurrentUser();
        
        const { doc, setDoc, writeBatch } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

        const batch = writeBatch(db);

        updates.forEach(({ listId, data }) => {
            const listRef = doc(db, 'users', user.uid, 'wordLists', listId);
            const updateData = {
                ...data,
                userId: user.uid,
                updatedAt: new Date().toISOString(),
                syncedAt: new Date().toISOString()
            };
            batch.set(listRef, updateData, { merge: true });
        });

        await batch.commit();
        console.log(`Bulk updated ${updates.length} word lists in Firestore`);

        return updates.map(({ listId }) => listId);
    } catch (error) {
        console.error('Error bulk updating word lists in Firestore:', error);
        throw error;
    }
}

/**
 * Sync all lists from Firestore to local IndexedDB
 */
export async function syncAllListsFromFirestore() {
    if (!await canSyncToCloud()) {
        return [];
    }

    try {
        const firestoreLists = await getAllWordListsFirestore();
        
        // Import IndexedDB operations
        const { bulkUpdateWordListsDB } = await import('./lists-db.js');
        
        // Prepare updates for IndexedDB
        const updates = firestoreLists.map(list => ({
            listId: list.id,
            data: list
        }));

        if (updates.length > 0) {
            await bulkUpdateWordListsDB(updates);
            console.log(`Synced ${updates.length} lists from Firestore to local storage`);
        }

        return firestoreLists;
    } catch (error) {
        console.error('Error syncing lists from Firestore:', error);
        throw error;
    }
}

/**
 * Sync all local lists that need synchronization to Firestore
 */
export async function syncPendingListsToFirestore() {
    if (!await canSyncToCloud()) {
        return [];
    }

    try {
        // Import IndexedDB operations
        const { getListsNeedingSyncDB, markListAsSyncedDB } = await import('./lists-db.js');
        
        const pendingLists = await getListsNeedingSyncDB();
        
        if (pendingLists.length === 0) {
            console.log('No lists need synchronization');
            return [];
        }

        const syncedLists = [];

        for (const list of pendingLists) {
            try {
                // Check if list exists in Firestore
                const existsInFirestore = await wordListExistsFirestore(list.id);
                
                if (existsInFirestore) {
                    // Update existing list
                    await updateWordListFirestore(list.id, {
                        name: list.name,
                        description: list.description,
                        wordIds: list.wordIds
                    });
                } else {
                    // Create new list
                    await createWordListFirestore(list);
                }

                // Mark as synced in local storage
                await markListAsSyncedDB(list.id);
                syncedLists.push(list.id);

                console.log(`Synced list to Firestore: ${list.id}`);
            } catch (error) {
                console.warn(`Failed to sync list ${list.id}:`, error);
            }
        }

        console.log(`Synced ${syncedLists.length} of ${pendingLists.length} pending lists to Firestore`);
        return syncedLists;
    } catch (error) {
        console.error('Error syncing pending lists to Firestore:', error);
        throw error;
    }
}

/**
 * Full bidirectional sync between Firestore and IndexedDB
 */
export async function performFullListSync() {
    if (!await canSyncToCloud()) {
        console.log('Full sync skipped - cloud sync not available');
        return { downloaded: 0, uploaded: 0 };
    }

    try {
        console.log('Starting full list synchronization...');

        // First, sync pending local changes to Firestore
        const uploaded = await syncPendingListsToFirestore();

        // Then, sync any newer changes from Firestore to local
        const downloaded = await syncAllListsFromFirestore();

        console.log(`Full sync completed: ${uploaded.length} uploaded, ${downloaded.length} downloaded`);
        
        return {
            uploaded: uploaded.length,
            downloaded: downloaded.length
        };
    } catch (error) {
        console.error('Error performing full list sync:', error);
        throw error;
    }
}