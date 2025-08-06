/**
 * Modal UI components for word management in lists
 * Handles the creation and rendering of modals for adding/removing words
 */

import { getSystemVocabulary } from '../../vocabulary/vocabulary-db.js?v=1.1';

/**
 * Render the add words modal with current data
 */
export async function renderAddWordsModal(listId, words, currentPage, activeFilter, searchQuery) {
    const PAGE_SIZE = 50; // Reduced page size for better performance
    const totalWords = 5523; // Approximate total
    const totalPages = Math.ceil(totalWords / PAGE_SIZE);

    const content = buildAddWordsModalContent(words, currentPage, totalPages, activeFilter, searchQuery);
    
    const modalHtml = createLargeModalWithHeaderActions('add-words-modal', 'Adicionar Palavras à Lista', content);
    
    const existingModal = document.getElementById('add-words-modal');
    if (existingModal) existingModal.remove();
    
    const modal = createAndShowModal(modalHtml);
    return modal;
}

/**
 * Build the content structure for add words modal
 */
export function buildAddWordsModalContent(wordsPage, currentPage, totalPages, activeFilter, searchQuery) {
    const searchFilterBar = `
        <div class="modal-search-section" id="search-filter-section">
            <div class="search-filter-toggle">
                <button class="toggle-filters-btn" id="toggle-filters">
                    <span class="material-symbols-sharp">expand_more</span>
                    <span>Filtros e Busca</span>
                </button>
            </div>
            <div class="search-filter-content" id="search-filter-content">
                <div class="search-container">
                    <span class="material-symbols-sharp search-icon">search</span>
                    <input type="text" id="modal-search" placeholder="Buscar palavras..." class="modal-search-input" value="${searchQuery}">
                </div>
                <div class="filter-section">
                    <h4>Filtrar por categoria:</h4>
                    <div class="filter-buttons-grid">
                        ${createFilterButtons(activeFilter)}
                    </div>
                </div>
            </div>
        </div>
    `;

    const wordsContainer = `
        <div class="words-selection-section">
            <div class="selection-header">
                <h4>Selecione as palavras (página ${currentPage} de ${totalPages})</h4>
                <div class="selection-controls">
                    <button id="select-all-btn" class="btn secondary">Selecionar Todas</button>
                    <button id="clear-selection-btn" class="btn secondary">Limpar Seleção</button>
                </div>
            </div>
            <div class="words-grid-container" id="modal-words-container">
                ${wordsPage.map(createWordSelectionItem).join('')}
            </div>
        </div>
    `;

    const pagination = createPaginationControls(currentPage, totalPages);

    return searchFilterBar + wordsContainer + pagination;
}

/**
 * Create individual word selection item
 */
export function createWordSelectionItem(word) {
    return `
        <div class="word-selection-card" data-word-id="${word.ID}" data-category="${word.PART_OF_SPEECH}">
            <div class="word-selection-checkbox">
                <input type="checkbox" id="modal-check-${word.ID}" class="word-selector" data-word-id="${word.ID}">
                <label for="modal-check-${word.ID}"></label>
            </div>
            <div class="word-selection-content">
                <div class="greek-word">${word.LEXICAL_FORM}</div>
                <div class="transliteration">${word.TRANSLITERATED_LEXICAL_FORM || ''}</div>
                <div class="meaning">${word.USAGE || word.DEFINITION || ''}</div>
                <div class="word-category">
                    <span class="category-tag">${word.PART_OF_SPEECH || 'não categorizado'}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Create filter buttons for categories
 */
export function createFilterButtons(activeFilter = 'all') {
    const filters = [
        { key: 'all', label: 'Todos', icon: 'select_all' },
        { key: 'substantivo', label: 'Substantivos', icon: 'label' },
        { key: 'verbo', label: 'Verbos', icon: 'play_arrow' },
        { key: 'adjetivo', label: 'Adjetivos', icon: 'palette' },
        { key: 'advérbio', label: 'Advérbios', icon: 'speed' },
        { key: 'pronome', label: 'Pronomes', icon: 'person' },
        { key: 'preposição', label: 'Preposições', icon: 'compare_arrows' },
        { key: 'conjunção', label: 'Conjunções', icon: 'link' },
        { key: 'artigo', label: 'Artigos', icon: 'article' },
        { key: 'partícula', label: 'Partículas', icon: 'grain' },
        { key: 'outro', label: 'Outros', icon: 'more_horiz' }
    ];

    return filters.map(({ key, label, icon }) => 
        `<button class="filter-chip ${activeFilter === key ? 'active' : ''}" data-filter="${key}">
            <span class="material-symbols-sharp">${icon}</span>
            <span>${label}</span>
        </button>`
    ).join('');
}

/**
 * Create pagination controls
 */
export function createPaginationControls(currentPage, totalPages) {
    if (totalPages <= 1) return '';
    
    return `
        <div class="modal-pagination">
            <div class="pagination-info">
                <span>Página ${currentPage} de ${totalPages}</span>
            </div>
            <div class="pagination-buttons">
                <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}>
                    <span class="material-symbols-sharp">chevron_left</span>
                    Anterior
                </button>
                <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" id="next-page" ${currentPage === totalPages ? 'disabled' : ''}>
                    Próxima
                    <span class="material-symbols-sharp">chevron_right</span>
                </button>
            </div>
        </div>
    `;
}

/**
 * Reload modal data with new filters/search/pagination
 */
export async function reloadModalData(modal, listId, newPage, filter, searchQuery, selectedWordIds) {
    // Show loading in words container
    const wordsContainer = modal.querySelector('#modal-words-container');
    wordsContainer.innerHTML = `
        <div class="loading-words">
            <span class="material-symbols-sharp loading-icon">sync</span>
            <p>Carregando palavras...</p>
        </div>
    `;
    
    try {
        const offset = (newPage - 1) * 50; // Updated page size
        const words = await getSystemVocabulary({
            sortByStatus: true,
            offset,
            limit: 50,
            category: filter !== 'all' ? filter : undefined,
            search: searchQuery || undefined,
        });
        
        // Update modal attributes
        modal.setAttribute('data-current-page', newPage.toString());
        
        // Update words container
        wordsContainer.innerHTML = words.map(createWordSelectionItem).join('');
        
        // Update pagination
        const totalPages = Math.ceil(5523 / 50);
        modal.setAttribute('data-total-pages', totalPages.toString());
        const paginationContainer = modal.querySelector('.modal-pagination');
        if (paginationContainer) {
            paginationContainer.outerHTML = createPaginationControls(newPage, totalPages);
        }
        
        // Update selection header
        const selectionHeader = modal.querySelector('.selection-header h4');
        if (selectionHeader) {
            selectionHeader.textContent = `Selecione as palavras (página ${newPage} de ${totalPages})`;
        }
        
        return words;
        
    } catch (error) {
        console.error('Error reloading modal data:', error);
        wordsContainer.innerHTML = `
            <div class="error-state">
                <span class="material-symbols-sharp">error</span>
                <p>Erro ao carregar palavras</p>
                <button onclick="window.location.reload()" class="btn primary">Tentar Novamente</button>
            </div>
        `;
        throw error;
    }
}

function createLargeModalWithHeaderActions(id, title, content) {
    return `
        <div class="modal" id="${id}">
            <div class="modal-content large">
                <div class="modal-header-with-actions">
                    <button class="close-modal">&times;</button>
                    <h2>${title}</h2>
                    <div class="header-actions">
                        <button id="cancel-add-words" class="btn">Cancelar</button>
                        <button id="add-selected-words-btn" class="btn primary">Adicionar Selecionadas</button>
                    </div>
                </div>
                ${content}
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