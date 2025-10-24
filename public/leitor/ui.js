/**
 * Module for UI-related functions
 */

import { leitorState, salvarProgresso, salvarProgressoModuloConcluido } from './state.js';
import { renderVocabulario, renderInterlinear, renderQuiz, renderExplicacao, renderLeitura } from './activities.js';
import { saveFeedback } from '../indexedDB.js';

// Retorna o título adequado para cada tipo de atividade
export function getTituloAtividade(tipo) {
    switch(tipo) {
        case 'vocabulario':
            return 'Vocabulario';
        case 'interlinear':
            return 'Leitura Interlinear';
        case 'quiz':
            return 'Quiz';
        case 'explicacao':
            return 'Explicação';
        case 'leitura':
            return 'Leitura';
        default:
            return 'Atividade';
    }
}

// Atualiza a barra de progresso
export function atualizarProgressBar() {
    if (!leitorState.trilhaAtual) return;
    
    const progressBar = document.getElementById('progressBar');
    const percentComplete = (leitorState.indiceAtual / (leitorState.trilhaAtual.length - 1)) * 100;
    progressBar.style.width = `${percentComplete}%`;
}

// Atualiza o estado dos botões de navegação
export function atualizarBotoesNavegacao() {
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    
    prevButton.disabled = leitorState.indiceAtual <= 0;
    nextButton.disabled = leitorState.indiceAtual >= leitorState.trilhaAtual.length - 1;
}

// Renderiza a atividade atual
export function renderizarAtividade(indice) {
    if (!leitorState.trilhaAtual || indice < 0 || indice >= leitorState.trilhaAtual.length) {
        return;
    }
    
    const container = document.getElementById('activity-container');
    const atividade = leitorState.trilhaAtual[indice];
    
    // Limpar conteúdo anterior
    container.innerHTML = '';
    
    // Adicionar título da atividade
    const tituloAtividade = document.createElement('h2');
    tituloAtividade.className = 'activity-title';
    tituloAtividade.innerHTML = `<span class="activity-number">${indice + 1}/${leitorState.trilhaAtual.length}</span> ${getTituloAtividade(atividade.tipo)}`;
    container.appendChild(tituloAtividade);
    
    // Renderizar com base no tipo de atividade
    switch(atividade.tipo) {
        case 'vocabulario':
            renderVocabulario(atividade, container);
            break;
        case 'interlinear':
            renderInterlinear(atividade, container);
            break;
        case 'quiz':
            renderQuiz(atividade, container);
            break;
        case 'explicacao':
            renderExplicacao(atividade, container);
            break;
        case 'leitura':
            renderLeitura(atividade, container);
            break;
        default:
            container.innerHTML += `<div class="error-message">Tipo de atividade desconhecido: ${atividade.tipo}</div>`;
    }
    
    // Adicionar botão de completar atividade se ainda não foi completada
    if (!leitorState.trilhaCompletada.includes(atividade.id)) {
        const completeButton = document.createElement('button');
        completeButton.className = 'mark-complete';
        completeButton.innerHTML = 'Marcar como concluído <span class="material-symbols-sharp">check_circle</span>';
        completeButton.onclick = () => marcarComoCompletada(atividade.id);
        container.appendChild(completeButton);
    } else {
        const completeBadge = document.createElement('div');
        completeBadge.className = 'completed-badge';
        completeBadge.innerHTML = '<span class="material-symbols-sharp">verified</span> Atividade Concluída';
        container.appendChild(completeBadge);
    }
    
    // Atualizar estado da navegação
    atualizarBotoesNavegacao();
}

// Mostra badge de conclusão temporário
export function mostrarBadgeConclusao() {
    // Remover badge existente se houver
    const badgeExistente = document.querySelector('.badge-conclusao');
    if (badgeExistente) badgeExistente.remove();
    
    // Criar novo badge
    const badge = document.createElement('div');
    badge.className = 'badge-conclusao';
    badge.innerHTML = `
        <span class="material-symbols-sharp">check_circle</span>
        Atividade concluída!
    `;
    
    document.body.appendChild(badge);
    
    // Remover após 3 segundos
    setTimeout(() => {
        badge.style.opacity = '0';
        badge.style.transform = 'translateY(20px)';
        setTimeout(() => badge.remove(), 500);
    }, 3000);
}

// Determina qual é o próximo módulo
export function obterProximoModulo(moduloAtual) {
    const modulos = ['modulo_1', 'modulo_2', 'modulo_3'];
    const indexAtual = modulos.indexOf(moduloAtual);
    
    if (indexAtual >= 0 && indexAtual < modulos.length - 1) {
        return modulos[indexAtual + 1];
    }
    
    return null;
}

// Mostra modal de conclusão de módulo
export function mostrarModalConclusao() {
    const trilhaId = new URLSearchParams(window.location.search).get('trilha') || 'modulo_1';
    const proximoModulo = obterProximoModulo(trilhaId);
    
    // Criar o modal
    const modalHtml = `
        <div class="feedback-modal" id="conclusaoModal">
            <div class="feedback-content conclusao-content">
                <button class="close-feedback">&times;</button>
                <div class="conclusao-header">
                    <span class="material-symbols-sharp success-icon">workspace_premium</span>
                    <h2>Parabéns!</h2>
                </div>
                <p>Você concluiu o módulo com sucesso!</p>
                
                <div class="conclusao-stats">
                    <div class="stat-item">
                        <span class="material-symbols-sharp">task_alt</span>
                        <span>${leitorState.trilhaCompletada.length} atividades concluídas</span>
                    </div>
                    <div class="stat-item">
                        <span class="material-symbols-sharp">military_tech</span>
                        <span>100% concluído</span>
                    </div>
                </div>
                
                <div class="conclusao-buttons">
                    <button id="avaliarModulo" class="conclusao-button">Avaliar módulo</button>
                    ${proximoModulo ? `<a href="/leitor.html?trilha=${proximoModulo}" class="conclusao-button primary">Próximo módulo</a>` : ''}
                    <a href="/src/html/conteudo/trilha_conteudo.html" class="conclusao-button secondary">Voltar à trilha</a>
                </div>
            </div>
        </div>
    `;
    
    // Adicionar ao DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.getElementById('conclusaoModal');
    const closeBtn = modal.querySelector('.close-feedback');
    const avaliarBtn = document.getElementById('avaliarModulo');
    
    // Event listeners
    closeBtn.addEventListener('click', () => modal.remove());
    if (avaliarBtn) {
        avaliarBtn.addEventListener('click', () => {
            modal.remove();
            mostrarModalFeedback();
        });
    }
    
    // Salvar progresso para desbloquear próximo módulo
    salvarProgressoModuloConcluido(trilhaId);
    
    // Mostrar modal
    modal.style.display = 'flex';
}

// Adiciona um modal para feedback do usuário
export function mostrarModalFeedback() {
    const trilhaId = new URLSearchParams(window.location.search).get('trilha') || 'modulo_1';
    
    // Criar o modal dinamicamente
    const modalHtml = `
        <div class="feedback-modal" id="feedbackModal">
            <div class="feedback-content">
                <button class="close-feedback">&times;</button>
                <h2>Avalie seu aprendizado</h2>
                <p>Ajude-nos a melhorar esta trilha de estudos!</p>
                
                <div class="avaliacao-container">
                    <h3>Como você avalia este módulo?</h3>
                    <div class="stars-container">
                        <span class="star" data-value="1">★</span>
                        <span class="star" data-value="2">★</span>
                        <span class="star" data-value="3">★</span>
                        <span class="star" data-value="4">★</span>
                        <span class="star" data-value="5">★</span>
                    </div>
                </div>
                
                <div class="comentario-container">
                    <h3>Comentários</h3>
                    <textarea id="comentarioFeedback" placeholder="Deixe seu comentário sobre este módulo..."></textarea>
                </div>
                
                <div class="sugestao-container">
                    <h3>Sugestões de melhoria</h3>
                    <textarea id="sugestaoFeedback" placeholder="O que poderia ser melhorado?"></textarea>
                </div>
                
                <button id="enviarFeedback" class="enviar-feedback">Enviar feedback</button>
            </div>
        </div>
    `;
    
    // Adicionar o modal ao DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.getElementById('feedbackModal');
    const closeBtn = document.querySelector('.close-feedback');
    const stars = document.querySelectorAll('.star');
    const enviarBtn = document.getElementById('enviarFeedback');
    
    let avaliacaoSelecionada = 0;
    
    // Adicionar listeners
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            avaliacaoSelecionada = parseInt(star.dataset.value);
            
            // Resetar todas as estrelas
            stars.forEach(s => s.classList.remove('selected'));
            
            // Selecionar estrelas até a atual
            for (let i = 0; i < avaliacaoSelecionada; i++) {
                stars[i].classList.add('selected');
            }
        });
    });
    
    enviarBtn.addEventListener('click', async () => {
        const comentario = document.getElementById('comentarioFeedback').value;
        const sugestoes = document.getElementById('sugestaoFeedback').value;
        
        if (avaliacaoSelecionada === 0) {
            alert('Por favor, selecione uma avaliação em estrelas.');
            return;
        }
        
        try {
            await saveFeedback(trilhaId, {
                avaliacao: avaliacaoSelecionada,
                comentario,
                sugestoes
            });
            
            // Feedback de sucesso
            alert('Obrigado pelo seu feedback!');
            modal.remove();
        } catch (error) {
            console.error('Erro ao salvar feedback:', error);
            alert('Ocorreu um erro ao enviar o feedback. Por favor, tente novamente.');
        }
    });
    
    // Mostrar o modal
    modal.style.display = 'flex';
}
