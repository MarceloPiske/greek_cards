/**
 * Match Game UI Module - Handles UI rendering and user interactions
 */

import { gameData, startNewRound, showHint, resetRound, resetGame } from './match-game-logic.js';
import { getStatusDisplayInfo, PROGRESS_STATUS } from './word-progress-manager.js';

/**
 * Render words in both columns with progress indicators
 */
export function renderWords() {
    const portugueseContainer = document.getElementById('portuguese-words');
    const greekContainer = document.getElementById('greek-words');
    
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

/**
 * Create a word element with progress indicator
 */
export function createWordElement(word, language) {
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

/**
 * Handle word click
 */
export function handleWordClick(element, word) {
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
        // Import and use the makeConnection function from logic module
        import('./match-game-logic.js').then(({ makeConnection }) => {
            makeConnection(gameData.selectedWord, { element, word, language });
        });
    } else {
        // Same language, switch selection
        deselectWord();
        selectWord(element, word, language);
    }
}

/**
 * Select a word
 */
export function selectWord(element, word, language) {
    // Clear previous selection
    document.querySelectorAll('.word-item.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    element.classList.add('selected');
    gameData.selectedWord = { element, word, language, id: word.id };
}

/**
 * Deselect current word
 */
export function deselectWord() {
    if (gameData.selectedWord) {
        gameData.selectedWord.element.classList.remove('selected');
        gameData.selectedWord = null;
    }
}

/**
 * Show game status message
 */
export function showGameStatus(message, type = 'info') {
    const statusEl = document.getElementById('game-status');
    const messageEl = document.getElementById('status-message');
    
    messageEl.textContent = message;
    statusEl.className = `game-status ${type}`;
    statusEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(hideGameStatus, 5000);
}

/**
 * Hide game status message
 */
export function hideGameStatus() {
    document.getElementById('game-status').style.display = 'none';
}

/**
 * Show results modal
 */
export function showResults() {
    const modal = document.getElementById('results-modal');
    const statsContainer = document.getElementById('results-stats');
    
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

/**
 * Close results modal
 */
export function closeResultsModal() {
    document.getElementById('results-modal').style.display = 'none';
}

/**
 * Show list selection modal
 */
export function showListSelection() {
    const modal = document.getElementById('list-selection-modal');
    modal.style.display = 'flex';
    
    // Hide game container
    document.querySelector('.game-container').style.display = 'none';
}

/**
 * Hide list selection modal
 */
export function hideListSelection() {
    const modal = document.getElementById('list-selection-modal');
    modal.style.display = 'none';
    
    if (gameData.selectedListId) {
        // Show game container if list is already selected
        document.querySelector('.game-container').style.display = 'block';
    }
}

/**
 * Play again
 */
export function playAgain() {
    closeResultsModal();
    resetGame();
    startNewRound();
}

/**
 * Back to menu
 */
export function backToMenu() {
    window.location.href = '../index.html';
}

/**
 * Bind all UI event listeners
 */
export function bindEventListeners() {
    document.getElementById('new-round-btn').addEventListener('click', startNewRound);
    // Remove check answers button listener since it's no longer needed
    document.getElementById('hint-btn').addEventListener('click', showHint);
    document.getElementById('reset-round-btn').addEventListener('click', resetRound);
    document.getElementById('close-results').addEventListener('click', closeResultsModal);
    document.getElementById('play-again-btn').addEventListener('click', playAgain);
    document.getElementById('back-to-menu-btn').addEventListener('click', backToMenu);
}

// Add CSS for pulse animation
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); box-shadow: 0 0 20px var(--accent); }
        100% { transform: scale(1); }
    }
    
    .greek-text {
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
    }
    
    .transliteration {
        font-size: 0.8rem;
        color: var(--text-secondary);
        font-style: italic;
    }
`;
document.head.appendChild(style);