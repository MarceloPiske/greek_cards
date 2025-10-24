/**
 * DOM Manipulation Utilities
 */

import { 
    createEmptyState, 
    createLoadingState, 
    createVocabWordItem,
    createVocabCard,
    createPagination,
    createListHeader,
    createListActionsBar
} from './ui-templates.js';

/**
 * Show content in a container
 */
export function showContent(containerId, content) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = content;
    }
}

/**
 * Show loading state in a container
 */
export function showLoading(containerId, message = 'Carregando...') {
    showContent(containerId, createLoadingState(message));
}

/**
 * Show empty state in a container
 */
export function showEmpty(containerId, icon, title, description, buttonConfig = null) {
    const content = createEmptyState(
        icon, 
        title, 
        description, 
        buttonConfig?.id, 
        buttonConfig?.text
    );
    showContent(containerId, content);
}

/**
 * Render vocabulary words
 */
export function renderVocabularyWords(words, containerId, currentPage, totalPages) {
    if (words.length === 0) {
        showEmpty(
            containerId,
            'menu_book',
            'Nenhuma palavra encontrada',
            'Use os filtros para encontrar palavras específicas'
        );
        return;
    }

    const wordsHtml = words.map(word => createVocabWordItem(word)).join('');
    const paginationHtml = createPagination(currentPage, totalPages);
    
    showContent(containerId, wordsHtml + paginationHtml);
}

/**
 * Add button event listener helper
 */
export function addButtonListener(buttonId, handler) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.addEventListener('click', handler);
    }
}

/**
 * Render word list content for practice
 */
export function renderWordListContent(list, containerId, viewMode = 'list') {
    const headerHtml = createListHeader(list, list.words.length);
    const actionsHtml = createListActionsBar(viewMode);
    
    let wordsHtml = '';
    if (list.words.length === 0) {
        wordsHtml = createEmptyState(
            'style',
            'Lista vazia',
            'Esta lista não contém palavras ainda'
        );
    } else {
        if (viewMode === 'cards') {
            wordsHtml = `<div class="words-grid">${list.words.map(word => createVocabCard(word)).join('')}</div>`;
        } else {
            wordsHtml = `<div class="words-list">${list.words.map(word => createVocabWordItem(word, false)).join('')}</div>`;
        }
    }
    
    const fullContent = headerHtml + actionsHtml + wordsHtml;
    showContent(containerId, fullContent);
}

/**
 * Mark a list as selected in the sidebar
 */
export function markListAsSelected(listId) {
    // Remove previous selection
    document.querySelectorAll('.word-list-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Add selection to current list
    const listItem = document.querySelector(`[data-list-id="${listId}"]`);
    if (listItem) {
        listItem.classList.add('selected');
    }
}