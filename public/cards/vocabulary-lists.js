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
} from './lists/lists-sync.js';

// Import unified word progress function from sync system
import { getWordProgress } from './word_progress/word-progress-sync.js';

// Import system vocabulary from vocabulary module (proper dependency)
import { getSystemVocabulary } from '../vocabulary/vocabulary-db.js';

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

        // Get words from the system vocabulary (using proper import)
        const allWords = await getSystemVocabulary();
        const words = [];

        for (const wordId of list.wordIds) {
            const word = allWords.find(w => w.ID === wordId);
            if (word) {
                // Add progress to the word using cards progress system
                try {
                    const progress = await getWordProgress(word.ID);
                    words.push({
                        ...word,
                        progress: progress || { status: 'unread', reviewCount: 0 }
                    });
                } catch (error) {
                    console.warn(`Error getting progress for word ${word.ID}:`, error);
                    words.push({
                        ...word,
                        progress: { status: 'unread', reviewCount: 0 }
                    });
                }
            }
        }

        return {
            ...list,
            words
        };
    } catch (error) {
        console.error('Error getting word list with words:', error);
        throw error;
    }
}