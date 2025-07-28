/**
 * Match Game Application Entry Point
 * Initializes the game controller and sets up global access
 */

import { MatchGameController } from './match-game-controller.js';

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