/**
 * Trilha Viewer UI Module
 * Handles all DOM rendering and updates for the trilha viewer.
 */

/**
 * Displays the content for a specific activity.
 */
export function displayActivity(activity, progressData) {
    const contentContainer = document.getElementById('trilha-content');
    if (!contentContainer) return;

    // Show loading transition
    contentContainer.classList.add('loading-transition');

    const activityType = activity.tipo || 'leitura';
    const activityTitle = activity.titulo || activity.instrucoes || 'Atividade';
    const activityContent = activity.conteudo?.html || activity.conteudo?.texto || 'Conteúdo não disponível';

    const isCompleted = progressData.blocosConcluidos.includes(activity.id);
    const isFavorited = progressData.favoritos && progressData.favoritos.includes(activity.id);

    const wordCount = activityContent.replace(/<[^>]*>/g, '').split(' ').length;
    const readingTime = Math.ceil(wordCount / 200); // 200 words per minute

    contentContainer.innerHTML = `
        <div class="activity-header enhanced-header">
            <div class="activity-meta">
                <div class="activity-badges">
                    <div class="activity-type-badge ${activityType}">
                        <span class="material-symbols-sharp">${getActivityIcon(activityType)}</span>
                        <span>${getActivityTypeName(activityType)}</span>
                    </div>
                </div>
                <div class="activity-actions">
                    <button id="favorite-btn" class="btn icon enhanced-btn ${isFavorited ? 'favorited' : ''}" 
                            title="${isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
                        <span class="material-symbols-sharp">${isFavorited ? 'favorite' : 'favorite_border'}</span>
                    </button>
                    <button id="share-btn" class="btn icon enhanced-btn" title="Compartilhar atividade">
                        <span class="material-symbols-sharp">share</span>
                    </button>
                    ${isCompleted ? `
                    <div class="completion-badge enhanced-badge">
                        <span class="material-symbols-sharp">check_circle</span>
                        <span>Concluído</span>
                    </div>` : ''}
                </div>
            </div>
            <h1 class="activity-title">${activityTitle}</h1>
            ${activity.instrucoes ? `<p class="activity-instructions">${activity.instrucoes}</p>` : ''}
        </div>
        
        <div class="activity-content enhanced-content">
            <div class="content-wrapper">
                ${activityContent}
            </div>
        </div>
    `;

    // Smooth transition
    setTimeout(() => {
        contentContainer.classList.remove('loading-transition');
        contentContainer.scrollTop = 0;
    }, 300);
}

/**
 * Updates the navigation controls (buttons, progress bar, counter).
 */
export function updateNavigation(currentIndex, totalActivities, progressData) {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const counter = document.getElementById('activity-counter');
    const progressFill = document.getElementById('progress-fill');

    if (counter) {
        counter.textContent = `${currentIndex + 1} / ${totalActivities}`;
    }

    if (progressFill) {
        const percent = totalActivities > 0 ? ((currentIndex + 1) / totalActivities) * 100 : 0;
        progressFill.style.width = `${percent}%`;
    }

    if (prevBtn) {
        prevBtn.disabled = currentIndex === 0;
    }

    if (nextBtn) {
        if (currentIndex >= totalActivities - 1) {
            nextBtn.innerHTML = 'Concluir Módulo <span class="material-symbols-sharp">check</span>';
            nextBtn.classList.add('complete-btn');
        } else {
            nextBtn.innerHTML = 'Próximo <span class="material-symbols-sharp">chevron_right</span>';
            nextBtn.classList.remove('complete-btn');
        }
    }
}

/**
 * Updates the page metadata like title and breadcrumb.
 */
export function updatePageMetadata(trilhaData) {
    const currentModuleElement = document.getElementById('current-module');
    if (currentModuleElement) {
        currentModuleElement.textContent = trilhaData.titulo;
    }
    document.title = `${trilhaData.titulo} - Koiné`;
}

/**
 * Shows the enhanced module completion modal with stats and celebration.
 */
export function showEnhancedCompletionModal(trilhaData, progressData, sessionStats) {
    const completedBlocks = progressData.blocosConcluidos.length;
    const totalTime = progressData.tempoTotal || 0;
    const completionPercent = Math.round((completedBlocks / trilhaData.trilha.length) * 100);

    const modalHtml = `
        <div class="modal completion-modal enhanced-completion" style="display: flex;">
            <div class="modal-content completion-content">
                <div class="completion-celebration">
                    <div class="completion-icon">
                        <span class="material-symbols-sharp">celebration</span>
                    </div>
                    <h2>🎉 Parabéns!</h2>
                    <p>Você concluiu com sucesso a trilha "<strong>${trilhaData.titulo}</strong>"!</p>
                </div>
                
                <div class="completion-stats enhanced-stats">
                    <div class="stat-grid">
                        <div class="stat-item">
                            <span class="material-symbols-sharp">assignment_turned_in</span>
                            <div class="stat-content">
                                <span class="stat-value">${completedBlocks}</span>
                                <span class="stat-label">Atividades completadas</span>
                            </div>
                        </div>
                         <div class="stat-item">
                            <span class="material-symbols-sharp">schedule</span>
                            <div class="stat-content">
                                <span class="stat-value">${sessionStats.totalTimeSpent} min</span>
                                <span class="stat-label">Tempo na sessão</span>
                            </div>
                        </div>
                        <div class="stat-item">
                            <span class="material-symbols-sharp">trending_up</span>
                            <div class="stat-content">
                                <span class="stat-value">${completionPercent}%</span>
                                <span class="stat-label">Progresso alcançado</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions enhanced-actions">
                    <button id="share-achievement" class="btn secondary">
                        <span class="material-symbols-sharp">share</span>
                        Compartilhar
                    </button>
                    <button id="back-to-trilhas" class="btn primary">
                        <span class="material-symbols-sharp">arrow_back</span>
                        Voltar às trilhas
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    triggerConfettiAnimation();
}


/**
 * Triggers a confetti animation for celebration.
 */
export function triggerConfettiAnimation() {
    const colors = ['#4a90e2', '#67b26f', '#ffd700', '#ff6b6b', '#4ecdc4'];
    for (let i = 0; i < 100; i++) {
        createConfettiPiece(colors[Math.floor(Math.random() * colors.length)]);
    }
}

function createConfettiPiece(color) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    confetti.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: ${color};
        top: -100px;
        left: ${Math.random() * 100}vw;
        animation: confetti-fall ${2 + Math.random() * 3}s linear forwards;
        /* z-index: 10000; */
        border-radius: 50%;
    `;
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 5000);
}

/**
 * Displays a loading state in the content area.
 */
export function showLoadingState(message = 'Carregando...') {
    const contentContainer = document.getElementById('trilha-content');
    if (contentContainer) {
        contentContainer.innerHTML = `
            <div class="loading-state enhanced-loading">
                <div class="loading-spinner">
                    <div class="spinner-circle"></div>
                    <div class="spinner-circle"></div>
                    <div class="spinner-circle"></div>
                </div>
                <p>${message}</p>
            </div>
        `;
    }
}

/**
 * Hides the loading state.
 */
export function hideLoadingState() {
    const loadingState = document.querySelector('.loading-state');
    if (loadingState) {
        loadingState.classList.add('fade-out');
        setTimeout(() => loadingState.remove(), 300);
    }
}

/**
 * Displays an error message in the content area.
 */
export function showError(message) {
    const contentContainer = document.getElementById('trilha-content');
    if (contentContainer) {
        contentContainer.innerHTML = `
            <div class="error-message enhanced-error">
                <div class="error-icon"><span class="material-symbols-sharp">error</span></div>
                <h3>Oops! Algo deu errado</h3>
                <p>${message}</p>
                <div class="error-actions">
                    <button onclick="window.location.reload()" class="btn primary">
                        <span class="material-symbols-sharp">refresh</span>
                        Tentar novamente
                    </button>
                    <button onclick="window.location.href='trilhas/trilha_conteudo.html'" class="btn secondary">
                        <span class="material-symbols-sharp">arrow_back</span>
                        Voltar
                    </button>
                </div>
            </div>
        `;
    }
}

/**
 * Helper to get an icon based on activity type.
 */
function getActivityIcon(type) {
    const icons = {
        'leitura': 'menu_book', 'exercicio': 'fitness_center', 'explicacao': 'lightbulb', 'video': 'play_circle'
    };
    return icons[type] || 'school';
}

/**
 * Helper to get a display name for an activity type.
 */
function getActivityTypeName(type) {
    const names = {
        'leitura': 'Leitura', 'exercicio': 'Exercício', 'explicacao': 'Explicação', 'video': 'Vídeo'
    };
    return names[type] || 'Atividade';
}

// Add CSS for share modal and toast
const style = document.createElement('style');
style.textContent = `
    @keyframes confetti-fall {
        0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
        100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
    }
    .loading-transition { opacity: 0.5; transition: opacity 0.3s ease; }
    .fade-out { opacity: 0; transition: opacity 0.3s ease; }
    
    .share-text-area {
        width: 100%;
        height: 120px;
        padding: 1rem;
        border: 1px solid var(--shadow);
        border-radius: 8px;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-family: inherit;
        font-size: 0.9rem;
        resize: vertical;
        margin: 1rem 0;
    }
    
    .share-text-area:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
    }
    
    .share-fallback-modal .modal-content {
        max-width: 500px;
    }
    
    .share-toast .toast-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .share-toast .material-symbols-sharp {
        font-size: 1.2rem;
    }
`;
document.head.appendChild(style);