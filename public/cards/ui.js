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

// import { showToast } from 'src/js/utils/toast.js';

import {
    showNewListModal,
    showEditListModal,
    showAddToListModal,
    confirmDeleteList,
    confirmRemoveFromList,
    startPracticeSession,
    showWordDetailModal,
    debounce,
    getStatusLabel
} from './ui_modal.js';

import { uiState, updateUIState, resetSelectedWords } from './ui-state.js';
import { 
    setupTabEventListeners,
    setupMainActionListeners,
    setupFilterListeners,
    setupSearchListeners,
    setupWordListEventListeners,
    setupViewToggleListeners,
    setupWordActionListeners,
    setupListContentActionListeners,
    setupPaginationListeners
} from './ui-events.js';
import {
    showLoading,
    showEmpty,
    renderWordLists,
    renderVocabularyWords,
    renderWordListContent,
    markListAsSelected,
    addButtonListener
} from './ui-dom.js';

// Re-export for backward compatibility
export { uiState };

const WORDS_PER_PAGE = 100;

/**
 * Initialize the vocabulary UI
 */
export async function initVocabularyUI() {
    try {
        setupTabs();
        await loadWordLists();
        await loadVocabularyWords();
        setupEventListeners();

        const lists = await getAllWordLists();
        if (lists.length === 0) {
            showEmptyState();
        } else {
            await selectWordList(lists[0].id);
        }
    } catch (error) {
        console.error('Error initializing vocabulary UI:', error);
        // showToast('Erro ao inicializar o sistema de vocabulário');
        alert('Erro ao inicializar o sistema de vocabulário');
    }
}

/**
 * Setup tabbed interface
 */
function setupTabs() {
    setupTabEventListeners();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    setupMainActionListeners();
    setupFilterListeners(() => {
        if (uiState.currentListId) {
            loadVocabularyWords();
        }
    });
    setupSearchListeners(() => {
        if (uiState.currentListId) {
            loadVocabularyWords(uiState.currentListId);
        }
    });
}

/**
 * Load user word lists
 */
export async function loadWordLists() {
    try {
        showLoading('word-lists', 'Carregando listas...');
        const lists = await getAllWordLists();
        renderWordLists(lists, 'word-lists');

        if (lists.length > 0) {
            setupWordListEventListeners(selectWordList);
        } else {
            // Add event listener for first list button when no lists exist
            addButtonListener('create-first-list', showNewListModal);
        }
    } catch (error) {
        console.error('Error loading word lists:', error);
        // showToast('Erro ao carregar listas de palavras');
        alert('Erro ao carregar listas de palavras');
    }
}

/**
 * Show empty state for no lists
 */
function showEmptyState() {
    showEmpty(
        'list-content-area',
        'inventory_2',
        'Nenhuma lista selecionada',
        'Selecione uma lista existente ou crie uma nova lista para começar',
        { id: 'empty-create-list', text: 'Criar lista' }
    );

    addButtonListener('empty-create-list', showNewListModal);
}

/**
 * Load all vocabulary words
 */
async function loadVocabularyWords() {
    try {
        showLoading('all-vocabulary-words', 'Carregando vocabulário...');

        const searchInput = document.getElementById('vocab-search');
        const searchTerm = searchInput ? searchInput.value : '';

        const activeFilter = document.querySelector('.filter-btn.active');
        const categoryFilter = activeFilter && activeFilter.getAttribute('data-filter') !== 'all' ?
            activeFilter.getAttribute('data-filter') : null;

        let words = await getSystemVocabulary({
            search: searchTerm,
            category: categoryFilter,
            sortByStatus: true
        });

        const totalPages = Math.ceil(words.length / WORDS_PER_PAGE);
        const start = (uiState.currentPage - 1) * WORDS_PER_PAGE;
        const end = start + WORDS_PER_PAGE;
        const currentWords = words.slice(start, end);

        renderVocabularyWords(currentWords, 'all-vocabulary-words', uiState.currentPage, totalPages);

        // Setup pagination
        setupPaginationListeners((page) => {
            updateUIState({ currentPage: page });
            loadVocabularyWords();
        });

        // Add event listener for first word button if no words exist
        addButtonListener('add-first-word', showAddWordModal);
    } catch (error) {
        console.error('Error loading vocabulary words:', error);
        // showToast('Erro ao carregar palavras do vocabulário');
        alert('Erro ao carregar palavras do vocabulário');
    }
}

/**
 * Select a word list and show its contents
 */
export async function selectWordList(listId) {
    try {
        updateUIState({ currentListId: listId });
        markListAsSelected(listId);
        await loadWordListContent(listId);
    } catch (error) {
        console.error('Error selecting word list:', error);
        // showToast('Erro ao selecionar lista de palavras');
        alert('Erro ao selecionar lista de palavras');
    }
}

/**
 * Load content of a specific word list
 */
export async function loadWordListContent(listId) {
    try {
        showLoading('list-content-area', 'Carregando lista...');

        const list = await getWordListWithWords(listId);
        let filteredWords = applyFilters(list.words || []);

        renderWordListContent(list, filteredWords, uiState.viewMode, 'list-content-area');
        setupListContentEventListeners();
    } catch (error) {
        console.error('Error loading word list content:', error);
        // showToast('Erro ao carregar conteúdo da lista');
        alert('Erro ao carregar conteúdo da lista');
    }
}

/**
 * Apply current filters to words
 */
function applyFilters(words) {
    let filteredWords = words;

    // Apply search filter
    const searchInput = document.getElementById('vocab-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    if (searchTerm) {
        filteredWords = filteredWords.filter(word =>
            word.LEXICAL_FORM.toLowerCase().includes(searchTerm) ||
            word.TRANSLITERATED_LEXICAL_FORM.toLowerCase().includes(searchTerm) ||
            word.DEFINITION.toLowerCase().includes(searchTerm)
        );
    }

    // Apply category filter
    if (uiState.currentFilter) {
        filteredWords = filteredWords.filter(word => word.PART_OF_SPEECH === uiState.currentFilter);
    }

    return filteredWords;
}

/**
 * Set up event listeners for list content
 */
function setupListContentEventListeners() {
    setupViewToggleListeners((view) => {
        loadWordListContent(uiState.currentListId);
    });
    
    setupWordActionListeners();
    setupListContentActionListeners();
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
                // showToast('Por favor, preencha todos os campos obrigatórios');
                alert('Por favor, preencha todos os campos obrigatórios');
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

            // showToast('Palavra adicionada com sucesso!');
            alert('Palavra adicionada com sucesso!');
            modal.remove();

            // Reload vocabulary words
            await loadVocabularyWords();

            // Reload current list if word was added to it
            if (addToCurrentList && addToCurrentList.checked && uiState.currentListId) {
                await loadWordListContent(uiState.currentListId);
            }
        } catch (error) {
            console.error('Error adding word:', error);
            // showToast('Erro ao adicionar palavra');
            alert('Erro ao adicionar palavra');
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
    };
}