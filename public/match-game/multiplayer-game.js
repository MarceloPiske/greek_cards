/**
 * Multiplayer Game Manager - Main entry point for multiplayer functionality
 */

// Re-export functions from the refactored modules for backward compatibility
export { 
    showLobby, 
    handleSessionUpdate, 
    closeLobby 
} from './multiplayer-lobby.js?v=1.1';

export { 
    startMultiplayerGameUI, 
    handleSessionGameUpdate,
    cleanupGameplay
} from './multiplayer-gameplay.js?v=1.1';