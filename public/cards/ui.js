//UI components for vocabulary cards system
import {
    WordStatus,
    WordCategories,
    getAllWordLists,
    getWordListWithWords,
    addWordsToList,
    updateWordProgress,
    getSystemVocabulary,
    addVocabularyWord,
} from './vocabulary.js';

import { showToast } from '../src/js/utils/toast.js';

import {showNewListModal,
    showEditListModal,
    showAddToListModal,
    confirmDeleteList,
    confirmRemoveFromList,
    startPracticeSession,
    showWordDetailModal,
    debounce,
    getStatusLabel
} from './ui_modal.js';

// Current UI state
export const uiState = {
    currentPage: 1,
    currentListId: null,
    currentFilter: null,
    selectedWords: [],
    viewMode: 'list', // 'list' or 'cards'
};

/**
 * Initialize the vocabulary UI
 */
export async function initVocabularyUI() {
    try {
        // Set up tabbed interface
        setupTabs();

        // Load user word lists
        await loadWordLists();

        // Load all vocabulary words for selection
        loadVocabularyWords();

        // Set up event listeners
        setupEventListeners();

        // If there are no lists, show empty state
        const lists = await getAllWordLists();
        if (lists.length === 0) {
            showEmptyState();
        } else {
            // Select the first list by default
            selectWordList(lists[0].id);
        }
    } catch (error) {
        console.error('Error initializing vocabulary UI:', error);
        showToast('Erro ao inicializar o sistema de vocabulário');
    }
}

/**
 * Setup tabbed interface
 */
function setupTabs() {
    const tabsContainer = document.querySelector('.vocabulary-tabs');
    if (!tabsContainer) return;

    const tabs = tabsContainer.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));

            // Add active class to clicked tab
            tab.classList.add('active');

            // Show corresponding content
            const target = tab.getAttribute('data-tab');
            tabContents.forEach(content => {
                if (content.id === target) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // New word list button
    const newListBtn = document.getElementById('new-list-btn');
    if (newListBtn) {
        newListBtn.addEventListener('click', showNewListModal);
    }

    // Add word button
    const addWordBtn = document.getElementById('add-word-btn');
    if (addWordBtn) {
        addWordBtn.addEventListener('click', showAddWordModal);
    }

    // Filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');
            uiState.currentFilter = filter === 'all' ? null : filter;

            // Reload current list with filter
            if (uiState.currentListId) {
                loadVocabularyWords();
            }
        });
    });

    // View mode toggle
    const viewToggleBtn = document.getElementById('view-toggle-btn');
    if (viewToggleBtn) {
        viewToggleBtn.addEventListener('click', toggleViewMode);
    }

    // Search input
    const searchInput = document.getElementById('vocab-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            // Apply search filter to current view

            if (uiState.currentListId) {
                loadVocabularyWords(uiState.currentListId)
            }
        }, 300));
    }
    
}

/**
 * Load user word lists
 */
export async function loadWordLists() {
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
                        selectWordList(listId);
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
                    confirmDeleteList(listId);
                });
            });
        }
    } catch (error) {
        console.error('Error loading word lists:', error);
        showToast('Erro ao carregar listas de palavras');
    }
}

/**
 * Show empty state for no lists
 */
function showEmptyState() {
    const contentArea = document.getElementById('list-content-area');
    if (!contentArea) return;

    contentArea.innerHTML = `
        <div class="empty-state">
            <span class="material-symbols-sharp">inventory_2</span>
            <h3>Nenhuma lista selecionada</h3>
            <p>Selecione uma lista existente ou crie uma nova lista para começar</p>
            <button id="empty-create-list" class="btn primary">Criar lista</button>
        </div>
    `;

    const createListBtn = document.getElementById('empty-create-list');
    if (createListBtn) {
        createListBtn.addEventListener('click', showNewListModal);
    }
}

/**
 * Load all vocabulary words
 */
const WORDS_PER_PAGE = 100;
async function loadVocabularyWords() {
    try {
        const wordsContainer = document.getElementById('all-vocabulary-words');
        if (!wordsContainer) return;

        const searchInput = document.getElementById('vocab-search');
        const searchTerm = searchInput ? searchInput.value : '';

        // Get category filter if any
        const activeFilter = document.querySelector('.filter-btn.active');
        const categoryFilter = activeFilter && activeFilter.getAttribute('data-filter') !== 'all' ?
            activeFilter.getAttribute('data-filter') : null;

        let words = await getSystemVocabulary({
            search: searchTerm,
            category: categoryFilter,
            sortByStatus: true
        });

        if (words.length === 0) {
            wordsContainer.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-sharp">menu_book</span>
                    <p>Nenhuma palavra encontrada</p>
                    <button id="add-first-word" class="btn primary">Adicionar palavra</button>
                </div>
            `;

            const addFirstWordBtn = document.getElementById('add-first-word');
            if (addFirstWordBtn) {
                addFirstWordBtn.addEventListener('click', showAddWordModal);
            }
        } else {
            const totalPages = Math.ceil(words.length / WORDS_PER_PAGE);
            const start = (uiState.currentPage - 1) * WORDS_PER_PAGE;
            const end = start + WORDS_PER_PAGE;
            const currentWords = words.slice(start, end);

            wordsContainer.innerHTML = currentWords.map(word => `
                <div class="vocab-word-item ${word.progress.status}" data-word-id="${word.ID}">
                    <!--<div class="word-checkbox">
                        <input type="checkbox" id="check-${word.ID}" class="word-selector" 
                            data-word-id="${word.ID}" ${uiState.selectedWords.includes(word.ID) ? 'checked' : ''}>
                        <label for="check-${word.ID}"></label>
                    </div>-->
                    <div class="word-info">
                        <div class="greek-word">${word.LEXICAL_FORM}</div>
                        <div class="word-details">
                            <span class="transliteration">${word.TRANSLITERATED_LEXICAL_FORM}</span>
                            <span class="meaning">${word.USAGE || word.DEFINITION}</span>
                        </div>
                        <div class="word-meta">
                            <span class="category-badge">${word.PART_OF_SPEECH || 'não categorizado'}</span>
                            <span class="status-badge ${word.progress.status}">${getStatusLabel(word.progress.status)}</span>
                            ${word.PHONETIC_SPELLING || word.ORIGIN ? `
                            <button class="info-btn" data-word-id="${word.ID}">
                                <span class="material-symbols-sharp">info</span>
                            </button>` : ''}
                        </div>
                    </div>
                </div>
            `).join('');

            // Pagination controls
            const pagination = document.createElement('div');
            pagination.classList.add('pagination-controls');

            for (let i = 1; i <= totalPages; i++) {
                const btn = document.createElement('button');
                btn.textContent = i;
                btn.className = 'pagination-btn' + (i === uiState.currentPage ? ' active' : '');
                btn.addEventListener('click', () => {
                    uiState.currentPage = i;
                    loadVocabularyWords(); // função que contém esse bloco de código
                });
                pagination.appendChild(btn);
            }

            wordsContainer.appendChild(pagination);

            /* // Add checkbox event listeners
            const checkboxes = document.querySelectorAll('.word-selector');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    const wordId = checkbox.getAttribute('data-word-id');
                    if (checkbox.checked) {
                        uiState.selectedWords.push(wordId);
                    } else {
                        uiState.selectedWords = uiState.selectedWords.filter(id => id !== wordId);
                    }
                    updateSelectedWordsUI();
                });
            }); */
        }
    } catch (error) {
        console.error('Error loading vocabulary words:', error);
        showToast('Erro ao carregar palavras do vocabulário');
    }
}

/**
 * Select a word list and show its contents
 */
export async function selectWordList(listId) {
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
        await loadWordListContent(listId);
    } catch (error) {
        console.error('Error selecting word list:', error);
        showToast('Erro ao selecionar lista de palavras');
    }
}

/**
 * Load content of a specific word list
 */
export async function loadWordListContent(listId) {
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
                word.LEXICAL_FORM.toLowerCase().includes(searchTerm) ||
                word.TRANSLITERATED_LEXICAL_FORM.toLowerCase().includes(searchTerm) ||
                word.DEFINITION.toLowerCase().includes(searchTerm)
            );
        }

        if (uiState.currentFilter) {
            filteredWords = filteredWords.filter(word => word.PART_OF_SPEECH === uiState.currentFilter);
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
                    <div class="vocab-card ${word.progress.status}" data-word-id="${word.ID}">
                        <div class="card-front">
                            <div class="greek-word">${word.LEXICAL_FORM}</div>
                            <div class="transliteration">${word.TRANSLITERATED_LEXICAL_FORM}</div>
                            ${word.PHONETIC_SPELLING || word.ORIGIN ? `
                            <button class="info-btn card-info-btn" data-word-id="${word.ID}" data-event="info">
                                <span class="material-symbols-sharp">info</span>
                            </button>` : ''}
                            <div class="card-footer">
                                <span class="category-badge">${word.PART_OF_SPEECH || 'não categorizado'}</span>
                                <span class="flip-hint">Clique para virar</span>
                            </div>
                        </div>
                        <div class="card-back">
                            <div class="meaning">${word.USAGE || word.DEFINITION}</div>
                            <div class="card-actions">
                                <button class="status-btn unread ${word.progress.status === WordStatus.UNREAD ? 'active' : ''}" 
                                    data-word-id="${word.ID}" data-status="${WordStatus.UNREAD}" data-event="status">
                                    <span class="material-symbols-sharp">visibility_off</span>
                                    <span>Não lido</span>
                                </button>
                                <button class="status-btn reading ${word.progress.status === WordStatus.READING ? 'active' : ''}" 
                                    data-word-id="${word.ID}" data-status="${WordStatus.READING}" data-event="status">
                                    <span class="material-symbols-sharp">visibility</span>
                                    <span>Lendo</span>
                                </button>
                                <button class="status-btn familiar ${word.progress.status === WordStatus.FAMILIAR ? 'active' : ''}" 
                                    data-word-id="${word.ID}" data-status="${WordStatus.FAMILIAR}" data-event="status">
                                    <span class="material-symbols-sharp">bookmark</span>
                                    <span>Familiar</span>
                                </button>
                                <button class="status-btn memorized ${word.progress.status === WordStatus.MEMORIZED ? 'active' : ''}" 
                                    data-word-id="${word.ID}" data-status="${WordStatus.MEMORIZED}" data-event="status">
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
                    <div class="vocab-word-item ${word.progress.status}" data-word-id="${word.ID}">
                        <div class="word-checkbox">
                            <input type="checkbox" id="list-check-${word.ID}" class="word-selector" 
                                data-word-id="${word.ID}" ${uiState.selectedWords.includes(word.ID) ? 'checked' : ''}>
                            <label for="list-check-${word.ID}"></label>
                        </div>
                        <div class="word-info">
                            <div class="greek-word">${word.LEXICAL_FORM}</div>
                            <div class="word-details">
                                <span class="transliteration">${word.TRANSLITERATED_LEXICAL_FORM}</span>
                                <span class="meaning">${word.USAGE || word.DEFINITION}</span>
                            </div>
                            <div class="word-meta">
                                <span class="category-badge">${word.PART_OF_SPEECH || 'não categorizado'}</span>
                                <span class="status-badge ${word.progress.status}">${getStatusLabel(word.progress.status)}</span>
                                ${word.PHONETIC_SPELLING || word.ORIGIN ? `
                                <button class="info-btn" data-word-id="${word.ID}">
                                    <span class="material-symbols-sharp">info</span>
                                </button>` : ''}
                            </div>
                        </div>
                        <!--<div class="word-actions">
                            <button class="status-btn unread ${word.progress.status === WordStatus.UNREAD ? 'active' : ''}" 
                                data-word-id="${word.ID}" data-status="${WordStatus.UNREAD}" data-event="status">
                                <span class="material-symbols-sharp">visibility_off</span>
                            </button>
                            <button class="status-btn reading ${word.progress.status === WordStatus.READING ? 'active' : ''}" 
                                data-word-id="${word.ID}" data-status="${WordStatus.READING}" data-event="status">
                                <span class="material-symbols-sharp">visibility</span>
                            </button>
                            <button class="status-btn familiar ${word.progress.status === WordStatus.FAMILIAR ? 'active' : ''}" 
                                data-word-id="${word.ID}" data-status="${WordStatus.FAMILIAR}" data-event="status">
                                <span class="material-symbols-sharp">bookmark</span>
                            </button>
                            <button class="status-btn memorized ${word.progress.status === WordStatus.MEMORIZED ? 'active' : ''}" 
                                data-word-id="${word.ID}" data-status="${WordStatus.MEMORIZED}" data-event="status">
                                <span class="material-symbols-sharp">check_circle</span>
                            </button>
                        </div>-->
                    </div>
                `).join('');
            }
        }

        contentArea.appendChild(wordsContainer);

        // Add event listeners for the new elements
        setupListContentEventListeners();
    } catch (error) {
        console.error('Error loading word list content:', error);
        showToast('Erro ao carregar conteúdo da lista');
    }
}

/**
 * Set up event listeners for list content
 */
function setupListContentEventListeners() {
    // View toggle buttons
    const viewBtns = document.querySelectorAll('.view-toggle .btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.getAttribute('data-view');
            uiState.viewMode = view;

            // Update active state
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Reload list content with new view
            loadWordListContent(uiState.currentListId);
        });
    });

    // Status buttons
    const statusBtns = document.querySelectorAll('.status-btn');
    statusBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const wordId = btn.getAttribute('data-word-id');
            const status = btn.getAttribute('data-status');

            try {
                await updateWordProgress(wordId, { status });

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
                    // Remove all status classes
                    Object.values(WordStatus).forEach(s => {
                        container.classList.remove(s);
                    });
                    // Add new status class
                    container.classList.add(status);
                });

                showToast('Status atualizado');
            } catch (error) {
                console.error('Error updating word status:', error);
                showToast('Erro ao atualizar status');
            }
        });
    });

    // Card flip functionality
    const cards = document.querySelectorAll('.vocab-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
        });
    });

    // Checkboxes for word selection
    const checkboxes = document.querySelectorAll('.word-selector');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const wordId = checkbox.getAttribute('data-word-id');
            if (checkbox.checked) {
                if (!uiState.selectedWords.includes(wordId)) {
                    uiState.selectedWords.push(wordId);
                }
            } else {
                uiState.selectedWords = uiState.selectedWords.filter(id => id !== wordId);
            }
            updateSelectedWordsUI();
        });
    });

    // Add to list button
    const addToListBtn = document.getElementById('add-to-list-btn');
    if (addToListBtn) {
        addToListBtn.addEventListener('click', showAddToListModal);
    }

    // Remove from list button
    const removeFromListBtn = document.getElementById('remove-from-list-btn');
    if (removeFromListBtn) {
        removeFromListBtn.addEventListener('click', () => {
            if (uiState.selectedWords.length > 0) {
                confirmRemoveFromList();
            } else {
                showToast('Selecione palavras para remover');
            }
        });
    }

    // Practice button
    const practiceBtn = document.getElementById('practice-list-btn');
    if (practiceBtn) {
        practiceBtn.addEventListener('click', () => {
            if (uiState.currentListId) {
                startPracticeSession(uiState.currentListId);
            }
        });
    }

    const infoButtons = document.querySelectorAll('.info-btn');
    infoButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card flip or other actions
            const wordId = btn.getAttribute('data-word-id');
            showWordDetailModal(wordId);
        });
    });
}

/**
 * Update UI based on selected words
 */
function updateSelectedWordsUI() {
    const addSelectedBtn = document.getElementById('add-selected-btn');
    const removeSelectedBtn = document.getElementById('remove-from-list-btn');

    if (addSelectedBtn) {
        if (uiState.selectedWords.length > 0) {
            addSelectedBtn.removeAttribute('disabled');
            addSelectedBtn.textContent = `Adicionar (${uiState.selectedWords.length})`;
        } else {
            addSelectedBtn.setAttribute('disabled', 'disabled');
            addSelectedBtn.textContent = 'Adicionar';
        }
    }

    if (removeSelectedBtn) {
        if (uiState.selectedWords.length > 0) {
            removeSelectedBtn.removeAttribute('disabled');
            removeSelectedBtn.textContent = `Remover selecionadas (${uiState.selectedWords.length})`;
        } else {
            removeSelectedBtn.setAttribute('disabled', 'disabled');
            removeSelectedBtn.textContent = 'Remover selecionadas';
        }
    }
}

/**
 * Show modal to add a new word
 */
function showAddWordModal() {
    // Create modal HTML
    const modalHtml = `
        <div class="modal" id="add-word-modal">
            <div class="modal-content">
                <button class="close-modal">&times;</button>
                <h2>Adicionar Nova Palavra</h2>
                
                <div class="form-group">
                    <label for="word-greek">Palavra em Grego</label>
                    <input type="text" id="word-greek" placeholder="Ex: λόγος">
                </div>
                
                <div class="form-group">
                    <label for="word-translit">Transliteração</label>
                    <input type="text" id="word-translit" placeholder="Ex: logos">
                </div>
                
                <div class="form-group">
                    <label for="word-meaning">Significado</label>
                    <input type="text" id="word-meaning" placeholder="Ex: palavra, verbo">
                </div>
                
                <div class="form-group">
                    <label for="word-category">Categoria</label>
                    <select id="word-category">
                        <option value="">Selecione uma categoria</option>
                        ${Object.entries(WordCategories).map(([key, value]) =>
        `<option value="${value}">${value}</option>`
    ).join('')}
                    </select>
                </div>
                
                ${uiState.currentListId ? `
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="add-to-current-list" checked>
                        Adicionar à lista atual
                    </label>
                </div>
                ` : ''}
                
                <div class="modal-actions">
                    <button id="cancel-add-word" class="btn">Cancelar</button>
                    <button id="save-word" class="btn primary">Salvar Palavra</button>
                </div>
            </div>
        </div>
    `;

    // Add to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('add-word-modal');
    const closeBtn = modal.querySelector('.close-modal');
    const cancelBtn = document.getElementById('cancel-add-word');
    const saveBtn = document.getElementById('save-word');

    // Event listeners
    closeBtn.addEventListener('click', () => modal.remove());
    cancelBtn.addEventListener('click', () => modal.remove());
    saveBtn.addEventListener('click', async () => {
        try {
            const grego = document.getElementById('word-greek').value.trim();
            const translit = document.getElementById('word-translit').value.trim();
            const significado = document.getElementById('word-meaning').value.trim();
            const categoria = document.getElementById('word-category').value;

            if (!grego || !translit || !significado) {
                showToast('Por favor, preencha todos os campos obrigatórios');
                return;
            }

            // Add word to vocabulary
            const newWord = await addVocabularyWord({
                grego,
                translit,
                significado,
                categoria,
                source: 'user'
            });

            // Add to current list if checked
            const addToCurrentList = document.getElementById('add-to-current-list');
            if (addToCurrentList && addToCurrentList.checked && uiState.currentListId) {
                await addWordsToList(uiState.currentListId, [newWord.id]);
            }

            showToast('Palavra adicionada com sucesso!');
            modal.remove();

            // Reload vocabulary words
            await loadVocabularyWords();

            // Reload current list if word was added to it
            if (addToCurrentList && addToCurrentList.checked && uiState.currentListId) {
                await loadWordListContent(uiState.currentListId);
            }
        } catch (error) {
            console.error('Error adding word:', error);
            showToast('Erro ao adicionar palavra');
        }
    });

    // Show modal
    modal.style.display = 'flex';
}


// Export functions to global scope for non-module scripts
if (typeof window !== 'undefined') {
    window.vocabularyUI = {
        initVocabularyUI,
        loadWordLists,
        loadVocabularyWords,
        selectWordList,
        //showImportLexiconModal
    };
}