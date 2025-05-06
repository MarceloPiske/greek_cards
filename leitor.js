/**
 * Arquivo principal do leitor de trilhas
 * Refatorado para melhor manutenção
 */

import { leitorState, carregarProgresso, salvarProgresso } from './leitor/state.js';
import { 
    renderizarAtividade, 
    atualizarProgressBar, 
    atualizarBotoesNavegacao,
    mostrarBadgeConclusao,
    mostrarModalConclusao,
    mostrarModalFeedback
} from './leitor/ui.js';

// Carrega a trilha de estudo
async function carregarTrilha(trilhaId = 'modulo_1') {
    try {
        const response = await fetch(`/trilhas/${trilhaId}.json`);
        if (!response.ok) {
            throw new Error('Não foi possível carregar a trilha');
        }
        
        const data = await response.json();
        //console.log('Trilha carregada:', data);
        
        leitorState.trilhaAtual = data.trilha;
        
        // Carregar progresso salvo, se houver
        await carregarProgresso(trilhaId);
        //console.log('Progresso carregado:', leitorState);
        
        // Renderizar a primeira atividade
        renderizarAtividade(leitorState.indiceAtual);
        atualizarProgressBar();
    } catch (error) {
        console.error('Erro ao carregar trilha:', error);
        document.getElementById('activity-container').innerHTML = `
            <div class="error-message">
                <h3>Erro ao carregar a trilha</h3>
                <p>${error.message}</p>
                <button onclick="carregarTrilha()">Tentar novamente</button>
            </div>
        `;
    }
}

// Marca atividade como completada
function marcarComoCompletada(atividadeId) {
    if (!leitorState.trilhaCompletada.includes(atividadeId)) {
        leitorState.trilhaCompletada.push(atividadeId);
        salvarProgresso();
        
        // Mostrar badge de conclusão
        mostrarBadgeConclusao();
        
        // Verificar se todas as atividades foram concluídas
        verificarTrilhaConcluida();
    }
}

// Navega para a próxima atividade
function proximaAtividade() {
    if (leitorState.indiceAtual < leitorState.trilhaAtual.length - 1) {
        leitorState.indiceAtual++;
        renderizarAtividade(leitorState.indiceAtual);
        atualizarProgressBar();
        salvarProgresso();
    }
}

// Navega para a atividade anterior
function atividadeAnterior() {
    if (leitorState.indiceAtual > 0) {
        leitorState.indiceAtual--;
        renderizarAtividade(leitorState.indiceAtual);
        atualizarProgressBar();
    }
}

// Verifica se a trilha toda foi concluída
function verificarTrilhaConcluida() {
    if (!leitorState.trilhaAtual) return;
    
    const todasAtividades = leitorState.trilhaAtual.map(atividade => atividade.id);
    const todasConcluidas = todasAtividades.every(id => leitorState.trilhaCompletada.includes(id));
    
    if (todasConcluidas) {
        // Mostrar modal de conclusão de módulo
        mostrarModalConclusao();
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Obter o ID da trilha da URL
    const params = new URLSearchParams(window.location.search);
    const trilhaId = params.get('trilha') || 'modulo_1';
    
    // Carregar a trilha
    await carregarTrilha(trilhaId);
    
    // Botões de navegação
    document.getElementById('next-button').addEventListener('click', proximaAtividade);
    document.getElementById('prev-button').addEventListener('click', atividadeAnterior);
    
    // Botão de voltar
    document.getElementById('back-button').addEventListener('click', () => {
        window.location.href = '/src/html/conteudo/trilha_conteudo.html';
    });
    
    // Adicionar botão de feedback
    const navigationButtons = document.querySelector('.navigation-buttons');
    const feedbackButton = document.createElement('button');
    feedbackButton.id = 'feedback-button';
    feedbackButton.classList.add('feedback-button');
    feedbackButton.textContent = 'Avaliar módulo';
    feedbackButton.addEventListener('click', mostrarModalFeedback);
    
    // Adicionar ao DOM
    navigationButtons.insertAdjacentElement('beforeend', feedbackButton);
});

// Expor funções necessárias ao escopo global
window.marcarComoCompletada = marcarComoCompletada;
window.verificarQuiz = function(quizId, respostaCorreta) {
    // Importamos esta função dinamicamente para evitar problemas com o escopo global
    import('./leitor/activities.js').then(module => {
        module.verificarQuiz(quizId, respostaCorreta);
    });
};