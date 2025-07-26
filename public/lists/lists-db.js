/**
 * Word Lists Database Operations
 * Handles all CRUD operations for word lists with IndexedDB
 */

import { initVocabularyDB } from '../vocabulary/vocabulary-db.js';
//import { saveDataWithSync } from '../cards/cards-sync.js';

// Database store for word lists
const STORE_WORD_LISTS = 'wordLists';

/**
 * Create a new word list in IndexedDB
 */
export async function createWordListDB(listData) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readwrite');
        const store = tx.objectStore(STORE_WORD_LISTS);

        // Generate unique ID if not provided
        if (!listData.id) {
            listData.id = 'list_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        }

        // Set timestamps and initial data
        const newList = {
            ...listData,
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

        return new Promise((resolve, reject) => {
            const request = store.get(listId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting word list from DB:', error);
        throw error;
    }
}

/**
 * Get all word lists from IndexedDB
 */
export async function getAllWordListsDB() {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readonly');
        const store = tx.objectStore(STORE_WORD_LISTS);

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const lists = request.result || [];
                // Sort by creation date, newest first
                lists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                resolve(lists);
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

        // Get current list
        const currentList = await new Promise((resolve, reject) => {
            const request = store.get(listId);
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
            id: listId, // Ensure ID doesn't change
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

        return new Promise((resolve, reject) => {
            const request = store.delete(listId);
            request.onsuccess = () => resolve(true);
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
 * Get word list count
 */
export async function getWordListCountDB() {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readonly');
        const store = tx.objectStore(STORE_WORD_LISTS);

        return new Promise((resolve, reject) => {
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
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
                // First get the current list
                const getRequest = store.get(listId);
                getRequest.onsuccess = () => {
                    const currentList = getRequest.result;
                    if (!currentList) {
                        reject(new Error(`List ${listId} not found`));
                        return;
                    }

                    // Merge and update
                    const updatedList = {
                        ...currentList,
                        ...data,
                        id: listId,
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