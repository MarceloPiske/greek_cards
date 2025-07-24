/**
 * Practice session modal functionality
 */

import {
    WordStatus,
    getWordListWithWords,
    updateWordProgress
} from './vocabulary.js';

import { 
    createAndShowModal,
    getStatusLabel
} from './modal-utils.js';

import {
    createWordDetailContent
} from './modal-components.js';

import { showWordDetailModal } from './ui_modal.js';

/**
 * Start a practice session with a list
 */
export async function startPracticeSession(listId) {
    try {
        const list = await getWordListWithWords(listId);

        if (list.words.length === 0) {
            alert('Esta lista não contém palavras para praticar');
            return;
        }

        const practiceModal = createPracticeModal(list);
        const modal = createAndShowModal(practiceModal);
        
        setupPracticeSession(modal, list.words);
    } catch (error) {
        console.error('Error starting practice session:', error);
        alert('Erro ao iniciar sessão de prática');
    }
}

function createPracticeModal(list) {
    return `
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
}

function setupPracticeSession(modal, words) {
    let currentIndex = 0;
    
    const closeBtn = modal.querySelector('.close-practice');
    const prevBtn = modal.querySelector('#prev-card');
    const nextBtn = modal.querySelector('#next-card');
    const cardContainer = modal.querySelector('#practice-card-container');
    const progressBar = modal.querySelector('.progress-bar');
    const currentCardText = modal.querySelector('#current-card');

    function renderCard(index) {
        const word = words[index];
        cardContainer.innerHTML = createPracticeCard(word);
        
        const card = cardContainer.querySelector('.practice-card');
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.info-btn')) {
                card.classList.toggle('flipped');
            }
        });

        const infoBtn = cardContainer.querySelector('.practice-info-btn');
        if (infoBtn) {
            infoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showWordDetailModal(word.ID);
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
    }

    function updateStatusButtons(modal, word) {
        const statusBtns = modal.querySelectorAll('.status-btn');
        statusBtns.forEach(btn => {
            const status = btn.getAttribute('data-status');
            btn.classList.toggle('active', status === word.progress.status);
        });
    }

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

    setupPracticeStatusButtons(modal, words, () => currentIndex, renderCard);
    setupKeyboardNavigation(modal, cardContainer, prevBtn, nextBtn, () => currentIndex, (newIndex) => {
        currentIndex = newIndex;
        renderCard(currentIndex);
    });

    renderCard(currentIndex);
}

function createPracticeCard(word) {
    return `
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
}

function setupPracticeStatusButtons(modal, words, getCurrentIndex, renderCard) {
    const statusBtns = modal.querySelectorAll('.status-btn');
    statusBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const status = btn.getAttribute('data-status');
            const currentIndex = getCurrentIndex();
            const wordId = modal.querySelector('.practice-card').getAttribute('data-word-id');

            try {
                await updateWordProgress(wordId, { status });
                
                const card = modal.querySelector('.practice-card');
                Object.values(WordStatus).forEach(s => card.classList.remove(s));
                card.classList.add(status);

                statusBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                words[currentIndex].progress.status = status;

                if (currentIndex < words.length - 1) {
                    setTimeout(() => {
                        renderCard(currentIndex + 1);
                    }, 500);
                }
            } catch (error) {
                console.error('Error updating word status:', error);
                alert('Erro ao atualizar status');
            }
        });
    });
}

function setupKeyboardNavigation(modal, cardContainer, prevBtn, nextBtn, getCurrentIndex, setCurrentIndex) {
    function cardNavHandler(e) {
        if (modal.style.display !== 'none') {
            switch (e.key) {
                case 'ArrowLeft':
                    if (!prevBtn.disabled) prevBtn.click();
                    break;
                case 'ArrowRight':
                    if (!nextBtn.disabled) nextBtn.click();
                    break;
                case 'Escape':
                    modal.remove();
                    document.removeEventListener('keydown', cardNavHandler);
                    break;
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    const card = cardContainer.querySelector('.practice-card');
                    card.classList.toggle('flipped');
                    break;
            }

            if (e.key >= '1' && e.key <= '4') {
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

/**
 * Toggle between list and card view
 */
export function toggleViewMode() {
    // This function would be implemented if needed
}