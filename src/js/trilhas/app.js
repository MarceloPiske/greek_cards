/**
 * Inicialização da aplicação de trilhas de estudo
 */

import { carregarTrilhasDisponiveis } from './trilha-loader.js';
import * as trilhaUI from './trilha-ui.js';

// Exportar funções para o escopo global
window.trilhaLoader = { 
    carregarTrilhasDisponiveis 
};

// Inicializar a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Configurar botão de voltar
    document.getElementById('back-button').addEventListener('click', () => {
        window.location.href = '/';
    });
    
    // Carregar lista de trilhas disponíveis
    carregarTrilhasDisponiveis();
});

// Exportar módulos UI para o escopo global
window.trilhaUI = trilhaUI;