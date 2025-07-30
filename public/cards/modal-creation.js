/**
 * Modal creation and management for vocabulary system
 */

import {
    WordStatus,
    WordCategories,
    getWordListWithWords,
    getSystemVocabulary,
    initVocabularyDB,
    addVocabularyWord
} from './vocabulary.js';

// Import unified list functions from sync system
import {
    createWordList,
    addWordsToList,
    removeWordsFromList,
    updateWordList,
    deleteWordList
} from '../lists/lists-sync.js';

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
 * Confirm removal of selected words from list
 */
export function confirmRemoveFromList() {
    // This functionality has been moved to lists-words.js
    console.warn('confirmRemoveFromList has been moved to lists module');
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
    // Use unified get function from sync system
    const { getWordList } = await import('../lists/lists-sync.js');
    return await getWordList(listId);
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

            // Use unified update function
            await updateWordList(list.id, { name, description });
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
            // Use unified delete function
            await deleteWordList(listId);
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