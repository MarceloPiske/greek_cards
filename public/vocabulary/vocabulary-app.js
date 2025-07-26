/**
 * Vocabulary Application Logic
 */

// Import from vocabulary-specific database functions
import { 
    getSystemVocabulary, 
    loadSystemVocabulary,
    getWordById
} from './vocabulary-db.js';

// Word categories constants
export const WordCategories = {
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

export class VocabularyApp {
    constructor() {
        this.currentPage = 1;
        this.currentFilter = null;
        this.WORDS_PER_PAGE = 100;
    }

    async initialize() {
        try {
            console.log('Initializing vocabulary app...');
            
            // Initialize Firebase Authentication
            if (typeof window.firebaseAuth !== 'undefined') {
                await window.firebaseAuth.initAuth();
            }
            
            // Load system vocabulary from JSON if not already loaded
            console.log('Loading system vocabulary...');
            await loadSystemVocabulary();
            
            console.log('Setting up tabs and UI...');
            this.setupTabs();
            this.setupEventListeners();
            this.setupModuleSelection();
            
            // Load vocabulary words after everything is set up
            console.log('Loading vocabulary words for display...');
            await this.loadVocabularyWords();
            
        } catch (error) {
            console.error('Error initializing vocabulary:', error);
            alert('Erro ao inicializar o sistema de vocabulário');
        }
    }

    /**
     * Set up module selection for system vocabulary
     */
    setupModuleSelection() {
        const moduleSelect = document.getElementById('module-select');
        if (!moduleSelect) return;
        
        moduleSelect.addEventListener('change', async () => {
            const moduleId = moduleSelect.value;
            if (!moduleId) {
                document.getElementById('system-vocabulary-container').innerHTML = `
                    <div class="empty-state">
                        <span class="material-symbols-sharp">school</span>
                        <h3>Selecione um módulo</h3>
                        <p>Escolha um módulo para ver o vocabulário do sistema</p>
                    </div>
                `;
                return;
            }
            
            try {
                // Show loading state
                document.getElementById('system-vocabulary-container').innerHTML = `
                    <div class="loading-state">
                        <span class="material-symbols-sharp loading-icon">sync</span>
                        <p>Carregando vocabulário do módulo...</p>
                    </div>
                `;
                
                // For now, show a message that module-specific vocabulary is coming soon
                document.getElementById('system-vocabulary-container').innerHTML = `
                    <div class="empty-state">
                        <span class="material-symbols-sharp">construction</span>
                        <h3>Em desenvolvimento</h3>
                        <p>O vocabulário por módulos estará disponível em breve. Por enquanto, use a aba "Vocabulário do Sistema" para ver todas as palavras.</p>
                    </div>
                `;

            } catch (error) {
                console.error('Error loading module vocabulary:', error);
                document.getElementById('system-vocabulary-container').innerHTML = `
                    <div class="empty-state">
                        <span class="material-symbols-sharp">error</span>
                        <h3>Erro ao carregar vocabulário</h3>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        });
    }

    setupTabs() {
        const tabsContainer = document.querySelector('.vocabulary-tabs');
        if (!tabsContainer) return;

        const tabs = tabsContainer.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const target = tab.getAttribute('data-tab');
                tabContents.forEach(content => {
                    content.classList.toggle('active', content.id === target);
                });
            });
        });
    }

    setupEventListeners() {
        // Filter buttons
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filter = btn.getAttribute('data-filter');
                this.currentFilter = filter === 'all' ? null : filter;
                this.currentPage = 1;
                
                this.loadVocabularyWords();
            });
        });

        // Search input
        const searchInput = document.getElementById('vocab-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentPage = 1;
                    this.loadVocabularyWords();
                }, 300);
            });
        }

        // Word actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.info-btn') || e.target.closest('.info-btn')) {
                e.stopPropagation();
                const btn = e.target.matches('.info-btn') ? e.target : e.target.closest('.info-btn');
                const wordId = btn.getAttribute('data-word-id');
                this.showWordDetailModal(wordId);
            }

            if (e.target.matches('.pagination-btn') || e.target.closest('.pagination-btn')) {
                const btn = e.target.matches('.pagination-btn') ? e.target : e.target.closest('.pagination-btn');
                const page = parseInt(btn.getAttribute('data-page'));
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.loadVocabularyWords();
                }
            }
        });
    }

    async loadVocabularyWords() {
        try {
            console.log('Loading vocabulary words...');
            const container = document.getElementById('all-vocabulary-words');
            container.innerHTML = `
                <div class="loading-state">
                    <span class="material-symbols-sharp loading-icon">sync</span>
                    <p>Carregando vocabulário...</p>
                </div>
            `;

            const searchInput = document.getElementById('vocab-search');
            const searchTerm = searchInput ? searchInput.value : '';

            console.log('Fetching system vocabulary with options:', {
                search: searchTerm,
                category: this.currentFilter
            });

            let words = await getSystemVocabulary({
                search: searchTerm,
                category: this.currentFilter
            });

            console.log(`Loaded ${words.length} words from system vocabulary`);

            if (words.length === 0) {
                console.warn('No words found in system vocabulary');
                container.innerHTML = `
                    <div class="empty-state">
                        <span class="material-symbols-sharp">warning</span>
                        <h3>Vocabulário não encontrado</h3>
                        <p>O vocabulário do sistema ainda não foi carregado. Por favor, aguarde ou recarregue a página.</p>
                        <button onclick="location.reload()" class="btn primary">Recarregar Página</button>
                    </div>
                `;
                return;
            }

            const totalPages = Math.ceil(words.length / this.WORDS_PER_PAGE);
            const start = (this.currentPage - 1) * this.WORDS_PER_PAGE;
            const end = start + this.WORDS_PER_PAGE;
            const currentWords = words.slice(start, end);

            this.renderVocabularyWords(currentWords, totalPages);
        } catch (error) {
            console.error('Error loading vocabulary words:', error);
            const container = document.getElementById('all-vocabulary-words');
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-sharp">error</span>
                    <h3>Erro ao carregar vocabulário</h3>
                    <p>Não foi possível carregar as palavras do vocabulário: ${error.message}</p>
                    <button onclick="location.reload()" class="btn primary">Tentar Novamente</button>
                </div>
            `;
        }
    }

    renderVocabularyWords(words, totalPages) {
        const container = document.getElementById('all-vocabulary-words');
        
        if (words.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-sharp">menu_book</span>
                    <h3>Nenhuma palavra encontrada</h3>
                    <p>Use os filtros para encontrar palavras específicas</p>
                </div>
            `;
            return;
        }

        const wordsHtml = words.map(word => this.createVocabWordItem(word)).join('');
        const paginationHtml = this.createPagination(this.currentPage, totalPages);
        
        container.innerHTML = wordsHtml + paginationHtml;
    }

    createVocabWordItem(word) {
        return `
            <div class="vocab-word-item" data-word-id="${word.ID}">
                <div class="word-info">
                    <div class="greek-word">${word.LEXICAL_FORM}</div>
                    <div class="word-details">
                        <span class="transliteration">${word.TRANSLITERATED_LEXICAL_FORM || ''}</span>
                        <span class="meaning">${word.DEFINITION || word.USAGE || ''}</span>
                    </div>
                    <div class="word-meta">
                        <span class="category-badge">${word.PART_OF_SPEECH || 'não categorizado'}</span>
                        ${(word.PHONETIC_SPELLING || word.ORIGIN) ? `
                        <button class="info-btn" data-word-id="${word.ID}" title="Ver detalhes">
                            <span class="material-symbols-sharp">info</span>
                        </button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    createPagination(currentPage, totalPages) {
        if (totalPages <= 1) return '';
        
        const buttons = [];
        
        // Previous button
        buttons.push(`
            <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
                <span class="material-symbols-sharp">chevron_left</span>
            </button>
        `);
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            buttons.push(`<button class="pagination-btn" data-page="1">1</button>`);
            if (startPage > 2) {
                buttons.push(`<span class="pagination-ellipsis">...</span>`);
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            buttons.push(`
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                    data-page="${i}">${i}</button>
            `);
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                buttons.push(`<span class="pagination-ellipsis">...</span>`);
            }
            buttons.push(`<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`);
        }
        
        // Next button
        buttons.push(`
            <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
                <span class="material-symbols-sharp">chevron_right</span>
            </button>
        `);
        
        return `<div class="pagination-controls">${buttons.join('')}</div>`;
    }

    async showWordDetailModal(wordId) {
        try {
            const word = await getWordById(wordId);
            if (!word) throw new Error('Palavra não encontrada');

            const modalHtml = `
                <div class="modal" id="word-detail-modal">
                    <div class="modal-content">
                        <button class="close-modal">&times;</button>
                        <h2>${word.LEXICAL_FORM}</h2>
                        <div class="word-detail-section">
                            <div class="detail-row">
                                <div class="detail-label">Transliteração:</div>
                                <div class="detail-value">${word.TRANSLITERATED_LEXICAL_FORM}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Classe gramatical:</div>
                                <div class="detail-value">${word.PART_OF_SPEECH}</div>
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
                                <div class="detail-value">${word.DEFINITION || '-'}</div>
                            </div>
                            ${word.ORIGIN ? `
                            <div class="detail-row">
                                <div class="detail-label">Origem:</div>
                                <div class="detail-value">${word.ORIGIN}</div>
                            </div>` : ''}
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = document.getElementById('word-detail-modal');
            const closeBtn = modal.querySelector('.close-modal');
            
            closeBtn.addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
            modal.style.display = 'flex';
        } catch (error) {
            console.error('Error showing word details:', error);
            alert('Erro ao exibir detalhes da palavra');
        }
    }
}

// Export the getSystemVocabulary function for other modules
export { getSystemVocabulary };

// Make getWordById available for other modules
export { getWordById };