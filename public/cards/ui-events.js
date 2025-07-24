/**
 * Event Handler Management
 */

import { uiState, toggleWordSelection, updateUIState } from './ui-state.js';
import {
    showNewListModal,
    showEditListModal,
    showAddToListModal,
    confirmDeleteList,
    confirmRemoveFromList,
    startPracticeSession,
    showWordDetailModal,
    debounce
} from './ui_modal.js';
import { 
    updateWordProgress,
    WordStatus
} from './vocabulary.js';

/**
 * Setup tab event listeners
 */
export function setupTabEventListeners() {
    const tabsContainer = document.querySelector('.vocabulary-tabs');
    if (!tabsContainer) return;

    const tabs = tabsContainer.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.getAttribute('data-tab');
            tabContents.forEach(content => {
                content.classList.toggle('active', content.id === target);
            });
        });
    });
}

/**
 * Setup main action event listeners
 */
export function setupMainActionListeners() {
    const newListBtn = document.getElementById('new-list-btn');
    if (newListBtn) {
        newListBtn.addEventListener('click', showNewListModal);
    }

    const addWordBtn = document.getElementById('add-word-btn');
    if (addWordBtn) {
        addWordBtn.addEventListener('click', showAddWordModal);
    }
}

/**
 * Setup filter event listeners
 */
export function setupFilterListeners(onFilterChange) {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');
            updateUIState({ currentFilter: filter === 'all' ? null : filter });
            
            if (onFilterChange) onFilterChange();
        });
    });
}

/**
 * Setup search event listeners
 */
export function setupSearchListeners(onSearch) {
    const searchInput = document.getElementById('vocab-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            if (onSearch) onSearch(searchInput.value);
        }, 300));
    }
}

/**
 * Setup word list event listeners
 */
export function setupWordListEventListeners(onListSelect) {
    const listItems = document.querySelectorAll('.word-list-item');
    listItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.list-actions')) {
                const listId = item.getAttribute('data-list-id');
                if (onListSelect) onListSelect(listId);
            }
        });
    });

    const editBtns = document.querySelectorAll('.edit-list');
    editBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const listId = btn.getAttribute('data-list-id');
            showEditListModal(listId);
        });
    });

    const deleteBtns = document.querySelectorAll('.delete-list');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const listId = btn.getAttribute('data-list-id');
            confirmDeleteList(listId);
        });
    });
}

/**
 * Setup view mode toggle listeners
 */
export function setupViewToggleListeners(onViewChange) {
    const viewBtns = document.querySelectorAll('.view-toggle .btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.getAttribute('data-view');
            updateUIState({ viewMode: view });

            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (onViewChange) onViewChange(view);
        });
    });
}

/**
 * Setup word action listeners
 */
export function setupWordActionListeners() {
    // Status buttons
    const statusBtns = document.querySelectorAll('.status-btn');
    statusBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await handleStatusChange(btn);
        });
    });

    // Card flip functionality
    const cards = document.querySelectorAll('.vocab-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
        });
    });

    // Info buttons
    const infoButtons = document.querySelectorAll('.info-btn');
    infoButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const wordId = btn.getAttribute('data-word-id');
            showWordDetailModal(wordId);
        });
    });

    // Checkboxes
    const checkboxes = document.querySelectorAll('.word-selector');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const wordId = checkbox.getAttribute('data-word-id');
            toggleWordSelection(wordId);
            updateSelectedWordsUI();
        });
    });
}

/**
 * Setup list content action listeners
 */
export function setupListContentActionListeners() {
    const addToListBtn = document.getElementById('add-to-list-btn');
    if (addToListBtn) {
        addToListBtn.addEventListener('click', showAddToListModal);
    }

    const removeFromListBtn = document.getElementById('remove-from-list-btn');
    if (removeFromListBtn) {
        removeFromListBtn.addEventListener('click', () => {
            if (uiState.selectedWords.length > 0) {
                confirmRemoveFromList();
            } else {
                alert('Selecione palavras para remover');
            }
        });
    }

    const practiceBtn = document.getElementById('practice-list-btn');
    if (practiceBtn) {
        practiceBtn.addEventListener('click', () => {
            if (uiState.currentListId) {
                startPracticeSession(uiState.currentListId);
            }
        });
    }
}

/**
 * Setup pagination listeners
 */
export function setupPaginationListeners(onPageChange) {
    const paginationBtns = document.querySelectorAll('.pagination-btn');
    paginationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.getAttribute('data-page'));
            if (onPageChange) onPageChange(page);
        });
    });
}

/**
 * Handle status change for words
 */
async function handleStatusChange(btn) {
    const wordId = btn.getAttribute('data-word-id');
    const status = btn.getAttribute('data-status');

    try {
        await updateWordProgress(wordId, { status });

        // Update UI
        document.querySelectorAll(`.status-btn[data-word-id="${wordId}"]`).forEach(b => {
            b.classList.remove('active');
        });

        document.querySelectorAll(`.status-btn.${status}[data-word-id="${wordId}"]`).forEach(b => {
            b.classList.add('active');
        });

        // Update container classes
        const containers = document.querySelectorAll(`[data-word-id="${wordId}"]`);
        containers.forEach(container => {
            Object.values(WordStatus).forEach(s => {
                container.classList.remove(s);
            });
            container.classList.add(status);
        });

        alert('Status atualizado');
    } catch (error) {
        console.error('Error updating word status:', error);
        alert('Erro ao atualizar status');
    }
}

/**
 * Update UI based on selected words
 */
function updateSelectedWordsUI() {
    const addSelectedBtn = document.getElementById('add-selected-btn');
    const removeSelectedBtn = document.getElementById('remove-from-list-btn');

    if (addSelectedBtn) {
        if (uiState.selectedWords.length > 0) {
            addSelectedBtn.removeAttribute('disabled');
            addSelectedBtn.textContent = `Adicionar (${uiState.selectedWords.length})`;
        } else {
            addSelectedBtn.setAttribute('disabled', 'disabled');
            addSelectedBtn.textContent = 'Adicionar';
        }
    }

    if (removeSelectedBtn) {
        if (uiState.selectedWords.length > 0) {
            removeSelectedBtn.removeAttribute('disabled');
            removeSelectedBtn.textContent = `Remover selecionadas (${uiState.selectedWords.length})`;
        } else {
            removeSelectedBtn.setAttribute('disabled', 'disabled');
            removeSelectedBtn.textContent = 'Remover selecionadas';
        }
    }
}