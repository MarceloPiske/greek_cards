/**
 * Modal creation and management for vocabulary system
 */

import {
    WordStatus,
    WordCategories,
    getWordListWithWords,
    addWordsToList,
    removeWordsFromList,
    getSystemVocabulary,
    initVocabularyDB,
    createWordList,
    addVocabularyWord
} from './vocabulary.js';

import { uiState, loadWordLists, selectWordList, loadWordListContent } from './ui.js';

import { 
    createModal, 
    createLargeModal, 
    createAndShowModal, 
    debounce,
    createFormGroup,
    createActionButtons,
    getStatusLabel
} from './modal-utils.js';

import {
    createWordListForm,
    createWordForm,
    createFilterButtons,
    createWordSelectionItem,
    createPaginationControls,
    createConfirmationContent,
    createWordDetailContent
} from './modal-components.js';

import { guardWordListCreation } from './access-control.js';

const STORE_VOCABULARY = 'systemVocabulary';

/**
 * Show modal to create a new word list
 */
export async function showNewListModal() {
    // Check if user can create new word lists
    const canCreate = await guardWordListCreation();
    if (!canCreate) {
        return; // guardWordListCreation will show upgrade modal if needed
    }

    const content = createWordListForm();
    const actions = createActionButtons([
        { id: 'cancel-new-list', text: 'Cancelar' },
        { id: 'create-list', text: 'Criar Lista', className: 'btn primary' }
    ]);

    const modalHtml = createModal('new-list-modal', 'Nova Lista de Palavras', content, actions);
    const modal = createAndShowModal(modalHtml);

    setupNewListEventListeners(modal);
}

function setupNewListEventListeners(modal) {
    const cancelBtn = modal.querySelector('#cancel-new-list');
    const createBtn = modal.querySelector('#create-list');

    cancelBtn.addEventListener('click', () => modal.remove());
    createBtn.addEventListener('click', async () => {
        try {
            const name = modal.querySelector('#list-name').value.trim();
            const description = modal.querySelector('#list-description').value.trim();

            if (!name) {
                alert('Por favor, insira um nome para a lista');
                return;
            }

            const newList = await createWordList({ name, description, wordIds: [] });
            alert('Lista criada com sucesso!');
            modal.remove();

            await loadWordLists();
            selectWordList(newList.id);
        } catch (error) {
            console.error('Error creating list:', error);
            alert('Erro ao criar lista');
        }
    });
}

/**
 * Show modal to add words to a list
 */
let allWordsCount = 0;
let currentPage = 1;
let activeFilter = 'all';
let activeSearchQuery = '';
const PAGE_SIZE = 100;

export async function showAddToListModal() {
    try {
        await showLoadingModal();
        currentPage = 1;
        activeFilter = uiState.currentFilter || 'all';
        activeSearchQuery = '';

        const pageData = await getSystemVocabulary({
            sortByStatus: true,
            offset: 0,
            limit: PAGE_SIZE,
            category: activeFilter !== 'all' ? activeFilter : undefined,
            search: activeSearchQuery || undefined,
        });

        allWordsCount = 5523;
        window.currentPageWords = pageData;
        removeLoadingModal();
        renderAddToListModal();
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

async function renderAddToListModal() {
    const offset = (currentPage - 1) * PAGE_SIZE;
    const words = await getSystemVocabulary({
        sortByStatus: true,
        offset,
        limit: PAGE_SIZE,
        category: activeFilter !== 'all' ? activeFilter : undefined,
        search: activeSearchQuery || undefined,
    });

    window.currentPageWords = words;
    const totalPages = Math.ceil(allWordsCount / PAGE_SIZE);

    const content = buildAddToListModalContent(words, currentPage, totalPages);
    const actions = createActionButtons([
        { id: 'cancel-add-to-list', text: 'Cancelar' },
        { id: 'add-selected-btn', text: 'Adicionar', className: 'btn primary' }
    ]);

    const modalHtml = createLargeModal('add-to-list-modal', 'Adicionar Palavras à Lista', content, actions);
    
    const existingModal = document.getElementById('add-to-list-modal');
    if (existingModal) existingModal.remove();
    
    const modal = createAndShowModal(modalHtml);
    setupAddToListEventListeners(modal);
}

function buildAddToListModalContent(wordsPage, currentPage, totalPages) {
    const searchFilterBar = `
        <div class="search-filter-bar">
            <input type="text" id="modal-search" placeholder="Buscar palavras..." class="search-input" value="${activeSearchQuery}">
            <div class="filter-buttons">
                ${createFilterButtons(activeFilter)}
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

function setupAddToListEventListeners(modal) {
    const selectedWordIds = new Set();
    const addBtn = modal.querySelector('#add-selected-btn');
    const searchInput = modal.querySelector('#modal-search');

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            activeSearchQuery = e.target.value;
            currentPage = 1;
            renderAddToListModal();
        }
    });

    setupPaginationEventListeners(modal);
    setupCheckboxHandlers(modal, selectedWordIds, addBtn);
    setupFilterHandlers(modal);
    setupAddSelectedEventListener(modal, selectedWordIds, addBtn);

    const cancelBtn = modal.querySelector('#cancel-add-to-list');
    cancelBtn.addEventListener('click', () => modal.remove());
}

function setupPaginationEventListeners(modal) {
    const prevBtn = modal.querySelector("#prev-page");
    const nextBtn = modal.querySelector("#next-page");
    
    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                renderAddToListModal();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            const totalPages = Math.ceil(allWordsCount / PAGE_SIZE);
            if (currentPage < totalPages) {
                currentPage++;
                renderAddToListModal();
            }
        });
    }
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

function setupFilterHandlers(modal) {
    modal.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.filter;
            currentPage = 1;
            renderAddToListModal();
        });
    });
}

function setupAddSelectedEventListener(modal, selectedWordIds, addBtn) {
    addBtn.addEventListener('click', async () => {
        if (!selectedWordIds.size) return alert('Selecione palavras para adicionar');
        try {
            await addWordsToList(uiState.currentListId, Array.from(selectedWordIds));
            alert(`${selectedWordIds.size} palavras adicionadas com sucesso!`);
            modal.remove();
            await loadWordListContent(uiState.currentListId);
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

/**
 * Confirm removal of selected words from list
 */
export function confirmRemoveFromList() {
    if (!uiState.currentListId || uiState.selectedWords.length === 0) return;

    const content = createConfirmationContent(
        `Tem certeza que deseja remover ${uiState.selectedWords.length} palavra(s) desta lista?`,
        'Nota: As palavras não serão excluídas do vocabulário, apenas removidas desta lista.'
    );
    
    const actions = createActionButtons([
        { id: 'cancel-remove', text: 'Cancelar' },
        { id: 'confirm-remove', text: 'Remover', className: 'btn danger' }
    ]);

    const modalHtml = createModal('confirm-remove-modal', 'Remover Palavras da Lista', content, actions);
    const modal = createAndShowModal(modalHtml);

    setupRemoveConfirmationEventListeners(modal);
}

function setupRemoveConfirmationEventListeners(modal) {
    const cancelBtn = modal.querySelector('#cancel-remove');
    const confirmBtn = modal.querySelector('#confirm-remove');

    cancelBtn.addEventListener('click', () => modal.remove());
    confirmBtn.addEventListener('click', async () => {
        try {
            await removeWordsFromList(uiState.currentListId, uiState.selectedWords);
            alert(`${uiState.selectedWords.length} palavras removidas com sucesso!`);
            modal.remove();
            uiState.selectedWords = [];
            await loadWordListContent(uiState.currentListId);
        } catch (error) {
            console.error('Error removing words from list:', error);
            alert('Erro ao remover palavras da lista');
        }
    });
}

/**
 * Show modal to edit an existing list
 */
export async function showEditListModal(listId) {
    try {
        const list = await getListById(listId);
        if (!list) throw new Error('List not found');

        const content = createWordListForm(list.name, list.description || '');
        const actions = createActionButtons([
            { id: 'cancel-edit-list', text: 'Cancelar' },
            { id: 'save-list', text: 'Salvar Alterações', className: 'btn primary' }
        ]);

        const modalHtml = createModal('edit-list-modal', 'Editar Lista de Palavras', content, actions);
        const modal = createAndShowModal(modalHtml);

        setupEditListEventListeners(modal, list);
    } catch (error) {
        console.error('Error showing edit list modal:', error);
        alert('Erro ao abrir modal de edição');
    }
}

async function getListById(listId) {
    const db = await initVocabularyDB();
    const tx = db.transaction('wordLists', 'readonly');
    const store = tx.objectStore('wordLists');
    
    return new Promise((resolve, reject) => {
        const request = store.get(listId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function setupEditListEventListeners(modal, list) {
    const cancelBtn = modal.querySelector('#cancel-edit-list');
    const saveBtn = modal.querySelector('#save-list');

    cancelBtn.addEventListener('click', () => modal.remove());
    saveBtn.addEventListener('click', async () => {
        try {
            const name = modal.querySelector('#edit-list-name').value.trim();
            const description = modal.querySelector('#edit-list-description').value.trim();

            if (!name) {
                alert('Por favor, insira um nome para a lista');
                return;
            }

            await updateList(list, name, description);
            alert('Lista atualizada com sucesso!');
            modal.remove();
            await loadWordLists();
            
            if (uiState.currentListId === list.id) {
                await loadWordListContent(list.id);
            }
        } catch (error) {
            console.error('Error updating list:', error);
            alert('Erro ao atualizar lista');
        }
    });
}

async function updateList(list, name, description) {
    const db = await initVocabularyDB();
    const tx = db.transaction('wordLists', 'readwrite');
    const store = tx.objectStore('wordLists');

    const updatedList = {
        ...list,
        name,
        description,
        updatedAt: new Date().toISOString()
    };

    return store.put(updatedList);
}

/**
 * Confirm deletion of a list
 */
export function confirmDeleteList(listId) {
    const content = createConfirmationContent(
        'Tem certeza que deseja excluir esta lista?',
        'Nota: As palavras não serão excluídas do vocabulário, apenas a lista será removida.'
    );
    
    const actions = createActionButtons([
        { id: 'cancel-delete', text: 'Cancelar' },
        { id: 'confirm-delete', text: 'Excluir', className: 'btn danger' }
    ]);

    const modalHtml = createModal('confirm-delete-modal', 'Excluir Lista', content, actions);
    const modal = createAndShowModal(modalHtml);

    setupDeleteConfirmationEventListeners(modal, listId);
}

function setupDeleteConfirmationEventListeners(modal, listId) {
    const cancelBtn = modal.querySelector('#cancel-delete');
    const confirmBtn = modal.querySelector('#confirm-delete');

    cancelBtn.addEventListener('click', () => modal.remove());
    confirmBtn.addEventListener('click', async () => {
        try {
            await deleteList(listId);
            alert('Lista excluída com sucesso!');
            modal.remove();

            if (uiState.currentListId === listId) {
                uiState.currentListId = null;
                showEmptyState();
            }

            await loadWordLists();
        } catch (error) {
            console.error('Error deleting list:', error);
            alert('Erro ao excluir lista');
        }
    });
}

async function deleteList(listId) {
    const db = await initVocabularyDB();
    const tx = db.transaction('wordLists', 'readwrite');
    const store = tx.objectStore('wordLists');

    return new Promise((resolve, reject) => {
        const request = store.delete(listId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Show modal with detailed word information
 */
export async function showWordDetailModal(wordId) {
    try {
        const word = await getWordById(wordId);
        if (!word) throw new Error('Palavra não encontrada');

        const content = createWordDetailContent(word);
        const modalHtml = createModal('word-detail-modal', word.LEXICAL_FORM, content);
        createAndShowModal(modalHtml);
    } catch (error) {
        console.error('Error showing word details:', error);
        alert('Erro ao exibir detalhes da palavra');
    }
}

async function getWordById(wordId) {
    const db = await initVocabularyDB();
    const tx = db.transaction('systemVocabulary', 'readonly');
    const store = tx.objectStore('systemVocabulary');

    return new Promise((resolve, reject) => {
        const request = store.get(wordId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function showEmptyState() {
    // Implementation would be added if needed
}