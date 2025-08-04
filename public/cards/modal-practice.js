/**
 * Enhanced practice session modal functionality with memorization techniques
 */

// Import unified word progress function from sync system
import { saveWordProgress } from '../word_progress/word-progress-sync.js';
import { getWordList } from '../lists/lists-sync.js';

// Word status constants
const WordStatus = {
    UNREAD: 'unread',
    READING: 'reading', 
    FAMILIAR: 'familiar',
    MEMORIZED: 'memorized'
};

// Practice session state
let practiceState = {
    startTime: null,
    cardsReviewed: 0,
    correctAnswers: 0,
    sessionStats: {
        unread: 0,
        reading: 0,
        familiar: 0,
        memorized: 0
    }
};

/**
 * Show modal and set up basic event listeners
 */
export function showModal(modalElement) {
    const closeBtn = modalElement.querySelector('.close-practice, .close-modal');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (confirm('Deseja sair da sessão de prática? Seu progresso será salvo.')) {
                modalElement.remove();
                // Restore body scroll when closing
                document.body.style.overflow = '';
            }
        });
    }

    // Close on ESC key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            if (confirm('Deseja sair da sessão de prática? Seu progresso será salvo.')) {
                modalElement.remove();
                document.removeEventListener('keydown', escHandler);
                // Restore body scroll when closing
                document.body.style.overflow = '';
            }
        }
    };
    document.addEventListener('keydown', escHandler);

    // Ensure modal appears above everything
    modalElement.style.display = 'flex';
    /* modalElement.style.zIndex = '10000'; */
    
    // Prevent body scroll during practice
    document.body.style.overflow = 'hidden';
    
    return modalElement;
}

export function createAndShowModal(htmlContent) {
    document.body.insertAdjacentHTML('beforeend', htmlContent);
    const modal = document.body.lastElementChild;
    
    // Ensure the modal has the highest z-index
    /* modal.style.zIndex = '10000'; */
    
    return showModal(modal);
}

/**
 * Get word list with words for practice
 */
async function getWordListWithWords(listId) {
    try {
        const list = await getWordList(listId);
        if (!list) {
            throw new Error('Lista não encontrada');
        }

        if (!list.wordIds || list.wordIds.length === 0) {
            return { ...list, words: [] };
        }

        const { initVocabularyDB } = await import('../vocabulary/vocabulary-db.js');
        const db = await initVocabularyDB();
        const tx = db.transaction('systemVocabulary', 'readonly');
        const store = tx.objectStore('systemVocabulary');
        
        const allWords = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });

        const words = [];
        for (const wordId of list.wordIds) {
            const word = allWords.find(w => w.ID === wordId);
            if (word) {
                try {
                    const { getWordProgress } = await import('../word_progress/word-progress-sync.js');
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

        // Sort words by status priority (unread/reading first for better learning)
        words.sort((a, b) => {
            const statusPriority = { unread: 0, reading: 1, familiar: 2, memorized: 3 };
            return statusPriority[a.progress.status] - statusPriority[b.progress.status];
        });

        return { ...list, words };
    } catch (error) {
        console.error('Error getting word list with words:', error);
        throw error;
    }
}

/**
 * Start enhanced practice session
 */
export async function startPracticeSession(listId) {
    try {
        const list = await getWordListWithWords(listId);

        if (list.words.length === 0) {
            alert('Esta lista não contém palavras para praticar');
            return;
        }

        // Initialize practice state
        practiceState.startTime = new Date();
        practiceState.cardsReviewed = 0;
        practiceState.correctAnswers = 0;
        practiceState.sessionStats = {
            unread: list.words.filter(w => w.progress.status === 'unread').length,
            reading: list.words.filter(w => w.progress.status === 'reading').length,
            familiar: list.words.filter(w => w.progress.status === 'familiar').length,
            memorized: list.words.filter(w => w.progress.status === 'memorized').length
        };

        const practiceModal = createEnhancedPracticeModal(list);
        const modal = createAndShowModal(practiceModal);
        
        setupEnhancedPracticeSession(modal, list.words);
    } catch (error) {
        console.error('Error starting practice session:', error);
        alert('Erro ao iniciar sessão de prática: ' + error.message);
    }
}

function createEnhancedPracticeModal(list) {
    return `
        <div class="modal fullscreen" id="practice-modal">
            <div class="practice-container">
                <div class="practice-header">
                    <h2>📚 Praticar: ${list.name}</h2>
                    <button class="close-practice" title="Sair da prática (ESC)">
                        <span class="material-symbols-sharp">close</span>
                    </button>
                </div>
                
                <div class="practice-progress">
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: 0%"></div>
                    </div>
                    <div class="progress-text">
                        <span class="material-symbols-sharp">auto_stories</span>
                        <span id="current-card">1</span>/<span id="total-cards">${list.words.length}</span>
                    </div>
                    <div class="session-stats">
                        <div class="stat-item">
                            <span class="material-symbols-sharp">visibility</span>
                            <span id="reviewed-count">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="material-symbols-sharp">timer</span>
                            <span id="session-time">00:00</span>
                        </div>
                    </div>
                </div>
                
                <div class="card-container" id="practice-card-container">
                    <!-- Cards will be dynamically inserted here -->
                </div>
                
                <div class="practice-controls">
                    <div class="navigation-controls">
                        <button id="prev-card" class="nav-btn" disabled title="Carta anterior (←)">
                            <span class="material-symbols-sharp">chevron_left</span>
                        </button>
                        <button id="shuffle-cards" class="nav-btn" title="Embaralhar cartas">
                            <span class="material-symbols-sharp">shuffle</span>
                        </button>
                        <button id="next-card" class="nav-btn" title="Próxima carta (→)">
                            <span class="material-symbols-sharp">chevron_right</span>
                        </button>
                    </div>
                    
                    <div class="status-controls">
                        <button class="status-btn unread" data-status="${WordStatus.UNREAD}" title="Pressione 1">
                            <span class="material-symbols-sharp">visibility_off</span>
                            <span>Não Conheço</span>
                        </button>
                        <button class="status-btn reading" data-status="${WordStatus.READING}" title="Pressione 2">
                            <span class="material-symbols-sharp">visibility</span>
                            <span>Estudando</span>
                        </button>
                        <button class="status-btn familiar" data-status="${WordStatus.FAMILIAR}" title="Pressione 3">
                            <span class="material-symbols-sharp">bookmark</span>
                            <span>Familiar</span>
                        </button>
                        <button class="status-btn memorized" data-status="${WordStatus.MEMORIZED}" title="Pressione 4">
                            <span class="material-symbols-sharp">check_circle</span>
                            <span>Memorizado</span>
                        </button>
                    </div>
                </div>
                
                <div class="keyboard-hints">
                    <div>⌨️ Atalhos: ← → (navegar) | Espaço (virar) | 1-4 (status) | ESC (sair)</div>
                </div>
            </div>
        </div>
    `;
}

function setupEnhancedPracticeSession(modal, words) {
    let currentIndex = 0;
    let sessionTimer = null;
    
    const closeBtn = modal.querySelector('.close-practice');
    const prevBtn = modal.querySelector('#prev-card');
    const nextBtn = modal.querySelector('#next-card');
    const shuffleBtn = modal.querySelector('#shuffle-cards');
    const cardContainer = modal.querySelector('#practice-card-container');
    const progressBar = modal.querySelector('.progress-bar');
    const currentCardText = modal.querySelector('#current-card');
    const reviewedCountText = modal.querySelector('#reviewed-count');
    const sessionTimeText = modal.querySelector('#session-time');

    // Start session timer
    sessionTimer = setInterval(() => {
        if (practiceState.startTime) {
            const elapsed = Math.floor((new Date() - practiceState.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            sessionTimeText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);

    function renderCard(index) {
        const word = words[index];
        cardContainer.innerHTML = createEnhancedPracticeCard(word);
        
        const card = cardContainer.querySelector('.practice-card');
        let isFlipped = false;
        
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.info-btn')) {
                isFlipped = !isFlipped;
                card.classList.toggle('flipped');
                
                // Auto-scroll meaning if it's long
                if (isFlipped) {
                    setTimeout(() => {
                        const meaning = card.querySelector('.meaning');
                        if (meaning && meaning.scrollHeight > meaning.clientHeight) {
                            meaning.scrollTop = 0;
                        }
                    }, 400);
                }
            }
        });

        const infoBtn = cardContainer.querySelector('.practice-info-btn');
        if (infoBtn) {
            infoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showWordDetailModal(word);
            });
        }

        updatePracticeUI(index, words.length);
        updateStatusButtons(modal, word);
    }

    function updatePracticeUI(index, total) {
        currentCardText.textContent = index + 1;
        progressBar.style.width = `${((index + 1) / total) * 100}%`;
        prevBtn.disabled = index === 0;
        nextBtn.disabled = index === total - 1;
        reviewedCountText.textContent = practiceState.cardsReviewed;
    }

    function updateStatusButtons(modal, word) {
        const statusBtns = modal.querySelectorAll('.status-btn');
        statusBtns.forEach(btn => {
            const status = btn.getAttribute('data-status');
            btn.classList.toggle('active', status === word.progress.status);
        });
    }

    function shuffleWords() {
        // Fisher-Yates shuffle algorithm
        for (let i = words.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [words[i], words[j]] = [words[j], words[i]];
        }
        currentIndex = 0;
        renderCard(currentIndex);
        
        // Show feedback
        const originalIcon = shuffleBtn.innerHTML;
        shuffleBtn.innerHTML = '<span class="material-symbols-sharp">check</span>';
        setTimeout(() => {
            shuffleBtn.innerHTML = originalIcon;
        }, 1000);
    }

    // Event listeners
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

    shuffleBtn.addEventListener('click', shuffleWords);

    setupEnhancedStatusButtons(modal, words, () => currentIndex, renderCard);
    setupEnhancedKeyboardNavigation(modal, cardContainer, prevBtn, nextBtn, shuffleWords, () => currentIndex, (newIndex) => {
        currentIndex = newIndex;
        renderCard(currentIndex);
    });

    // Cleanup on modal close
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.removedNodes.forEach((node) => {
                    if (node === modal) {
                        clearInterval(sessionTimer);
                        observer.disconnect();
                    }
                });
            }
        });
    });
    observer.observe(document.body, { childList: true });

    renderCard(currentIndex);
}

function createEnhancedPracticeCard(word) {
    const hasDetails = word.PHONETIC_SPELLING || word.ORIGIN || word.definicaoCompleta;
    
    return `
        <div class="practice-card ${word.progress.status}" data-word-id="${word.ID}">
            <div class="card-front">
                <div class="greek-word">${word.LEXICAL_FORM}</div>
                <div class="transliteration">${word.TRANSLITERATED_LEXICAL_FORM || ''}</div>
                ${hasDetails ? `
                <button class="info-btn card-info-btn practice-info-btn" data-word-id="${word.ID}" title="Ver detalhes">
                    <span class="material-symbols-sharp">info</span>
                </button>` : ''}
                <div class="card-footer">
                    <span class="category-badge">${word.PART_OF_SPEECH || 'não categorizado'}</span>
                    <div class="flip-hint">
                        <span class="material-symbols-sharp">touch_app</span>
                        <span>Clique para revelar o significado</span>
                    </div>
                </div>
            </div>
            <div class="card-back">
                <div class="meaning">${word.USAGE || word.DEFINITION || 'Significado não disponível'}</div>
                <div class="card-footer">
                    <span class="category-badge">${word.PART_OF_SPEECH || 'não categorizado'}</span>
                    <div class="confidence-prompt">
                        <span class="material-symbols-sharp">psychology</span>
                        <span>Como você avalia seu conhecimento?</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function setupEnhancedStatusButtons(modal, words, getCurrentIndex, renderCard) {
    const statusBtns = modal.querySelectorAll('.status-btn');
    statusBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const status = btn.getAttribute('data-status');
            const currentIndex = getCurrentIndex();
            const word = words[currentIndex];

            try {
                await saveWordProgress(word.ID, { status });
                
                // Update card visual state
                const card = modal.querySelector('.practice-card');
                Object.values(WordStatus).forEach(s => card.classList.remove(s));
                card.classList.add(status);

                // Update button states
                statusBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update word progress
                word.progress.status = status;
                practiceState.cardsReviewed++;

                // Update session stats
                updateSessionStats(modal, words);

                // Provide visual feedback
                btn.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    btn.style.transform = '';
                }, 150);

                // Auto-advance with smart timing
                if (currentIndex < words.length - 1) {
                    const delay = status === WordStatus.MEMORIZED ? 800 : 1200;
                    setTimeout(() => {
                        const newIndex = currentIndex + 1;
                        renderCard(newIndex);
                    }, delay);
                } else {
                    // Session complete
                    setTimeout(() => {
                        showSessionComplete(modal, words);
                    }, 1000);
                }
            } catch (error) {
                console.error('Error updating word status:', error);
                alert('Erro ao atualizar status da palavra');
            }
        });
    });
}

function updateSessionStats(modal, words) {
    const stats = {
        unread: words.filter(w => w.progress.status === 'unread').length,
        reading: words.filter(w => w.progress.status === 'reading').length,
        familiar: words.filter(w => w.progress.status === 'familiar').length,
        memorized: words.filter(w => w.progress.status === 'memorized').length
    };
    
    practiceState.sessionStats = stats;
}

function showSessionComplete(modal, words) {
    const sessionDuration = Math.floor((new Date() - practiceState.startTime) / 1000);
    const minutes = Math.floor(sessionDuration / 60);
    const seconds = sessionDuration % 60;
    
    const completionModal = `
        <div class="modal" id="session-complete-modal">
            <div class="modal-content">
                <div class="completion-content">
                    <div class="completion-icon">🎉</div>
                    <h2>Sessão Concluída!</h2>
                    <div class="session-summary">
                        <div class="summary-stat">
                            <span class="material-symbols-sharp">timer</span>
                            <span>Tempo: ${minutes}:${seconds.toString().padStart(2, '0')}</span>
                        </div>
                        <div class="summary-stat">
                            <span class="material-symbols-sharp">auto_stories</span>
                            <span>Palavras: ${words.length}</span>
                        </div>
                        <div class="summary-stat">
                            <span class="material-symbols-sharp">check_circle</span>
                            <span>Memorizadas: ${practiceState.sessionStats.memorized}</span>
                        </div>
                    </div>
                    <div class="completion-actions">
                        <button id="practice-again" class="btn primary">Praticar Novamente</button>
                        <button id="finish-session" class="btn">Finalizar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', completionModal);
    const completionModalEl = document.getElementById('session-complete-modal');
    completionModalEl.style.display = 'flex';
    
    document.getElementById('practice-again').addEventListener('click', () => {
        completionModalEl.remove();
        // Restart with words that aren't memorized
        const wordsToReview = words.filter(w => w.progress.status !== 'memorized');
        if (wordsToReview.length > 0) {
            // Reset modal with filtered words
            modal.remove();
            setTimeout(() => {
                startPracticeSession(words[0].listId || 'current');
            }, 300);
        } else {
            modal.remove();
        }
    });
    
    document.getElementById('finish-session').addEventListener('click', () => {
        completionModalEl.remove();
        modal.remove();
    });
}

function setupEnhancedKeyboardNavigation(modal, cardContainer, prevBtn, nextBtn, shuffleWords, getCurrentIndex, setCurrentIndex) {
    function cardNavHandler(e) {
        if (modal.style.display !== 'none' && !e.target.closest('.modal-content')) {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    if (!prevBtn.disabled) prevBtn.click();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (!nextBtn.disabled) nextBtn.click();
                    break;
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    const card = cardContainer.querySelector('.practice-card');
                    if (card) card.click();
                    break;
                case 's':
                case 'S':
                    e.preventDefault();
                    shuffleWords();
                    break;
            }

            // Number keys 1-4 for status buttons
            if (e.key >= '1' && e.key <= '4') {
                e.preventDefault();
                const statusBtns = modal.querySelectorAll('.status-btn');
                const index = parseInt(e.key) - 1;
                if (index >= 0 && index < statusBtns.length) {
                    statusBtns[index].click();
                }
            }
        }
    }

    document.addEventListener('keydown', cardNavHandler);
}

async function showWordDetailModal(word) {
    try {
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
        modal.style.opacity = '100';
    } catch (error) {
        console.error('Error showing word details:', error);
        alert('Erro ao exibir detalhes da palavra');
    }
}