/**
 * Match Game Module - Main entry point
 */

import { initGame, loadWordLists, selectWordList } from './match-game-logic.js?v=1.1';
import { bindEventListeners, showListSelection } from './match-game-ui.js?v=1.1';
import { showMultiplayerMenu } from './multiplayer-ui.js?v=1.1';

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
        const { showGameStatus } = await import('./match-game-ui.js?v=1.1');
        showGameStatus('Erro ao carregar o jogo. Tente recarregar a página.', 'error');
    }
});

/**
 * Bind list selection event listeners
 */
function bindListSelectionListeners() {
    document.getElementById('change-list-btn').addEventListener('click', async () => {
        const { showListSelection } = await import('./match-game-ui.js?v=1.1');
        showListSelection();
    });
    document.getElementById('select-list-btn').addEventListener('click', selectWordList);
    document.getElementById('cancel-selection-btn').addEventListener('click', async () => {
        const { hideListSelection } = await import('./match-game-ui.js?v=1.1');
        hideListSelection();
    });
    
    // Add multiplayer button listener
    const multiplayerBtn = document.getElementById('multiplayer-btn');
    if (multiplayerBtn) {
        multiplayerBtn.addEventListener('click', showMultiplayerMenu);
    }
}