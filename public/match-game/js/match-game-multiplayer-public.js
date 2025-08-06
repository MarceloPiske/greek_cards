/**
 * Match Game Multiplayer Public Rooms Management
 * Handles public room listing, pagination, and joining
 */

//import { canSyncToCloud } from '../../plan-manager.js?v=1.1';

export class MatchGameMultiplayerPublic {
    constructor(coreInstance) {
        this.core = coreInstance;
        this.game = coreInstance.game;
        this.lastVisible = null; // For pagination
    }

    /**
     * Load public rooms with pagination
     */
    async loadPublicRooms(page = 1, limit = 10) {
        const canAccess = await this.core.canAccessMultiplayer();
        if (!canAccess) return [];
        
        try {
            const db = window.firebaseAuth.db;
            const { collection, query, where, orderBy, limit: limitQuery, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js?v=1.1');
            
            // Note: Simple implementation. For robust pagination, use startAfter with document snapshots.
            const q = query(
                collection(db, 'multiplayerRooms'),
                where('isPublic', '==', true),
                where('status', '==', 'waiting'),
                orderBy('createdAt', 'desc'),
                limitQuery(limit)
            );

            const querySnapshot = await getDocs(q);
            const rooms = [];
            
            querySnapshot.forEach((doc) => {
                const roomData = doc.data();
                if (Object.keys(roomData.players || {}).length < roomData.maxPlayers) {
                    rooms.push({
                        id: doc.id,
                        ...roomData,
                        playerCount: Object.keys(roomData.players || {}).length
                    });
                }
            });

            return rooms;

        } catch (error) {
            console.error('Error loading public rooms:', error);
            throw error;
        }
    }

    /**
     * Display public rooms in UI
     */
    displayPublicRooms(rooms, currentPage = 1) {
        const container = document.getElementById('public-rooms-list');
        if (!container) return;

        if (rooms.length === 0) {
            container.innerHTML = `
                <div class="no-public-rooms">
                    <span class="material-symbols-sharp">search_off</span>
                    <h4>Nenhuma sala pública encontrada</h4>
                    <p>Seja o primeiro a criar uma sala pública!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = rooms.map(room => `
            <div class="public-room-item" data-room-id="${room.id}">
                <div class="public-room-info">
                    <div class="public-room-name">${room.listName}</div>
                    <div class="public-room-details">
                        <span>Host: ${room.hostName}</span>
                        <span>Código: ${room.code}</span>
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
                this.joinPublicRoom(roomId);
            });
        });

        // Update pagination (simple implementation)
        this.updatePublicRoomsPagination(currentPage);
    }

    /**
     * Update pagination controls
     */
    updatePublicRoomsPagination(currentPage) {
        const container = document.getElementById('public-rooms-pagination');
        if (!container) return;

        const maxPages = 5; // Simplified pagination
        const pages = [];

        for (let i = 1; i <= maxPages; i++) {
            pages.push(`
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                        data-page="${i}" ${i === currentPage ? 'disabled' : ''}>
                    ${i}
                </button>
            `);
        }

        container.innerHTML = `
            <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                    data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
                <span class="material-symbols-sharp">chevron_left</span>
            </button>
            ${pages.join('')}
            <button class="pagination-btn" data-page="${currentPage + 1}">
                <span class="material-symbols-sharp">chevron_right</span>
            </button>
        `;

        // Add event listeners
        container.querySelectorAll('.pagination-btn:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.getAttribute('data-page'));
                if (page > 0) {
                    this.loadPublicRooms(page);
                }
            });
        });
    }

    /**
     * Join a public room by room ID
     */
    async joinPublicRoom(roomId) {
        const canAccess = await this.core.canAccessMultiplayer();
        if (!canAccess) {
             throw new Error('Você precisa de um plano premium para entrar em salas públicas.');
        }

        try {
            const db = window.firebaseAuth.db;
            const user = window.firebaseAuth.getCurrentUser();
            const { doc, getDoc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js?v=1.1');

            const roomRef = doc(db, 'multiplayerRooms', roomId);
            const roomDoc = await getDoc(roomRef);

            if (!roomDoc.exists()) throw new Error('Sala não encontrada.');
            
            const roomData = roomDoc.data();
            if (Object.keys(roomData.players || {}).length >= roomData.maxPlayers) throw new Error('Sala lotada.');
            if (roomData.status !== 'waiting') throw new Error('Jogo já iniciado ou finalizado.');
            if (roomData.players && roomData.players[user.uid]) throw new Error('Você já está nesta sala.');

            const playerData = {
                id: user.uid,
                name: user.displayName || user.email.split('@')[0],
                avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=4a90e2&color=fff&size=128`,
                score: 0, correct: 0, incorrect: 0, isReady: false, isHost: false, joinedAt: serverTimestamp()
            };
            
            await updateDoc(roomRef, { [`players.${user.uid}`]: playerData });

            this.core.room.currentRoom = { id: roomId, ...roomData };
            this.core.room.roomCode = roomData.code;
            this.core.room.isHost = false;

            console.log(`Joined public room: ${roomData.code}`);
            return { roomCode: roomData.code };

        } catch (error) {
            console.error('Error joining public room:', error);
            throw error;
        }
    }

    /**
     * Display error when loading public rooms fails
     */
    displayPublicRoomsError() {
        const container = document.getElementById('public-rooms-list');
        if (!container) return;

        container.innerHTML = `
            <div class="no-public-rooms">
                <span class="material-symbols-sharp">error</span>
                <h4>Erro ao carregar salas</h4>
                <p>Não foi possível carregar as salas públicas.</p>
            </div>
        `;
    }
}