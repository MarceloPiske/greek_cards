/**
 * Word list management functionality - now delegating to unified sync system
 */

// Import unified functions from sync system
import { 
    createWordList,
    getWordList,
    getAllWordLists,
    updateWordList,
    deleteWordList,
    addWordsToList,
    removeWordsFromList
} from '../lists/lists-sync.js';

// Import unified word progress function from sync system
import { getWordProgress } from '../word_progress/word-progress-sync.js';

// Re-export unified functions
export {
    createWordList,
    addWordsToList,
    removeWordsFromList,
    getAllWordLists
};

/**
 * Get a specific word list with its words (enhanced version)
 */
export async function getWordListWithWords(listId) {
    try {
        // Get the list using unified sync function
        const list = await getWordList(listId);

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
        const { initVocabularyDB, STORE_SYSTEM_VOCABULARY } = await import('./vocabulary-db.js');
        const db = await initVocabularyDB();

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