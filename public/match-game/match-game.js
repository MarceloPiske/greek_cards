/**
 * Match Game Module - Main entry point
 */

<<<<<<< HEAD
import { initGame, loadWordLists, selectWordList } from './match-game-logic.js?v=1.1';
import { bindEventListeners, showListSelection } from './match-game-ui.js?v=1.1';
import { showMultiplayerMenu } from './multiplayer-ui.js?v=1.1';
=======
import { initGame, loadWordLists, selectWordList } from './match-game-logic.js';
import { bindEventListeners, showListSelection } from './match-game-ui.js';
import { showMultiplayerMenu } from './multiplayer-ui.js';
>>>>>>> 485a7111651673321d36bac1405974bd151865fc

/**
 * Initialize the match game
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initGame();
        bindEventListeners();
        bindListSelectionListeners();
        await loadWordLists();
        await showListSelection();
    } catch (error) {
        console.error('Error initializing match game:', error);
<<<<<<< HEAD
        const { showGameStatus } = await import('./match-game-ui.js?v=1.1');
=======
        const { showGameStatus } = await import('./match-game-ui.js');
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
        showGameStatus('Erro ao carregar o jogo. Tente recarregar a página.', 'error');
    }
});

/**
 * Bind list selection event listeners
 */
function bindListSelectionListeners() {
    document.getElementById('change-list-btn').addEventListener('click', async () => {
<<<<<<< HEAD
        const { showListSelection } = await import('./match-game-ui.js?v=1.1');
=======
        const { showListSelection } = await import('./match-game-ui.js');
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
        showListSelection();
    });
    document.getElementById('select-list-btn').addEventListener('click', selectWordList);
    document.getElementById('cancel-selection-btn').addEventListener('click', async () => {
<<<<<<< HEAD
        const { hideListSelection } = await import('./match-game-ui.js?v=1.1');
=======
        const { hideListSelection } = await import('./match-game-ui.js');
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
        hideListSelection();
    });
    
    // Add multiplayer button listener
    const multiplayerBtn = document.getElementById('multiplayer-btn');
    if (multiplayerBtn) {
        multiplayerBtn.addEventListener('click', showMultiplayerMenu);
    }
}