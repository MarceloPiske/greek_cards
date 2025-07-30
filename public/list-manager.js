/**
 * Centralized List Management System
 * Handles creation, updating, deletion, and synchronization of word lists
 */

import { initVocabularyDB, STORE_WORD_LISTS } from './cards/vocabulary-db.js';
import { saveDataWithSync, loadDataWithSync } from './cards/cards-sync.js';
import { canSyncToCloud } from './plan-manager.js';

/**
 * Create a new word list
 */
export async function createWordList(listData) {
    try {
        const db = await initVocabularyDB();
        
        // Generate unique ID if not provided
        if (!listData.id) {
            listData.id = 'list_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        }

        // Set timestamps
        const now = new Date().toISOString();
        const newList = {
            ...listData,
            wordIds: listData.wordIds || [],
            createdAt: now,
            updatedAt: now,
            syncedAt: null // Start as offline
        };

        // Save locally first
        const tx = db.transaction(STORE_WORD_LISTS, 'readwrite');
        const store = tx.objectStore(STORE_WORD_LISTS);
        
        await new Promise((resolve, reject) => {
            const request = store.put(newList);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        // Try cloud sync for premium users
        if (canSyncToCloud()) {
            try {
                await saveDataWithSync('wordLists', newList, newList.id);
                newList.syncedAt = new Date().toISOString();
                // Update local with sync timestamp
                const updateTx = db.transaction(STORE_WORD_LISTS, 'readwrite');
                const updateStore = updateTx.objectStore(STORE_WORD_LISTS);
                await new Promise((resolve, reject) => {
                    const updateRequest = updateStore.put(newList);
                    updateRequest.onsuccess = () => resolve();
                    updateRequest.onerror = () => reject(updateRequest.error);
                });
            } catch (error) {
                console.warn('Cloud sync failed, list saved offline only:', error);
            }
        }

        return newList;
    } catch (error) {
        console.error('Error creating word list:', error);
        throw error;
    }
}

/**
 * Update an existing word list
 */
export async function updateWordList(listId, updates) {
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

        // Apply updates
        const updatedList = {
            ...currentList,
            ...updates,
            updatedAt: new Date().toISOString(),
            syncedAt: null // Mark as not synced
        };

        // Save locally
        await new Promise((resolve, reject) => {
            const request = store.put(updatedList);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        // Try cloud sync for premium users
        if (canSyncToCloud()) {
            try {
                await saveDataWithSync('wordLists', updatedList, listId);
                updatedList.syncedAt = new Date().toISOString();
                // Update local with sync timestamp
                const syncTx = db.transaction(STORE_WORD_LISTS, 'readwrite');
                const syncStore = syncTx.objectStore(STORE_WORD_LISTS);
                await new Promise((resolve, reject) => {
                    const syncRequest = syncStore.put(updatedList);
                    syncRequest.onsuccess = () => resolve();
                    syncRequest.onerror = () => reject(syncRequest.error);
                });
            } catch (error) {
                console.warn('Cloud sync failed for list update:', error);
            }
        }

        return updatedList;
    } catch (error) {
        console.error('Error updating word list:', error);
        throw error;
    }
}

/**
 * Delete a word list
 */
export async function deleteWordList(listId) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readwrite');
        const store = tx.objectStore(STORE_WORD_LISTS);

        // Delete locally
        await new Promise((resolve, reject) => {
            const request = store.delete(listId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        // Try to delete from cloud for premium users
        if (canSyncToCloud()) {
            try {
                // Mark as deleted in cloud (soft delete)
                const deletedMarker = {
                    id: listId,
                    deleted: true,
                    deletedAt: new Date().toISOString()
                };
                await saveDataWithSync('wordLists', deletedMarker, listId);
            } catch (error) {
                console.warn('Cloud deletion failed:', error);
            }
        }

        return true;
    } catch (error) {
        console.error('Error deleting word list:', error);
        throw error;
    }
}

/**
 * Get all word lists
 */
export async function getAllWordLists() {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readonly');
        const store = tx.objectStore(STORE_WORD_LISTS);

        const lists = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        // Filter out deleted lists
        return lists.filter(list => !list.deleted);
    } catch (error) {
        console.error('Error getting word lists:', error);
        return [];
    }
}

/**
 * Get a specific word list by ID
 */
export async function getWordListById(listId) {
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
        console.error('Error getting word list:', error);
        return null;
    }
}

/**
 * Add words to a list
 */
export async function addWordsToList(listId, wordIds) {
    try {
        const currentList = await getWordListById(listId);
        if (!currentList) {
            throw new Error('List not found');
        }

        const uniqueWords = [...new Set([...currentList.wordIds, ...wordIds])];
        
        return await updateWordList(listId, {
            wordIds: uniqueWords
        });
    } catch (error) {
        console.error('Error adding words to list:', error);
        throw error;
    }
}

/**
 * Remove words from a list
 */
export async function removeWordsFromList(listId, wordIds) {
    try {
        const currentList = await getWordListById(listId);
        if (!currentList) {
            throw new Error('List not found');
        }

        const filteredWords = currentList.wordIds.filter(id => !wordIds.includes(id));
        
        return await updateWordList(listId, {
            wordIds: filteredWords
        });
    } catch (error) {
        console.error('Error removing words from list:', error);
        throw error;
    }
}

/**
 * Get word list with populated words
 */
export async function getWordListWithWords(listId) {
    try {
        const list = await getWordListById(listId);
        if (!list) {
            throw new Error('List not found');
        }

        if (!list.wordIds || list.wordIds.length === 0) {
            return {
                ...list,
                words: []
            };
        }

        // Import vocabulary functions
        const { getSystemVocabulary, getWordProgress } = await import('./cards/vocabulary-words.js');
        
        // Get words from system vocabulary
        const allWords = await getSystemVocabulary();
        const listWords = allWords.filter(word => list.wordIds.includes(word.ID));

        // Add progress to each word
        const wordsWithProgress = await Promise.all(
            listWords.map(async (word) => {
                const progress = await getWordProgress(word.ID);
                return {
                    ...word,
                    progress
                };
            })
        );

        return {
            ...list,
            words: wordsWithProgress
        };
    } catch (error) {
        console.error('Error getting word list with words:', error);
        throw error;
    }
}

/**
 * Sync all lists with cloud (for premium users)
 */
export async function syncAllListsWithCloud() {
    if (!canSyncToCloud()) {
        console.log('Cloud sync not available for current user plan');
        return;
    }

    try {
        const lists = await getAllWordLists();
        
        for (const list of lists) {
            if (!list.syncedAt || (list.updatedAt && list.updatedAt > list.syncedAt)) {
                try {
                    await saveDataWithSync('wordLists', list, list.id);
                    // Update sync timestamp
                    await updateWordList(list.id, { syncedAt: new Date().toISOString() });
                } catch (error) {
                    console.warn(`Failed to sync list ${list.id}:`, error);
                }
            }
        }

        console.log('All lists synced with cloud');
    } catch (error) {
        console.error('Error syncing lists with cloud:', error);
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.listManager = {
        createWordList,
        updateWordList,
        deleteWordList,
        getAllWordLists,
        getWordListById,
        addWordsToList,
        removeWordsFromList,
        getWordListWithWords,
        syncAllListsWithCloud
    };
}