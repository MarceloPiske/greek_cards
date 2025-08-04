/**
 * Lógica da Aplicação de Vocabulário
 * @version 2.0 - Refatorado para maior clareza, eficiência e manutenibilidade.
 */

// Importa funções do banco de dados específico de vocabulário
import { 
    getSystemVocabulary, 
    loadSystemVocabulary,
    getWordById
} from './vocabulary-db.js';

// Constantes para as categorias de palavras (mantido como está)
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
    // MELHORIA: Uso de campos privados para encapsulamento
    #currentPage = 1;
    #currentFilter = null;
    #searchTimeout = null;
    #elements = {}; // Objeto para armazenar referências a elementos do DOM

    // Constante
    WORDS_PER_PAGE = 100;

    constructor() {
        // MELHORIA: Centraliza a busca por elementos do DOM para evitar repetição
        this.#cacheDOMElements();
    }

    /**
     * Armazena referências a elementos do DOM usados frequentemente.
     */
    #cacheDOMElements() {
        this.#elements = {
            moduleSelect: document.getElementById('module-select'),
            systemVocabContainer: document.getElementById('system-vocabulary-container'),
            allWordsContainer: document.getElementById('all-vocabulary-words'),
            searchInput: document.getElementById('vocab-search'),
            tabsContainer: document.querySelector('.vocabulary-tabs'),
            filterBtns: document.querySelectorAll('.filter-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            actionButtons: document.querySelector('.action-buttons'),
        };
    }

    /**
     * Inicializa a aplicação.
     */
    async initialize() {
        try {
            console.log('Initializing vocabulary app...');
            
            // Check authentication and show warning if needed
            this.#checkAuthenticationStatus();
            
            // Inicializa a autenticação (se existir)
            if (window.firebaseAuth?.initAuth) {
                await window.firebaseAuth.initAuth();
            }
            
            // Carrega o vocabulário do sistema
            console.log('Loading system vocabulary...');
            await loadSystemVocabulary();
            
            console.log('Setting up UI...');
            this.#setupEventListeners();
            
            // Carrega as palavras para exibição
            console.log('Loading vocabulary words for display...');
            await this.loadVocabularyWords();
            
            // Verifica se há uma palavra compartilhada na URL
            this.#checkForSharedWord();

        } catch (error) {
            console.error('Error initializing vocabulary:', error);
            alert('Erro ao inicializar o sistema de vocabulário');
        }
    }

    /**
     * Check authentication status and show warning if needed
     */
    #checkAuthenticationStatus() {
        // Wait a bit for Firebase to initialize
        setTimeout(() => {
            if (!window.firebaseAuth?.isAuthenticated()) {
                const authWarning = document.getElementById('auth-warning');
                if (authWarning) {
                    authWarning.style.display = 'block';
                }
            }
        }, 1000);
    }
    
    /**
     * Configura todos os ouvintes de eventos da aplicação.
     */
    #setupEventListeners() {
        // Abas
        this.#elements.tabsContainer?.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => this.#handleTabClick(tab));
        });
        
        // Seleção de Módulo
        this.#elements.moduleSelect?.addEventListener('change', this.#handleModuleChange);
        
        // Botões de Filtro
        this.#elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => this.#handleFilterClick(btn));
        });
        
        // Campo de Busca (com debounce)
        this.#elements.searchInput?.addEventListener('input', this.#handleSearchInput);
        
        // MELHORIA: Delegação de eventos para ações dinâmicas (modais, paginação, etc.)
        document.body.addEventListener('click', this.#handleBodyClick);
    }
    
    // --- Manipuladores de Eventos (extraídos para maior clareza) ---

    #handleTabClick = (tab) => {
        this.#elements.tabsContainer.querySelector('.tab.active')?.classList.remove('active');
        tab.classList.add('active');
        
        const targetId = tab.dataset.tab;
        this.#elements.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === targetId);
        });
    }
    
    #handleModuleChange = () => {
        // A lógica atual é um placeholder, então mantemos a simplicidade.
        const moduleId = this.#elements.moduleSelect.value;
        if (!moduleId) {
            this.#updateContainerUI('systemVocabContainer', 'empty', {
                icon: 'school',
                title: 'Selecione um módulo',
                message: 'Escolha um módulo para ver o vocabulário do sistema.'
            });
            return;
        }
        
        this.#updateContainerUI('systemVocabContainer', 'empty', {
            icon: 'construction',
            title: 'Em desenvolvimento',
            message: 'O vocabulário por módulos estará disponível em breve.'
        });
    }
    
    #handleFilterClick = (btn) => {
        this.#elements.filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        this.#currentFilter = filter === 'all' ? null : filter;
        this.#currentPage = 1;
        this.loadVocabularyWords();
    }
    
    #handleSearchInput = () => {
        clearTimeout(this.#searchTimeout);
        this.#searchTimeout = setTimeout(() => {
            this.#currentPage = 1;
            this.loadVocabularyWords();
        }, 300);
    }

    #handleBodyClick = (e) => {
        const infoBtn = this.#getClosest(e.target, '.info-btn');
        if (infoBtn) {
            this.showWordDetailModal(infoBtn.dataset.wordId);
            return;
        }

        const shareBtn = this.#getClosest(e.target, '.share-btn');
        if (shareBtn) {
            this.shareWord(shareBtn.dataset.wordId);
            return;
        }

        const paginationBtn = this.#getClosest(e.target, '.pagination-btn');
        if (paginationBtn && !paginationBtn.disabled) {
            const page = parseInt(paginationBtn.dataset.page, 10);
            if (page !== this.#currentPage) {
                this.#currentPage = page;
                this.loadVocabularyWords();
            }
        }
    }
    
    /**
     * Carrega e renderiza as palavras do vocabulário com base nos filtros e página atuais.
     */
    async loadVocabularyWords() {
        try {
            this.#updateContainerUI('allWordsContainer', 'loading', { message: 'Carregando vocabulário...' });

            const searchTerm = this.#elements.searchInput?.value || '';
            const words = await getSystemVocabulary({
                search: searchTerm,
                category: this.#currentFilter
            });

            console.log(`Loaded ${words.length} words.`);

            if (words.length === 0) {
                 this.#updateContainerUI('allWordsContainer', 'empty', {
                     icon: 'menu_book',
                     title: 'Nenhuma palavra encontrada',
                     message: 'Tente alterar os filtros ou o termo de busca.'
                 });
                 return;
            }

            const totalPages = Math.ceil(words.length / this.WORDS_PER_PAGE);
            const start = (this.#currentPage - 1) * this.WORDS_PER_PAGE;
            const end = start + this.WORDS_PER_PAGE;
            const currentWords = words.slice(start, end);

            this.#renderVocabularyWords(currentWords, totalPages);

        } catch (error) {
            console.error('Error loading vocabulary words:', error);
            this.#updateContainerUI('allWordsContainer', 'error', {
                message: `Não foi possível carregar as palavras: ${error.message}`,
                showReload: true
            });
        }
    }

    /**
     * Renderiza a lista de palavras e os controles de paginação.
     */
    #renderVocabularyWords(words, totalPages) {
        const wordsHtml = words.map(word => this.#createVocabWordItem(word)).join('');
        const paginationHtml = this.#createPagination(totalPages);
        
        this.#elements.allWordsContainer.innerHTML = wordsHtml + paginationHtml;
    }
    
    // --- Funções de Geração de HTML ---

    #createVocabWordItem(word) {
        const definition = word.DEFINITION || word.USAGE || '';
        const hasDetails = word.PHONETIC_SPELLING || word.ORIGIN;

        return `
            <div class="vocab-word-item" data-word-id="${word.ID}">
                <div class="word-info">
                    <div class="greek-word">${word.LEXICAL_FORM}</div>
                    <div class="word-details">
                        <span class="transliteration">${word.TRANSLITERATED_LEXICAL_FORM || ''}</span>
                        <span class="meaning">${definition}</span>
                    </div>
                    <div class="word-meta">
                        <span class="category-badge">${word.PART_OF_SPEECH || 'não categorizado'}</span>
                        <div class="word-actions">
                            ${hasDetails ? `
                            <button class="info-btn" data-word-id="${word.ID}" title="Ver detalhes">
                                <span class="material-symbols-sharp">info</span>
                            </button>` : ''}
                            <button class="share-btn" data-word-id="${word.ID}" title="Compartilhar palavra">
                                <span class="material-symbols-sharp">share</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    #createPagination(totalPages) {
        if (totalPages <= 1) return '';

        let buttons = '';
        const currentPage = this.#currentPage;
        const maxVisibleButtons = 5; // Define quantos botões de página são visíveis

        // Botão "Anterior"
        buttons += `<button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}><span class="material-symbols-sharp">chevron_left</span></button>`;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

        if(endPage - startPage + 1 < maxVisibleButtons){
            startPage = Math.max(1, endPage - maxVisibleButtons + 1);
        }

        if (startPage > 1) {
            buttons += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) buttons += `<span class="pagination-ellipsis">...</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            buttons += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) buttons += `<span class="pagination-ellipsis">...</span>`;
            buttons += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Botão "Próximo"
        buttons += `<button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}><span class="material-symbols-sharp">chevron_right</span></button>`;
        
        return `<div class="pagination-controls">${buttons}</div>`;
    }
    
    // --- Funções de Ação e UI ---

    /**
     * Verifica se há um ID de palavra na URL e exibe o modal correspondente.
     */
    #checkForSharedWord() {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedWordId = urlParams.get('word');
        if (sharedWordId) {
            // MELHORIA: Removido setTimeout. Chamado após o carregamento inicial das palavras.
            this.showWordDetailModal(sharedWordId);
            
            // Opcional: limpa a URL para evitar reabrir o modal no recarregamento
            const newUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }

    /**
     * Copia a URL de compartilhamento para a área de transferência e notifica o usuário.
     */
    async shareWord(wordId) {
        const shareUrl = `${window.location.origin}${window.location.pathname}?word=${wordId}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            const word = await getWordById(wordId);
            this.#showShareNotification(word?.LEXICAL_FORM || 'esta palavra');
        } catch (error) {
            console.error('Error sharing word via clipboard:', error);
            this.#showShareModal(shareUrl); // Fallback
        }
    }

    async showWordDetailModal(wordId) {
        try {
            const word = await getWordById(wordId);
            if (!word) throw new Error('Palavra não encontrada');

            const content = `
                <h2>${word.LEXICAL_FORM}</h2>
                <div class="word-detail-section">
                    ${this.#createDetailRow('Transliteração', word.TRANSLITERATED_LEXICAL_FORM)}
                    ${this.#createDetailRow('Classe gramatical', word.PART_OF_SPEECH)}
                    ${this.#createDetailRow('Pronúncia', word.PHONETIC_SPELLING)}
                    ${this.#createDetailRow('Uso', word.USAGE)}
                    ${this.#createDetailRow('Definição', word.DEFINITION)}
                    ${this.#createDetailRow('Origem', word.ORIGIN)}
                </div>
                <div class="modal-actions">
                    <button id="copy-word-data" class="btn secondary"><span class="material-symbols-sharp">content_copy</span> Copiar Dados</button>
                    <button id="share-word-data" class="btn primary"><span class="material-symbols-sharp">share</span> Compartilhar</button>
                </div>
            `;

            const modal = this.#createModal('word-detail-modal', content);
            
            modal.querySelector('#copy-word-data').addEventListener('click', (e) => this.#copyWordData(word, e.currentTarget));
            modal.querySelector('#share-word-data').addEventListener('click', () => {
                modal.remove();
                this.shareWord(wordId);
            });

        } catch (error) {
            console.error('Error showing word details:', error);
            alert('Erro ao exibir detalhes da palavra.');
        }
    }
    
    async #copyWordData(word, button) {
        const wordData = `
📖 ${word.LEXICAL_FORM}
🔤 Transliteração: ${word.TRANSLITERATED_LEXICAL_FORM || '-'}
📝 Classe gramatical: ${word.PART_OF_SPEECH || '-'}
🗣️ Pronúncia: ${word.PHONETIC_SPELLING || '-'}
💡 Uso: ${word.USAGE || '-'}
📚 Definição: ${word.DEFINITION || '-'}
${word.ORIGIN ? `🏛️ Origem: ${word.ORIGIN}` : ''}
`.trim();

        try {
            await navigator.clipboard.writeText(wordData);
            const originalText = button.innerHTML;
            button.innerHTML = `<span class="material-symbols-sharp">check</span> Copiado!`;
            button.classList.add('success');
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('success');
            }, 2000);
        } catch (error) {
            console.error('Error copying word data:', error);
            alert('Erro ao copiar dados da palavra.');
        }
    }

    #showShareNotification(wordText) {
        document.getElementById('share-notification')?.remove();
        
        const notification = document.createElement('div');
        notification.id = 'share-notification';
        notification.className = 'share-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="material-symbols-sharp">check_circle</span>
                <span>Link para "${wordText}" copiado!</span>
            </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            notification.addEventListener('transitionend', () => notification.remove());
        }, 3000);
    }
    
    #showShareModal(shareUrl) {
        const content = `
            <h2>Compartilhar Palavra</h2>
            <p>Não foi possível copiar automaticamente. Use o link abaixo:</p>
            <div class="share-url-container">
                <input type="text" id="share-url-input" value="${shareUrl}" readonly>
                <button id="copy-share-url" class="btn primary"><span class="material-symbols-sharp">content_copy</span> Copiar</button>
            </div>
        `;

        const modal = this.#createModal('share-modal', content);
        const copyBtn = modal.querySelector('#copy-share-url');
        const urlInput = modal.querySelector('#share-url-input');

        copyBtn.addEventListener('click', async () => {
            urlInput.select();
            try {
                await navigator.clipboard.writeText(shareUrl);
                copyBtn.innerHTML = `<span class="material-symbols-sharp">check</span> Copiado!`;
            } catch {
                document.execCommand('copy'); // Fallback para navegadores mais antigos
                copyBtn.innerHTML = `<span class="material-symbols-sharp">check</span> Copiado!`;
            }
            setTimeout(() => {
                copyBtn.innerHTML = `<span class="material-symbols-sharp">content_copy</span> Copiar`;
            }, 2000);
        });
    }

    // --- Funções Auxiliares (Helpers) ---

    /**
     * Atualiza um container com um estado de UI (loading, empty, error).
     * @param {string} containerKey - A chave do elemento no objeto this.#elements.
     * @param {'loading'|'empty'|'error'} state - O estado a ser exibido.
     * @param {object} [options] - Opções para personalizar a mensagem.
     */
    #updateContainerUI(containerKey, state, options = {}) {
        const container = this.#elements[containerKey];
        if (!container) return;

        let html = '';
        switch (state) {
            case 'loading':
                html = `<div class="loading-state"><span class="material-symbols-sharp loading-icon">sync</span><p>${options.message || 'Carregando...'}</p></div>`;
                break;
            case 'empty':
                html = `<div class="empty-state"><span class="material-symbols-sharp">${options.icon || 'info'}</span><h3>${options.title || 'Vazio'}</h3><p>${options.message || ''}</p></div>`;
                break;
            case 'error':
                const reloadButton = options.showReload ? `<button onclick="location.reload()" class="btn primary">Tentar Novamente</button>` : '';
                html = `<div class="empty-state"><span class="material-symbols-sharp">error</span><h3>Erro</h3><p>${options.message || 'Ocorreu um erro.'}</p>${reloadButton}</div>`;
                break;
        }
        container.innerHTML = html;
    }
    
    /**
     * Cria e exibe um modal genérico.
     * @returns {HTMLElement} A referência para o elemento do modal.
     */
    #createModal(id, content) {
        document.getElementById(id)?.remove(); // Remove modal anterior, se houver
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = id;
        modal.innerHTML = `
            <div class="modal-content">
                <button class="close-modal" aria-label="Fechar modal">&times;</button>
                ${content}
            </div>
        `;
        document.body.appendChild(modal);

        const closeModal = () => modal.remove();
        modal.querySelector('.close-modal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Força reflow antes de adicionar a classe para garantir a transição de CSS
        void modal.offsetWidth;
        modal.classList.add('show');
        
        return modal;
    }

    #createDetailRow(label, value) {
        if (!value) return '';
        return `
            <div class="detail-row">
                <div class="detail-label">${label}:</div>
                <div class="detail-value">${value}</div>
            </div>`;
    }

    /**
     * Auxiliar para delegação de eventos. Encontra o elemento pai que corresponde ao seletor.
     * @returns {HTMLElement|null}
     */
    #getClosest(element, selector) {
        return element.closest(selector);
    }
}