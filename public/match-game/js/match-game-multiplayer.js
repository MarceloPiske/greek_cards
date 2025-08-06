/**
 * Match Game Multiplayer System - Main Coordinator
 * Coordinates between core functionality and UI management
 */

import { MatchGameMultiplayerCore } from './match-game-multiplayer-core.js?v=1.1';
import { MatchGameMultiplayerUI } from './match-game-multiplayer-ui.js?v=1.1';

class MatchGameMultiplayer {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.core = new MatchGameMultiplayerCore(gameInstance, this);
        this.ui = new MatchGameMultiplayerUI(this);
    }

    /**
     * Initializes multiplayer functionality and checks for access.
     * Shows an upgrade modal if access is denied.
     * @returns {Promise<boolean>} - True if user can access multiplayer.
     */
    async initialize() {
        const canAccess = await this.core.canAccessMultiplayer();
        if (!canAccess) {
            this.ui.showUpgradeModal('Login Necessário', 'É necessário fazer login para acessar o modo multiplayer.');
            return false;
        }
        return true;
    }

    /**
     * Prepares and shows the multiplayer setup screen.
     * @param {object|null} list - The list selected for the game, or null if joining/creating a room without a pre-selection.
     */
    async showMultiplayerSetup(list = null) {
        this.game.ui.showScreen('main'); // Ensure we are on the main screen
        await this.loadPublicRooms();
    }

    /**
     * Handles the creation of a new multiplayer room.
     * @param {string} listId - The ID of the list for the game.
     * @param {string} listName - The name of the list.
     * @param {boolean} isPublic - Whether the room should be public.
     * @param {string|null} password - The password for the room (if any).
     */
    async createRoom(listId, listName, isPublic, password = null) {
        try {
            // Check if user can create rooms (premium feature)
            const canCreate = await this.core.canCreateMultiplayerRoom();
            if (!canCreate) {
                this.ui.showUpgradeModal(
                    'Recurso Premium', 
                    'Criar salas multiplayer é um recurso premium. Usuários gratuitos podem entrar em salas existentes criadas por usuários premium.'
                );
                return;
            }

            this.ui.showLoading('Criando sala...');
            const { roomId, roomCode } = await this.core.createRoom(listId, listName, isPublic, password);
            
            if (roomId) {
                await this.core.room.subscribeToRoom(roomId);
                this.ui.hideLoading();
                this.ui.showLobby(roomCode);
            } else {
                throw new Error('Não foi possível obter o ID da sala.');
            }
        } catch (error) {
            this.ui.hideLoading();
            this.ui.showError(error.message);
        }
    }

    /**
     * Handles joining an existing room via a room code.
     * @param {string} roomCode - The 6-digit code of the room to join.
     * @param {string|null} password - The password for the room (if required).
     */
    async joinRoom(roomCode, password = null) {
        try {
            this.ui.showLoading('Entrando na sala...');
            const { roomId, roomCode: actualCode } = await this.core.joinRoom(roomCode, password);

            if (roomId) {
                await this.core.room.subscribeToRoom(roomId);
                this.ui.hideLoading();
                this.ui.showLobby(actualCode);
            } else {
                throw new Error('Não foi possível entrar na sala.');
            }
        } catch (error) {
            this.ui.hideLoading();
            this.ui.showError(error.message);
        }
    }
    
    /**
     * Handles joining a public room from the list.
     * @param {string} roomId - The ID of the public room to join.
     */
    async joinPublicRoom(roomId) {
        try {
            this.ui.showLoading('Entrando na sala pública...');
            const { roomCode } = await this.core.publicRooms.joinPublicRoom(roomId);
            
            if (roomCode) {
                 await this.core.room.subscribeToRoom(roomId);
                 this.ui.hideLoading();
                 this.ui.showLobby(roomCode);
            } else {
                throw new Error('Não foi possível entrar na sala pública.');
            }

        } catch (error) {
            this.ui.hideLoading();
            this.ui.showError(error.message);
        }
    }

    /**
     * Loads and displays public rooms.
     * @param {number} [page=1] - The page number to load.
     */
    async loadPublicRooms(page = 1) {
        try {
            this.ui.showLoading('Carregando salas públicas...');
            const rooms = await this.core.publicRooms.loadPublicRooms(page);
            this.ui.hideLoading();
            this.ui.renderPublicRooms(rooms, page);
        } catch (error) {
            this.ui.hideLoading();
            this.ui.renderPublicRoomsError();
            console.error('Error loading public rooms:', error);
        }
    }
    
    // Delegate core functionality methods
    async toggleReady() {
        return await this.core.room.toggleReady();
    }

    async startGame() {
        return await this.core.room.startGame();
    }

    async updatePlayerScore(scoreChange, isCorrect) {
        return await this.core.room.updatePlayerScore(scoreChange, isCorrect);
    }

    async leaveRoom() {
        await this.core.room.leaveRoom();
        this.game.ui.showScreen('main');
        this.game.setGameMode('multiplayer'); // Refresh multiplayer view
    }

    // Expose core properties
    get core() {
        return this._core;
    }

    set core(value) {
        this._core = value;
    }
    
    get currentRoom() {
        return this.core.room.currentRoom;
    }

    get isHost() {
        return this.core.room.isHost;
    }
    
    // UI-related methods that might be called from the main game
    showUpgradeModal(title, message) {
        this.ui.showUpgradeModal(title, message);
    }
}

export { MatchGameMultiplayer };