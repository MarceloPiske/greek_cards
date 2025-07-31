/**
 * Main application file for vocabulary cards
 */

import { 
    initVocabularyDB
} from '../vocabulary/vocabulary-db.js';

// Import unified list functions from sync system
import { 
    getAllWordLists,
    getWordList
} from '../lists/lists-sync.js';

// Import word progress function
import { getWordProgress } from '../word_progress/word-progress-sync.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize Firebase Authentication
        if (typeof window.firebaseAuth !== 'undefined') {
            await window.firebaseAuth.initAuth();
        }
        
        // Initialize the database
        await initVocabularyDB();
        
        // Initialize the UI - this will load word lists
        await initVocabularyUI();
        
        // Check if there's a list parameter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const listId = urlParams.get('list');
        if (listId) {
            setTimeout(() => {
                selectWordList(listId);
            }, 1000);
        }
        
        // Set up back button
        const backButton = document.getElementById('back-button');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location.href = '/';
            });
        }
        
    } catch (error) {
        console.error('Error initializing application:', error);
        alert('Erro ao inicializar a aplicação');
    }
});

/**
 * Load word lists for the sidebar
 */
async function loadWordLists() {
    try {
        const container = document.getElementById('word-lists-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="loading-state">
                <span class="material-symbols-sharp loading-icon">sync</span>
                <p>Carregando listas...</p>
            </div>
        `;
        
        console.log('Loading word lists...');
        const lists = await getAllWordLists();
        console.log('Found lists:', lists);
        
        if (lists.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-sharp">inventory_2</span>
                    <h3>Nenhuma lista encontrada</h3>
                    <p>Acesse o gerenciador de listas para criar suas primeiras listas</p>
                </div>
            `;
            return;
        }

        // Render simple list items for selection
        const listsHtml = lists.map(list => `
            <div class="word-list-item" data-list-id="${list.id}">
                <div class="list-info">
                    <h3>${list.name}</h3>
                    <p>${list.wordIds ? list.wordIds.length : 0} palavras</p>
                    ${list.description ? `<p class="list-description">${list.description}</p>` : ''}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = listsHtml;
        
        // Setup event listeners for list items
        container.querySelectorAll('.word-list-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.list-actions')) {
                    const listId = item.getAttribute('data-list-id');
                    selectWordList(listId);
                }
            });
        });
        
    } catch (error) {
        console.error('Error loading word lists:', error);
        const container = document.getElementById('word-lists-container');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-sharp">error</span>
                    <h3>Erro ao carregar listas</h3>
                    <p>Não foi possível carregar suas listas de palavras</p>
                </div>
            `;
        }
    }
}

/**
 * Select a word list and load its content
 */
async function selectWordList(listId) {
    try {
        markListAsSelected(listId);
        await loadWordListContent(listId);
    } catch (error) {
        console.error('Error selecting word list:', error);
        alert('Erro ao carregar lista');
    }
}

/**
 * Load content of a specific word list
 */
async function loadWordListContent(listId) {
    await loadWordListContentWithView(listId, 'list');
}

/**
 * Load word list content with specific view mode
 */
async function loadWordListContentWithView(listId, viewMode = 'list') {
    try {
        const contentContainer = document.getElementById('list-content');
        contentContainer.innerHTML = `
            <div class="loading-state">
                <span class="material-symbols-sharp loading-icon">sync</span>
                <p>Carregando palavras da lista...</p>
            </div>
        `;
        
        const list = await getWordList(listId);
        if (!list) {
            throw new Error('Lista não encontrada');
        }
        
        // Get words with their progress
        const words = [];
        if (list.wordIds && list.wordIds.length > 0) {
            // Get system vocabulary
            const db = await initVocabularyDB();
            const tx = db.transaction('systemVocabulary', 'readonly');
            const store = tx.objectStore('systemVocabulary');
            
            const allWords = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
            
            for (const wordId of list.wordIds) {
                const word = allWords.find(w => w.ID === wordId);
                if (word) {
                    try {
                        const progress = await getWordProgress(word.ID);
                        words.push({
                            ...word,
                            progress: progress || { status: 'unread', reviewCount: 0 }
                        });
                    } catch (error) {
                        words.push({
                            ...word,
                            progress: { status: 'unread', reviewCount: 0 }
                        });
                    }
                }
            }
        }
        
        const listWithWords = { ...list, words };
        renderWordListContent(listWithWords, 'list-content', viewMode);
        
        // Setup event listeners for list content
        setupListContentActions();
        setupCardFlipEvents();
        
    } catch (error) {
        console.error('Error loading word list content:', error);
        const contentContainer = document.getElementById('list-content');
        contentContainer.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-sharp">error</span>
                <h3>Erro ao carregar lista</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

/**
 * Setup card flip events for card view
 */
function setupCardFlipEvents() {
    const cards = document.querySelectorAll('.vocab-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
        });
    });
}

/**
 * Render word list content
 */
function renderWordListContent(list, containerId, viewMode = 'list') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const headerHtml = `
        <div class="list-header">
            <h2>${list.name}</h2>
            ${list.description ? `<p class="list-description">${list.description}</p>` : ''}
            <div class="list-stats">
                <span>${list.words.length} palavras</span>
            </div>
        </div>
    `;
    
    const actionsHtml = `
        <div class="list-actions-bar">
            <div class="list-actions-left">
                <button id="add-to-list-btn" class="btn" title="Adicionar palavras à lista">
                    <span class="material-symbols-sharp">add</span> Adicionar palavras
                </button>
            </div>
            <div class="list-actions-right">
                <button id="practice-list-btn" class="btn primary" title="Iniciar prática com esta lista">
                    <span class="material-symbols-sharp">school</span> Praticar
                </button>
                <div class="view-toggle">
                    <button class="btn icon ${viewMode === 'list' ? 'active' : ''}" data-view="list" title="Visualização em lista">
                        <span class="material-symbols-sharp">view_list</span>
                    </button>
                    <button class="btn icon ${viewMode === 'cards' ? 'active' : ''}" data-view="cards" title="Visualização em cartões">
                        <span class="material-symbols-sharp">view_module</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    let wordsHtml = '';
    if (list.words.length === 0) {
        wordsHtml = `
            <div class="empty-state">
                <span class="material-symbols-sharp">style</span>
                <h3>Lista vazia</h3>
                <p>Esta lista não contém palavras ainda. Use o botão "Adicionar palavras" para começar.</p>
            </div>
        `;
    } else {
        if (viewMode === 'cards') {
            wordsHtml = `<div class="words-grid">${list.words.map(word => createVocabCard(word)).join('')}</div>`;
        } else {
            wordsHtml = `<div class="words-list">${list.words.map(word => createVocabWordItem(word)).join('')}</div>`;
        }
    }
    
    container.innerHTML = headerHtml + actionsHtml + wordsHtml;
}

/**
 * Create vocabulary word item
 */
function createVocabWordItem(word) {
    const progress = word.progress || { status: 'unread', reviewCount: 0 };
    
    return `
        <div class="vocab-word-item ${progress.status}" data-word-id="${word.ID}">
            <div class="word-info">
                <div class="greek-word">${word.LEXICAL_FORM}</div>
                <div class="word-details">
                    <span class="transliteration">${word.TRANSLITERATED_LEXICAL_FORM || ''}</span>
                    <span class="meaning">${word.DEFINITION || word.USAGE || ''}</span>
                </div>
                <div class="word-meta">
                    <span class="category-badge">${word.PART_OF_SPEECH || 'não categorizado'}</span>
                    <span class="status-badge ${progress.status}">${getStatusLabel(progress.status)}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Create vocabulary card
 */
function createVocabCard(word) {
    const progress = word.progress || { status: 'unread', reviewCount: 0 };
    
    return `
        <div class="vocab-card ${progress.status}" data-word-id="${word.ID}">
            <div class="card-front">
                <div class="greek-word">${word.LEXICAL_FORM}</div>
                <div class="transliteration">${word.TRANSLITERATED_LEXICAL_FORM || ''}</div>
                <div class="card-footer">
                    <span class="category-badge">${word.PART_OF_SPEECH || 'não categorizado'}</span>
                    <span class="flip-hint">Clique para virar</span>
                </div>
            </div>
            <div class="card-back">
                <div class="meaning">${word.DEFINITION || word.USAGE || ''}</div>
            </div>
        </div>
    `;
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status) {
    const labels = {
        'unread': 'Não lido',
        'reading': 'Lendo',
        'familiar': 'Familiar',
        'memorized': 'Decorado'
    };
    return labels[status] || 'Desconhecido';
}

/**
 * Mark a list as selected in the sidebar
 */
function markListAsSelected(listId) {
    document.querySelectorAll('.word-list-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const listItem = document.querySelector(`[data-list-id="${listId}"]`);
    if (listItem) {
        listItem.classList.add('selected');
    }
}

/**
 * Setup list content actions
 */
function setupListContentActions() {
    const addWordsBtn = document.getElementById('add-to-list-btn');
    const practiceBtn = document.getElementById('practice-list-btn');
    const viewToggleBtns = document.querySelectorAll('.view-toggle .btn');
    
    if (addWordsBtn) {
        addWordsBtn.addEventListener('click', async () => {
            const selectedList = document.querySelector('.word-list-item.selected');
            if (selectedList) {
                const listId = selectedList.getAttribute('data-list-id');
                const { showAddWordsModal } = await import('./lists/lists-words-actions.js');
                await showAddWordsModal(listId);
            }
        });
    }
    
    if (practiceBtn) {
        practiceBtn.addEventListener('click', async () => {
            const selectedList = document.querySelector('.word-list-item.selected');
            if (selectedList) {
                const listId = selectedList.getAttribute('data-list-id');
                try {
                    // Import the practice session function
                    const { startPracticeSession } = await import('./modal-practice.js');
                    await startPracticeSession(listId);
                } catch (error) {
                    console.error('Error starting practice session:', error);
                    alert('Erro ao iniciar sessão de prática: ' + error.message);
                }
            }
        });
    }

    // Setup view toggle buttons
    viewToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const viewMode = btn.getAttribute('data-view');
            const selectedList = document.querySelector('.word-list-item.selected');
            
            if (selectedList) {
                // Update button states
                viewToggleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Re-render the list content with new view mode
                const listId = selectedList.getAttribute('data-list-id');
                loadWordListContentWithView(listId, viewMode);
            }
        });
    });
}

/**
 * Initialize the vocabulary UI
 */
async function initVocabularyUI() {
    try {
        await loadWordLists();
    } catch (error) {
        console.error('Error initializing vocabulary UI:', error);
        alert('Erro ao inicializar o sistema de vocabulário');
    }
}

// Theme switcher functionality
function initThemeSwitcher() {
    const themeSwitch = document.querySelector('.theme-switch');
    if (!themeSwitch) return;
    
    const sunIcon = themeSwitch.querySelector('.sun');
    const moonIcon = themeSwitch.querySelector('.moon');
    let isDark = false;

    themeSwitch.addEventListener('click', () => {
        isDark = !isDark;
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        if (sunIcon) sunIcon.style.display = isDark ? 'block' : 'none';
        if (moonIcon) moonIcon.style.display = isDark ? 'none' : 'block';
    });
}

function initLoginModal() {
    const loginBtn = document.querySelector('.login-button');
    const modal = document.getElementById('loginModal');
    const closeBtn = document.querySelector('.close-modal');

    if (loginBtn && modal && closeBtn) {
        loginBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

// Initialize theme and login when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initThemeSwitcher();
    initLoginModal();
});

// Login function
window.loginWith = async function(provider) {
    if (typeof window.firebaseAuth !== 'undefined') {
        try {
            await window.firebaseAuth.loginWith(provider);
        } catch (error) {
            console.error(`Error logging in with ${provider}:`, error);
        }
    } else {
        console.log(`Logging in with ${provider} - Firebase not available`);
        const modal = document.getElementById('loginModal');
        if (modal) modal.style.display = 'none';
    }
};