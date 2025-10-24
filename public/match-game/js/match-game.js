/**
 * Match Game Application Entry Point
 * Initializes the game controller and sets up global access
 */

<<<<<<< HEAD
import { MatchGameController } from './match-game-controller.js?v=1.1';
=======
import { MatchGameController } from './match-game-controller.js';
>>>>>>> 485a7111651673321d36bac1405974bd151865fc

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Make sure Firebase Auth is initialized before starting the game
    if (typeof window.firebaseAuth?.initAuth === 'function') {
        await window.firebaseAuth.initAuth();
    }
    
    const game = new MatchGameController();
    await game.initialize();
    
    // Make game instance globally available for debugging and UI access
    window.matchGame = game;
});