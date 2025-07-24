/**
 * Inicialização da aplicação de trilhas de estudo
 */

import { carregarTrilhasDisponiveis } from './trilha-loader.js';

// Initialize progress manager
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize progress manager
        if (window.progressManager) {
            await window.progressManager.initProgressDB();
        }
        
        // Setup back button
        const backButton = document.getElementById('back-button');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location.href = '/';
            });
        }
        
        // Load available trilhas
        await carregarTrilhasDisponiveis();
        
        console.log('Trilhas loaded successfully with progress tracking');
    } catch (error) {
        console.error('Error initializing trilhas app:', error);
    }
});

// Export functions for global scope
window.trilhaLoader = { 
    carregarTrilhasDisponiveis 
};