/**
 * Match Game Controller
 * Main coordinator that handles initialization, UI coordination, and game flow
 */

import { getAllWordLists } from '../../lists/lists-sync.js?v=1.1';
import { MatchGameCore } from './match-game-core.js?v=1.1';
import { MatchGameUI } from './match-game-ui.js?v=1.1';
import { MatchGameMultiplayer } from './match-game-multiplayer.js?v=1.1';
import { MatchGameLeaderboard } from './match-game-leaderboard.js?v=1.1';

export class MatchGameController {
    constructor() {
        this.currentScreen = 'list-selection';
        this.gameMode = 'single'; // single, multiplayer
        
        // Initialize components
        this.core = new MatchGameCore();
        this.ui = new MatchGameUI(this);
        this.multiplayer = new MatchGameMultiplayer(this);
        this.leaderboard = new MatchGameLeaderboard();
        
        this.selectedList = null;
    }

    async initialize() {
        try {
            this.ui.setupEventListeners();
            
            // This is now handled in match-game.js?v=1.1 before controller initialization
            // if (typeof window.firebaseAuth !== 'undefined') {
            //     await window.firebaseAuth.initAuth();
            // }
            
            this.setGameMode('single'); // Start in single player mode
            
        } catch (error) {
            console.error('Error initializing match game:', error);
            this.ui.showError('Erro ao inicializar o jogo');
        }
    }
    
    /**
     * Set game mode and update UI accordingly.
     * @param {string} mode - 'single' or 'multiplayer'.
     */
    async setGameMode(mode) {
        if (this.gameMode === mode && this.listsLoaded) return;
        
        this.gameMode = mode;
        this.selectedList = null; // Reset selected list on mode change
        this.ui.updateUIMode(mode);
        this.listsLoaded = false;

        if (mode === 'multiplayer') {
            const canAccess = await this.multiplayer.initialize();
            if (!canAccess) {
                // If user can't access, revert to single player mode
                this.setGameMode('single');
                return;
            }
            await this.multiplayer.loadPublicRooms();
            
            // Check if user can create rooms and update UI accordingly
            const canCreate = await this.multiplayer.core.canCreateMultiplayerRoom();
            this.updateMultiplayerUIForPlan(canCreate);
        }
        
        await this.loadAvailableLists();
    }

    /**
     * Update multiplayer UI based on user's plan capabilities
     */
    updateMultiplayerUIForPlan(canCreateRooms) {
        const multiplayerListActions = document.getElementById('multiplayer-list-actions');
        const createRoomBtns = document.querySelectorAll('#create-room-btn');
        const availableListsMultiplayer = document.getElementById('available-lists-multiplayer');
        
        if (canCreateRooms) {
            // Premium user - show all functionality
            if (multiplayerListActions) {
                multiplayerListActions.style.display = 'none'; // Will be shown when list is selected
            }
            createRoomBtns.forEach(btn => {
                btn.style.display = 'flex';
                btn.disabled = false;
            });
            if (availableListsMultiplayer) {
                availableListsMultiplayer.style.display = 'grid';
            }
        } else {
            // Free user - hide room creation, show only joining options
            if (multiplayerListActions) {
                multiplayerListActions.style.display = 'none';
            }
            createRoomBtns.forEach(btn => {
                btn.style.display = 'none';
            });
            if (availableListsMultiplayer) {
                availableListsMultiplayer.style.display = 'none';
            }
            
            // Show message for free users
            this.showFreeUserMultiplayerMessage();
        }
    }

    /**
     * Show message for free users about multiplayer limitations
     */
    showFreeUserMultiplayerMessage() {
        const multiplayerContent = document.getElementById('multiplayer-content');
        if (!multiplayerContent) return;
        
        // Add free user message if it doesn't exist
        let freeUserMessage = document.getElementById('free-user-multiplayer-message');
        if (!freeUserMessage) {
            freeUserMessage = document.createElement('div');
            freeUserMessage.id = 'free-user-multiplayer-message';
            freeUserMessage.className = 'free-user-message';
            freeUserMessage.innerHTML = `
                <div class="free-user-content">
                    <span class="material-symbols-sharp">info</span>
                    <div class="message-text">
                        <h4>Usuário Gratuito</h4>
                        <p>Você pode entrar em salas criadas por usuários premium. Para criar suas próprias salas, faça upgrade para um plano premium.</p>
                        <button onclick="window.planManager?.showUpgradeModal('cloudSync')" class="btn primary small">
                            <span class="material-symbols-sharp">upgrade</span>
                            Fazer Upgrade
                        </button>
                    </div>
                </div>
            `;
            
            // Insert after selection header
            const selectionHeader = multiplayerContent.querySelector('.selection-header');
            if (selectionHeader) {
                selectionHeader.insertAdjacentElement('afterend', freeUserMessage);
            }
        }
        
        freeUserMessage.style.display = 'block';
    }

    /**
     * Loads the available vocabulary lists based on the current game mode.
     */
    async loadAvailableLists() {
        try {
            this.ui.showLoadingLists(this.gameMode);
            const allLists = await getAllWordLists();
            const playableLists = allLists.filter(list => list.wordIds && list.wordIds.length >= 5);
            
            this.ui.renderLists(playableLists, this.gameMode);
            this.listsLoaded = true;

        } catch (error) {
            console.error('Error loading lists:', error);
            this.ui.showErrorLoadingLists(this.gameMode);
        }
    }

    /**
     * Handles the selection of a list card.
     * @param {string} listId - The ID of the selected list.
     */
    async handleListSelection(listId) {
        const allLists = await getAllWordLists(); // Re-fetch to ensure data is current
        this.selectedList = allLists.find(l => l.id === listId);

        if (!this.selectedList) {
            this.ui.showError("Lista não encontrada.");
            return;
        }

        if (this.gameMode === 'single') {
            this.startGame(this.selectedList);
        } else if (this.gameMode === 'multiplayer') {
            this.ui.highlightSelectedList(listId);
        }
    }

    /**
     * Start a single player game
     */
    async startGame(list) {
        try {
            this.currentList = list;
            await this.core.initializeGame(list);
            this.ui.renderGameUI();
            this.ui.renderWords();
            this.ui.showScreen('game');
            
        } catch (error) {
            console.error('Error starting game:', error);
            this.ui.showError(`Erro ao iniciar o jogo: ${error.message}`);
        }
    }

    /**
     * Start a multiplayer game with room data
     */
    async startMultiplayerGame(roomList) {
        try {
            this.currentList = roomList;
            
            // Initialize core with room word data
            await this.core.initializeMultiplayerGame(roomList);
            this.ui.renderGameUI();
            this.ui.renderWords();
            this.ui.showScreen('game');
            
        } catch (error) {
            console.error('Error starting multiplayer game:', error);
            this.ui.showError(`Erro ao iniciar o jogo multiplayer: ${error.message}`);
        }
    }

    /**
     * Handle word matching logic
     */
    async checkMatch(greekItem, portugueseItem) {
        const greekId = greekItem.getAttribute('data-word-id');
        const portugueseId = portugueseItem.getAttribute('data-word-id');
        
        const isCorrect = this.core.isCorrectMatch(greekId, portugueseId);
        this.ui.showMatchResult(greekItem, portugueseItem, isCorrect);
        this.core.clearSelections();
        
        if (isCorrect) {
            if (this.gameMode === 'multiplayer' && this.multiplayer.core.room.currentRoom) {
                await this.multiplayer.core.room.updatePlayerScore(10, true);
            }
            const gameComplete = await this.core.processCorrectMatch(greekId);
            
            setTimeout(() => {
                this.ui.renderWords(); // Re-render to remove items and potentially add new ones
                if (gameComplete) {
                    this.showRoundResults();
                }
            }, 1000);
            
        } else {
            if (this.gameMode === 'multiplayer' && this.multiplayer.core.room.currentRoom) {
                await this.multiplayer.core.room.updatePlayerScore(-5, false);
            }
            this.core.processIncorrectMatch();
        }
        
        this.ui.updateGameStats();
    }

    /**
     * Show game results
     */
    async showRoundResults() {
        const results = this.core.getGameResults();
        
        // Save all word progress to database at game end
        await this.core.saveAllWordProgress();
        
        if (this.gameMode === 'single') {
            this.saveToLeaderboard();
            this.ui.renderResultsScreen(results);
            this.ui.renderProgressSummary();
            this.ui.showScreen('results');
        } else if (this.gameMode === 'multiplayer') {
            // Handle multiplayer completion
            this.multiplayer.core.handlePlayerFinished(results);
        }
    }

    /**
     * Save single player results to leaderboard
     */
    async saveToLeaderboard() {
        if (!window.firebaseAuth?.isAuthenticated()) return;

        try {
            const user = window.firebaseAuth.getCurrentUser();
            const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js?v=1.1');
            const gameState = this.core.getGameState();
            const accuracy = gameState.gameStats.correct / (gameState.gameStats.correct + gameState.gameStats.incorrect || 1);

            const leaderboardEntry = {
                userId: user.uid,
                userName: user.displayName || user.email.split('@')[0],
                userAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=4a90e2&color=fff&size=128`,
                score: gameState.gameStats.score,
                correct: gameState.gameStats.correct,
                incorrect: gameState.gameStats.incorrect,
                accuracy: isNaN(accuracy) ? 0 : accuracy,
                gameMode: 'single',
                listId: gameState.currentList.id,
                listName: gameState.currentList.name,
                playedAt: serverTimestamp(),
                week: this.getWeekIdentifier(),
                month: this.getMonthIdentifier(),
            };
            await addDoc(collection(window.firebaseAuth.db, 'leaderboard'), leaderboardEntry);
            console.log('Single player result saved to leaderboard.');

        } catch (error) {
            console.error('Error saving to leaderboard:', error);
        }
    }
    
    // Multiplayer actions triggered from UI
    handleCreateRoom() {
        // Allow creating room without selected list - show modal to select list or use default
        const isPublic = document.getElementById('public-room-checkbox')?.checked || false;
        const password = document.getElementById('room-password-input')?.value?.trim() || null;
        
        if (!this.selectedList) {
            this.showCreateRoomModal();
            return;
        }
        
        this.multiplayer.createRoom(this.selectedList.id, this.selectedList.name, isPublic, password);
    }

    async showCreateRoomModal() {
        try {
            const allLists = await getAllWordLists();
            const playableLists = allLists.filter(list => list.wordIds && list.wordIds.length >= 5);
            
            const modalHtml = `
                <div class="modal" id="create-room-modal">
                    <div class="modal-content">
                        <button class="close-modal">&times;</button>
                        <h2>Criar Nova Sala</h2>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="room-list-select">Selecione uma opção:</label>
                                <select id="room-list-select" class="form-control">
                                    <option value="random">📱 Lista Aleatória (20 palavras)</option>
                                    ${playableLists.map(list => 
                                        `<option value="${list.id}">${this.escapeHtml(list.name)} (${list.wordIds.length} palavras)</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="visibility-checkbox">
                                    <input type="checkbox" id="modal-public-room-checkbox">
                                    Tornar esta sala pública (outros podem encontrar)
                                </label>
                            </div>
                            <div class="form-group">
                                <label for="modal-room-password">Senha da sala (opcional):</label>
                                <input type="password" id="modal-room-password" class="form-control" placeholder="Deixe em branco para sala sem senha">
                                <small>Se definir uma senha, apenas jogadores com a senha poderão entrar</small>
                            </div>
                        </div>
                        <div class="modal-actions">
                            <button id="cancel-create-room" class="btn">Cancelar</button>
                            <button id="confirm-create-room" class="btn primary">Criar Sala</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = document.getElementById('create-room-modal');
            
            const closeBtn = modal.querySelector('.close-modal');
            const cancelBtn = document.getElementById('cancel-create-room');
            const confirmBtn = document.getElementById('confirm-create-room');
            
            closeBtn.addEventListener('click', () => modal.remove());
            cancelBtn.addEventListener('click', () => modal.remove());
            confirmBtn.addEventListener('click', async () => {
                const selectedValue = document.getElementById('room-list-select').value;
                const isPublic = document.getElementById('modal-public-room-checkbox').checked;
                const password = document.getElementById('modal-room-password').value.trim() || null;
                
                let listName;
                if (selectedValue === 'random') {
                    listName = 'Lista Aleatória';
                } else {
                    const selectedList = playableLists.find(l => l.id === selectedValue);
                    listName = selectedList ? selectedList.name : 'Lista Desconhecida';
                }
                
                modal.remove();
                this.multiplayer.createRoom(selectedValue, listName, isPublic, password);
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
            modal.style.display = 'flex';
            
        } catch (error) {
            console.error('Error showing create room modal:', error);
            this.ui.showError('Erro ao preparar criação de sala');
        }
    }

    handleJoinRoom() {
        const roomCodeInput = document.getElementById('join-room-code');
        const roomCode = roomCodeInput?.value?.trim();
        if (!roomCode) {
            this.ui.showError('Por favor, digite o código da sala.');
            return;
        }
        
        // Check if room might need password by showing password modal
        this.showJoinRoomPasswordModal(roomCode);
    }

    showJoinRoomPasswordModal(roomCode) {
        const modalHtml = `
            <div class="modal" id="join-room-modal">
                <div class="modal-content">
                    <button class="close-modal">&times;</button>
                    <h2>Entrar na Sala</h2>
                    <div class="modal-body">
                        <p>Código da sala: <strong>${roomCode.toUpperCase()}</strong></p>
                        <div class="form-group">
                            <label for="join-room-password">Senha (se necessário):</label>
                            <input type="password" id="join-room-password" class="form-control" placeholder="Deixe em branco se a sala não tem senha">
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button id="cancel-join-room" class="btn">Cancelar</button>
                        <button id="confirm-join-room" class="btn primary">Entrar na Sala</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('join-room-modal');
        
        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = document.getElementById('cancel-join-room');
        const confirmBtn = document.getElementById('confirm-join-room');
        
        closeBtn.addEventListener('click', () => modal.remove());
        cancelBtn.addEventListener('click', () => modal.remove());
        confirmBtn.addEventListener('click', () => {
            const password = document.getElementById('join-room-password').value.trim() || null;
            modal.remove();
            this.multiplayer.joinRoom(roomCode, password);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        modal.style.display = 'flex';
    }

    // Utility methods
    getWeekIdentifier() {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const pastDaysOfYear = (now - startOfYear) / 86400000;
        const week = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
        return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
    }

    getMonthIdentifier() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Core state getters for UI
    getGameState() { return this.core.getGameState(); }
    getStatusInfo(status) { return this.core.getStatusInfo(status); }
}