/**
 * Word management actions for lists
 * Handles adding/removing words from lists and event management
 */

import {
    addWordsToList,
    removeWordsFromList,
} from './lists-sync.js';

import { getSystemVocabulary } from '../../vocabulary/vocabulary-db.js';
import { 
    renderAddWordsModal, 
    reloadModalData,
} from './lists-words-modal.js';

/**
 * Show modal to add words to a specific list
 */
export async function showAddWordsModal(listId) {
    try {
        const loadingModal = createModal('loading-modal', 'Carregando palavras...', `
            <div class="loading-state">
                <span class="material-symbols-sharp loading-icon">sync</span>
                <p>Por favor, aguarde enquanto carregamos o vocabulário...</p>
            </div>
        `);
        const loadingModalElement = createAndShowModal(loadingModal);
        
        // Load initial data with better performance
        const initialWords = await getSystemVocabulary({
            sortByStatus: true,
            offset: 0,
            limit: 50 // Reduced for better performance
        });
        
        loadingModalElement.remove();
        const modal = await renderAddWordsModal(listId, initialWords, 1, 'all', '');
        setupAddWordsEventListeners(modal, listId, 1, 'all', '');
    } catch (error) {
        console.error('Erro ao exibir modal:', error);
        alert('Erro ao abrir modal de adição de palavras. Verifique se o vocabulário foi carregado corretamente.');
    }
}

/**
 * Setup all event listeners for the add words modal
 */
export function setupAddWordsEventListeners(modal, listId, currentPage, activeFilter, searchQuery) {
    const selectedWordIds = new Set();
    const addBtn = modal.querySelector('#add-selected-words-btn');
    
    setupCheckboxHandlers(modal, selectedWordIds, addBtn);
    setupAddSelectedEventListener(modal, selectedWordIds, addBtn, listId);
    setupFilterEventListeners(modal, listId, currentPage, selectedWordIds);
    setupSearchEventListener(modal, listId, activeFilter, selectedWordIds);
    setupPaginationEventListeners(modal, listId, activeFilter, searchQuery, selectedWordIds);
    setupSelectionControls(modal, selectedWordIds, addBtn);
    setupFilterToggle(modal);

    const cancelBtn = modal.querySelector('#cancel-add-words');
    cancelBtn.addEventListener('click', () => modal.remove());
}

/**
 * Setup filter toggle functionality
 */
function setupFilterToggle(modal) {
    const toggleBtn = modal.querySelector('#toggle-filters');
    const filterContent = modal.querySelector('#search-filter-content');
    const toggleIcon = toggleBtn.querySelector('.material-symbols-sharp');
    
    let isExpanded = false;
    
    toggleBtn.addEventListener('click', () => {
        isExpanded = !isExpanded;
        
        if (isExpanded) {
            filterContent.style.display = 'block';
            toggleIcon.textContent = 'expand_less';
            toggleBtn.classList.add('expanded');
        } else {
            filterContent.style.display = 'none';
            toggleIcon.textContent = 'expand_more';
            toggleBtn.classList.remove('expanded');
        }
    });
    
    // Start collapsed
    filterContent.style.display = 'none';
}

/**
 * Setup filter event listeners
 */
function setupFilterEventListeners(modal, listId, currentPage, selectedWordIds) {
    const filterBtns = modal.querySelectorAll('.filter-chip');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const filter = btn.getAttribute('data-filter');
            const searchQuery = modal.querySelector('#modal-search').value;
            
            // Update active filter visually
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Reload data with new filter
            await reloadModalDataAndSetupHandlers(modal, listId, 1, filter, searchQuery, selectedWordIds);
        });
    });
}

/**
 * Setup search event listener with improved debouncing
 */
function setupSearchEventListener(modal, listId, activeFilter, selectedWordIds) {
    const searchInput = modal.querySelector('#modal-search');
    let searchTimeout;
    
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            const searchQuery = searchInput.value.trim();
            
            // Show loading state immediately
            const wordsContainer = modal.querySelector('#modal-words-container');
            wordsContainer.innerHTML = `
                <div class="loading-words">
                    <span class="material-symbols-sharp loading-icon">sync</span>
                    <p>Buscando palavras...</p>
                </div>
            `;
            
            try {
                await reloadModalDataAndSetupHandlers(modal, listId, 1, activeFilter, searchQuery, selectedWordIds);
            } catch (error) {
                console.error('Search error:', error);
                wordsContainer.innerHTML = `
                    <div class="error-state">
                        <span class="material-symbols-sharp">error</span>
                        <p>Erro na busca. Tente novamente.</p>
                    </div>
                `;
            }
        }, 500); // Increased debounce time for better performance
    });
}

/**
 * Setup pagination event listeners
 */
function setupPaginationEventListeners(modal, listId, activeFilter, searchQuery, selectedWordIds) {
    const prevBtn = modal.querySelector('#prev-page');
    const nextBtn = modal.querySelector('#next-page');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', async () => {
            const currentPage = parseInt(modal.getAttribute('data-current-page') || '1');
            if (currentPage > 1) {
                await reloadModalDataAndSetupHandlers(modal, listId, currentPage - 1, activeFilter, searchQuery, selectedWordIds);
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            const currentPage = parseInt(modal.getAttribute('data-current-page') || '1');
            const totalPages = parseInt(modal.getAttribute('data-total-pages') || '1');
            if (currentPage < totalPages) {
                await reloadModalDataAndSetupHandlers(modal, listId, currentPage + 1, activeFilter, searchQuery, selectedWordIds);
            }
        });
    }
}

/**
 * Setup selection control buttons (select all, clear selection)
 */
function setupSelectionControls(modal, selectedWordIds, addBtn) {
    const selectAllBtn = modal.querySelector('#select-all-btn');
    const clearSelectionBtn = modal.querySelector('#clear-selection-btn');
    
    selectAllBtn.addEventListener('click', () => {
        const checkboxes = modal.querySelectorAll('.word-selector:not([disabled])');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            selectedWordIds.add(checkbox.dataset.wordId);
        });
        updateAddBtn(addBtn, selectedWordIds.size);
    });
    
    clearSelectionBtn.addEventListener('click', () => {
        const checkboxes = modal.querySelectorAll('.word-selector');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        selectedWordIds.clear();
        updateAddBtn(addBtn, selectedWordIds.size);
    });
}

/**
 * Reload modal data and re-setup event handlers
 */
async function reloadModalDataAndSetupHandlers(modal, listId, newPage, filter, searchQuery, selectedWordIds) {
    try {
        await reloadModalData(modal, listId, newPage, filter, searchQuery, selectedWordIds);
        
        // Re-setup checkbox handlers
        const addBtn = modal.querySelector('#add-selected-words-btn');
        setupCheckboxHandlers(modal, selectedWordIds, addBtn);
        setupPaginationEventListeners(modal, listId, filter, searchQuery, selectedWordIds);
        
    } catch (error) {
        console.error('Error reloading modal data and handlers:', error);
    }
}

/**
 * Setup checkbox event handlers
 */
function setupCheckboxHandlers(modal, selectedSet, addBtn) {
    modal.querySelectorAll('.word-selector:not([disabled])').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const wordId = checkbox.dataset.wordId;
            checkbox.checked ? selectedSet.add(wordId) : selectedSet.delete(wordId);
            updateAddBtn(addBtn, selectedSet.size);
        });
    });
}

/**
 * Setup add selected words event listener
 */
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

/**
 * Update add button state based on selection count
 */
function updateAddBtn(button, count) {
    if (count > 0) {
        button.removeAttribute('disabled');
        button.innerHTML = `<span class="material-symbols-sharp">add</span> Adicionar (${count})`;
        button.classList.add('primary');
    } else {
        button.setAttribute('disabled', 'disabled');
        button.innerHTML = `<span class="material-symbols-sharp">add</span> Adicionar`;
        button.classList.remove('primary');
    }
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