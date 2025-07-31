/**
 * UI Components Module for Trilhas de Estudo 
 * Handles UI component generation, modals, and visual elements
 */

// Enhanced toast notification system
export function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toasts
    document.querySelectorAll('.toast-notification').forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    const icons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };
    
    toast.innerHTML = `
        <div class="toast-content">
            <span class="material-symbols-sharp">${icons[type] || 'info'}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" aria-label="Fechar notificação">
                <span class="material-symbols-sharp">close</span>
            </button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Setup close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    });
    
    // Show toast with animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // Auto-remove after duration
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// Enhanced HTML generation for modules
export function gerarHTMLModulo(trilha, index, container) {
    const isLastItem = index === container.children.length;
    const moduleNumber = index + 1;
    
    const html = `
        <div class="trilha-module enhanced-module" 
             data-modulo-id="${trilha.id}" 
             data-nivel="${trilha.nivel || 'iniciante'}"
             data-index="${index}">
            
            <div class="module-timeline-item">
                <div class="module-badge ${index > 0 ? 'locked' : ''}" 
                     title="${trilha.nivel || 'Nível básico'}"
                     data-module-number="${moduleNumber}">
                    <span class="material-symbols-sharp">${trilha.icone || 'school'}</span>
                    <div class="badge-number">${moduleNumber}</div>
                </div>
                
                ${!isLastItem ? '<div class="module-connector enhanced-connector"></div>' : ''}
            </div>
            
            <div class="module-card enhanced-card ${index > 0 ? 'locked' : ''}" 
                 data-modulo-id="${trilha.id}">
                
                <!-- Module Header -->
                <div class="module-header">
                    <div class="module-meta">
                        <span class="module-level ${trilha.nivel || 'iniciante'}">
                            <span class="material-symbols-sharp">trending_up</span>
                            ${(trilha.nivel || 'iniciante').charAt(0).toUpperCase() + (trilha.nivel || 'iniciante').slice(1)}
                        </span>
                        <span class="module-number">Módulo ${moduleNumber}</span>
                    </div>
                    
                    <div class="module-actions">
                        <button class="module-info-btn enhanced-info-btn" 
                                data-modulo-id="${trilha.id}"
                                title="Informações do módulo">
                            <span class="material-symbols-sharp">info</span>
                        </button>
                        
                        <button class="module-bookmark-btn" 
                                data-modulo-id="${trilha.id}"
                                title="Marcar como favorito">
                            <span class="material-symbols-sharp">bookmark_border</span>
                        </button>
                    </div>
                </div>
                
                <!-- Module Content -->
                <div class="module-content">
                    <h3 class="module-title">${trilha.titulo}</h3>
                    <p class="module-description">${trilha.descricao}</p>
                    
                    <div class="module-details enhanced-details">
                        <span class="module-atividades">
                            <span class="material-symbols-sharp">assignment</span>
                            <span>${trilha.numeroAtividades || '5'} atividades</span>
                        </span>
                        <span class="module-tempo">
                            <span class="material-symbols-sharp">schedule</span>
                            <span>${trilha.tempoEstimado || '15 min'}</span>
                        </span>
                        <span class="module-dificuldade">
                            <span class="material-symbols-sharp">speed</span>
                            <span class="difficulty-stars" data-difficulty="${trilha.nivel || 'iniciante'}">
                                <span class="star"></span>
                                <span class="star"></span>
                                <span class="star"></span>
                            </span>
                        </span>
                    </div>
                </div>
                
                <!-- Enhanced Progress Section -->
                <div class="module-progress-section">
                    <div class="progress-header">
                        <span class="progress-label">Progresso</span>
                        <span class="progress-percentage">0%</span>
                    </div>
                    
                    <div class="module-progress enhanced-progress">
                        <div class="progress-bar" style="width: 0%">
                            <div class="progress-glow"></div>
                        </div>
                        <div class="progress-steps" id="progress-steps-${trilha.id}">
                            <!-- Steps will be generated dynamically -->
                        </div>
                    </div>
                    
                    <div class="progress-details">
                        <span class="completed-activities">0 de ${trilha.numeroAtividades || 5} concluídas</span>
                        <span class="time-spent">0 min estudados</span>
                    </div>
                </div>
                
                <!-- Module Status -->
                <div class="module-status-section">
                    <div class="module-status ${index > 0 ? 'locked' : ''}">
                        <span class="material-symbols-sharp">
                            ${index > 0 ? 'lock' : 'play_arrow'}
                        </span>
                        <span class="status-text">
                            ${index > 0 ? 'Bloqueado' : 'Iniciar'}
                        </span>
                    </div>
                    
                    <div class="module-features" style="display: none;">
                        <div class="feature-item" title="Conteúdo interativo">
                            <span class="material-symbols-sharp">touch_app</span>
                        </div>
                        <div class="feature-item" title="Exercícios práticos">
                            <span class="material-symbols-sharp">fitness_center</span>
                        </div>
                        <div class="feature-item" title="Progresso salvo na nuvem" data-premium="cloud">
                            <span class="material-symbols-sharp">cloud_sync</span>
                        </div>
                        <div class="feature-item" title="IA tutora disponível" data-premium="ai">
                            <span class="material-symbols-sharp">smart_toy</span>
                        </div>
                    </div>
                </div>
                
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', html);
    
    // Initialize module features based on user plan
    initializeModuleFeatures(trilha.id);
}

// Initialize module features based on user plan
export function initializeModuleFeatures(moduleId) {
    const moduleCard = document.querySelector(`[data-modulo-id="${moduleId}"]`);
    if (!moduleCard) return;
    
    const featuresContainer = moduleCard.querySelector('.module-features');
    const cloudFeature = featuresContainer.querySelector('[data-premium="cloud"]');
    const aiFeature = featuresContainer.querySelector('[data-premium="ai"]');
    
    if (window.planManager) {
        const canSync = window.planManager.canSyncToCloud();
        const hasAI = window.planManager.hasAIAccess();
        
        if (canSync || hasAI) {
            featuresContainer.style.display = 'flex';
        }
        
        if (canSync) {
            cloudFeature.classList.add('available');
        }
        
        if (hasAI) {
            aiFeature.classList.add('available');
        }
    }
}

// Generate progress preview HTML
export function generateProgressPreview(progressData, trilha) {
    if (!progressData || !trilha) return '';
    
    const completedCount = progressData.blocosConcluidos?.length || 0;
    const totalCount = trilha.length;
    const progressPercent = Math.round((completedCount / totalCount) * 100);
    
    return `
        <div class="progress-preview">
            <h4>Seu progresso</h4>
            <div class="progress-bar-container">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <span class="progress-text">${progressPercent}%</span>
            </div>
            <div class="progress-stats">
                <span>${completedCount} de ${totalCount} atividades concluídas</span>
                <span>${progressData.tempoTotal || 0} minutos estudados</span>
            </div>
        </div>
    `;
}

// Generate activity preview list
export function generateActivityPreviewList(trilha, progressData) {
    return trilha.map((activity, index) => {
        const isCompleted = progressData?.blocosConcluidos?.includes(activity.id) || false;
        const isFavorited = progressData?.favoritos?.includes(activity.id) || false;
        
        return `
            <div class="activity-preview-item ${isCompleted ? 'completed' : ''}">
                <div class="activity-icon">
                    <span class="material-symbols-sharp">
                        ${isCompleted ? 'check_circle' : getActivityIcon(activity.tipo)}
                    </span>
                </div>
                <div class="activity-info">
                    <span class="activity-title">${activity.titulo || activity.instrucoes}</span>
                    <span class="activity-type">${getActivityTypeName(activity.tipo)}</span>
                </div>
                <div class="activity-status">
                    ${isFavorited ? '<span class="material-symbols-sharp favorite">favorite</span>' : ''}
                    ${isCompleted ? '<span class="completed-badge">Concluído</span>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Helper functions for activity types
export function getActivityIcon(type) {
    const icons = {
        'leitura': 'menu_book',
        'exercicio': 'fitness_center', 
        'video': 'play_circle',
        'quiz': 'quiz',
        'explicacao': 'lightbulb'
    };
    return icons[type] || 'school';
}

export function getActivityTypeName(type) {
    const names = {
        'leitura': 'Leitura',
        'exercicio': 'Exercício',
        'video': 'Vídeo', 
        'quiz': 'Quiz',
        'explicacao': 'Explicação'
    };
    return names[type] || 'Atividade';
}

// Loading modal functions
export function showLoadingModal() {
    const loadingHtml = `
        <div class="modal loading-modal" style="display: flex;">
            <div class="modal-content loading-content">
                <div class="loading-spinner">
                    <div class="spinner-circle"></div>
                    <div class="spinner-circle"></div>
                    <div class="spinner-circle"></div>
                </div>
                <p>Carregando informações do módulo...</p>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loadingHtml);
}

export function hideLoadingModal() {
    const loadingModal = document.querySelector('.loading-modal');
    if (loadingModal) loadingModal.remove();
}

// Close modal with animation
export function closeModalWithAnimation(modal) {
    modal.classList.add('closing');
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('closing');
    }, 300);
}

// Show reset confirmation dialog
export function showResetConfirmationDialog(moduloId) {
    const confirmHtml = `
        <div class="modal confirmation-modal" style="display: flex;">
            <div class="modal-content">
                <h3>Reiniciar progresso</h3>
                <p>Tem certeza de que deseja reiniciar todo o progresso deste módulo? Esta ação não pode ser desfeita.</p>
                <div class="modal-actions">
                    <button class="btn secondary" onclick="closeModalWithAnimation(this.closest('.modal'))">
                        Cancelar
                    </button>
                    <button class="btn danger" onclick="confirmResetProgress('${moduloId}')">
                        Sim, reiniciar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', confirmHtml);
}

// Show module preview on hover
export function showModulePreview(moduleId) {
    // Implementation for module preview tooltip
    const preview = document.createElement('div');
    preview.className = 'module-preview-tooltip';
    preview.innerHTML = `
        <div class="preview-content">
            <h4>Prévia rápida</h4>
            <p>Passe o mouse para ver mais detalhes sobre este módulo.</p>
            <div class="preview-actions">
                <span class="preview-hint">Clique para iniciar</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(preview);
    
    // Position tooltip
    const moduleElement = document.querySelector(`[data-modulo-id="${moduleId}"]`);
    if (moduleElement) {
        const rect = moduleElement.getBoundingClientRect();
        preview.style.left = `${rect.right + 10}px`;
        preview.style.top = `${rect.top}px`;
    }
    
    setTimeout(() => preview.classList.add('show'), 50);
}

export function hideModulePreview() {
    const preview = document.querySelector('.module-preview-tooltip');
    if (preview) {
        preview.classList.remove('show');
        setTimeout(() => preview.remove(), 200);
    }
}

// Verificar módulo completo (helper function)
export async function verificarModuloCompleto(moduloId) {
    try {
        const response = await fetch(`trilhas/trilhas/${moduloId}.json`);
        if (response.ok) {
            const data = await response.json();
            return data.trilha ? data.trilha.length : 5;
        }
        return 5; // valor padrão
    } catch (error) {
        console.error('Erro ao verificar módulo:', error);
        return 5; // valor padrão em caso de erro
    }
}