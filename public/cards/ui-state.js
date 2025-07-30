/**
 * UI State Management
 */

// Current UI state
export const uiState = {
    currentPage: 1,
    currentListId: null,
    currentFilter: null,
    selectedWords: [],
    viewMode: 'list', // 'list' or 'cards'
};

/**
 * Update UI state
 */
export function updateUIState(updates) {
    Object.assign(uiState, updates);
}

/**
 * Reset selected words
 */
export function resetSelectedWords() {
    uiState.selectedWords = [];
}

/**
 * Add word to selection
 */
export function addToSelection(wordId) {
    if (!uiState.selectedWords.includes(wordId)) {
        uiState.selectedWords.push(wordId);
    }
}

/**
 * Remove word from selection
 */
export function removeFromSelection(wordId) {
    uiState.selectedWords = uiState.selectedWords.filter(id => id !== wordId);
}

/**
 * Toggle word selection
 */
export function toggleWordSelection(wordId) {
    if (uiState.selectedWords.includes(wordId)) {
        removeFromSelection(wordId);
    } else {
        addToSelection(wordId);
    }
}