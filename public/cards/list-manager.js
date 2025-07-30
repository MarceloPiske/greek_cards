/**
 * List management functionality for vocabulary cards system
 */

import { 
    getAllWordLists, 
    getWordListWithWords, 
    updateWordProgress, 
    WordStatus 
} from './vocabulary.js';
import { showToast, getStatusLabel } from './ui-utils.js';
import { 
    showNewListModal, 
    showEditListModal, 
    confirmDeleteList, 
    confirmRemoveFromList, 
    showAddToListModal, 
    startPracticeSession 
} from './modals.js';

/**
 * Load user word lists
 */
export async function loadWordLists(uiState) {
    try {
        const listsContainer = document.getElementById('word-lists');
        if (!listsContainer) return;

        const lists = await getAllWordLists();

        if (lists.length === 0) {
            listsContainer.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-sharp">list</span>
                    <p>Você ainda não tem listas de palavras</p>
                    <button id="create-first-list" class="btn primary">Criar primeira lista</button>
                </div>
            `;

            // Add event listener for first list button
            const createFirstListBtn = document.getElementById('create-first-list');
            if (createFirstListBtn) {
                createFirstListBtn.addEventListener('click', showNewListModal);
            }
        } else {
            listsContainer.innerHTML = lists.map(list => `
                <div class="word-list-item" data-list-id="${list.id}">
                    <div class="list-info">
                        <h3>${list.name}</h3>
                        <p>${list.wordIds.length} palavras</p>
                    </div>
                    <div class="list-actions">
                        <button class="btn icon edit-list" data-list-id="${list.id}">
                            <span class="material-symbols-sharp">edit</span>
                        </button>
                        <button class="btn icon delete-list" data-list-id="${list.id}">
                            <span class="material-symbols-sharp">delete</span>
                        </button>
                    </div>
                </div>
            `).join('');

            // Add event listeners to list items
            const listItems = document.querySelectorAll('.word-list-item');
            listItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.list-actions')) {
                        const listId = item.getAttribute('data-list-id');
                        selectWordList(listId, uiState);
                    }
                });
            });

            // Edit list button
            const editBtns = document.querySelectorAll('.edit-list');
            editBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const listId = btn.getAttribute('data-list-id');
                    showEditListModal(listId);
                });
            });

            // Delete list button
            const deleteBtns = document.querySelectorAll('.delete-list');
            deleteBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const listId = btn.getAttribute('data-list-id');
                    confirmDeleteList(listId, uiState);
                });
            });
        }
    } catch (error) {
        console.error('Error loading word lists:', error);
        showToast('Erro ao carregar listas de palavras');
    }
}

/**
 * Select a word list and show its contents
 */
export async function selectWordList(listId, uiState) {
    try {
        // Update UI state
        uiState.currentListId = listId;

        // Highlight selected list
        document.querySelectorAll('.word-list-item').forEach(item => {
            if (item.getAttribute('data-list-id') === listId) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });

        // Load list content
        await loadWordListContent(listId, uiState);
    } catch (error) {
        console.error('Error selecting word list:', error);
        showToast('Erro ao selecionar lista de palavras');
    }
}

/**
 * Load content of a specific word list
 */
export async function loadWordListContent(listId, uiState) {
    try {
        const contentArea = document.getElementById('list-content-area');
        if (!contentArea) return;

        // Show loading state
        contentArea.innerHTML = `
            <div class="loading-state">
                <span class="material-symbols-sharp loading-icon">sync</span>
                <p>Carregando lista...</p>
            </div>
        `;

        // Get list with words
        const list = await getWordListWithWords(listId);

        // Get search term if any
        const searchInput = document.getElementById('vocab-search');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

        // Filter words if needed
        let filteredWords = list.words;

        if (searchTerm) {
            filteredWords = filteredWords.filter(word =>
                word.grego.toLowerCase().includes(searchTerm) ||
                word.translit.toLowerCase().includes(searchTerm) ||
                word.significado.toLowerCase().includes(searchTerm)
            );
        }

        if (uiState.currentFilter) {
            filteredWords = filteredWords.filter(word => word.categoria === uiState.currentFilter);
        }

        // Render list
        contentArea.innerHTML = `
            <div class="list-header">
                <h2>${list.name}</h2>
                <p>${list.description || ''}</p>
                <div class="list-stats">
                    <span>${list.words.length} palavras no total</span>
                    <span>${filteredWords.length} palavras mostradas</span>
                </div>
            </div>
            
            <div class="list-actions-bar">
                <button id="add-to-list-btn" class="btn">
                    <span class="material-symbols-sharp">add</span> Adicionar palavras
                </button>
                <button id="remove-from-list-btn" class="btn">
                    <span class="material-symbols-sharp">remove</span> Remover selecionadas
                </button>
                <button id="practice-list-btn" class="btn primary">
                    <span class="material-symbols-sharp">school</span> Praticar
                </button>
                <div class="view-toggle">
                    <button class="btn icon ${uiState.viewMode === 'list' ? 'active' : ''}" data-view="list">
                        <span class="material-symbols-sharp">view_list</span>
                    </button>
                    <button class="btn icon ${uiState.viewMode === 'cards' ? 'active' : ''}" data-view="cards">
                        <span class="material-symbols-sharp">view_module</span>
                    </button>
                </div>
            </div>
        `;

        // Create content container based on view mode
        const wordsContainer = document.createElement('div');
        wordsContainer.className = uiState.viewMode === 'cards' ? 'words-grid' : 'words-list';
        wordsContainer.id = 'list-words-container';

        if (filteredWords.length === 0) {
            wordsContainer.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-sharp">search_off</span>
                    <p>Nenhuma palavra encontrada com os filtros atuais</p>
                </div>
            `;
        } else {
            // Render words according to view mode
            if (uiState.viewMode === 'cards') {
                wordsContainer.innerHTML = filteredWords.map(word => `
                    <div class="vocab-card ${word.progress.status}" data-word-id="${word.id}">
                        <div class="card-front">
                            <div class="greek-word">${word.grego}</div>
                            <div class="transliteration">${word.translit}</div>
                            <button class="info-btn card-info-btn" data-word-id="${word.id}" data-event="info">
                                <span class="material-symbols-sharp">info</span>
                            </button>
                            <div class="card-footer">
                                <span class="category-badge">${word.categoria || 'não categorizado'}</span>
                                <span class="flip-hint">Clique para virar</span>
                            </div>
                        </div>
                        <div class="card-back">
                            <div class="meaning">${word.significado}</div>
                            <div class="card-actions">
                                <button class="status-btn unread ${word.progress.status === WordStatus.UNREAD ? 'active' : ''}" 
                                    data-word-id="${word.id}" data-status="${WordStatus.UNREAD}" data-event="status">
                                    <span class="material-symbols-sharp">visibility_off</span>
                                    <span>Não lido</span>
                                </button>
                                <button class="status-btn reading ${word.progress.status === WordStatus.READING ? 'active' : ''}" 
                                    data-word-id="${word.id}" data-status="${WordStatus.READING}" data-event="status">
                                    <span class="material-symbols-sharp">visibility</span>
                                    <span>Lendo</span>
                                </button>
                                <button class="status-btn familiar ${word.progress.status === WordStatus.FAMILIAR ? 'active' : ''}" 
                                    data-word-id="${word.id}" data-status="${WordStatus.FAMILIAR}" data-event="status">
                                    <span class="material-symbols-sharp">bookmark</span>
                                    <span>Familiar</span>
                                </button>
                                <button class="status-btn memorized ${word.progress.status === WordStatus.MEMORIZED ? 'active' : ''}" 
                                    data-word-id="${word.id}" data-status="${WordStatus.MEMORIZED}" data-event="status">
                                    <span class="material-symbols-sharp">check_circle</span>
                                    <span>Decorado</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                // List view
                wordsContainer.innerHTML = filteredWords.map(word => `
                    <div class="vocab-word-item ${word.progress.status}" data-word-id="${word.id}">
                        <div class="word-checkbox">
                            <input type="checkbox" id="list-check-${word.id}" class="word-selector" 
                                data-word-id="${word.id}" ${uiState.selectedWords.includes(word.id) ? 'checked' : ''}>
                            <label for="list-check-${word.id}"></label>
                        </div>
                        <div class="word-info">
                            <div class="greek-word">${word.grego}</div>
                            <div class="word-details">
                                <span class="transliteration">${word.translit}</span>
                                <span class="meaning">${word.significado}</span>
                            </div>
                            <div class="word-meta">
                                <span class="category-badge">${word.categoria || 'não categorizado'}</span>
                                <span class="status-badge ${word.progress.status}">${getStatusLabel(word.progress.status)}</span>
                                <button class="info-btn" data-word-id="${word.id}">
                                    <span class="material-symbols-sharp">info</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }

        contentArea.appendChild(wordsContainer);

        // Import functions and setup event listeners
        const { showWordDetailModal } = await import('./modals.js');
        const { setupListContentEventListeners } = await import('./ui.js');
        
        setupListContentEventListeners(listId, uiState);
    } catch (error) {
        console.error('Error loading word list content:', error);
        showToast('Erro ao carregar conteúdo da lista');
    }
}