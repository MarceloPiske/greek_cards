/**
 * Match Game Logic Module - Handles game logic and data management
 */

import { getUserWordLists, getWordsFromList, createDefaultWordList } from './word-list-manager.js?v=1.1';
import { updateWordProgress, getWordsProgress, PROGRESS_STATUS } from './word-progress-manager.js?v=1.1';
import { saveGameSession } from './game-data-manager.js?v=1.1';

// Game state - exported for UI access
export const gameData = {
    selectedListId: null,
    selectedList: null,
    words: [],
    currentRound: [],
    connections: new Map(),
    selectedWord: null,
    score: 0,
    correctCount: 0,
    totalRounds: 0,
    startTime: null,
    gameTimer: null,
    currentLevel: 1,
    wordsProgress: new Map()
};

// Game configuration
const WORDS_PER_ROUND = 5;
const POINTS_PER_CORRECT = 10;
const HINT_PENALTY = -2;

/**
 * Initialize Firebase Auth
 */
export async function initGame() {
    if (typeof window.firebaseAuth !== 'undefined') {
        try {
            await window.firebaseAuth.initAuth();
        } catch (error) {
            console.error('Failed to initialize Firebase Auth:', error);
        }
    }
}

/**
 * Load available word lists
 */
export async function loadWordLists() {
    try {
        console.log('Loading word lists...');
        let wordLists = await getUserWordLists();
        console.log('Retrieved word lists:', wordLists.length);
        
        // If no lists found, create default list
        if (wordLists.length === 0) {
            console.log('No word lists found, creating default list');
            try {
                const defaultList = await createDefaultWordList();
                wordLists = [defaultList];
                console.log('Default list created:', defaultList);
            } catch (error) {
                console.error('Failed to create default list:', error);
                throw new Error('Não foi possível criar lista padrão. Verifique se o vocabulário foi carregado.');
            }
        }
        
        // Populate list selection UI
        const listSelect = document.getElementById('word-list-select');
        listSelect.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Selecione uma lista...';
        listSelect.appendChild(defaultOption);
        
        for (const list of wordLists) {
            const option = document.createElement('option');
            option.value = list.id;
            option.textContent = `${list.name} (${list.wordIds ? list.wordIds.length : 0} palavras)`;
            listSelect.appendChild(option);
        }
        
        console.log(`Populated ${wordLists.length} word lists in select`);
    } catch (error) {
        console.error('Error loading word lists:', error);
        
        // Show error in UI
        const listSelect = document.getElementById('word-list-select');
        listSelect.innerHTML = '<option value="">Erro ao carregar listas</option>';
        
        throw error;
    }
}

/**
 * Select word list and start game
 */
export async function selectWordList() {
    try {
        const listSelect = document.getElementById('word-list-select');
        const selectedListId = listSelect.value;
        
        if (!selectedListId) {
            showGameStatus('Por favor, selecione uma lista de palavras.', 'warning');
            return;
        }
        
        console.log('Selected list ID:', selectedListId);
        
        // Load words from selected list
        gameData.selectedListId = selectedListId;
        gameData.words = await getWordsFromList(selectedListId);
        
        console.log('Loaded words:', gameData.words.length);
        
        if (gameData.words.length < WORDS_PER_ROUND) {
            showGameStatus(`A lista selecionada tem apenas ${gameData.words.length} palavras. São necessárias pelo menos ${WORDS_PER_ROUND} palavras.`, 'error');
            return;
        }
        
        // Load progress for all words
        gameData.wordsProgress = await getWordsProgress(gameData.words.map(w => w.id));
        console.log('Loaded progress for words:', gameData.wordsProgress.size);
        
        // Update UI with selected list name
        const selectedOption = listSelect.options[listSelect.selectedIndex];
        document.getElementById('selected-list-name').textContent = selectedOption.textContent;
        
        // Hide selection modal and show game
        hideListSelection();
        document.querySelector('.game-container').style.display = 'block';
        
        // Reset and start first round
        resetGame();
        startNewRound();
        
        console.log(`Game started with list: ${selectedListId}, ${gameData.words.length} words`);
    } catch (error) {
        console.error('Error selecting word list:', error);
        showGameStatus('Erro ao carregar a lista de palavras. Tente novamente.', 'error');
    }
}

/**
 * Start a new round
 */
export function startNewRound() {
    if (gameData.words.length < WORDS_PER_ROUND) {
        showGameStatus('Não há palavras suficientes para iniciar o jogo.', 'error');
        return;
    }
    
    // Reset round state
    gameData.connections.clear();
    gameData.selectedWord = null;
    
    // Initialize completed words set if not exists
    if (!gameData.completedWords) {
        gameData.completedWords = new Set();
    }
    
    // Select words for this round, excluding already completed ones
    gameData.currentRound = selectWordsForRound();
    
    // Start timer if first round
    if (!gameData.startTime) {
        gameData.startTime = Date.now();
        startTimer();
    }
    
    gameData.totalRounds++;
    
    renderWords();
    clearConnections();
    updateUI();
    hideGameStatus();
    
    console.log('New round started with words:', gameData.currentRound);
}

/**
 * Select words for current round based on progress, excluding completed words
 */
function selectWordsForRound() {
    // Filter out completed words
    const availableWords = gameData.words.filter(word => 
        !gameData.completedWords || !gameData.completedWords.has(word.id)
    );
    
    if (availableWords.length === 0) {
        return [];
    }
    
    // Prioritize words that need more practice
    const sortedWords = availableWords.sort((a, b) => {
        const progressA = gameData.wordsProgress.get(a.id) || { status: PROGRESS_STATUS.NEW, reviewCount: 0 };
        const progressB = gameData.wordsProgress.get(b.id) || { status: PROGRESS_STATUS.NEW, reviewCount: 0 };
        
        // Priority: new > learning > familiar > memorized > mastered
        const statusPriority = {
            [PROGRESS_STATUS.NEW]: 5,
            [PROGRESS_STATUS.LEARNING]: 4,
            [PROGRESS_STATUS.FAMILIAR]: 3,
            [PROGRESS_STATUS.MEMORIZED]: 2,
            [PROGRESS_STATUS.MASTERED]: 1
        };
        
        const priorityA = statusPriority[progressA.status] || 5;
        const priorityB = statusPriority[progressB.status] || 5;
        
        if (priorityA !== priorityB) {
            return priorityB - priorityA; // Higher priority first
        }
        
        // If same priority, use review count (less reviewed first)
        return progressA.reviewCount - progressB.reviewCount;
    });
    
    // Take up to WORDS_PER_ROUND words
    const wordsToSelect = Math.min(WORDS_PER_ROUND, sortedWords.length);
    const selectedWords = [];
    
    for (let i = 0; i < wordsToSelect; i++) {
        selectedWords.push(sortedWords[i]);
    }
    
    return selectedWords;
}

/**
 * Make a connection between two words
 */
export function makeConnection(word1, word2) {
    const connection = {
        portuguese: word1.language === 'portuguese' ? word1 : word2,
        greek: word1.language === 'greek' ? word1 : word2
    };
    
    // Check if connection is correct
    const isCorrect = connection.portuguese.word.id === connection.greek.word.id;
    
    // Store connection temporarily
    gameData.connections.set(connection.portuguese.id, connection.greek.id);
    
    // Apply immediate visual feedback
    if (isCorrect) {
        // Correct match - green feedback and disable
        connection.portuguese.element.classList.add('correct');
        connection.greek.element.classList.add('correct');
        connection.portuguese.element.classList.add('disabled');
        connection.greek.element.classList.add('disabled');
        connection.portuguese.element.classList.remove('selected');
        connection.greek.element.classList.remove('selected');
        
        // Add points for correct answer
        gameData.score += POINTS_PER_CORRECT;
        gameData.correctCount++;
        
        // Update word progress
        updateWordProgress(connection.portuguese.word.id, true);
        
        console.log('Correct match:', connection.portuguese.word.portuguese, '→', connection.greek.word.greek);
        
        // Remove word from current round and add new word
        setTimeout(() => {
            removeWordAndAddNew(connection.portuguese.word.id);
        }, 1000);
    } else {
        // Incorrect match - red feedback
        connection.portuguese.element.classList.add('incorrect');
        connection.greek.element.classList.add('incorrect');
        connection.portuguese.element.classList.remove('selected');
        connection.greek.element.classList.remove('selected');
        
        // Deduct points for incorrect answer
        gameData.score = Math.max(0, gameData.score - 15);
        
        // Update word progress for both words (incorrect)
        updateWordProgress(connection.portuguese.word.id, false);
        updateWordProgress(connection.greek.word.id, false);
        
        console.log('Incorrect match:', connection.portuguese.word.portuguese, '→', connection.greek.word.greek);
        
        // Allow retry by removing the connection and resetting after a delay
        setTimeout(() => {
            connection.portuguese.element.classList.remove('incorrect');
            connection.greek.element.classList.remove('incorrect');
            gameData.connections.delete(connection.portuguese.id);
        }, 1500);
    }
    
    // Clear selection
    gameData.selectedWord = null;
    
    // Update UI
    updateUI();
}

/**
 * Remove correctly matched word and add a new one from the list
 */
function removeWordAndAddNew(correctWordId) {
    // Remove the correct word from current round
    const wordIndex = gameData.currentRound.findIndex(word => word.id === correctWordId);
    if (wordIndex !== -1) {
        gameData.currentRound.splice(wordIndex, 1);
    }
    
    // Track completed words
    if (!gameData.completedWords) {
        gameData.completedWords = new Set();
    }
    gameData.completedWords.add(correctWordId);
    
    // Find a new word that hasn't been used yet
    const availableWords = gameData.words.filter(word => 
        !gameData.completedWords.has(word.id) &&
        !gameData.currentRound.some(roundWord => roundWord.id === word.id)
    );
    
    if (availableWords.length > 0) {
        // Select next word based on progress (prioritize words that need practice)
        const sortedAvailable = availableWords.sort((a, b) => {
            const progressA = gameData.wordsProgress.get(a.id) || { status: PROGRESS_STATUS.NEW, reviewCount: 0 };
            const progressB = gameData.wordsProgress.get(b.id) || { status: PROGRESS_STATUS.NEW, reviewCount: 0 };
            
            // Priority: new > learning > familiar > memorized > mastered
            const statusPriority = {
                [PROGRESS_STATUS.NEW]: 5,
                [PROGRESS_STATUS.LEARNING]: 4,
                [PROGRESS_STATUS.FAMILIAR]: 3,
                [PROGRESS_STATUS.MEMORIZED]: 2,
                [PROGRESS_STATUS.MASTERED]: 1
            };
            
            const priorityA = statusPriority[progressA.status] || 5;
            const priorityB = statusPriority[progressB.status] || 5;
            
            if (priorityA !== priorityB) {
                return priorityB - priorityA;
            }
            
            return progressA.reviewCount - progressB.reviewCount;
        });
        
        // Add the highest priority word
        const newWord = sortedAvailable[0];
        gameData.currentRound.push(newWord);
        
        console.log('Added new word to round:', newWord.portuguese, '→', newWord.greek);
        
        // Re-render words to include the new one
        renderWords();
    } else {
        // All words completed - check if game should end
        if (gameData.completedWords.size >= gameData.words.length) {
            setTimeout(() => {
                showGameStatus('🎉 PARABÉNS! Você completou todas as palavras da lista! 🎉', 'success');
                
                // Save final game session
                saveGameSession({
                    listId: gameData.selectedListId,
                    totalWords: gameData.words.length,
                    completedWords: gameData.completedWords.size,
                    correctConnections: gameData.correctCount,
                    totalConnections: gameData.correctCount,
                    accuracy: 100,
                    finalScore: gameData.score,
                    timeSpent: Math.floor((Date.now() - gameData.startTime) / 1000),
                    gameCompleted: true
                });
                
                // Show final results
                setTimeout(() => {
                    showFinalResults();
                }, 2000);
            }, 500);
        }
    }
    
    updateUI();
}

/**
 * Show final results when all words are completed
 */
function showFinalResults() {
    const modal = document.getElementById('results-modal');
    const statsContainer = document.getElementById('results-stats');
    
    if (!modal || !statsContainer) return;
    
    const totalTime = Math.floor((Date.now() - gameData.startTime) / 1000);
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    
    // Update modal title for completion
    const modalTitle = modal.querySelector('h2');
    if (modalTitle) {
        modalTitle.textContent = '🏆 Lista Completa! 🏆';
    }
    
    statsContainer.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">🎯 Palavras Completadas:</span>
            <span class="stat-value">${gameData.completedWords.size}/${gameData.words.length}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">⭐ Pontuação Final:</span>
            <span class="stat-value">${gameData.score} pontos</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">✅ Total de Acertos:</span>
            <span class="stat-value">${gameData.correctCount}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">🕒 Tempo Total:</span>
            <span class="stat-value">${minutes}:${seconds.toString().padStart(2, '0')}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">🔥 Média por Palavra:</span>
            <span class="stat-value">${Math.round(totalTime / gameData.words.length)}s</span>
        </div>
    `;
    
    modal.style.display = 'flex';
}

/**
 * Check if round is complete
 */
function checkRoundCompletion() {
    // This function is no longer needed since we handle completion per word
    // Keep it for compatibility but make it do nothing
    return;
}

/**
 * Show hint
 */
export function showHint() {
    const unmatched = gameData.currentRound.filter(word => 
        !Array.from(gameData.connections.keys()).includes(word.id) &&
        !Array.from(gameData.connections.values()).includes(word.id)
    );
    
    if (unmatched.length === 0) {
        showGameStatus('Todas as palavras já foram conectadas!', 'info');
        return;
    }
    
    // Show hint for first unmatched word
    const hintWord = unmatched[0];
    const portugueseEl = document.querySelector(`[data-word-id="${hintWord.id}"][data-language="portuguese"]`);
    const greekEl = document.querySelector(`[data-word-id="${hintWord.id}"][data-language="greek"]`);
    
    if (portugueseEl && greekEl) {
        portugueseEl.style.animation = 'pulse 1s ease-in-out 3';
        greekEl.style.animation = 'pulse 1s ease-in-out 3';
        
        setTimeout(() => {
            portugueseEl.style.animation = '';
            greekEl.style.animation = '';
        }, 3000);
        
        // Deduct points for hint
        gameData.score = Math.max(0, gameData.score + HINT_PENALTY);
        updateUI();
        
        showGameStatus(`Dica: "${hintWord.portuguese}" se conecta com "${hintWord.greek}"`, 'info');
    }
}

/**
 * Reset current round
 */
export function resetRound() {
    gameData.connections.clear();
    gameData.selectedWord = null;
    
    // Reset word states
    document.querySelectorAll('.word-item').forEach(el => {
        el.className = 'word-item';
    });
    
    clearConnections();
    updateUI();
    hideGameStatus();
}

/**
 * Reset entire game
 */
export function resetGame() {
    gameData.connections.clear();
    gameData.selectedWord = null;
    gameData.score = 0;
    gameData.correctCount = 0;
    gameData.totalRounds = 0;
    gameData.startTime = null;
    gameData.completedWords = new Set(); // Reset completed words
    
    if (gameData.gameTimer) {
        clearInterval(gameData.gameTimer);
        gameData.gameTimer = null;
    }
    
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.textContent = '00:00';
    }
    clearConnections();
    updateUI();
    hideGameStatus();
}

// UI Helper functions (moved from UI module to avoid circular imports)
function renderWords() {
    const portugueseContainer = document.getElementById('portuguese-words');
    const greekContainer = document.getElementById('greek-words');
    
    if (!portugueseContainer || !greekContainer) return;
    
    // Clear containers
    portugueseContainer.innerHTML = '';
    greekContainer.innerHTML = '';
    
    // Shuffle the words for each column separately to make it challenging
    const shuffledPortuguese = [...gameData.currentRound].sort(() => Math.random() - 0.5);
    const shuffledGreek = [...gameData.currentRound].sort(() => Math.random() - 0.5);
    
    // Render Portuguese words
    shuffledPortuguese.forEach(word => {
        const wordElement = createWordElement(word, 'portuguese');
        portugueseContainer.appendChild(wordElement);
    });
    
    // Render Greek words
    shuffledGreek.forEach(word => {
        const wordElement = createWordElement(word, 'greek');
        greekContainer.appendChild(wordElement);
    });
}

function createWordElement(word, language) {
    const element = document.createElement('div');
    element.className = 'word-item';
    element.dataset.wordId = word.id;
    element.dataset.language = language;
    
    // Get progress info
    const progress = gameData.wordsProgress.get(word.id);
    const statusInfo = getStatusDisplayInfo(progress ? progress.status : PROGRESS_STATUS.NEW);
    
    if (language === 'portuguese') {
        element.innerHTML = `
            <div class="word-content">
                <div class="word-text">${word.portuguese}</div>
                <div class="progress-indicator">
                    <span class="material-symbols-sharp" style="color: ${statusInfo.color}; font-size: 16px;">
                        ${statusInfo.icon}
                    </span>
                </div>
            </div>
        `;
    } else {
        element.innerHTML = `
            <div class="word-content">
                <div class="greek-text">${word.greek}</div>
                ${word.transliteration ? `<div class="transliteration">${word.transliteration}</div>` : ''}
                <div class="progress-indicator">
                    <span class="material-symbols-sharp" style="color: ${statusInfo.color}; font-size: 16px;">
                        ${statusInfo.icon}
                    </span>
                </div>
            </div>
        `;
    }
    
    element.addEventListener('click', () => handleWordClick(element, word));
    
    return element;
}

function handleWordClick(element, word) {
    if (element.classList.contains('disabled')) return;
    
    const language = element.dataset.language;
    const wordId = parseInt(element.dataset.wordId);
    
    // If no word is selected, select this one
    if (!gameData.selectedWord) {
        selectWord(element, word, language);
        return;
    }
    
    // If same word clicked, deselect
    if (gameData.selectedWord.id === wordId && gameData.selectedWord.language === language) {
        deselectWord();
        return;
    }
    
    // If different language, try to make connection
    if (gameData.selectedWord.language !== language) {
        makeConnection(gameData.selectedWord, { element, word, language });
    } else {
        // Same language, switch selection
        deselectWord();
        selectWord(element, word, language);
    }
}

function selectWord(element, word, language) {
    // Clear previous selection
    document.querySelectorAll('.word-item.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    element.classList.add('selected');
    gameData.selectedWord = { element, word, language, id: word.id };
}

function deselectWord() {
    if (gameData.selectedWord) {
        gameData.selectedWord.element.classList.remove('selected');
        gameData.selectedWord = null;
    }
}

function clearConnections() {
    const svg = document.getElementById('connection-svg');
    if (svg) {
        svg.innerHTML = '';
    }
}

function updateUI() {
    const scoreElement = document.getElementById('score');
    const correctElement = document.getElementById('correct-count');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (scoreElement) scoreElement.textContent = gameData.score;
    if (correctElement) correctElement.textContent = gameData.correctCount;
    
    // Update progress bar based on completed words vs total words
    if (progressFill && progressText && gameData.words.length > 0) {
        const completedCount = gameData.completedWords ? gameData.completedWords.size : 0;
        const progress = (completedCount / gameData.words.length) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${completedCount}/${gameData.words.length} palavras`;
    }
}

function startTimer() {
    gameData.gameTimer = setInterval(() => {
        if (gameData.startTime) {
            const elapsed = Math.floor((Date.now() - gameData.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timerElement = document.getElementById('timer');
            if (timerElement) {
                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }
    }, 1000);
}

function showGameStatus(message, type = 'info') {
    const statusEl = document.getElementById('game-status');
    const messageEl = document.getElementById('status-message');
    
    if (statusEl && messageEl) {
        messageEl.textContent = message;
        statusEl.className = `game-status ${type}`;
        statusEl.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(hideGameStatus, 5000);
    }
}

function hideGameStatus() {
    const statusEl = document.getElementById('game-status');
    if (statusEl) {
        statusEl.style.display = 'none';
    }
}

function hideListSelection() {
    const modal = document.getElementById('list-selection-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    if (gameData.selectedListId) {
        // Show game container if list is already selected
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.style.display = 'block';
        }
    }
}

function showResults() {
    const modal = document.getElementById('results-modal');
    const statsContainer = document.getElementById('results-stats');
    
    if (!modal || !statsContainer) return;
    
    const totalTime = Math.floor((Date.now() - gameData.startTime) / 1000);
    const accuracy = gameData.currentRound.length > 0 ? 
        Math.round((gameData.correctCount / (gameData.totalRounds * 5)) * 100) : 0; 
    
    statsContainer.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Pontuação Total:</span>
            <span class="stat-value">${gameData.score} pontos</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Acertos:</span>
            <span class="stat-value">${gameData.correctCount}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Rodadas Jogadas:</span>
            <span class="stat-value">${gameData.totalRounds}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Precisão:</span>
            <span class="stat-value">${accuracy}%</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Tempo Total:</span>
            <span class="stat-value">${Math.floor(totalTime / 60)}:${(totalTime % 60).toString().padStart(2, '0')}</span>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function getStatusDisplayInfo(status) {
    const statusInfo = {
        [PROGRESS_STATUS.NEW]: {
            label: 'Novo',
            color: '#gray',
            icon: 'fiber_new',
            description: 'Ainda não estudada'
        },
        [PROGRESS_STATUS.LEARNING]: {
            label: 'Aprendendo',
            color: '#ff9800',
            icon: 'school',
            description: 'Em processo de aprendizado'
        },
        [PROGRESS_STATUS.FAMILIAR]: {
            label: 'Familiar',
            color: '#2196f3',
            icon: 'visibility',
            description: 'Já conhece, mas precisa praticar'
        },
        [PROGRESS_STATUS.MEMORIZED]: {
            label: 'Memorizada',
            color: '#4caf50',
            icon: 'check_circle',
            description: 'Bem memorizada'
        },
        [PROGRESS_STATUS.MASTERED]: {
            label: 'Dominada',
            color: '#9c27b0',
            icon: 'stars',
            description: 'Completamente dominada'
        }
    };
    
    return statusInfo[status] || statusInfo[PROGRESS_STATUS.NEW];
}