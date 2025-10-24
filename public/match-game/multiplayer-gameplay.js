/**
 * Multiplayer Gameplay Manager - Handles in-game mechanics and UI
 */

import { 
    updatePlayerProgress,
    endMultiplayerGame,
    GAME_STATES
<<<<<<< HEAD
} from './multiplayer-manager.js?v=1.1';
import { getCurrentSessionData } from './multiplayer-ui.js?v=1.1';
import { closeLobby } from './multiplayer-lobby.js?v=1.1';
=======
} from './multiplayer-manager.js';
import { getCurrentSessionData } from './multiplayer-ui.js';
import { closeLobby } from './multiplayer-lobby.js';
>>>>>>> 485a7111651673321d36bac1405974bd151865fc

let gameTimer = null;
let gameStartTime = null;
let selectedMpWord = null;

/**
 * Start multiplayer game UI
 */
export function startMultiplayerGameUI(sessionData) {
    const gameArea = document.getElementById('multiplayer-game-area');
    const lobbyActions = document.getElementById('lobby-actions');
    
    if (!gameArea) return;
    
    gameArea.style.display = 'block';
    lobbyActions.style.display = 'none';
    
    // Create game interface similar to single player but with multiplayer elements
    gameArea.innerHTML = `
        <div class="multiplayer-game-header">
            <div class="game-timer">
                <span class="material-symbols-sharp">timer</span>
                <span id="mp-timer">${Math.floor(sessionData.timeLimit / 60)}:00</span>
            </div>
            <div class="player-scores" id="player-scores">
                <!-- Scores will be updated here -->
            </div>
        </div>
        
        <div class="matching-area">
            <div class="column portuguese-column">
                <h3><span class="flag">🇧🇷</span> Português</h3>
                <div class="words-container" id="mp-portuguese-words"></div>
            </div>
            
            <div class="column greek-column">
                <h3><span class="flag">🇬🇷</span> Grego Koiné</h3>
                <div class="words-container" id="mp-greek-words"></div>
            </div>
        </div>
    `;
    
    // Start game timer
    gameStartTime = Date.now();
    startGameTimer(sessionData.timeLimit);
    
    // Render words
    renderMultiplayerWords(sessionData.words);
    
    // Update scores
    updatePlayerScores(sessionData);
}

/**
 * Handle session game updates
 */
export function handleSessionGameUpdate(sessionData) {
    if (sessionData.status === GAME_STATES.FINISHED) {
        showMultiplayerResults(sessionData);
        return;
    }
    
    // Update scores and game state
    updatePlayerScores(sessionData);
    
    // Update word states based on player connections
    const currentUser = window.firebaseAuth.getCurrentUser();
    const myConnections = sessionData.players[currentUser?.uid]?.connections || {};
    
    // Mark my correct connections
    Object.entries(myConnections).forEach(([wordId, isCorrect]) => {
        const ptWord = document.querySelector(`[data-mp-word-id="${wordId}"][data-mp-language="portuguese"]`);
        const grWord = document.querySelector(`[data-mp-word-id="${wordId}"][data-mp-language="greek"]`);
        
        if (ptWord && grWord) {
            if (isCorrect) {
                ptWord.classList.add('correct', 'disabled');
                grWord.classList.add('correct', 'disabled');
            }
        }
    });
}

/**
 * Update player scores
 */
function updatePlayerScores(sessionData) {
    const scoresEl = document.getElementById('player-scores');
    if (!scoresEl) return;
    
    const players = Object.values(sessionData.players);
    players.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    scoresEl.innerHTML = players.map((player, index) => `
        <div class="player-score-item ${index === 0 ? 'leading' : ''}">
            <span class="position">#${index + 1}</span>
            <span class="name">${player.name}</span>
            <span class="score">${player.score || 0}</span>
        </div>
    `).join('');
}

/**
 * Render multiplayer words
 */
function renderMultiplayerWords(words) {
    const ptContainer = document.getElementById('mp-portuguese-words');
    const grContainer = document.getElementById('mp-greek-words');
    
    if (!ptContainer || !grContainer) return;
    
    ptContainer.innerHTML = '';
    grContainer.innerHTML = '';
    
    // Shuffle words for each column
    const shuffledPt = [...words].sort(() => Math.random() - 0.5);
    const shuffledGr = [...words].sort(() => Math.random() - 0.5);
    
    // Render Portuguese words
    shuffledPt.forEach(word => {
        const element = createMultiplayerWordElement(word, 'portuguese');
        ptContainer.appendChild(element);
    });
    
    // Render Greek words
    shuffledGr.forEach(word => {
        const element = createMultiplayerWordElement(word, 'greek');
        grContainer.appendChild(element);
    });
}

/**
 * Create multiplayer word element
 */
function createMultiplayerWordElement(word, language) {
    const element = document.createElement('div');
    element.className = 'word-item mp-word-item';
    element.dataset.mpWordId = word.id;
    element.dataset.mpLanguage = language;
    
    if (language === 'portuguese') {
        element.innerHTML = `
            <div class="word-content">
                <div class="word-text">${word.portuguese}</div>
            </div>
        `;
    } else {
        element.innerHTML = `
            <div class="word-content">
                <div class="greek-text">${word.greek}</div>
                ${word.transliteration ? `<div class="transliteration">${word.transliteration}</div>` : ''}
            </div>
        `;
    }
    
    element.addEventListener('click', () => handleMultiplayerWordClick(element, word));
    
    return element;
}

/**
 * Handle multiplayer word click
 */
function handleMultiplayerWordClick(element, word) {
    if (element.classList.contains('disabled')) return;
    
    const language = element.dataset.mpLanguage;
    
    // If no word selected, select this one
    if (!selectedMpWord) {
        selectMpWord(element, word, language);
        return;
    }
    
    // If same word clicked, deselect
    if (selectedMpWord.word.id === word.id && selectedMpWord.language === language) {
        deselectMpWord();
        return;
    }
    
    // If different language, try to make connection
    if (selectedMpWord.language !== language) {
        makeMultiplayerConnection(selectedMpWord, { element, word, language });
    } else {
        // Same language, switch selection
        deselectMpWord();
        selectMpWord(element, word, language);
    }
}

/**
 * Select multiplayer word
 */
function selectMpWord(element, word, language) {
    // Clear previous selection
    document.querySelectorAll('.mp-word-item.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    element.classList.add('selected');
    selectedMpWord = { element, word, language };
}

/**
 * Deselect multiplayer word
 */
function deselectMpWord() {
    if (selectedMpWord) {
        selectedMpWord.element.classList.remove('selected');
        selectedMpWord = null;
    }
}

/**
 * Make multiplayer connection
 */
async function makeMultiplayerConnection(word1, word2) {
    const connection = {
        portuguese: word1.language === 'portuguese' ? word1 : word2,
        greek: word1.language === 'greek' ? word1 : word2
    };
    
    const isCorrect = connection.portuguese.word.id === connection.greek.word.id;
    const currentUser = window.firebaseAuth.getCurrentUser();
    const currentSessionData = getCurrentSessionData();
    
    if (isCorrect) {
        // Correct match
        connection.portuguese.element.classList.add('correct', 'disabled');
        connection.greek.element.classList.add('correct', 'disabled');
        
        const currentPlayer = currentSessionData.players[currentUser.uid];
        const newScore = (currentPlayer.score || 0) + currentSessionData.pointsPerCorrect;
        const newCorrectAnswers = (currentPlayer.correctAnswers || 0) + 1;
        
        // Update connections
        const connections = { ...currentPlayer.connections };
        connections[connection.portuguese.word.id] = true;
        
        // Update progress in Firebase
        await updatePlayerProgress(currentSessionData.id, currentUser.uid, {
            score: newScore,
            correctAnswers: newCorrectAnswers,
            connections: connections
        });
        
    } else {
        // Incorrect match
        connection.portuguese.element.classList.add('incorrect');
        connection.greek.element.classList.add('incorrect');
        
        const currentPlayer = currentSessionData.players[currentUser.uid];
        const newScore = Math.max(0, (currentPlayer.score || 0) + currentSessionData.pointsPerIncorrect);
        
        // Update progress in Firebase
        await updatePlayerProgress(currentSessionData.id, currentUser.uid, {
            score: newScore,
            correctAnswers: currentPlayer.correctAnswers || 0,
            connections: currentPlayer.connections || {}
        });
        
        // Remove incorrect styling after delay
        setTimeout(() => {
            connection.portuguese.element.classList.remove('incorrect');
            connection.greek.element.classList.remove('incorrect');
        }, 1500);
    }
    
    // Clear selection
    deselectMpWord();
}

/**
 * Start game timer
 */
function startGameTimer(timeLimit) {
    const timerEl = document.getElementById('mp-timer');
    let remainingTime = timeLimit;
    
    gameTimer = setInterval(() => {
        remainingTime--;
        
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        
        if (timerEl) {
            timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Change color when time is running out
            if (remainingTime <= 30) {
                timerEl.style.color = '#ff4444';
            } else if (remainingTime <= 60) {
                timerEl.style.color = '#ff8800';
            }
        }
        
        if (remainingTime <= 0) {
            clearInterval(gameTimer);
            gameTimer = null;
            handleGameTimeout();
        }
    }, 1000);
}

/**
 * Handle game timeout
 */
async function handleGameTimeout() {
    const currentSessionData = getCurrentSessionData();
    const currentUser = window.firebaseAuth.getCurrentUser();
    const isHost = currentSessionData.players[currentUser.uid]?.isHost;
    
    if (isHost) {
        // Host ends the game
        await endMultiplayerGame(currentSessionData.id, {
            reason: 'timeout',
            finalScores: currentSessionData.players
        });
    }
}

/**
 * Show multiplayer results
 */
function showMultiplayerResults(sessionData) {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    
    const gameArea = document.getElementById('multiplayer-game-area');
    const players = Object.values(sessionData.players);
    players.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    if (gameArea) {
        gameArea.innerHTML = `
            <div class="multiplayer-results">
                <h2>🏆 Resultados Finais</h2>
                <div class="final-rankings">
                    ${players.map((player, index) => `
                        <div class="ranking-item ${index === 0 ? 'winner' : ''}">
                            <div class="position">${index + 1}º</div>
                            <div class="player-info">
                                <div class="name">${player.name}</div>
                                <div class="stats">
                                    ${player.score || 0} pontos • ${player.correctAnswers || 0} acertos
                                </div>
                            </div>
                            ${index === 0 ? '<div class="crown">👑</div>' : ''}
                        </div>
                    `).join('')}
                </div>
                <div class="results-actions">
                    <button id="new-mp-game-btn" class="btn primary">Nova Partida</button>
                    <button id="leave-results-btn" class="btn secondary">Sair</button>
                </div>
            </div>
        `;
        
        // Bind result actions
        document.getElementById('new-mp-game-btn')?.addEventListener('click', handleNewMpGame);
        document.getElementById('leave-results-btn')?.addEventListener('click', handleLeaveResults);
    }
}

/**
 * Handle new multiplayer game
 */
function handleNewMpGame() {
    // Reset session to waiting state (only host can do this)
    const currentSessionData = getCurrentSessionData();
    const currentUser = window.firebaseAuth.getCurrentUser();
    const isHost = currentSessionData.players[currentUser.uid]?.isHost;
    
    if (isHost) {
        alert('Funcionalidade em desenvolvimento - Criar nova partida');
    } else {
        alert('Apenas o host pode iniciar uma nova partida');
    }
}

/**
 * Handle leave results
 */
async function handleLeaveResults() {
    try {
        const currentSessionData = getCurrentSessionData();
        const currentUser = window.firebaseAuth.getCurrentUser();
        await leaveMultiplayerSession(currentSessionData.id, currentUser.uid);
        closeLobby();
    } catch (error) {
        console.error('Error leaving results:', error);
        closeLobby();
    }
}

/**
 * Cleanup function
 */
export function cleanupGameplay() {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    selectedMpWord = null;
}

// Add required CSS for gameplay components
const style = document.createElement('style');
style.textContent = `
    .multiplayer-game-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        background: var(--bg-primary);
        padding: 1rem;
        border-radius: 8px;
    }
    
    .game-timer {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.2rem;
        font-weight: bold;
    }
    
    .player-scores {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
    }
    
    .player-score-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--bg-secondary);
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.9rem;
    }
    
    .player-score-item.leading {
        background: var(--accent);
        color: white;
    }
    
    .position {
        font-weight: bold;
    }
    
    .mp-word-item.selected {
        border-color: var(--accent);
        background: rgba(74, 144, 226, 0.1);
        transform: translateY(-2px);
    }
    
    .multiplayer-results {
        text-align: center;
        padding: 2rem;
    }
    
    .final-rankings {
        margin: 2rem 0;
    }
    
    .ranking-item {
        display: flex;
        align-items: center;
        background: var(--bg-primary);
        margin: 1rem 0;
        padding: 1rem;
        border-radius: 8px;
        gap: 1rem;
    }
    
    .ranking-item.winner {
        background: linear-gradient(135deg, #ffd700, #ffed4e);
        color: #333;
    }
    
    .ranking-item .position {
        font-size: 1.5rem;
        font-weight: bold;
        min-width: 40px;
    }
    
    .ranking-item .player-info {
        flex: 1;
        text-align: left;
    }
    
    .ranking-item .name {
        font-size: 1.2rem;
        font-weight: 500;
    }
    
    .ranking-item .stats {
        font-size: 0.9rem;
        opacity: 0.8;
    }
    
    .crown {
        font-size: 2rem;
    }
    
    @media (max-width: 768px) {
        .multiplayer-game-header {
            flex-direction: column;
            gap: 1rem;
        }
        
        .player-scores {
            justify-content: center;
        }
        
        .matching-area {
            grid-template-columns: 1fr;
            gap: 1rem;
        }
    }
`;
document.head.appendChild(style);