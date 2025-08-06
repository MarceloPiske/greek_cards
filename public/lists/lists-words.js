/**
 * Word management functionality for lists - Entry point
 * Re-exports functions from split modules for backward compatibility
 */

// Re-export main functions from the split modules
export { showAddWordsModal, showRemoveWordsModal } from './lists-words-actions.js?v=1.1';
export { 
    renderAddWordsModal, 
    buildAddWordsModalContent,
    createWordSelectionItem,
    createFilterButtons,
    createPaginationControls,
    reloadModalData
} from './lists-words-modal.js?v=1.1';