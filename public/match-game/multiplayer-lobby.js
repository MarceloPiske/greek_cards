/**
 * Multiplayer Lobby Manager - Handles lobby UI and session management
 */

import { 
    startSessionListener, 
    stopSessionListener,
    startMultiplayerGame,
    leaveMultiplayerSession,
    GAME_STATES,
    PLAYER_STATES
} from './multiplayer-manager.js?v=1.1';
import { getCurrentSessionData, setCurrentSessionData } from './multiplayer-ui.js?v=1.1';
import { startMultiplayerGameUI, handleSessionGameUpdate } from './multiplayer-gameplay.js?v=1.1';

/**
 * Show lobby
 */
export function showLobby(sessionData, updateCallback) {
    setCurrentSessionData(sessionData);
    
    const lobbyHtml = `
        <div class="modal" id="multiplayer-lobby">
            <div class="modal-content large">
                <button class="close-modal">&times;</button>
                <h2>🏆 Sala Multiplayer</h2>
                
                <div class="session-info">
                    <div class="session-code">
                        <strong>Código da Sala: <span class="code">${sessionData.id}</span></strong>
                        <button id="copy-code-btn" class="copy-btn" title="Copiar código">
                            <span class="material-symbols-sharp">content_copy</span>
                        </button>
                    </div>
                    <div class="session-status">Status: <span id="session-status">Aguardando jogadores</span></div>
                </div>
                
                <div class="players-list" id="players-list">
                    <!-- Players will be inserted here -->
                </div>
                
                <div class="lobby-actions" id="lobby-actions">
                    <button id="leave-session-btn" class="btn danger">Sair da Sala</button>
                    <button id="start-game-btn" class="btn primary" style="display: none;">Iniciar Jogo</button>
                </div>
                
                <div class="game-area" id="multiplayer-game-area" style="display: none;">
                    <!-- Game will be rendered here -->
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', lobbyHtml);
    const modal = document.getElementById('multiplayer-lobby');
    
    // Bind events
    modal.querySelector('.close-modal').addEventListener('click', handleLeaveLobby);
    modal.querySelector('#leave-session-btn').addEventListener('click', handleLeaveLobby);
    modal.querySelector('#copy-code-btn').addEventListener('click', copySessionCode);
    modal.querySelector('#start-game-btn').addEventListener('click', handleStartGame);
    
    modal.style.display = 'flex';
    
    // Start listening to session updates
    startSessionListener(sessionData.id, updateCallback);
    
    // Initial render
    renderPlayers(sessionData);
}

/**
 * Handle session updates
 */
export function handleSessionUpdate(sessionData) {
    if (!sessionData) {
        alert('A sessão foi encerrada');
        closeLobby();
        return;
    }
    
    setCurrentSessionData(sessionData);
    
    // Update status
    const statusEl = document.getElementById('session-status');
    if (statusEl) {
        switch (sessionData.status) {
            case GAME_STATES.WAITING:
                statusEl.textContent = 'Aguardando jogadores';
                break;
            case GAME_STATES.IN_PROGRESS:
                statusEl.textContent = 'Jogo em andamento';
                if (document.getElementById('multiplayer-game-area').style.display === 'none') {
                    startMultiplayerGameUI(sessionData);
                }
                break;
            case GAME_STATES.FINISHED:
                statusEl.textContent = 'Jogo finalizado';
                handleSessionGameUpdate(sessionData);
                break;
        }
    }
    
    // Update players list
    renderPlayers(sessionData);
    
    // Update game if in progress
    if (sessionData.status === GAME_STATES.IN_PROGRESS) {
        handleSessionGameUpdate(sessionData);
    }
}

/**
 * Render players list
 */
function renderPlayers(sessionData) {
    const playersList = document.getElementById('players-list');
    const startBtn = document.getElementById('start-game-btn');
    
    if (!playersList) return;
    
    const players = Object.values(sessionData.players);
    const currentUser = window.firebaseAuth.getCurrentUser();
    const isHost = sessionData.players[currentUser?.uid]?.isHost;
    
    playersList.innerHTML = `
        <h3>Jogadores (${players.length}/${sessionData.maxPlayers}):</h3>
        <div class="players-grid">
            ${players.map(player => `
                <div class="player-card ${player.state}">
                    <div class="player-info">
                        <span class="player-name">${player.name}</span>
                        ${player.isHost ? '<span class="host-badge">Host</span>' : ''}
                    </div>
                    <div class="player-score">
                        <span class="score">${player.score || 0} pts</span>
                        <span class="answers">${player.correctAnswers || 0} acertos</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Show start button for host when enough players
    if (startBtn) {
        if (isHost && players.length >= 2 && sessionData.status === GAME_STATES.WAITING) {
            startBtn.style.display = 'block';
        } else {
            startBtn.style.display = 'none';
        }
    }
}

/**
 * Handle start game
 */
async function handleStartGame() {
    try {
        const currentSessionData = getCurrentSessionData();
        await startMultiplayerGame(currentSessionData.id);
    } catch (error) {
        console.error('Error starting game:', error);
        alert('Erro ao iniciar jogo: ' + error.message);
    }
}

/**
 * Handle leave lobby
 */
async function handleLeaveLobby() {
    try {
        const currentSessionData = getCurrentSessionData();
        const currentUser = window.firebaseAuth.getCurrentUser();
        await leaveMultiplayerSession(currentSessionData.id, currentUser.uid);
        closeLobby();
    } catch (error) {
        console.error('Error leaving lobby:', error);
        closeLobby();
    }
}

/**
 * Close lobby
 */
export function closeLobby() {
    stopSessionListener();
    
    const modal = document.getElementById('multiplayer-lobby');
    if (modal) {
        modal.remove();
    }
    
    setCurrentSessionData(null);
}

/**
 * Copy session code
 */
function copySessionCode() {
    const currentSessionData = getCurrentSessionData();
    const code = currentSessionData?.id;
    if (code) {
        navigator.clipboard.writeText(code).then(() => {
            const btn = document.getElementById('copy-code-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-sharp">check</span>';
            btn.style.color = '#4caf50';
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.color = '';
            }, 2000);
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert(`Código copiado: ${code}`);
        });
    }
}

// Add required CSS for lobby components
const style = document.createElement('style');
style.textContent = `
    .modal-content.large {
        max-width: 800px;
        max-height: 90vh;
        overflow-y: auto;
    }
    
    .session-info {
        background: var(--bg-primary);
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
    }
    
    .session-code {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .code {
        font-family: monospace;
        background: var(--accent);
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 1.2rem;
        font-weight: bold;
    }
    
    .copy-btn {
        background: none;
        border: none;
        color: var(--accent);
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: all 0.3s ease;
    }
    
    .copy-btn:hover {
        background: rgba(74, 144, 226, 0.1);
    }
    
    .players-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }
    
    .player-card {
        background: var(--bg-primary);
        border: 2px solid transparent;
        border-radius: 8px;
        padding: 1rem;
        transition: all 0.3s ease;
    }
    
    .player-card.ready {
        border-color: var(--color-success);
    }
    
    .player-card.playing {
        border-color: var(--accent);
    }
    
    .player-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    
    .player-name {
        font-weight: 500;
    }
    
    .host-badge {
        background: var(--accent);
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.8rem;
    }
    
    .player-score {
        display: flex;
        justify-content: space-between;
        font-size: 0.9rem;
        color: var(--text-secondary);
    }
    
    @media (max-width: 768px) {
        .session-info {
            flex-direction: column;
            text-align: center;
        }
        
        .players-grid {
            grid-template-columns: 1fr;
        }
    }
`;
document.head.appendChild(style);