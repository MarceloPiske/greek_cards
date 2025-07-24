/**
 * DOM Manipulation Utilities
 */

import { 
    createEmptyState, 
    createLoadingState, 
    createWordListItem,
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
 * Render word lists
 */
export function renderWordLists(lists, containerId) {
    if (lists.length === 0) {
        showEmpty(
            containerId,
            'list',
            'Você ainda não tem listas de palavras',
            '',
            { id: 'create-first-list', text: 'Criar primeira lista' }
        );
    } else {
        const content = lists.map(createWordListItem).join('');
        showContent(containerId, content);
    }
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
            '',
            { id: 'add-first-word', text: 'Adicionar palavra' }
        );
        return;
    }

    const wordsHtml = words.map(word => createVocabWordItem(word)).join('');
    const paginationHtml = createPagination(currentPage, totalPages);
    
    showContent(containerId, wordsHtml + paginationHtml);
}

/**
 * Render word list content
 */
export function renderWordListContent(list, filteredWords, viewMode, containerId) {
    const headerHtml = createListHeader(list, filteredWords.length);
    const actionsHtml = createListActionsBar(viewMode);
    
    let wordsContainer;
    if (filteredWords.length === 0) {
        wordsContainer = createEmptyState(
            'search_off',
            'Nenhuma palavra encontrada com os filtros atuais',
            'Adicione palavras a esta lista ou ajuste os filtros.',
            { id: 'add-words-empty', text: 'Adicionar palavras' }
        );
    } else {
        const containerClass = viewMode === 'cards' ? 'words-grid' : 'words-list';
        const wordsHtml = viewMode === 'cards' 
            ? filteredWords.map(createVocabCard).join('')
            : filteredWords.map(word => createVocabWordItem(word, true)).join('');
        
        wordsContainer = `<div class="${containerClass}" id="list-words-container">${wordsHtml}</div>`;
    }
    
    showContent(containerId, headerHtml + actionsHtml + wordsContainer);
    
    // Add event listener for empty state button
    addButtonListener('add-words-empty', () => {
        // Import and call the showAddToListModal function
        import('./ui_modal.js').then(module => {
            module.showAddToListModal();
        });
    });
}

/**
 * Mark list as selected
 */
export function markListAsSelected(listId) {
    document.querySelectorAll('.word-list-item').forEach(item => {
        if (item.getAttribute('data-list-id') === listId) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
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