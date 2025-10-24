/**
 * Multiplayer UI Manager - Handles multiplayer interface and modals
 */

import { 
    createMultiplayerSession, 
    joinMultiplayerSession, 
    startSessionListener, 
    stopSessionListener,
    startMultiplayerGame,
    leaveMultiplayerSession,
    GAME_STATES,
    PLAYER_STATES,
    canAccessMultiplayer
<<<<<<< HEAD
} from './multiplayer-manager.js?v=1.1';
import { getUserWordLists } from './word-list-manager.js?v=1.1';
=======
} from './multiplayer-manager.js';
import { getUserWordLists } from './word-list-manager.js';
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
import { 
    showLobby, 
    handleSessionUpdate, 
    closeLobby 
<<<<<<< HEAD
} from './multiplayer-game.js?v=1.1';
=======
} from './multiplayer-game.js';
>>>>>>> 485a7111651673321d36bac1405974bd151865fc

let currentSessionData = null;

/**
 * Show multiplayer menu
 */
export async function showMultiplayerMenu() {
    try {
        // Check if user can access multiplayer
        if (!(await canAccessMultiplayer())) {
<<<<<<< HEAD
            const { showUpgradeModal } = await import('../plan-manager.js?v=1.1');
=======
            const { showUpgradeModal } = await import('../plan-manager.js');
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
            showUpgradeModal('multiplayer', 'cloud');
            return;
        }

        const menuHtml = `
            <div class="modal" id="multiplayer-menu">
                <div class="modal-content">
                    <button class="close-modal">&times;</button>
                    <h2>🏆 Modo Multiplayer</h2>
                    <p>Compete com outros jogadores em tempo real!</p>
                    
                    <div class="multiplayer-options">
                        <button id="create-session-btn" class="btn primary">
                            <span class="material-symbols-sharp">add</span>
                            Criar Sala
                        </button>
                        <button id="join-session-btn" class="btn secondary">
                            <span class="material-symbols-sharp">login</span>
                            Entrar na Sala
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', menuHtml);
        const modal = document.getElementById('multiplayer-menu');
        
        // Bind events
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.querySelector('#create-session-btn').addEventListener('click', () => {
            modal.remove();
            showCreateSessionModal();
        });
        modal.querySelector('#join-session-btn').addEventListener('click', () => {
            modal.remove();
            showJoinSessionModal();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error showing multiplayer menu:', error);
        alert('Erro ao abrir menu multiplayer: ' + error.message);
    }
}

/**
 * Show create session modal
 */
async function showCreateSessionModal() {
    try {
        const wordLists = await getUserWordLists();
        
        const modalHtml = `
            <div class="modal" id="create-session-modal">
                <div class="modal-content">
                    <button class="close-modal">&times;</button>
                    <h2>Criar Sala Multiplayer</h2>
                    
                    <div class="form-group">
                        <label for="session-word-list">Lista de Palavras:</label>
                        <select id="session-word-list" required>
                            <option value="">Selecione uma lista...</option>
                            ${wordLists.map(list => 
                                `<option value="${list.id}">${list.name} (${list.wordIds?.length || 0} palavras)</option>`
                            ).join('')}
                            <option value="random">🎲 Lista Aleatória</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="session-time-limit">Tempo Limite (minutos):</label>
                        <select id="session-time-limit">
                            <option value="180">3 minutos</option>
                            <option value="300" selected>5 minutos</option>
                            <option value="600">10 minutos</option>
                            <option value="900">15 minutos</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="session-max-players">Máximo de Jogadores:</label>
                        <select id="session-max-players">
                            <option value="2" selected>2 jogadores</option>
                            <option value="4">4 jogadores</option>
                            <option value="6">6 jogadores</option>
                        </select>
                    </div>
                    
                    <div class="modal-actions">
                        <button id="cancel-create-btn" class="btn secondary">Cancelar</button>
                        <button id="confirm-create-btn" class="btn primary">Criar Sala</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('create-session-modal');
        
        // Bind events
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.querySelector('#cancel-create-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('#confirm-create-btn').addEventListener('click', handleCreateSession);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error showing create session modal:', error);
        alert('Erro ao carregar listas de palavras');
    }
}

/**
 * Handle create session
 */
async function handleCreateSession() {
    try {
        const wordListId = document.getElementById('session-word-list').value;
        const timeLimit = parseInt(document.getElementById('session-time-limit').value);
        const maxPlayers = parseInt(document.getElementById('session-max-players').value);
        
        if (!wordListId) {
            alert('Por favor, selecione uma lista de palavras');
            return;
        }
        
        const user = window.firebaseAuth.getCurrentUser();
        if (!user) {
            alert('Você precisa estar logado para criar uma sala');
            return;
        }
        
        const gameConfig = {
            timeLimit,
            maxPlayers,
            pointsPerCorrect: 10,
            pointsPerIncorrect: -5
        };
        
        const session = await createMultiplayerSession(
            user.uid,
            user.displayName || user.email.split('@')[0],
            wordListId,
            gameConfig
        );
        
        document.getElementById('create-session-modal').remove();
        currentSessionData = session;
        showLobby(session, handleSessionUpdate);
        
    } catch (error) {
        console.error('Error creating session:', error);
        alert('Erro ao criar sala: ' + error.message);
    }
}

/**
 * Show join session modal
 */
function showJoinSessionModal() {
    const modalHtml = `
        <div class="modal" id="join-session-modal">
            <div class="modal-content">
                <button class="close-modal">&times;</button>
                <h2>Entrar na Sala</h2>
                
                <div class="form-group">
                    <label for="session-code">Código da Sala:</label>
                    <input type="text" id="session-code" placeholder="Digite o código (ex: ABC123)" maxlength="6" required>
                </div>
                
                <div class="modal-actions">
                    <button id="cancel-join-btn" class="btn secondary">Cancelar</button>
                    <button id="confirm-join-btn" class="btn primary">Entrar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('join-session-modal');
    
    // Bind events
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.querySelector('#cancel-join-btn').addEventListener('click', () => modal.remove());
    modal.querySelector('#confirm-join-btn').addEventListener('click', handleJoinSession);
    
    // Auto-format session code
    const codeInput = modal.querySelector('#session-code');
    codeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    modal.style.display = 'flex';
    codeInput.focus();
}

/**
 * Handle join session
 */
async function handleJoinSession() {
    try {
        const sessionId = document.getElementById('session-code').value.trim();
        
        if (!sessionId || sessionId.length !== 6) {
            alert('Por favor, digite um código válido de 6 caracteres');
            return;
        }
        
        const user = window.firebaseAuth.getCurrentUser();
        if (!user) {
            alert('Você precisa estar logado para entrar em uma sala');
            return;
        }
        
        const session = await joinMultiplayerSession(
            sessionId,
            user.uid,
            user.displayName || user.email.split('@')[0]
        );
        
        document.getElementById('join-session-modal').remove();
        currentSessionData = session;
        showLobby(session, handleSessionUpdate);
        
    } catch (error) {
        console.error('Error joining session:', error);
        alert('Erro ao entrar na sala: ' + error.message);
    }
}

/**
 * Get current session data
 */
export function getCurrentSessionData() {
    return currentSessionData;
}

/**
 * Set current session data
 */
export function setCurrentSessionData(sessionData) {
    currentSessionData = sessionData;
}

// Add required CSS for modals and forms
const style = document.createElement('style');
style.textContent = `
    .multiplayer-options {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 2rem;
    }
    
    .form-group {
        margin-bottom: 1rem;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
    }
    
    .form-group select,
    .form-group input {
        width: 100%;
        padding: 0.8rem;
        border: 1px solid var(--shadow);
        border-radius: 6px;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: 1rem;
    }
    
    @media (max-width: 768px) {
        .modal-content {
            width: 95%;
            max-width: 95vw;
            margin: 1rem;
            padding: 1.5rem;
        }
    }
`;
document.head.appendChild(style);