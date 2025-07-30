/**
 * Event Handler Management
 */

import { uiState, toggleWordSelection, updateUIState } from './ui-state.js';
import {
    startPracticeSession,
    showWordDetailModal,
    debounce
} from './ui_modal.js';

// Import unified word progress function from sync system
import { saveWordProgress } from '../word_progress/word-progress-sync.js';

import { 
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
    // No main actions needed for cards-only view
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
        card.addEventListener('click', (e) => {
            // Don't flip if clicking on buttons
            if (e.target.closest('.status-btn') || e.target.closest('.info-btn')) {
                return;
            }
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
        await saveWordProgress(wordId, { status });

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
    // No selected words UI needed for cards-only view
}