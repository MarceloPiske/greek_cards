import { showToast } from '../src/js/utils/toast.js';
import {
    WordStatus,
    WordCategories,
    getWordListWithWords,
    addWordsToList,
    removeWordsFromList,
    updateWordProgress,
    getSystemVocabulary,
    initVocabularyDB,
    createWordList
} from './vocabulary.js';

import { uiState, loadWordLists, selectWordList, loadWordListContent } from './ui.js'

const STORE_VOCABULARY = 'systemVocabulary';
/**
 * Show modal to create a new word list
 */
export function showNewListModal() {
    // Create modal HTML
    const modalHtml = `
        <div class="modal" id="new-list-modal">
            <div class="modal-content">
                <button class="close-modal">&times;</button>
                <h2>Nova Lista de Palavras</h2>
                
                <div class="form-group">
                    <label for="list-name">Nome da Lista</label>
                    <input type="text" id="list-name" placeholder="Ex: Vocabulário básico">
                </div>
                
                <div class="form-group">
                    <label for="list-description">Descrição (opcional)</label>
                    <textarea id="list-description" placeholder="Descreva o propósito desta lista"></textarea>
                </div>
                
                <div class="modal-actions">
                    <button id="cancel-new-list" class="btn">Cancelar</button>
                    <button id="create-list" class="btn primary">Criar Lista</button>
                </div>
            </div>
        </div>
    `;

    // Add to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('new-list-modal');
    const closeBtn = modal.querySelector('.close-modal');
    const cancelBtn = document.getElementById('cancel-new-list');
    const createBtn = document.getElementById('create-list');

    // Event listeners
    closeBtn.addEventListener('click', () => modal.remove());
    cancelBtn.addEventListener('click', () => modal.remove());
    createBtn.addEventListener('click', async () => {
        try {
            const name = document.getElementById('list-name').value.trim();
            const description = document.getElementById('list-description').value.trim();

            if (!name) {
                showToast('Por favor, insira um nome para a lista');
                return;
            }

            const newList = await createWordList({
                name,
                description,
                wordIds: []
            });

            showToast('Lista criada com sucesso!');
            modal.remove();

            // Reload lists and select the new one
            await loadWordLists();
            selectWordList(newList.id);
        } catch (error) {
            console.error('Error creating list:', error);
            showToast('Erro ao criar lista');
        }
    });

    // Show modal
    modal.style.display = 'flex';
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
        const loadingModal = document.createElement('div');
        loadingModal.id = 'loading-modal';
        loadingModal.className = 'modal';
        loadingModal.innerHTML = `  
            <div class="modal-content">
                <button class="close-modal">&times;</button>
                <h2>Carregando palavras...</h2>
                <div class="loading-state">
                    <span class="material-symbols-sharp loading-icon">sync</span>
                    <p>Por favor, aguarde</p>
                </div>
            </div>
        `;
        document.body.appendChild(loadingModal);
        loadingModal.style.display = 'flex';

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

        // Simula total de palavras filtradas (opcional: adaptar para obter um count real)
        allWordsCount = 5523; // Se quiser estimar, ou adaptar getSystemVocabulary para retornar total
        window.currentPageWords = pageData;

        loadingModal.remove();
        renderModal();

    } catch (error) {
        console.error('Erro ao exibir modal:', error);
        showToast('Erro ao abrir modal de adição');
    }
}

async function renderModal() {
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

    const modal = document.getElementById('add-to-list-modal') || document.createElement('div');
    modal.className = 'modal';
    modal.id = 'add-to-list-modal';
    modal.innerHTML = buildModalContent(words, currentPage, totalPages);

    if (!document.body.contains(modal)) {
        document.body.appendChild(modal);
    }

    modal.querySelector("#prev-page")?.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderModal();
        }
    });

    modal.querySelector("#next-page")?.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderModal();
        }
    });

    const selectedWordIds = new Set();
    const modalWordsContainer = modal.querySelector('#modal-words-container');
    const addBtn = modal.querySelector('#add-selected-btn');
    const searchInput = modal.querySelector('#modal-search');

    searchInput.value = activeSearchQuery;
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            activeSearchQuery = e.target.value;
            currentPage = 1;
            renderModal();
        }
    });

    setupCheckboxHandlers(modal, selectedWordIds, addBtn);
    setupFilterHandlers(modalWordsContainer, modal, (newFilter) => {
        activeFilter = newFilter;
        currentPage = 1;
        renderModal(); // Recarrega com novo filtro
    });
    setupModalActions(modal, selectedWordIds, addBtn);

    modal.querySelector('.close-modal')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#cancel-add-to-list')?.addEventListener('click', () => modal.remove());

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', activeFilter === btn.dataset.filter);
    });

    modal.style.display = 'flex';
}

export function setupFilterHandlers(container, modal, onFilterChange) {
    modal.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            if (typeof onFilterChange === 'function') {
                onFilterChange(filter);
            }
        });
    });
}

export function buildModalContent(wordsPage, currentPage = 1, totalPages = 1) {
    const filtersHtml = `
        <button class="filter-btn ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">Todos</button>
        ${Object.values(WordCategories).map(c => `
            <button class="filter-btn ${activeFilter === c ? 'active' : ''}" data-filter="${c}">${c}</button>
        `).join('')}
    `;

    const wordsHtml = wordsPage.map(word => `
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
        </div>`).join('');

    const paginationHtml = `
        <div class="pagination-controls">
            <button class="pagination-btn" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
            <span>Página ${currentPage} de ${totalPages}</span>
            <button class="pagination-btn" id="next-page" ${currentPage === totalPages ? 'disabled' : ''}>Próxima</button>
        </div>`;

    return `
        <div class="modal-content large">
            <button class="close-modal">&times;</button>
            <h2>Adicionar Palavras à Lista</h2>
            <div class="search-filter-bar">
                <input type="text" id="modal-search" placeholder="Buscar palavras..." class="search-input" value="${activeSearchQuery}">
                <div class="filter-buttons">
                    ${filtersHtml}
                </div>
            </div>
            <div class="words-selection">
                <div class="words-container" id="modal-words-container">${wordsHtml}</div>
            </div>
            ${paginationHtml}
            <div class="modal-actions">
                <button id="cancel-add-to-list" class="btn">Cancelar</button>
                <button id="add-selected-btn" class="btn primary" disabled>Adicionar</button>
            </div>
        </div>`;
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

function updateAddBtn(button, count) {
    if (count > 0) {
        button.removeAttribute('disabled');
        button.textContent = `Adicionar (${count})`;
    } else {
        button.setAttribute('disabled', 'disabled');
        button.textContent = 'Adicionar';
    }
}

function setupModalActions(modal, selectedWordIds, addBtn) {
    addBtn.addEventListener('click', async () => {
        if (!selectedWordIds.size) return showToast('Selecione palavras para adicionar');
        try {
            await addWordsToList(uiState.currentListId, Array.from(selectedWordIds));
            showToast(`${selectedWordIds.size} palavras adicionadas com sucesso!`);
            modal.remove();
            await loadWordListContent(uiState.currentListId);
        } catch (error) {
            console.error(error);
            showToast('Erro ao adicionar palavras à lista');
        }
    });
}

/**
 * Confirm removal of selected words from list
 */
export function confirmRemoveFromList() {
    if (!uiState.currentListId || uiState.selectedWords.length === 0) return;

    // Create modal HTML
    const modalHtml = `
        <div class="modal" id="confirm-remove-modal">
            <div class="modal-content">
                <button class="close-modal">&times;</button>
                <h2>Remover Palavras da Lista</h2>
                
                <p>Tem certeza que deseja remover ${uiState.selectedWords.length} palavra(s) desta lista?</p>
                <p class="note">Nota: As palavras não serão excluídas do vocabulário, apenas removidas desta lista.</p>
                
                <div class="modal-actions">
                    <button id="cancel-remove" class="btn">Cancelar</button>
                    <button id="confirm-remove" class="btn danger">Remover</button>
                </div>
            </div>
        </div>
    `;

    // Add to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('confirm-remove-modal');
    const closeBtn = modal.querySelector('.close-modal');
    const cancelBtn = document.getElementById('cancel-remove');
    const confirmBtn = document.getElementById('confirm-remove');

    // Event listeners
    closeBtn.addEventListener('click', () => modal.remove());
    cancelBtn.addEventListener('click', () => modal.remove());
    confirmBtn.addEventListener('click', async () => {
        try {
            await removeWordsFromList(uiState.currentListId, uiState.selectedWords);
            showToast(`${uiState.selectedWords.length} palavras removidas com sucesso!`);
            modal.remove();

            // Clear selected words
            uiState.selectedWords = [];

            // Reload current list
            await loadWordListContent(uiState.currentListId);
        } catch (error) {
            console.error('Error removing words from list:', error);
            showToast('Erro ao remover palavras da lista');
        }
    });

    // Show modal
    modal.style.display = 'flex';
}

/**
 * Show modal to edit an existing list
 */
export async function showEditListModal(listId) {
    try {
        // Get list details
        const db = await initVocabularyDB();
        const tx = db.transaction('wordLists', 'readonly');
        const store = tx.objectStore('wordLists');
        const list = await new Promise((resolve, reject) => {
            const request = store.get(listId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (!list) {
            throw new Error('List not found');
        }

        // Create modal HTML
        const modalHtml = `
            <div class="modal" id="edit-list-modal">
                <div class="modal-content">
                    <button class="close-modal">&times;</button>
                    <h2>Editar Lista de Palavras</h2>
                    
                    <div class="form-group">
                        <label for="edit-list-name">Nome da Lista</label>
                        <input type="text" id="edit-list-name" value="${list.name}">
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-list-description">Descrição (opcional)</label>
                        <textarea id="edit-list-description">${list.description || ''}</textarea>
                    </div>
                    
                    <div class="modal-actions">
                        <button id="cancel-edit-list" class="btn">Cancelar</button>
                        <button id="save-list" class="btn primary">Salvar Alterações</button>
                    </div>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('edit-list-modal');
        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = document.getElementById('cancel-edit-list');
        const saveBtn = document.getElementById('save-list');

        // Event listeners
        closeBtn.addEventListener('click', () => modal.remove());
        cancelBtn.addEventListener('click', () => modal.remove());
        saveBtn.addEventListener('click', async () => {
            try {
                const name = document.getElementById('edit-list-name').value.trim();
                const description = document.getElementById('edit-list-description').value.trim();

                if (!name) {
                    showToast('Por favor, insira um nome para a lista');
                    return;
                }

                // Update list
                const tx = db.transaction('wordLists', 'readwrite');
                const store = tx.objectStore('wordLists');

                const updatedList = {
                    ...list,
                    name,
                    description,
                    updatedAt: new Date().toISOString()
                };

                await store.put(updatedList);

                showToast('Lista atualizada com sucesso!');
                modal.remove();

                // Reload lists and current list content
                await loadWordLists();
                if (uiState.currentListId === listId) {
                    await loadWordListContent(listId);
                }
            } catch (error) {
                console.error('Error updating list:', error);
                showToast('Erro ao atualizar lista');
            }
        });

        // Show modal
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error showing edit list modal:', error);
        showToast('Erro ao abrir modal de edição');
    }
}

/**
 * Confirm deletion of a list
 */
export function confirmDeleteList(listId) {
    // Create modal HTML
    const modalHtml = `
        <div class="modal" id="confirm-delete-modal">
            <div class="modal-content">
                <button class="close-modal">&times;</button>
                <h2>Excluir Lista</h2>
                
                <p>Tem certeza que deseja excluir esta lista?</p>
                <p class="note">Nota: As palavras não serão excluídas do vocabulário, apenas a lista será removida.</p>
                
                <div class="modal-actions">
                    <button id="cancel-delete" class="btn">Cancelar</button>
                    <button id="confirm-delete" class="btn danger">Excluir</button>
                </div>
            </div>
        </div>
    `;

    // Add to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('confirm-delete-modal');
    const closeBtn = modal.querySelector('.close-modal');
    const cancelBtn = document.getElementById('cancel-delete');
    const confirmBtn = document.getElementById('confirm-delete');

    // Event listeners
    closeBtn.addEventListener('click', () => modal.remove());
    cancelBtn.addEventListener('click', () => modal.remove());
    confirmBtn.addEventListener('click', async () => {
        try {
            // Delete list
            const db = await initVocabularyDB();
            const tx = db.transaction('wordLists', 'readwrite');
            const store = tx.objectStore('wordLists');

            await new Promise((resolve, reject) => {
                const request = store.delete(listId);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            showToast('Lista excluída com sucesso!');
            modal.remove();

            // Reset current list if it was the deleted one
            if (uiState.currentListId === listId) {
                uiState.currentListId = null;
                showEmptyState();
            }

            // Reload lists
            await loadWordLists();
        } catch (error) {
            console.error('Error deleting list:', error);
            showToast('Erro ao excluir lista');
        }
    });

    // Show modal
    modal.style.display = 'flex';
}

/**
 * Start a practice session with a list
 */
export async function startPracticeSession(listId) {
    try {
        const list = await getWordListWithWords(listId);

        if (list.words.length === 0) {
            showToast('Esta lista não contém palavras para praticar');
            return;
        }

        // Create practice session modal
        const modalHtml = `
            <div class="modal fullscreen" id="practice-modal">
                <div class="practice-container">
                    <div class="practice-header">
                        <h2>Praticar: ${list.name}</h2>
                        <button class="close-practice">&times;</button>
                    </div>
                    
                    <div class="practice-status">
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: 0%"></div>
                        </div>
                        <div class="progress-text">
                            <span id="current-card">1</span>/<span id="total-cards">${list.words.length}</span>
                        </div>
                    </div>
                    
                    <div class="card-container" id="practice-card-container">
                        <!-- Cards will be dynamically inserted here -->
                    </div>
                    
                    <div class="practice-controls">
                        <button id="prev-card" class="btn icon" disabled>
                            <span class="material-symbols-sharp">chevron_left</span>
                        </button>
                        <div class="status-controls">
                            <button class="status-btn unread" data-status="${WordStatus.UNREAD}">
                                <span class="material-symbols-sharp">visibility_off</span>
                                <span>Não lido</span>
                            </button>
                            <button class="status-btn reading" data-status="${WordStatus.READING}">
                                <span class="material-symbols-sharp">visibility</span>
                                <span>Lendo</span>
                            </button>
                            <button class="status-btn familiar" data-status="${WordStatus.FAMILIAR}">
                                <span class="material-symbols-sharp">bookmark</span>
                                <span>Familiar</span>
                            </button>
                            <button class="status-btn memorized" data-status="${WordStatus.MEMORIZED}">
                                <span class="material-symbols-sharp">check_circle</span>
                                <span>Decorado</span>
                            </button>
                        </div>
                        <button id="next-card" class="btn icon">
                            <span class="material-symbols-sharp">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('practice-modal');
        const closeBtn = modal.querySelector('.close-practice');
        const prevBtn = document.getElementById('prev-card');
        const nextBtn = document.getElementById('next-card');
        const cardContainer = document.getElementById('practice-card-container');
        const progressBar = modal.querySelector('.progress-bar');
        const currentCardText = document.getElementById('current-card');

        // Current card index
        let currentIndex = 0;
        const words = list.words;

        // Function to render current card
        const renderCard = (index) => {
            const word = words[index];

            cardContainer.innerHTML = `
                <div class="practice-card ${word.progress.status}" data-word-id="${word.ID}">
                    <div class="card-front">
                        <div class="greek-word">${word.LEXICAL_FORM}</div>
                        <div class="transliteration">${word.TRANSLITERATED_LEXICAL_FORM}</div>
                        ${word.PHONETIC_SPELLING || word.ORIGIN || word.definicaoCompleta ? `
                        <button class="info-btn card-info-btn practice-info-btn" data-word-id="${word.ID}">
                            <span class="material-symbols-sharp">info</span>
                        </button>` : ''}
                        <div class="card-footer">
                            <span class="category-badge">${word.PART_OF_SPEECH || 'não categorizado'}</span>
                            <span class="flip-hint">Clique para ver o significado</span>
                        </div>
                    </div>
                    <div class="card-back">
                        <div class="meaning">${word.USAGE || word.DEFINITION}</div>
                        ${word.PART_OF_SPEECH ? `<div class="category">${word.PART_OF_SPEECH}</div>` : ''}
                    </div>
                </div>
            `;

            // Card flip functionality
            const card = cardContainer.querySelector('.practice-card');
            card.addEventListener('click', (e) => {
                // Don't flip if clicking on the info button
                if (!e.target.closest('.info-btn')) {
                    card.classList.toggle('flipped');
                }
            });

            // Info button listener
            const infoBtn = cardContainer.querySelector('.practice-info-btn');
            if (infoBtn) {
                infoBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showWordDetailModal(word.ID);
                });
            }

            // Update progress indicator
            currentCardText.textContent = index + 1;
            progressBar.style.width = `${((index + 1) / words.length) * 100}%`;

            // Update navigation buttons
            prevBtn.disabled = index === 0;
            nextBtn.disabled = index === words.length - 1;

            // Update status buttons
            const statusBtns = modal.querySelectorAll('.status-btn');
            statusBtns.forEach(btn => {
                const status = btn.getAttribute('data-status');
                if (status === word.progress.status) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        };

        // Render first card
        renderCard(currentIndex);

        // Event listeners
        closeBtn.addEventListener('click', () => modal.remove());

        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                renderCard(currentIndex);
            }
        });

        nextBtn.addEventListener('click', () => {
            if (currentIndex < words.length - 1) {
                currentIndex++;
                renderCard(currentIndex);
            }
        });

        // Status buttons
        const statusBtns = modal.querySelectorAll('.status-btn');
        statusBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const status = btn.getAttribute('data-status');
                const wordId = cardContainer.querySelector('.practice-card').getAttribute('data-word-id');

                try {
                    await updateWordProgress(wordId, { status });

                    // Update card status
                    const card = cardContainer.querySelector('.practice-card');

                    // Remove all status classes
                    Object.values(WordStatus).forEach(s => {
                        card.classList.remove(s);
                    });
                    // Add new status class
                    card.classList.add(status);

                    // Update button active state
                    statusBtns.forEach(b => {
                        b.classList.remove('active');
                    });
                    btn.classList.add('active');

                    // Also update the status in our words array
                    words[currentIndex].progress.status = status;

                    // Automatically go to next card if not the last one
                    if (currentIndex < words.length - 1) {
                        setTimeout(() => {
                            currentIndex++;
                            renderCard(currentIndex);
                        }, 500);
                    }
                } catch (error) {
                    console.error('Error updating word status:', error);
                    showToast('Erro ao atualizar status');
                }
            });
        });

        // Keyboard navigation
        document.addEventListener('keydown', function cardNavHandler(e) {
            if (modal.style.display !== 'none') {
                if (e.key === 'ArrowLeft' && !prevBtn.disabled) {
                    prevBtn.click();
                } else if (e.key === 'ArrowRight' && !nextBtn.disabled) {
                    nextBtn.click();
                } else if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', cardNavHandler);
                } else if (e.key === ' ' || e.key === 'Enter') {
                    // Flip card on space or enter
                    const card = cardContainer.querySelector('.practice-card');
                    card.classList.toggle('flipped');
                } else if (e.key >= '1' && e.key <= '4') {
                    // Number keys for status
                    const index = parseInt(e.key) - 1;
                    if (index >= 0 && index < statusBtns.length) {
                        statusBtns[index].click();
                    }
                }
            }
        });

        // Show modal
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error starting practice session:', error);
        showToast('Erro ao iniciar sessão de prática');
    }
}

/**
 * Toggle between list and card view
 */
export function toggleViewMode() {
    uiState.viewMode = uiState.viewMode === 'list' ? 'cards' : 'list';

    // Reload current list with new view mode
    if (uiState.currentListId) {
        loadWordListContent(uiState.currentListId);
    }
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status) {
    switch (status) {
        case WordStatus.UNREAD:
            return 'Não lido';
        case WordStatus.READING:
            return 'Lendo';
        case WordStatus.FAMILIAR:
            return 'Familiar';
        case WordStatus.MEMORIZED:
            return 'Decorado';
        default:
            return 'Desconhecido';
    }
}

/**
 * Simple debounce function
 */
export function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Show modal with detailed word information
 */
export async function showWordDetailModal(wordId) {
    try {
        // Get the word from the database
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_VOCABULARY, 'readonly');
        const store = tx.objectStore(STORE_VOCABULARY);

        //const word = await store.get(wordId);
        const word = await new Promise((resolve, reject) => {
            const request = store.get(wordId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        if (!word) {
            throw new Error('Palavra não encontrada');
        }

        // Create modal HTML
        const modalHtml = `
            <div class="modal" id="word-detail-modal">
                <div class="modal-content">
                    <button class="close-modal">&times;</button>
                    <h2>${word.LEXICAL_FORM}</h2>
                    
                    <div class="word-detail-section">
                        <div class="detail-row">
                            <div class="detail-label">Transliteração:</div>
                            <div class="detail-value">${word.TRANSLITERATED_LEXICAL_FORM || '-'}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Classe gramatical:</div>
                            <div class="detail-value">${word.PART_OF_SPEECH || '-'}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Pronúncia:</div>
                            <div class="detail-value">${word.PHONETIC_SPELLING || '-'}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Uso:</div>
                            <div class="detail-value">${word.USAGE || '-'}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Definição:</div>
                            <div class="detail-value">${word.definicaoCompleta || word.DEFINITION || '-'}</div>
                        </div>
                        ${word.ORIGIN ? `
                        <div class="detail-row">
                            <div class="detail-label">Origem:</div>
                            <div class="detail-value">${word.ORIGIN}</div>
                        </div>` : ''}
                    </div>
                    
                    <div class="word-detail-footer">
                        <div class="status-label">Status: <span class="${word.progress?.status || WordStatus.UNREAD}">${getStatusLabel(word.progress?.status || WordStatus.UNREAD)}</span></div>
                    </div>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('word-detail-modal');
        const closeBtn = modal.querySelector('.close-modal');

        // Event listeners
        closeBtn.addEventListener('click', () => modal.remove());

        // Show modal
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error showing word details:', error);
        showToast('Erro ao exibir detalhes da palavra');
    }
}