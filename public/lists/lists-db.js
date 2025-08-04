/**
 * Word Lists Database Operations
 * Handles all CRUD operations for word lists with IndexedDB
 */

import { initVocabularyDB } from '../vocabulary/vocabulary-db.js';

// Database store for word lists
const STORE_WORD_LISTS = 'wordLists';

/**
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
function createUserKey(listId, userId = null) {
    const uid = userId || getCurrentUserId();
    return `${uid}_${listId}`;
}

/**
 * Create a new word list in IndexedDB
 */
export async function createWordListDB(listData) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readwrite');
        const store = tx.objectStore(STORE_WORD_LISTS);

        const userId = getCurrentUserId();

        // Generate unique ID if not provided
        if (!listData.id) {
            listData.id = 'list_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        }

        const userKey = createUserKey(listData.id, userId);

        // Set timestamps and initial data
        const newList = {
            ...listData,
            id: userKey,
            originalId: listData.id,
            userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            wordIds: listData.wordIds || [],
            syncedAt: null // Initially offline
        };

        return new Promise((resolve, reject) => {
            const request = store.put(newList);
            request.onsuccess = () => resolve(newList);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error creating word list in DB:', error);
        throw error;
    }
}

/**
 * Get a word list by ID from IndexedDB
 */
export async function getWordListDB(listId) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readonly');
        const store = tx.objectStore(STORE_WORD_LISTS);

        const userId = getCurrentUserId();
        const userKey = createUserKey(listId, userId);

        return new Promise((resolve, reject) => {
            const request = store.get(userKey);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting word list from DB:', error);
        throw error;
    }
}

/**
 * Get all word lists for current user from IndexedDB
 */
export async function getAllWordListsDB() {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readonly');
        const store = tx.objectStore(STORE_WORD_LISTS);

        const userId = getCurrentUserId();

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const allLists = request.result || [];
                // Filter by current user
                const userLists = allLists.filter(list => list.userId === userId);
                // Sort by creation date, newest first
                userLists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                resolve(userLists);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting all word lists from DB:', error);
        return [];
    }
}

/**
 * Update a word list in IndexedDB
 */
export async function updateWordListDB(listId, updateData) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readwrite');
        const store = tx.objectStore(STORE_WORD_LISTS);

        const userId = getCurrentUserId();
        const userKey = createUserKey(listId, userId);

        // Get current list
        const currentList = await new Promise((resolve, reject) => {
            const request = store.get(userKey);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (!currentList) {
            throw new Error('List not found');
        }

        // Merge with updates
        const updatedList = {
            ...currentList,
            ...updateData,
            id: userKey, // Ensure ID doesn't change
            originalId: listId,
            userId,
            updatedAt: new Date().toISOString(),
            syncedAt: null // Mark as needing sync
        };

        return new Promise((resolve, reject) => {
            const request = store.put(updatedList);
            request.onsuccess = () => resolve(updatedList);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error updating word list in DB:', error);
        throw error;
    }
}

/**
 * Delete a word list from IndexedDB
 */
export async function deleteWordListDB(listId) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readwrite');
        const store = tx.objectStore(STORE_WORD_LISTS);

        const userId = getCurrentUserId();
        
        // Check if listId is already a composite key (contains userId prefix)
        let userKey;
        if (listId.startsWith(userId + '_')) {
            // Already a composite key, use directly
            userKey = listId;
        } else {
            // Original ID, create composite key
            userKey = createUserKey(listId, userId);
        }

        return new Promise((resolve, reject) => {
            const request = store.delete(userKey);
            request.onsuccess = () => {
                console.log(`Word list deleted from IndexedDB: ${userKey}`);
                resolve(true);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error deleting word list from DB:', error);
        throw error;
    }
}

/**
 * Add words to a word list in IndexedDB
 */
export async function addWordsToListDB(listId, wordIds) {
    try {
        const currentList = await getWordListDB(listId);

        if (!currentList) {
            throw new Error('List not found');
        }

        // Add new words that aren't already in the list
        const existingWordIds = currentList.wordIds || [];
        const uniqueWordIds = [...new Set([...existingWordIds, ...wordIds])];

        return await updateWordListDB(listId, {
            wordIds: uniqueWordIds
        });
    } catch (error) {
        console.error('Error adding words to list in DB:', error);
        throw error;
    }
}

/**
 * Remove words from a word list in IndexedDB
 */
export async function removeWordsFromListDB(listId, wordIds) {
    try {
        const currentList = await getWordListDB(listId);

        if (!currentList) {
            throw new Error('List not found');
        }

        // Remove specified words
        const filteredWordIds = (currentList.wordIds || []).filter(id => !wordIds.includes(id));

        return await updateWordListDB(listId, {
            wordIds: filteredWordIds
        });
    } catch (error) {
        console.error('Error removing words from list in DB:', error);
        throw error;
    }
}

/**
 * Get word list count for current user
 */
export async function getWordListCountDB() {
    try {
        const userLists = await getAllWordListsDB();
        return userLists.length;
    } catch (error) {
        console.error('Error getting word list count from DB:', error);
        return 0;
    }
}

/**
 * Check if a word list exists
 */
export async function wordListExistsDB(listId) {
    try {
        const list = await getWordListDB(listId);
        return !!list;
    } catch (error) {
        console.error('Error checking if word list exists:', error);
        return false;
    }
}

/**
 * Get word lists by creation date range
 */
export async function getWordListsByDateRangeDB(startDate, endDate) {
    try {
        const allLists = await getAllWordListsDB();

        return allLists.filter(list => {
            const createdDate = new Date(list.createdAt);
            return createdDate >= startDate && createdDate <= endDate;
        });
    } catch (error) {
        console.error('Error getting word lists by date range:', error);
        return [];
    }
}

/**
 * Search word lists by name or description
 */
export async function searchWordListsDB(searchTerm) {
    try {
        const allLists = await getAllWordListsDB();
        const lowerSearchTerm = searchTerm.toLowerCase();

        return allLists.filter(list => {
            const nameMatch = list.name?.toLowerCase().includes(lowerSearchTerm);
            const descriptionMatch = list.description?.toLowerCase().includes(lowerSearchTerm);
            return nameMatch || descriptionMatch;
        });
    } catch (error) {
        console.error('Error searching word lists:', error);
        return [];
    }
}

/**
 * Mark list as synced (update syncedAt timestamp)
 */
export async function markListAsSyncedDB(listId, syncedAt = null) {
    try {
        const syncTimestamp = syncedAt || new Date().toISOString();

        return await updateWordListDB(listId, {
            syncedAt: syncTimestamp
        });
    } catch (error) {
        console.error('Error marking list as synced:', error);
        throw error;
    }
}

/**
 * Get lists that need synchronization (not synced or updated after last sync)
 */
export async function getListsNeedingSyncDB() {
    try {
        const allLists = await getAllWordListsDB();

        return allLists.filter(list => {
            // No sync timestamp means never synced
            if (!list.syncedAt) {
                return true;
            }

            // Updated after last sync
            const updatedDate = new Date(list.updatedAt);
            const syncedDate = new Date(list.syncedAt);
            return updatedDate > syncedDate;
        });
    } catch (error) {
        console.error('Error getting lists needing sync:', error);
        return [];
    }
}

/**
 * Bulk update multiple lists (useful for sync operations)
 */
export async function bulkUpdateWordListsDB(updates) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readwrite');
        const store = tx.objectStore(STORE_WORD_LISTS);

        const promises = updates.map(({ listId, data }) => {
            return new Promise((resolve, reject) => {
                const userKey = createUserKey(listId);
                
                // First get the current list
                const getRequest = store.get(userKey);
                getRequest.onsuccess = () => {
                    const currentList = getRequest.result;
                    
                    if (!currentList) {
                        // List doesn't exist locally, create it from cloud data
                        console.log(`Creating missing local list: ${listId}`);
                        const newList = {
                            ...data,
                            id: userKey,
                            originalId: listId,
                            userId: getCurrentUserId(),
                            createdAt: data.createdAt || new Date().toISOString(),
                            updatedAt: data.updatedAt || new Date().toISOString(),
                            wordIds: data.wordIds || []
                        };

                        const putRequest = store.put(newList);
                        putRequest.onsuccess = () => resolve(newList);
                        putRequest.onerror = () => reject(putRequest.error);
                        return;
                    }

                    // List exists, merge and update
                    const updatedList = {
                        ...currentList,
                        ...data,
                        id: userKey,
                        originalId: listId,
                        updatedAt: new Date().toISOString()
                    };

                    const putRequest = store.put(updatedList);
                    putRequest.onsuccess = () => resolve(updatedList);
                    putRequest.onerror = () => reject(putRequest.error);
                };
                getRequest.onerror = () => reject(getRequest.error);
            });
        });

        return await Promise.all(promises);
    } catch (error) {
        console.error('Error bulk updating word lists:', error);
        throw error;
    }
}

/**
 * Extract original ID from composite key
 */
export function extractOriginalIdFromCompositeKey(compositeKey) {
    const userId = getCurrentUserId();
    if (compositeKey.startsWith(userId + '_')) {
        return compositeKey.substring((userId + '_').length);
    }
    return compositeKey;
}