/**
 * Word Lists Synchronization - Main Export Module
 * Re-exports functions from the split core and manager modules
 */

// Re-export core CRUD operations
export {
    createWordList,
    getWordList,
    getAllWordLists,
    updateWordList,
    deleteWordList,
    addWordsToList,
    removeWordsFromList,
    getWordListCount,
    wordListExists,
    forceFullSync
} from './lists-sync-core.js';

// Re-export sync management functions
export {
    performBackgroundSync,
    clearListsCache,
    retrySyncAll,
    getSyncStatus,
    initSyncSystem
} from './lists-sync-manager.js';