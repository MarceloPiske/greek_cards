/**
 * Multiplayer Game Manager - Main entry point for multiplayer functionality
 */

// Re-export functions from the refactored modules for backward compatibility
export { 
    showLobby, 
    handleSessionUpdate, 
    closeLobby 
<<<<<<< HEAD
} from './multiplayer-lobby.js?v=1.1';
=======
} from './multiplayer-lobby.js';
>>>>>>> 485a7111651673321d36bac1405974bd151865fc

export { 
    startMultiplayerGameUI, 
    handleSessionGameUpdate,
    cleanupGameplay
<<<<<<< HEAD
} from './multiplayer-gameplay.js?v=1.1';
=======
} from './multiplayer-gameplay.js';
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
