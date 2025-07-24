/**
 * Word list management functionality
 */

import { 
    initVocabularyDB, 
    syncWordListToFirebase,
    getFromStore, 
    putInStore, 
    getAllFromStore,
    STORE_WORD_LISTS, 
    STORE_SYSTEM_VOCABULARY 
} from './vocabulary-db.js';
import { getWordProgress } from './vocabulary-words.js';
import { saveDataWithSync, loadDataWithSync } from './cards-sync.js';

/**
 * Create a new word list with Firebase sync for premium users
 */
export async function createWordList(list) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readwrite');
        const store = tx.objectStore(STORE_WORD_LISTS);

        // Generate a unique ID if not provided
        if (!list.id) {
            list.id = 'list_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        }

        // Set initial properties
        list.createdAt = new Date().toISOString();
        list.wordIds = list.wordIds || [];

        await putInStore(store, list);
        
        // Use sync system for cloud backup
        await saveDataWithSync('wordLists', list, list.id);
        
        return list;
    } catch (error) {
        console.error('Error creating word list:', error);
        throw error;
    }
}

/**
 * Add words to a word list
 */
export async function addWordsToList(listId, wordIds) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readwrite');
        const store = tx.objectStore(STORE_WORD_LISTS);

        // Get the current list
        const list = await getFromStore(store, listId);
        
        if (!list) {
            throw new Error('List not found');
        }

        // Add words that aren't already in the list
        const uniqueWords = [...new Set([...list.wordIds, ...wordIds])];
        list.wordIds = uniqueWords;
        list.updatedAt = new Date().toISOString();

        await putInStore(store, list);
        
        // Use sync system for cloud backup
        await saveDataWithSync('wordLists', list, list.id);
        
        return list;
    } catch (error) {
        console.error('Error adding words to list:', error);
        throw error;
    }
}

/**
 * Remove words from a word list
 */
export async function removeWordsFromList(listId, wordIds) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readwrite');
        const store = tx.objectStore(STORE_WORD_LISTS);

        // Get the current list
        const list = await getFromStore(store, listId);
        
        if (!list) {
            throw new Error('List not found');
        }
        
        // Remove specified words
        list.wordIds = list.wordIds.filter(id => !wordIds.includes(id));
        list.updatedAt = new Date().toISOString();

        await putInStore(store, list);
        
        // Use sync system for cloud backup
        await saveDataWithSync('wordLists', list, list.id);
        
        return list;
    } catch (error) {
        console.error('Error removing words from list:', error);
        throw error;
    }
}

/**
 * Get all word lists with sync
 */
export async function getAllWordLists() {
    try {
        // For collections, we need to handle this differently
        // First try to sync individual lists if we have IDs, otherwise fall back to local
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readonly');
        const store = tx.objectStore(STORE_WORD_LISTS);

        return await getAllFromStore(store);
    } catch (error) {
        console.error('Error getting word lists:', error);
        return [];
    }
}

/**
 * Get a specific word list with its words
 */
export async function getWordListWithWords(listId) {
    try {
        const db = await initVocabularyDB();
        
        // Get the list first
        const list = await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_WORD_LISTS, 'readonly');
            const store = tx.objectStore(STORE_WORD_LISTS);
            const request = store.get(listId);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (!list) {
            throw new Error('List not found');
        }

        // If no word IDs, return list with empty words array
        if (!list.wordIds || list.wordIds.length === 0) {
            return {
                ...list,
                words: []
            };
        }

        // Get all words from the system vocabulary
        const words = await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_SYSTEM_VOCABULARY, 'readonly');
            const store = tx.objectStore(STORE_SYSTEM_VOCABULARY);
            const results = [];
            let completed = 0;
            const total = list.wordIds.length;

            if (total === 0) {
                resolve(results);
                return;
            }

            for (const wordId of list.wordIds) {
                const request = store.get(wordId);
                
                request.onsuccess = async () => {
                    if (request.result) {
                        // Add progress to the word
                        const progress = await getWordProgress(request.result.ID);
                        results.push({
                            ...request.result,
                            progress
                        });
                    }
                    
                    completed++;
                    if (completed === total) {
                        resolve(results);
                    }
                };
                
                request.onerror = () => {
                    console.warn(`Could not load word ${wordId}`);
                    completed++;
                    if (completed === total) {
                        resolve(results);
                    }
                };
            }
        });

        return {
            ...list,
            words
        };
    } catch (error) {
        console.error('Error getting word list with words:', error);
        throw error;
    }
}