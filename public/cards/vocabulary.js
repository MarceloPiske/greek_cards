/**
 * Main vocabulary module - re-exports all functionality from sub-modules
 */
// Import modules to make them available locally
import * as db from './vocabulary-db.js';
import * as words from './vocabulary-words.js';
import * as lists from './vocabulary-lists.js';
// Re-export constants first
export { WordStatus, WordCategories } from './vocabulary-db.js';

// Re-export database functions
export { 
    initVocabularyDB, 
    syncToFirebase, 
    loadUserDataFromFirebase 
} from './vocabulary-db.js';

// Re-export word management functions
export { 
    addVocabularyWord, 
    updateWordProgress, 
    getWordProgress, 
    addSystemVocabulary, 
    getSystemVocabulary, 
    importGreekLexicon 
} from './vocabulary-words.js';

// Re-export list management functions
export { 
    createWordList, 
    addWordsToList, 
    removeWordsFromList, 
    getAllWordLists, 
    getWordListWithWords 
} from './vocabulary-lists.js';

// Export to global scope for non-module scripts
if (typeof window !== 'undefined') {
    window.vocabularyManager = {
        ...db,
        ...words,
        ...lists
    };
}