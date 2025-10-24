/**
 * Match Game Multiplayer Room Management
 * Handles room creation, joining, leaving, and real-time synchronization
 */

export class MatchGameMultiplayerRoom {
    constructor(coreInstance) {
        this.core = coreInstance;
        this.game = coreInstance.game;
        this.currentRoom = null;
        this.isHost = false;
        this.roomCode = null;
        this.unsubscribeRoom = null;
    }

    /**
     * Create a new multiplayer room
     */
    async createRoom(listId, listName, isPublic = false, password = null) {
        const canAccess = await this.core.canAccessMultiplayer();
        if (!canAccess) {
            throw new Error('Você precisa de um plano premium para criar salas multiplayer.');
        }

        try {
            const db = window.firebaseAuth.db;
            const user = window.firebaseAuth.getCurrentUser();

            const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            // Prepare word data for the room
            let wordData = [];
            let actualListName = listName;
            
            if (listId === 'random') {
                // Create random list from system vocabulary
<<<<<<< HEAD
                const { getSystemVocabulary } = await import('../../vocabulary/vocabulary-db.js?v=1.1');
=======
                const { getSystemVocabulary } = await import('../../vocabulary/vocabulary-db.js');
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
                const allWords = await getSystemVocabulary();
                
                if (allWords.length < 20) {
                    throw new Error('Vocabulário do sistema insuficiente para criar lista aleatória.');
                }
                
                // Select 20 random words
                const shuffled = allWords.sort(() => 0.5 - Math.random());
                wordData = shuffled.slice(0, 20).map(word => ({
                    ID: word.ID,
                    LEXICAL_FORM: word.LEXICAL_FORM,
                    TRANSLITERATED_LEXICAL_FORM: word.TRANSLITERATED_LEXICAL_FORM,
                    DEFINITION: word.DEFINITION,
                    USAGE: word.USAGE,
                    PART_OF_SPEECH: word.PART_OF_SPEECH
                }));
                actualListName = 'Lista Aleatória';
            } else {
                // Get word data from existing list
<<<<<<< HEAD
                const { getWordList } = await import('../../lists/lists-sync.js?v=1.1');
                const { getWordById } = await import('../../vocabulary/vocabulary-db.js?v=1.1');
=======
                const { getWordList } = await import('../../lists/lists-sync.js');
                const { getWordById } = await import('../../vocabulary/vocabulary-db.js');
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
                
                const list = await getWordList(listId);
                if (!list || !list.wordIds || list.wordIds.length < 5) {
                    throw new Error('Lista inválida ou com palavras insuficientes.');
                }
                
                // Load full word data
                for (const wordId of list.wordIds) {
                    const word = await getWordById(wordId);
                    if (word) {
                        wordData.push({
                            ID: word.ID,
                            LEXICAL_FORM: word.LEXICAL_FORM,
                            TRANSLITERATED_LEXICAL_FORM: word.TRANSLITERATED_LEXICAL_FORM,
                            DEFINITION: word.DEFINITION,
                            USAGE: word.USAGE,
                            PART_OF_SPEECH: word.PART_OF_SPEECH
                        });
                    }
                }
            }

            const roomData = {
                code: roomCode,
                hostId: user.uid,
                hostName: user.displayName || user.email.split('@')[0],
                listId: listId,
                listName: actualListName,
                wordData: wordData, // Store full word data in room
                maxPlayers: 10,
                status: 'waiting', // waiting, playing, finished
                isPublic: isPublic,
                hasPassword: !!password,
                password: password || null,
                createdAt: serverTimestamp(),
                players: {
                    [user.uid]: {
                        id: user.uid,
                        name: user.displayName || user.email.split('@')[0],
                        avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=4a90e2&color=fff&size=128`,
                        score: 0,
                        correct: 0,
                        incorrect: 0,
                        isReady: true,
                        isHost: true,
                        joinedAt: serverTimestamp()
                    }
                }
            };

            const docRef = await addDoc(collection(db, 'multiplayerRooms'), roomData);
            
            this.currentRoom = { id: docRef.id, ...roomData };
            this.roomCode = roomCode;
            this.isHost = true;
            
            console.log(`Created multiplayer room: ${roomCode} (Public: ${isPublic}, Password: ${!!password})`);
            return { roomId: docRef.id, roomCode };

        } catch (error) {
            console.error('Error creating multiplayer room:', error);
            throw new Error('Erro ao criar sala: ' + error.message);
        }
    }

    /**
     * Join an existing room by code
     */
    async joinRoom(roomCode, password = null) {
        const canAccess = await this.core.canAccessMultiplayer();
        if (!canAccess) {
            throw new Error('Você precisa de um plano premium para entrar em salas multiplayer.');
        }

        if (!roomCode || typeof roomCode !== 'string' || roomCode.length !== 6) {
            throw new Error('Código da sala inválido. Deve ter 6 caracteres.');
        }

        try {
            const db = window.firebaseAuth.db;
            const user = window.firebaseAuth.getCurrentUser();
            const { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            const roomsRef = collection(db, 'multiplayerRooms');
            const q = query(roomsRef, where('code', '==', roomCode.toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error('Sala não encontrada. Verifique se o código está correto.');
            }

            const roomDoc = querySnapshot.docs[0];
            const roomData = roomDoc.data();
            const roomId = roomDoc.id;

            // Check password if room has one
            if (roomData.hasPassword && roomData.password !== password) {
                throw new Error('Senha incorreta.');
            }

            if (Object.keys(roomData.players || {}).length >= roomData.maxPlayers) throw new Error('Sala lotada.');
            if (roomData.status !== 'waiting') throw new Error('O jogo já começou ou foi finalizado nesta sala.');
            if (roomData.players && roomData.players[user.uid]) { // User is already in room
                this.currentRoom = { id: roomId, ...roomData };
                this.roomCode = roomCode.toUpperCase();
                this.isHost = roomData.hostId === user.uid;
                return { roomId, roomCode: this.roomCode };
            }

            const playerData = {
                id: user.uid,
                name: user.displayName || user.email.split('@')[0],
                avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=4a90e2&color=fff&size=128`,
                score: 0, correct: 0, incorrect: 0, isReady: false, isHost: false, joinedAt: serverTimestamp()
            };

            await updateDoc(doc(db, 'multiplayerRooms', roomId), { [`players.${user.uid}`]: playerData });
            
            this.currentRoom = { id: roomId, ...roomData, players: {...roomData.players, [user.uid]: playerData } };
            this.roomCode = roomCode.toUpperCase();
            this.isHost = false;

            console.log(`Joined multiplayer room: ${roomCode}`);
            return { roomId, roomCode: this.roomCode };

        } catch (error) {
            console.error('Error joining room:', error);
            throw error;
        }
    }

    /**
     * Start listening to room updates
     */
    async subscribeToRoom(roomId) {
        if (this.unsubscribeRoom) this.unsubscribeRoom(); // Unsubscribe from previous room if any

        try {
            const { doc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const roomRef = doc(window.firebaseAuth.db, 'multiplayerRooms', roomId);
            
            this.unsubscribeRoom = onSnapshot(roomRef, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const roomData = docSnapshot.data();
                    this.currentRoom = { id: roomId, ...roomData };
                    this.isHost = this.currentRoom.hostId === window.firebaseAuth.getCurrentUser()?.uid;
                    this.core.handleRoomUpdate(roomData);
                } else {
                    console.warn('Room no longer exists.');
                    this.leaveRoom();
                    this.game.ui.showError("A sala foi fechada pelo anfitrião ou não existe mais.");
                    this.game.ui.showScreen('main');
                    this.game.setGameMode('multiplayer');
                }
            }, (error) => {
                 console.error("Error in room subscription:", error);
                 this.game.ui.showError("Perdemos a conexão com a sala.");
            });

        } catch (error) {
            console.error('Error subscribing to room:', error);
        }
    }
    
    /**
     * Resets the room status to 'waiting', e.g., after a game start error.
     */
    async resetRoomStatus() {
        if (!this.isHost || !this.currentRoom) return;
        try {
            const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const roomRef = doc(window.firebaseAuth.db, 'multiplayerRooms', this.currentRoom.id);
            await updateDoc(roomRef, { status: 'waiting' });
            console.log('Room status reset to waiting.');
        } catch (error) {
            console.error("Error resetting room status:", error);
        }
    }

    /**
     * Toggle player ready status
     */
    async toggleReady() {
        if (!this.currentRoom || !window.firebaseAuth?.isAuthenticated()) return;

        try {
            const user = window.firebaseAuth.getCurrentUser();
            const currentReadyState = this.currentRoom.players[user.uid]?.isReady || false;
            const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            const roomRef = doc(window.firebaseAuth.db, 'multiplayerRooms', this.currentRoom.id);
            await updateDoc(roomRef, { [`players.${user.uid}.isReady`]: !currentReadyState });

        } catch (error) {
            console.error('Error toggling ready status:', error);
            this.game.ui.showError("Não foi possível atualizar seu status.");
        }
    }

    /**
     * Start multiplayer game (host only)
     */
    async startGame() {
        if (!this.isHost || !this.currentRoom) return;

        try {
            const players = Object.values(this.currentRoom.players || {});
            if (players.length < 2) {
                this.game.ui.showError('Você precisa de pelo menos 2 jogadores para iniciar.');
                return;
            }
            if (!players.every(p => p.isReady)) {
                this.game.ui.showError('Aguarde todos os jogadores ficarem prontos.');
                return;
            }

            const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const roomRef = doc(window.firebaseAuth.db, 'multiplayerRooms', this.currentRoom.id);
            await updateDoc(roomRef, {
                status: 'playing',
                'currentGameState.startedAt': serverTimestamp()
            });
            console.log('Game started by host.');

        } catch (error) {
            console.error('Error starting game:', error);
            this.game.ui.showError("Não foi possível iniciar o jogo.");
        }
    }

    /**
     * Update player score in real-time
     */
    async updatePlayerScore(scoreChange, isCorrect) {
        if (!this.currentRoom || this.currentRoom.status !== 'playing' || !window.firebaseAuth?.isAuthenticated()) return;

        try {
            const user = window.firebaseAuth.getCurrentUser();
            const { doc, updateDoc, increment } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const roomRef = doc(window.firebaseAuth.db, 'multiplayerRooms', this.currentRoom.id);
            
            const currentScore = this.currentRoom.players[user.uid].score || 0;
            const newScore = Math.max(0, currentScore + scoreChange);

            const updates = {
                [`players.${user.uid}.score`]: newScore,
                [`players.${user.uid}.${isCorrect ? 'correct' : 'incorrect'}`]: increment(1)
            };
            await updateDoc(roomRef, updates);

        } catch (error) {
            console.error('Error updating player score:', error);
        }
    }

    /**
     * Leave current room
     */
    async leaveRoom() {
        if (this.unsubscribeRoom) {
            this.unsubscribeRoom();
            this.unsubscribeRoom = null;
        }

        const user = window.firebaseAuth.getCurrentUser();
        if (!this.currentRoom || !user) {
             this.resetLocalState();
             return;
        }

        try {
            const { doc, updateDoc, deleteField, getDoc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const roomRef = doc(window.firebaseAuth.db, 'multiplayerRooms', this.currentRoom.id);
            
            // Get current room state to check remaining players
            const roomDoc = await getDoc(roomRef);
            
            if (!roomDoc.exists()) {
                console.log('Room no longer exists.');
                this.resetLocalState();
                return;
            }
            
            const roomData = roomDoc.data();
            const currentPlayers = roomData.players || {};
            
            // Remove current user from players
            delete currentPlayers[user.uid];
            
            // Check if room will be empty after this player leaves
            const remainingPlayerCount = Object.keys(currentPlayers).length;
            
            if (remainingPlayerCount === 0) {
                // Room will be empty, delete it completely
                await deleteDoc(roomRef);
                console.log('Room deleted - no players remaining.');
            } else {
                // Still have players, just remove current user
                await updateDoc(roomRef, { [`players.${user.uid}`]: deleteField() });
                
                // If the leaving player was the host, assign a new host
                if (this.isHost) {
                    const remainingPlayers = Object.values(currentPlayers);
                    const newHost = remainingPlayers[0]; // First remaining player becomes host
                    
                    await updateDoc(roomRef, { 
                        hostId: newHost.id,
                        hostName: newHost.name,
                        [`players.${newHost.id}.isHost`]: true
                    });
                    
                    console.log(`New host assigned: ${newHost.name}`);
                }
                
                console.log('Player left room.');
            }
        } catch (error) {
            console.error('Error leaving room:', error);
        } finally {
            this.resetLocalState();
        }
    }

    /**
     * Resets the local state of the room manager.
     */
    resetLocalState() {
        this.currentRoom = null;
        this.roomCode = null;
        this.isHost = false;
        if (this.unsubscribeRoom) {
            this.unsubscribeRoom();
            this.unsubscribeRoom = null;
        }
    }

    /**
     * Save player result to leaderboard
     */
    async saveToLeaderboard(gameResults) {
        if (!window.firebaseAuth?.isAuthenticated()) return;

        try {
            const user = window.firebaseAuth.getCurrentUser();
            const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const accuracy = (gameResults.correct + gameResults.incorrect > 0) 
                           ? gameResults.correct / (gameResults.correct + gameResults.incorrect)
                           : 0;

            const leaderboardEntry = {
                userId: user.uid,
                userName: user.displayName || user.email.split('@')[0],
                userAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=4a90e2&color=fff&size=128`,
                score: gameResults.score,
                correct: gameResults.correct,
                incorrect: gameResults.incorrect,
                accuracy: accuracy,
                gameMode: 'multiplayer',
                listId: this.currentRoom.listId,
                listName: this.currentRoom.listName,
                playedAt: serverTimestamp(),
                week: this.getWeekIdentifier(),
                month: this.getMonthIdentifier()
            };

            await addDoc(collection(window.firebaseAuth.db, 'leaderboard'), leaderboardEntry);
            console.log('Multiplayer result saved to leaderboard.');

        } catch (error) {
            console.error('Error saving to leaderboard:', error);
        }
    }
    
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
}