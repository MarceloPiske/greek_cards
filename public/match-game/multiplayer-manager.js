/**
 * Multiplayer Manager - Handles multiplayer game sessions
 */

<<<<<<< HEAD
import { getWordsFromList } from './word-list-manager.js?v=1.1';
=======
import { getWordsFromList } from './word-list-manager.js';
>>>>>>> 485a7111651673321d36bac1405974bd151865fc

// Game states
export const GAME_STATES = {
    WAITING: 'waiting',
    IN_PROGRESS: 'in_progress',
    FINISHED: 'finished',
    CANCELLED: 'cancelled'
};

// Player states
export const PLAYER_STATES = {
    CONNECTED: 'connected',
    READY: 'ready',
    PLAYING: 'playing',
    FINISHED: 'finished',
    DISCONNECTED: 'disconnected'
};

let currentSession = null;
let sessionListener = null;

/**
 * Create a new multiplayer session
 */
export async function createMultiplayerSession(hostUserId, hostName, wordListId, gameConfig = {}) {
    try {
        if (!window.firebaseAuth?.isAuthenticated() || !window.firebaseAuth.db) {
            throw new Error('Firebase authentication required');
        }

        const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const sessionId = generateSessionId();
        const sessionRef = doc(window.firebaseAuth.db, 'multiplayerSessions', sessionId);
        
        // Load words from selected list
        const words = await getWordsFromList(wordListId);
        if (words.length < 10) {
            throw new Error('Lista deve ter pelo menos 10 palavras para modo multiplayer');
        }
        
        // Shuffle and select words for the session
        const shuffledWords = [...words].sort(() => Math.random() - 0.5);
        const sessionWords = shuffledWords.slice(0, Math.min(20, shuffledWords.length));
        
        const sessionData = {
            id: sessionId,
            hostUserId,
            status: GAME_STATES.WAITING,
            wordListId,
            words: sessionWords,
            maxPlayers: gameConfig.maxPlayers || 2,
            timeLimit: gameConfig.timeLimit || 300, // 5 minutes default
            pointsPerCorrect: gameConfig.pointsPerCorrect || 10,
            pointsPerIncorrect: gameConfig.pointsPerIncorrect || -5,
            players: {
                [hostUserId]: {
                    id: hostUserId,
                    name: hostName,
                    isHost: true,
                    state: PLAYER_STATES.CONNECTED,
                    score: 0,
                    correctAnswers: 0,
                    connections: {},
                    joinedAt: serverTimestamp(),
                    lastActivity: serverTimestamp()
                }
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            gameStartedAt: null,
            gameEndedAt: null
        };
        
        await setDoc(sessionRef, sessionData);
        
        currentSession = { ...sessionData, ref: sessionRef };
        console.log('Multiplayer session created:', sessionId);
        
        return sessionData;
    } catch (error) {
        console.error('Error creating multiplayer session:', error);
        throw error;
    }
}

/**
 * Join an existing multiplayer session
 */
export async function joinMultiplayerSession(sessionId, playerId, playerName) {
    try {
        if (!window.firebaseAuth?.isAuthenticated() || !window.firebaseAuth.db) {
            throw new Error('Firebase authentication required');
        }

        const { doc, getDoc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const sessionRef = doc(window.firebaseAuth.db, 'multiplayerSessions', sessionId);
        const sessionSnap = await getDoc(sessionRef);
        
        if (!sessionSnap.exists()) {
            throw new Error('Sessão não encontrada');
        }
        
        const sessionData = sessionSnap.data();
        
        if (sessionData.status !== GAME_STATES.WAITING) {
            throw new Error('Não é possível entrar nesta sessão no momento');
        }
        
        const playerCount = Object.keys(sessionData.players).length;
        if (playerCount >= sessionData.maxPlayers) {
            throw new Error('Sessão lotada');
        }
        
        if (sessionData.players[playerId]) {
            throw new Error('Jogador já está na sessão');
        }
        
        // Add player to session
        const updatedPlayers = {
            ...sessionData.players,
            [playerId]: {
                id: playerId,
                name: playerName,
                isHost: false,
                state: PLAYER_STATES.CONNECTED,
                score: 0,
                correctAnswers: 0,
                connections: {},
                joinedAt: serverTimestamp(),
                lastActivity: serverTimestamp()
            }
        };
        
        await updateDoc(sessionRef, {
            players: updatedPlayers,
            updatedAt: serverTimestamp()
        });
        
        currentSession = { ...sessionData, players: updatedPlayers, ref: sessionRef };
        console.log('Joined multiplayer session:', sessionId);
        
        return { ...sessionData, players: updatedPlayers };
    } catch (error) {
        console.error('Error joining multiplayer session:', error);
        throw error;
    }
}

/**
 * Start listening to session updates
 */
export function startSessionListener(sessionId, onUpdate) {
    try {
        if (!window.firebaseAuth?.db) {
            throw new Error('Firebase not initialized');
        }

        const { doc, onSnapshot } = window.firebaseAuth.db.modules;
        const sessionRef = doc(window.firebaseAuth.db, 'multiplayerSessions', sessionId);
        
        sessionListener = onSnapshot(sessionRef, (doc) => {
            if (doc.exists()) {
                const sessionData = doc.data();
                currentSession = { ...sessionData, ref: sessionRef };
                onUpdate(sessionData);
            } else {
                console.warn('Session document no longer exists');
                onUpdate(null);
            }
        }, (error) => {
            console.error('Session listener error:', error);
            onUpdate(null);
        });
        
        return sessionListener;
    } catch (error) {
        console.error('Error starting session listener:', error);
        throw error;
    }
}

/**
 * Stop session listener
 */
export function stopSessionListener() {
    if (sessionListener) {
        sessionListener();
        sessionListener = null;
    }
}

/**
 * Update player progress
 */
export async function updatePlayerProgress(sessionId, playerId, progressData) {
    try {
        if (!currentSession || !window.firebaseAuth?.db) return;

        const { updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const updateData = {};
        updateData[`players.${playerId}.score`] = progressData.score;
        updateData[`players.${playerId}.correctAnswers`] = progressData.correctAnswers;
        updateData[`players.${playerId}.connections`] = progressData.connections;
        updateData[`players.${playerId}.lastActivity`] = serverTimestamp();
        updateData.updatedAt = serverTimestamp();
        
        await updateDoc(currentSession.ref, updateData);
        
        console.log('Player progress updated:', playerId, progressData.score);
    } catch (error) {
        console.error('Error updating player progress:', error);
    }
}

/**
 * Start the multiplayer game
 */
export async function startMultiplayerGame(sessionId) {
    try {
        if (!currentSession || !window.firebaseAuth?.db) return;

        const { updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const updateData = {
            status: GAME_STATES.IN_PROGRESS,
            gameStartedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        // Update all players to playing state
        Object.keys(currentSession.players).forEach(playerId => {
            updateData[`players.${playerId}.state`] = PLAYER_STATES.PLAYING;
        });
        
        await updateDoc(currentSession.ref, updateData);
        
        console.log('Multiplayer game started');
    } catch (error) {
        console.error('Error starting multiplayer game:', error);
    }
}

/**
 * End the multiplayer game
 */
export async function endMultiplayerGame(sessionId, results) {
    try {
        if (!currentSession || !window.firebaseAuth?.db) return;

        const { updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        await updateDoc(currentSession.ref, {
            status: GAME_STATES.FINISHED,
            gameEndedAt: serverTimestamp(),
            finalResults: results,
            updatedAt: serverTimestamp()
        });
        
        console.log('Multiplayer game ended');
    } catch (error) {
        console.error('Error ending multiplayer game:', error);
    }
}

/**
 * Leave multiplayer session
 */
export async function leaveMultiplayerSession(sessionId, playerId) {
    try {
        if (!currentSession || !window.firebaseAuth?.db) return;

        const { updateDoc, deleteDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const updatedPlayers = { ...currentSession.players };
        delete updatedPlayers[playerId];
        
        // If no players left, delete session
        if (Object.keys(updatedPlayers).length === 0) {
            await deleteDoc(currentSession.ref);
            console.log('Session deleted - no players remaining');
        } else {
            // If host left, assign new host
            const remainingPlayers = Object.values(updatedPlayers);
            if (currentSession.players[playerId]?.isHost && remainingPlayers.length > 0) {
                const newHost = remainingPlayers[0];
                updatedPlayers[newHost.id].isHost = true;
            }
            
            await updateDoc(currentSession.ref, {
                players: updatedPlayers,
                updatedAt: serverTimestamp()
            });
        }
        
        stopSessionListener();
        currentSession = null;
        
        console.log('Left multiplayer session');
    } catch (error) {
        console.error('Error leaving multiplayer session:', error);
    }
}

/**
 * Get current session
 */
export function getCurrentSession() {
    return currentSession;
}

/**
 * Generate unique session ID
 */
function generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Check if user can access multiplayer (requires cloud or ai plan)
 */
export async function canAccessMultiplayer() {
    try {
        if (!window.firebaseAuth?.isAuthenticated()) {
            return false;
        }
        
<<<<<<< HEAD
        const { canSyncToCloud } = await import('../plan-manager.js?v=1.1');
=======
        const { canSyncToCloud } = await import('../plan-manager.js');
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
        return canSyncToCloud(); // Multiplayer requires cloud sync capability
    } catch (error) {
        console.warn('Could not check multiplayer access:', error);
        return false;
    }
}