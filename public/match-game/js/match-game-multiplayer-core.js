/**
 * Match Game Multiplayer Core System
 * Manages game state and business logic for multiplayer, coordinating Room and Public Room managers.
 */

import { MatchGameMultiplayerRoom } from './match-game-multiplayer-room.js';
import { MatchGameMultiplayerPublic } from './match-game-multiplayer-public.js';

export class MatchGameMultiplayerCore {
    constructor(gameInstance, multiplayerInstance) {
        this.game = gameInstance;
        this.multiplayer = multiplayerInstance;
        this.room = new MatchGameMultiplayerRoom(this);
        this.publicRooms = new MatchGameMultiplayerPublic(this);
        this.gameState = 'waiting'; // waiting, playing, finished
        this.playerFinished = false; // Track if current player finished
    }

    /**
     * Checks if the current user can access multiplayer features (join rooms).
     * @returns {Promise<boolean>}
     */
    async canAccessMultiplayer() {
        if (!window.firebaseAuth?.isAuthenticated()) {
            return false;
        }
        // All authenticated users can access multiplayer (join rooms)
        return true;
    }

    /**
     * Checks if the current user can create multiplayer rooms (premium only).
     * @returns {Promise<boolean>}
     */
    async canCreateMultiplayerRoom() {
        if (!window.firebaseAuth?.isAuthenticated()) {
            return false;
        }
        // Only premium users (cloud/ai plans) can create rooms
        if (typeof window.planManager?.canSyncToCloud !== 'function') {
            return false;
        }
        return window.planManager.canSyncToCloud();
    }

    // Delegate room management methods
    get currentRoom() { return this.room.currentRoom; }
    get isHost() { return this.room.isHost; }
    get roomCode() { return this.room.roomCode; }

    async createRoom(listId, listName, isPublic = false, password = null) {
        // Check if user can create rooms (premium only)
        const canCreate = await this.canCreateMultiplayerRoom();
        if (!canCreate) {
            throw new Error('Apenas usuários premium podem criar salas. Você pode entrar em salas existentes gratuitamente.');
        }
        
        return await this.room.createRoom(listId, listName, isPublic, password);
    }

    async joinRoom(roomCode, password = null) {
        return await this.room.joinRoom(roomCode, password);
    }

    async subscribeToRoom(roomId) {
        return await this.room.subscribeToRoom(roomId);
    }

    async toggleReady() {
        return await this.room.toggleReady();
    }

    async startGame() {
        return await this.room.startGame();
    }

    async updatePlayerScore(scoreChange, isCorrect) {
        return await this.room.updatePlayerScore(scoreChange, isCorrect);
    }

    async leaveRoom() {
        return await this.room.leaveRoom();
    }

    // Delegate public rooms methods
    async loadPublicRooms(page = 1) {
        return await this.publicRooms.loadPublicRooms(page);
    }

    async joinPublicRoom(roomId) {
        return await this.publicRooms.joinPublicRoom(roomId);
    }

    /**
     * Handle when current player finishes the game
     */
    async handlePlayerFinished(gameResults) {
        if (this.playerFinished) return; // Prevent double-finishing
        
        this.playerFinished = true;
        
        // Save all word progress to database for multiplayer games too
        if (this.game.core && typeof this.game.core.saveAllWordProgress === 'function') {
            await this.game.core.saveAllWordProgress();
        }
        
        try {
            const db = window.firebaseAuth.db;
            const user = window.firebaseAuth.getCurrentUser();
            const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            // Update player as finished in room
            const roomRef = doc(db, 'multiplayerRooms', this.room.currentRoom.id);
            await updateDoc(roomRef, {
                [`players.${user.uid}.isFinished`]: true,
                [`players.${user.uid}.finishedAt`]: serverTimestamp(),
                [`players.${user.uid}.finalScore`]: gameResults.score,
                [`players.${user.uid}.finalCorrect`]: gameResults.correct,
                [`players.${user.uid}.finalIncorrect`]: gameResults.incorrect
            });

            // Show waiting screen
            this.showMultiplayerWaitingScreen(gameResults);
            
        } catch (error) {
            console.error('Error handling player finished:', error);
        }
    }

    /**
     * Show waiting screen for multiplayer results
     */
    showMultiplayerWaitingScreen(gameResults) {
        if (this.game.ui) {
            this.game.ui.showMultiplayerWaitingScreen(gameResults);
        }
    }

    /**
     * Check if all players finished and end game
     */
    checkAllPlayersFinished(roomData) {
        const players = Object.values(roomData.players || {});
        const allFinished = players.every(player => player.isFinished === true);
        
        if (allFinished && this.gameState !== 'finished') {
            this.endMultiplayerGame(roomData);
        }
    }

    /**
     * End multiplayer game and show final results
     */
    async endMultiplayerGame(roomData) {
        this.gameState = 'finished';
        
        try {
            // Update room status to finished if host
            if (this.room.isHost) {
                const db = window.firebaseAuth.db;
                const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                
                const roomRef = doc(db, 'multiplayerRooms', this.room.currentRoom.id);
                await updateDoc(roomRef, {
                    status: 'finished',
                    finishedAt: serverTimestamp()
                });
            }
            
            this.showGameResults(roomData);
        } catch (error) {
            console.error('Error ending multiplayer game:', error);
        }
    }

    /**
     * Handles updates from the room subscription and coordinates UI changes.
     * @param {object} roomData - The latest data from the Firestore room document.
     */
    handleRoomUpdate(roomData) {
        // Notify UI to update
        if (this.multiplayer.ui) {
            this.multiplayer.ui.updateRoomUI(roomData);
        }

        // Handle game state changes
        if (roomData.status === 'playing' && this.gameState !== 'playing') {
            this.startMultiplayerGame(roomData.listId);
        } else if (roomData.status === 'finished' && this.gameState !== 'finished') {
            this.showGameResults(roomData);
        } else if (roomData.status === 'waiting' && this.gameState !== 'waiting') {
             this.gameState = 'waiting';
             if (this.game.currentScreen === 'game') {
                this.game.ui.showScreen('multiplayer-lobby');
             }
        }
        
        // Check if all players finished during playing state
        if (roomData.status === 'playing') {
            this.checkAllPlayersFinished(roomData);
        }
    }
    
    /**
     * Starts the actual multiplayer game.
     * @param {string} listId - The ID of the list to be played.
     */
    async startMultiplayerGame(listId) {
        this.gameState = 'playing';
        try {
            // Use word data from the room instead of trying to fetch list
            if (!this.room.currentRoom || !this.room.currentRoom.wordData) {
                throw new Error('Dados da lista não encontrados na sala.');
            }
            
            // Create a mock list object with the room's word data
            const roomList = {
                id: this.room.currentRoom.listId,
                name: this.room.currentRoom.listName,
                wordIds: this.room.currentRoom.wordData.map(word => word.ID),
                // Add the actual word objects for easy access
                words: this.room.currentRoom.wordData
            };
            
            // Start the game with the room's word data
            await this.game.startMultiplayerGame(roomList);
        } catch (error) {
            console.error("Error starting multiplayer game:", error);
            this.multiplayer.ui.showError(`Não foi possível iniciar o jogo: ${error.message}`);
            // Potentially reset room status
            await this.room.resetRoomStatus();
        }
    }

    /**
     * Update players list in UI
     */
    updatePlayersList(players) {
        const playersContainer = document.getElementById('multiplayer-players-list');
        if (!playersContainer) return;

        const playersList = Object.values(players || {}).sort((a, b) => b.score - a.score);

        playersContainer.innerHTML = playersList.map((player, index) => `
            <div class="multiplayer-player-card ${player.isHost ? 'host' : ''} ${player.isReady ? 'ready' : ''}">
                <img src="${player.avatar}" alt="${player.name}" class="player-avatar">
                <div class="player-info">
                    <div class="player-name">
                        ${player.name}
                        ${player.isHost ? '<span class="host-badge">HOST</span>' : ''}
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
     * Update player count display
     */
    updatePlayerCount(players) {
        const playerCountElement = document.getElementById('player-count');
        if (playerCountElement) {
            const count = Object.keys(players || {}).length;
            playerCountElement.textContent = `${count}/10`;
        }
    }

    /**
     * Shows the final game results screen.
     * @param {object} roomData - The final room data after the game is finished.
     */
    showGameResults(roomData) {
        this.gameState = 'finished';
        
        const players = Object.values(roomData.players).sort((a, b) => {
            // Sort by final score, then by finish time
            if (b.finalScore !== a.finalScore) {
                return b.finalScore - a.finalScore;
            }
            // If scores are equal, earlier finisher wins
            const aTime = a.finishedAt?.toMillis?.() || 0;
            const bTime = b.finishedAt?.toMillis?.() || 0;
            return aTime - bTime;
        });
        
        const currentUser = window.firebaseAuth.getCurrentUser();
        const userPlayer = players.find(p => p.id === currentUser?.uid);
        
        // Save to leaderboard for the current user
        if (userPlayer) {
            this.room.saveToLeaderboard({
                score: userPlayer.finalScore || userPlayer.score,
                correct: userPlayer.finalCorrect || userPlayer.correct,
                incorrect: userPlayer.finalIncorrect || userPlayer.incorrect
            });
        }

        // Use the main UI handler to show multiplayer results
        if (this.game.ui) {
            this.game.ui.showMultiplayerResults(players, userPlayer);
        }
    }
}