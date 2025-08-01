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
            
            // Check for shared word URL parameter
            this.checkForSharedWord();
            
        } catch (error) {
            console.error('Error initializing vocabulary:', error);
            alert('Erro ao inicializar o sistema de vocabulário');
        }
    }

    /**
     * Check if there's a shared word in URL parameters
     */
    checkForSharedWord() {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedWordId = urlParams.get('word');
        
        if (sharedWordId) {
            // Wait a bit for the words to load, then show the modal
            setTimeout(() => {
                this.showWordDetailModal(sharedWordId);
            }, 1500);
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

            if (e.target.matches('.share-btn') || e.target.closest('.share-btn')) {
                e.stopPropagation();
                const btn = e.target.matches('.share-btn') ? e.target : e.target.closest('.share-btn');
                const wordId = btn.getAttribute('data-word-id');
                this.shareWord(wordId);
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

    /**
     * Share a word by copying its URL to clipboard
     */
    async shareWord(wordId) {
        try {
            const word = await getWordById(wordId);
            if (!word) {
                throw new Error('Palavra não encontrada');
            }

            // Create shareable URL
            const currentUrl = window.location.origin + window.location.pathname;
            const shareUrl = `${currentUrl}?word=${wordId}`;
            
            // Copy to clipboard
            await navigator.clipboard.writeText(shareUrl);
            
            // Show success message
            this.showShareNotification(word.LEXICAL_FORM);
            
        } catch (error) {
            console.error('Error sharing word:', error);
            
            // Fallback: show the URL in a modal if clipboard fails
            const currentUrl = window.location.origin + window.location.pathname;
            const shareUrl = `${currentUrl}?word=${wordId}`;
            this.showShareModal(shareUrl);
        }
    }

    /**
     * Show share notification
     */
    showShareNotification(wordText) {
        // Remove existing notification if any
        const existingNotification = document.getElementById('share-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.id = 'share-notification';
        notification.className = 'share-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="material-symbols-sharp">check_circle</span>
                <span>Link da palavra "${wordText}" copiado!</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Show share modal as fallback
     */
    showShareModal(shareUrl) {
        const modalHtml = `
            <div class="modal" id="share-modal">
                <div class="modal-content">
                    <button class="close-modal">&times;</button>
                    <h2>Compartilhar Palavra</h2>
                    <p>Copie este link para compartilhar a palavra:</p>
                    <div class="share-url-container">
                        <input type="text" id="share-url-input" value="${shareUrl}" readonly>
                        <button id="copy-share-url" class="btn primary">
                            <span class="material-symbols-sharp">content_copy</span>
                            Copiar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('share-modal');
        const closeBtn = modal.querySelector('.close-modal');
        const copyBtn = document.getElementById('copy-share-url');
        const urlInput = document.getElementById('share-url-input');
        
        closeBtn.addEventListener('click', () => modal.remove());
        
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(shareUrl);
                copyBtn.innerHTML = '<span class="material-symbols-sharp">check</span> Copiado!';
                setTimeout(() => {
                    copyBtn.innerHTML = '<span class="material-symbols-sharp">content_copy</span> Copiar';
                }, 2000);
            } catch (error) {
                urlInput.select();
                document.execCommand('copy');
                copyBtn.innerHTML = '<span class="material-symbols-sharp">check</span> Copiado!';
            }
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        modal.style.display = 'flex';
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
                        <div class="word-actions">
                            ${(word.PHONETIC_SPELLING || word.ORIGIN) ? `
                            <button class="info-btn" data-word-id="${word.ID}" title="Ver detalhes">
                                <span class="material-symbols-sharp">info</span>
                            </button>` : ''}
                            <button class="share-btn" data-word-id="${word.ID}" title="Compartilhar palavra">
                                <span class="material-symbols-sharp">share</span>
                            </button>
                        </div>
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
                        <div class="modal-actions">
                            <button id="copy-word-data" class="btn secondary">
                                <span class="material-symbols-sharp">content_copy</span>
                                Copiar Dados
                            </button>
                            <button id="share-word-data" class="btn primary">
                                <span class="material-symbols-sharp">share</span>
                                Compartilhar
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = document.getElementById('word-detail-modal');
            const closeBtn = modal.querySelector('.close-modal');
            const copyBtn = document.getElementById('copy-word-data');
            const shareBtn = document.getElementById('share-word-data');
            
            closeBtn.addEventListener('click', () => modal.remove());
            
            copyBtn.addEventListener('click', () => this.copyWordData(word, copyBtn));
            shareBtn.addEventListener('click', () => {
                modal.remove();
                this.shareWord(wordId);
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
            modal.style.display = 'flex';
        } catch (error) {
            console.error('Error showing word details:', error);
            alert('Erro ao exibir detalhes da palavra');
        }
    }

    /**
     * Copy word data to clipboard
     */
    async copyWordData(word, button) {
        try {
            const wordData = `
📖 ${word.LEXICAL_FORM}
🔤 Transliteração: ${word.TRANSLITERATED_LEXICAL_FORM || '-'}
📝 Classe gramatical: ${word.PART_OF_SPEECH || '-'}
🗣️ Pronúncia: ${word.PHONETIC_SPELLING || '-'}
💡 Uso: ${word.USAGE || '-'}
📚 Definição: ${word.DEFINITION || '-'}
${word.ORIGIN ? `🏛️ Origem: ${word.ORIGIN}` : ''}

Estude grego bíblico em: ${window.location.origin}
            `.trim();

            await navigator.clipboard.writeText(wordData);
            
            const originalText = button.innerHTML;
            button.innerHTML = '<span class="material-symbols-sharp">check</span> Copiado!';
            button.classList.add('success');
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('success');
            }, 2000);
            
        } catch (error) {
            console.error('Error copying word data:', error);
            alert('Erro ao copiar dados da palavra');
        }
    }
}

// Export the getSystemVocabulary function for other modules
export { getSystemVocabulary };

// Make getWordById available for other modules
export { getWordById };

if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        .word-actions {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }

        .share-btn {
            background: var(--bg-secondary);
            color: var(--text-secondary);
            border: 2px solid var(--shadow);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 8px var(--shadow);
        }

        .share-btn:hover {
            background: var(--accent);
            color: white;
            border-color: var(--accent);
            transform: scale(1.1);
            box-shadow: 0 4px 15px rgba(74, 144, 226, 0.3);
        }

        .share-notification {
            position: fixed;
            top: 100px;
            right: -400px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 30px var(--shadow);
            border: 1px solid rgba(74, 144, 226, 0.2);
            z-index: 2000;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }

        .share-notification.show {
            right: 20px;
        }

        .notification-content {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: var(--text-primary);
        }

        .notification-content .material-symbols-sharp {
            color: #22c55e;
            font-size: 1.2rem;
        }

        .share-url-container {
            display: flex;
            gap: 0.75rem;
            margin-top: 1rem;
            padding: 1rem;
            background: var(--bg-primary);
            border-radius: 8px;
            border: 1px solid var(--shadow);
        }

        .share-url-container input {
            flex: 1;
            padding: 0.75rem;
            border: 1px solid var(--shadow);
            border-radius: 6px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            font-family: monospace;
            font-size: 0.9rem;
        }

        .share-url-container input:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
        }

        .btn.success {
            background: #22c55e !important;
            border-color: #22c55e !important;
            color: white !important;
        }

        @media (max-width: 768px) {
            .share-notification {
                right: -300px;
                left: 20px;
                width: calc(100% - 40px);
            }

            .share-notification.show {
                right: 20px;
            }

            .word-actions {
                gap: 0.25rem;
            }

            .share-btn,
            .info-btn {
                width: 32px;
                height: 32px;
            }

            .share-url-container {
                flex-direction: column;
            }

            .share-url-container input {
                font-size: 0.85rem;
            }
        }
    `;
    document.head.appendChild(style);
}