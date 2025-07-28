/**
 * Match Game Multiplayer UI System
 * Handles UI updates, player displays, and modal management for multiplayer
 */

//import { canSyncToCloud } from '../../plan-manager.js';

export class MatchGameMultiplayerUI {
    constructor(multiplayerInstance) {
        this.multiplayer = multiplayerInstance;
        this.game = multiplayerInstance.game;
    }

    /**
     * Renders the multiplayer setup screen based on whether a list is pre-selected.
     * @param {object|null} list - The selected list, or null.
     */
    async renderMultiplayerSetup(list) {
        const listSection = document.getElementById('selected-list-section');
        const roomVisibilitySection = document.getElementById('room-visibility-section');
        
        if (list && list.id && list.name) {
            document.getElementById('selected-list-name').textContent = list.name;
            document.getElementById('selected-list-words').textContent = `${list.wordIds?.length || 0} palavras`;
            if(listSection) listSection.style.display = 'block';
            if(roomVisibilitySection) roomVisibilitySection.style.display = 'block';
        } else {
            if(listSection) listSection.style.display = 'none';
            if(roomVisibilitySection) roomVisibilitySection.style.display = 'none';
        }
    }

    /**
     * Displays the lobby screen with the given room code.
     * @param {string} roomCode - The code of the room to display.
     */
    showLobby(roomCode) {
        const roomCodeDisplay = document.getElementById('room-code-display');
        if (roomCodeDisplay) {
            roomCodeDisplay.textContent = roomCode.toUpperCase();
        }
        this.game.ui.showScreen('multiplayer-lobby');
    }

    /**
     * Update room UI based on current room state (called on snapshot updates).
     * @param {object} roomData - The latest data from the room document.
     */
    updateRoomUI(roomData) {
        const currentUser = window.firebaseAuth.getCurrentUser();
        if (!currentUser) return;
        
        this.updatePlayersList(roomData.players, currentUser.uid);
        this.updateLobbyActions(roomData, currentUser.uid);

        if (roomData.status === 'playing') {
            this.updatePlayerScores(roomData.players);
            // Update waiting screen if on that screen
            if (this.multiplayer.game.currentScreen === 'multiplayer-waiting') {
                this.multiplayer.game.ui.updatePlayersProgress(roomData.players);
            }
        }
    }

    /**
     * Update the list of players in the lobby or in-game.
     * @param {object} players - The players object from room data.
     * @param {string} currentUserId - The UID of the current user.
     */
    updatePlayersList(players, currentUserId) {
        const playersContainer = document.getElementById('multiplayer-players-list');
        const playerCountElement = document.getElementById('player-count');

        if (!playersContainer || !playerCountElement) return;

        const playersList = Object.values(players || {}).sort((a, b) => b.score - a.score);
        playerCountElement.textContent = `${playersList.length}/10`;

        playersContainer.innerHTML = playersList.map(player => `
            <div class="multiplayer-player-card ${player.isHost ? 'host' : ''} ${player.isReady ? 'ready' : ''} ${player.id === currentUserId ? 'current-user-lobby' : ''}">
                <img src="${player.avatar}" alt="${player.name}" class="player-avatar">
                <div class="player-info">
                    <div class="player-name">
                        ${player.name}
                        ${player.isHost ? '<span class="host-badge">HOST</span>' : ''}
                        ${player.id === currentUserId ? '<span class="you-badge">(Você)</span>' : ''}
                    </div>
                    <div class="player-stats">
                        <span class="score">${player.score} pts</span>
                        <span class="accuracy">${player.correct}/${player.correct + player.incorrect}</span>
                    </div>
                </div>
                <div class="player-status">
                    ${player.isReady ? '<span class="material-symbols-sharp ready">check_circle</span>' : '<span class="material-symbols-sharp">schedule</span>'}
                </div>
            </div>
        `).join('');
    }

    /**
     * Updates the actions available in the lobby (e.g., Start Game button for host).
     * @param {object} roomData - The latest room data.
     * @param {string} currentUserId - The UID of the current user.
     */
    updateLobbyActions(roomData, currentUserId) {
        const startGameBtn = document.getElementById('start-game-btn');
        if (!startGameBtn) return;
        
        const isHost = roomData.hostId === currentUserId;
        startGameBtn.style.display = isHost ? 'flex' : 'none';

        if (isHost) {
            const players = Object.values(roomData.players || {});
            const allReady = players.every(p => p.isReady);
            const canStart = players.length >= 2 && allReady;
            startGameBtn.disabled = !canStart;
            startGameBtn.title = canStart ? 'Iniciar o jogo para todos' : 'Aguardando todos os jogadores ficarem prontos (mínimo 2).';
        }
    }
    
    /**
     * Update player scores display in the real-time leaderboard during a game.
     * @param {object} players - The players object from room data.
     */
    updatePlayerScores(players) {
        const leaderboardContainer = document.getElementById('game-leaderboard');
        if (!leaderboardContainer) return;

        leaderboardContainer.style.display = 'block';
        const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
        
        leaderboardContainer.innerHTML = sortedPlayers.map((player, index) => `
            <div class="leaderboard-item ${player.id === window.firebaseAuth.getCurrentUser()?.uid ? 'current-user' : ''}">
                <span class="rank">#${index + 1}</span>
                <img src="${player.avatar}" alt="${player.name}" class="player-avatar-small">
                <span class="player-name-ingame">${player.name}</span>
                <span class="player-score-ingame">${player.score}</span>
            </div>
        `).join('');
    }
    
    /**
     * Renders the list of public rooms.
     * @param {Array<object>} rooms - The array of public rooms to display.
     * @param {number} currentPage - The current page number for pagination.
     */
    renderPublicRooms(rooms, currentPage) {
        const container = document.getElementById('public-rooms-list');
        const paginationContainer = document.getElementById('public-rooms-pagination');
        if (!container || !paginationContainer) return;

        if (!rooms || rooms.length === 0) {
            container.innerHTML = `
                <div class="no-public-rooms">
                    <span class="material-symbols-sharp">search_off</span>
                    <h4>Nenhuma sala pública encontrada</h4>
                    <p>Seja o primeiro a criar uma sala pública!</p>
                </div>
            `;
            paginationContainer.innerHTML = '';
            return;
        }

        container.innerHTML = rooms.map(room => `
            <div class="public-room-item" data-room-id="${room.id}">
                <div class="public-room-info">
                    <div class="public-room-name">${room.listName}</div>
                    <div class="public-room-details">
                        <span>Host: ${room.hostName}</span>
                    </div>
                </div>
                <div class="public-room-players">
                    <span class="material-symbols-sharp">group</span>
                    <span>${room.playerCount}/${room.maxPlayers}</span>
                </div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.public-room-item').forEach(item => {
            item.addEventListener('click', () => {
                const roomId = item.getAttribute('data-room-id');
                this.multiplayer.joinPublicRoom(roomId);
            });
        });

        this.renderPublicRoomsPagination(currentPage, rooms.length);
    }

    /**
     * Renders the pagination controls for public rooms.
     * @param {number} currentPage - The current page.
     * @param {number} roomsCount - The number of rooms on the current page.
     */
    renderPublicRoomsPagination(currentPage, roomsCount) {
        const container = document.getElementById('public-rooms-pagination');
        if (!container) return;
        
        const hasNextPage = roomsCount === 10; // Assuming page size is 10

        container.innerHTML = `
            <button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
                <span class="material-symbols-sharp">chevron_left</span>
            </button>
            <span class="pagination-info">Página ${currentPage}</span>
            <button class="pagination-btn" data-page="${currentPage + 1}" ${!hasNextPage ? 'disabled' : ''}>
                <span class="material-symbols-sharp">chevron_right</span>
            </button>
        `;

        // Add event listeners
        container.querySelectorAll('.pagination-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.getAttribute('data-page'));
                if (page > 0) {
                    this.multiplayer.loadPublicRooms(page);
                }
            });
        });
    }
    
    /**
     * Renders an error message in the public rooms list.
     */
    renderPublicRoomsError() {
        const container = document.getElementById('public-rooms-list');
        if (!container) return;
        container.innerHTML = `
            <div class="no-public-rooms">
                <span class="material-symbols-sharp">error</span>
                <h4>Erro ao carregar salas</h4>
                <p>Não foi possível carregar as salas públicas. Verifique sua conexão.</p>
            </div>
        `;
    }

    /**
     * Shows a modal dialog for feature upgrades.
     * @param {string} title - The title of the modal.
     * @param {string} message - The main message of the modal.
     */
    showUpgradeModal(title, message) {
        // This can be delegated to a global UI manager if one exists
        if (window.planManager && typeof window.planManager.showUpgradeModal === 'function') {
            window.planManager.showUpgradeModal(message);
        } else {
             alert(`${title}: ${message}`);
        }
    }
    
    /**
     * Shows a loading overlay.
     * @param {string} message - The message to display while loading.
     */
    showLoading(message) {
        this.game.ui.showLoading(message);
    }
    
    /**
     * Hides the loading overlay.
     */
    hideLoading() {
        this.game.ui.hideLoading();
    }

    /**
     * Shows an error message dialog.
     * @param {string} message - The error message to display.
     */
    showError(message) {
        this.game.ui.showError(message);
    }
}