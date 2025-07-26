/**
 * Modal creation and management for vocabulary system
 */

import { initVocabularyDB } from './vocabulary-db.js';

// Import unified list functions from sync system
import {
    createWordList,
    addWordsToList,
    removeWordsFromList,
    updateWordList,
    deleteWordList
} from './lists/lists-sync.js';

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

// Import system vocabulary from vocabulary module
const { getWordById } = await import('../vocabulary/vocabulary-db.js');

// Word status and categories constants
const WordStatus = {
    UNREAD: 'unread',
    READING: 'reading',
    FAMILIAR: 'familiar',
    MEMORIZED: 'memorized'
};

const WordCategories = {
    NOUN: 'substantivo',
    VERB: 'verbo',
    ADJECTIVE: 'adjetivo',
    ADVERB: 'advérbio',
    PRONOUN: 'pronome',
    PREPOSITION: 'preposição',
    CONJUNCTION: 'conjunção',
    ARTICLE: 'artigo',
    PARTICLE: 'partícula',
    OTHER: 'outro'
};

/**
 * Get word list with words (enhanced version)
 */
async function getWordListWithWords(listId) {
    try {
        const { getWordListWithWords } = await import('./vocabulary-lists.js');
        return await getWordListWithWords(listId);
    } catch (error) {
        console.error('Error getting word list:', error);
        throw error;
    }
}

/**
 * Get system vocabulary with filtering
 */
async function getSystemVocabulary(options = {}) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction('systemVocabulary', 'readonly');
        const store = tx.objectStore('systemVocabulary');

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = async () => {
                let words = request.result || [];
                
                // Add progress to each word
                const { getWordProgress } = await import('./word_progress/word-progress-sync.js');
                for (let word of words) {
                    try {
                        word.progress = await getWordProgress(word.ID);
                    } catch (error) {
                        word.progress = { status: 'unread', reviewCount: 0 };
                    }
                }

                // Apply filters
                if (options.search) {
                    const searchLower = options.search.toLowerCase();
                    words = words.filter(word => 
                        word.LEXICAL_FORM?.toLowerCase().includes(searchLower) ||
                        word.TRANSLITERATED_LEXICAL_FORM?.toLowerCase().includes(searchLower) ||
                        word.DEFINITION?.toLowerCase().includes(searchLower) ||
                        word.USAGE?.toLowerCase().includes(searchLower)
                    );
                }

                if (options.category) {
                    words = words.filter(word => word.PART_OF_SPEECH === options.category);
                }

                resolve(words);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting system vocabulary:', error);
        return [];
    }
}

/**
 * Add vocabulary word to custom vocabulary
 */
async function addVocabularyWord(wordData) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction('vocabularyWords', 'readwrite');
        const store = tx.objectStore('vocabularyWords');
        
        const newWord = {
            id: 'custom_' + Date.now(),
            ...wordData,
            createdAt: new Date().toISOString(),
            progress: { status: 'unread', reviewCount: 0 }
        };
        
        return new Promise((resolve, reject) => {
            const request = store.put(newWord);
            request.onsuccess = () => resolve(newWord);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error adding vocabulary word:', error);
        throw error;
    }
}

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
    const { getWordList } = await import('./lists/lists-sync.js');
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

function showEmptyState() {
    // Implementation would be added if needed
}