/**
 * Word management functionality for lists
 * Handles adding/removing words from lists
 */

import { 
    getSystemVocabulary,
    WordCategories 
} from '../vocabulary.js';

import {
    addWordsToList,
    removeWordsFromList,
    getWordList
} from './lists-sync.js';

/**
 * Show modal to add words to a specific list
 */
export async function showAddWordsModal(listId) {
    try {
        await showLoadingModal();
        let currentPage = 1;
        let activeFilter = 'all';
        let activeSearchQuery = '';
        const PAGE_SIZE = 100;

        const pageData = await getSystemVocabulary({
            sortByStatus: true,
            offset: 0,
            limit: PAGE_SIZE,
            category: activeFilter !== 'all' ? activeFilter : undefined,
            search: activeSearchQuery || undefined,
        });

        const allWordsCount = 5523;
        window.currentPageWords = pageData;
        removeLoadingModal();
        renderAddWordsModal(listId);
    } catch (error) {
        console.error('Erro ao exibir modal:', error);
        alert('Erro ao abrir modal de adição');
    }
}

function showLoadingModal() {
    const loadingModal = createModal('loading-modal', 'Carregando palavras...', `
        <div class="loading-state">
            <span class="material-symbols-sharp loading-icon">sync</span>
            <p>Por favor, aguarde</p>
        </div>
    `);
    return createAndShowModal(loadingModal);
}

function removeLoadingModal() {
    const loadingModal = document.getElementById('loading-modal');
    if (loadingModal) loadingModal.remove();
}

async function renderAddWordsModal(listId) {
    const currentPage = 1;
    const PAGE_SIZE = 100;
    const activeFilter = 'all';
    const activeSearchQuery = '';
    
    const offset = (currentPage - 1) * PAGE_SIZE;
    const words = await getSystemVocabulary({
        sortByStatus: true,
        offset,
        limit: PAGE_SIZE,
        category: activeFilter !== 'all' ? activeFilter : undefined,
        search: activeSearchQuery || undefined,
    });

    window.currentPageWords = words;
    const totalPages = Math.ceil(5523 / PAGE_SIZE);

    const content = buildAddWordsModalContent(words, currentPage, totalPages, listId);
    const actions = createActionButtons([
        { id: 'cancel-add-words', text: 'Cancelar' },
        { id: 'add-selected-words-btn', text: 'Adicionar', className: 'btn primary' }
    ]);

    const modalHtml = createLargeModal('add-words-modal', 'Adicionar Palavras à Lista', content, actions);
    
    const existingModal = document.getElementById('add-words-modal');
    if (existingModal) existingModal.remove();
    
    const modal = createAndShowModal(modalHtml);
    setupAddWordsEventListeners(modal, listId);
}

function buildAddWordsModalContent(wordsPage, currentPage, totalPages, listId) {
    const searchFilterBar = `
        <div class="search-filter-bar">
            <input type="text" id="modal-search" placeholder="Buscar palavras..." class="search-input" value="">
            <div class="filter-buttons">
                ${createFilterButtons('all')}
            </div>
        </div>
    `;

    const wordsContainer = `
        <div class="words-selection">
            <div class="words-container" id="modal-words-container">
                ${wordsPage.map(createWordSelectionItem).join('')}
            </div>
        </div>
    `;

    const pagination = createPaginationControls(currentPage, totalPages);

    return searchFilterBar + wordsContainer + pagination;
}

function createWordSelectionItem(word) {
    return `
        <div class="vocab-word-item ${word.progress.status}" data-word-id="${word.ID}" data-category="${word.PART_OF_SPEECH}">
            <div class="word-checkbox">
                <input type="checkbox" id="modal-check-${word.ID}" class="word-selector" data-word-id="${word.ID}">
                <label for="modal-check-${word.ID}"></label>
            </div>
            <div class="word-info">
                <div class="greek-word">${word.LEXICAL_FORM}</div>
                <div class="word-details">
                    <span class="transliteration">${word.TRANSLITERATED_LEXICAL_FORM}</span>
                    <span class="meaning">${word.USAGE}</span>
                </div>
                <div class="word-meta">
                    <span class="category-badge">${word.PART_OF_SPEECH || 'não categorizado'}</span>
                    <span class="status-badge ${word.progress.status}">${getStatusLabel(word.progress.status)}</span>
                </div>
            </div>
        </div>
    `;
}

function createFilterButtons(activeFilter = 'all') {
    const filters = [
        { key: 'all', label: 'Todos' },
        ...Object.values(WordCategories).map(category => ({ key: category, label: category }))
    ];

    return filters.map(({ key, label }) => 
        `<button class="filter-btn ${activeFilter === key ? 'active' : ''}" data-filter="${key}">${label}</button>`
    ).join('');
}

function createPaginationControls(currentPage, totalPages) {
    return `
        <div class="pagination-controls">
            <button class="pagination-btn" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
            <span>Página ${currentPage} de ${totalPages}</span>
            <button class="pagination-btn" id="next-page" ${currentPage === totalPages ? 'disabled' : ''}>Próxima</button>
        </div>
    `;
}

function setupAddWordsEventListeners(modal, listId) {
    const selectedWordIds = new Set();
    const addBtn = modal.querySelector('#add-selected-words-btn');
    
    setupCheckboxHandlers(modal, selectedWordIds, addBtn);
    setupAddSelectedEventListener(modal, selectedWordIds, addBtn, listId);

    const cancelBtn = modal.querySelector('#cancel-add-words');
    cancelBtn.addEventListener('click', () => modal.remove());
}

function setupCheckboxHandlers(modal, selectedSet, addBtn) {
    modal.querySelectorAll('.word-selector:not([disabled])').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const wordId = checkbox.dataset.wordId;
            checkbox.checked ? selectedSet.add(wordId) : selectedSet.delete(wordId);
            updateAddBtn(addBtn, selectedSet.size);
        });
    });
}

function setupAddSelectedEventListener(modal, selectedWordIds, addBtn, listId) {
    addBtn.addEventListener('click', async () => {
        if (!selectedWordIds.size) return alert('Selecione palavras para adicionar');
        try {
            await addWordsToList(listId, Array.from(selectedWordIds));
            alert(`${selectedWordIds.size} palavras adicionadas com sucesso!`);
            modal.remove();
            
            // Trigger refresh of lists if callback is available
            if (window.refreshLists) {
                window.refreshLists();
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao adicionar palavras à lista');
        }
    });
}

function updateAddBtn(button, count) {
    if (count > 0) {
        button.removeAttribute('disabled');
        button.textContent = `Adicionar (${count})`;
    } else {
        button.setAttribute('disabled', 'disabled');
        button.textContent = 'Adicionar';
    }
}

// Utility functions
function createModal(id, title, content, actions = '') {
    return `
        <div class="modal" id="${id}">
            <div class="modal-content">
                <button class="close-modal">&times;</button>
                <h2>${title}</h2>
                ${content}
                ${actions ? `<div class="modal-actions">${actions}</div>` : ''}
            </div>
        </div>
    `;
}

function createLargeModal(id, title, content, actions = '') {
    return `
        <div class="modal" id="${id}">
            <div class="modal-content large">
                <button class="close-modal">&times;</button>
                <h2>${title}</h2>
                ${content}
                ${actions ? `<div class="modal-actions">${actions}</div>` : ''}
            </div>
        </div>
    `;
}

function createAndShowModal(htmlContent) {
    document.body.insertAdjacentHTML('beforeend', htmlContent);
    const modal = document.body.lastElementChild;
    
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.remove());
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    modal.style.display = 'flex';
    return modal;
}

function createActionButtons(buttons) {
    return buttons.map(({ id, text, className = 'btn' }) => 
        `<button id="${id}" class="${className}">${text}</button>`
    ).join('');
}

function getStatusLabel(status) {
    const labels = {
        'unread': 'Não lido',
        'reading': 'Lendo',
        'familiar': 'Familiar',
        'memorized': 'Decorado'
    };
    return labels[status] || 'Desconhecido';
}

/**
 * Show modal to remove words from a list
 */
export async function showRemoveWordsModal(listId, selectedWords) {
    if (!selectedWords || selectedWords.length === 0) {
        alert('Selecione palavras para remover');
        return;
    }

    const content = `
        <p>Tem certeza que deseja remover ${selectedWords.length} palavra(s) desta lista?</p>
        <p class="note">Nota: As palavras não serão excluídas do vocabulário, apenas removidas desta lista.</p>
    `;
    
    const actions = createActionButtons([
        { id: 'cancel-remove-words', text: 'Cancelar' },
        { id: 'confirm-remove-words', text: 'Remover', className: 'btn danger' }
    ]);

    const modalHtml = createModal('confirm-remove-words-modal', 'Remover Palavras da Lista', content, actions);
    const modal = createAndShowModal(modalHtml);

    const cancelBtn = modal.querySelector('#cancel-remove-words');
    const confirmBtn = modal.querySelector('#confirm-remove-words');

    cancelBtn.addEventListener('click', () => modal.remove());
    confirmBtn.addEventListener('click', async () => {
        try {
            await removeWordsFromList(listId, selectedWords);
            alert(`${selectedWords.length} palavras removidas com sucesso!`);
            modal.remove();
            
            // Trigger refresh of lists if callback is available
            if (window.refreshLists) {
                window.refreshLists();
            }
        } catch (error) {
            console.error('Error removing words from list:', error);
            alert('Erro ao remover palavras da lista');
        }
    });
}