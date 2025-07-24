/**
 * Trilha Viewer Main Logic
 */

import { 
    saveProgress, 
    loadProgress, 
    markBlockCompleted, 
    addStudyTime,
    getCompletionPercentage
} from '../../progress-manager.js';

let currentTrilha = null;
let currentActivityIndex = 0;
let trilhaData = null;
let startTime = null;
let progressData = null;

// Get trilha ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const trilhaId = urlParams.get('trilha');

/**
 * Initialize the viewer
 */
export async function initViewer() {
    if (!trilhaId) {
        showError('Nenhuma trilha especificada');
        return;
    }
    
    await loadTrilha(trilhaId);
    setupBackButton();
    startTime = Date.now();
}

/**
 * Load trilha data
 */
async function loadTrilha(moduloId) {
    try {
        // Try to load the trilha JSON file
        const response = await fetch(`trilhas/trilhas/${moduloId}.json`);
        
        if (!response.ok) {
            throw new Error(`Trilha não encontrada: ${moduloId}`);
        }
        
        const data = await response.json();
        
        // Extract trilha data from new structure
        trilhaData = {
            id: data.modulo.id,
            titulo: data.modulo.titulo,
            trilha: data.trilha
        };
        
        // Update breadcrumb
        const currentModuleElement = document.getElementById('current-module');
        if (currentModuleElement) {
            currentModuleElement.textContent = trilhaData.titulo;
        }
        
        // Load saved progress using new progress manager
        progressData = await loadProgress(moduloId);
        
        // Find current position based on completed blocks
        currentActivityIndex = progressData.blocosConcluidos.length;
        
        // Don't go beyond available activities
        if (currentActivityIndex >= trilhaData.trilha.length) {
            currentActivityIndex = trilhaData.trilha.length - 1;
        }
        
        // Display current activity
        displayActivity(currentActivityIndex);
        updateNavigation();
        
    } catch (error) {
        console.error('Erro ao carregar trilha:', error);
        showError('Erro ao carregar o conteúdo da trilha');
    }
}

/**
 * Display an activity
 */
export function displayActivity(index) {
    if (!trilhaData || !trilhaData.trilha || index >= trilhaData.trilha.length) {
        showError('Atividade não encontrada');
        return;
    }
    
    const activity = trilhaData.trilha[index];
    const contentContainer = document.getElementById('trilha-content');
    
    if (contentContainer) {
        const activityType = activity.tipo || 'leitura';
        const activityTitle = activity.titulo || activity.instrucoes || 'Atividade';
        const activityContent = activity.conteudo?.html || activity.conteudo?.texto || 'Conteúdo não disponível';
        
        // Check if block is completed or favorited
        const isCompleted = progressData.blocosConcluidos.includes(activity.id);
        const isFavorited = progressData.favoritos && progressData.favoritos.includes(activity.id);
        
        contentContainer.innerHTML = `
            <div class="activity-header">
                <div class="activity-meta">
                    <div class="activity-type-badge ${activityType}">
                        <span class="material-symbols-sharp">${getActivityIcon(activityType)}</span>
                        <span>${getActivityTypeName(activityType)}</span>
                    </div>
                    <div class="activity-actions">
                        <button id="favorite-btn" class="btn icon ${isFavorited ? 'favorited' : ''}" 
                                title="${isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
                            <span class="material-symbols-sharp">${isFavorited ? 'favorite' : 'favorite_border'}</span>
                        </button>
                        ${isCompleted ? `
                        <span class="completion-badge">
                            <span class="material-symbols-sharp">check_circle</span>
                            Concluído
                        </span>` : ''}
                    </div>
                </div>
                <h2>${activityTitle}</h2>
            </div>
            <div class="activity-content">
                ${activityContent}
            </div>
        `;
        
        // Setup favorite button
        const favoriteBtn = document.getElementById('favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => toggleFavorite(activity.id));
        }
        
        // Scroll to top
        contentContainer.scrollTop = 0;
    }
}

/**
 * Get activity icon based on type
 */
function getActivityIcon(type) {
    const icons = {
        'leitura': 'menu_book',
        'exercicio': 'fitness_center',
        'video': 'play_circle',
        'quiz': 'quiz',
        'explicacao': 'lightbulb'
    };
    return icons[type] || 'school';
}

/**
 * Get activity type name
 */
function getActivityTypeName(type) {
    const names = {
        'leitura': 'Leitura',
        'exercicio': 'Exercício',
        'video': 'Vídeo',
        'quiz': 'Quiz',
        'explicacao': 'Explicação'
    };
    return names[type] || 'Atividade';
}

/**
 * Update navigation buttons and progress
 */
export function updateNavigation() {
    if (!trilhaData || !progressData) return;
    
    const totalActivities = trilhaData.trilha.length;
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const counter = document.getElementById('activity-counter');
    const progressFill = document.getElementById('progress-fill');
    
    // Update counter
    if (counter) {
        counter.textContent = `${currentActivityIndex + 1} / ${totalActivities}`;
    }
    
    // Update progress bar based on completed blocks
    const progressPercent = getCompletionPercentage(progressData, totalActivities);
    if (progressFill) {
        progressFill.style.width = `${progressPercent}%`;
    }
    
    // Update buttons
    if (prevBtn) {
        prevBtn.disabled = currentActivityIndex === 0;
    }
    
    if (nextBtn) {
        nextBtn.disabled = false;
        
        if (currentActivityIndex === totalActivities - 1) {
            nextBtn.innerHTML = '<span class="material-symbols-sharp">check</span> Concluir Módulo';
            nextBtn.classList.add('complete-btn');
        } else {
            nextBtn.innerHTML = 'Próximo <span class="material-symbols-sharp">chevron_right</span>';
            nextBtn.classList.remove('complete-btn');
        }
    }
}

/**
 * Navigate to previous activity
 */
export function navigatePrevious() {
    if (currentActivityIndex > 0) {
        saveCurrentActivityProgress();
        currentActivityIndex--;
        displayActivity(currentActivityIndex);
        updateNavigation();
    }
}

/**
 * Navigate to next activity or complete trilha
 */
export function navigateNext() {
    if (!trilhaData) return;
    
    // Mark current activity as completed and save progress
    saveCurrentActivityProgress();
    
    if (currentActivityIndex < trilhaData.trilha.length - 1) {
        currentActivityIndex++;
        displayActivity(currentActivityIndex);
        updateNavigation();
    } else {
        // Complete the trilha
        completeTrilha();
    }
}

/**
 * Save progress for current activity
 */
async function saveCurrentActivityProgress() {
    if (!trilhaData || currentActivityIndex >= trilhaData.trilha.length) return;
    
    try {
        const currentActivity = trilhaData.trilha[currentActivityIndex];
        await markBlockCompleted(trilhaId, currentActivity.id);
        
        // Update local progress data
        progressData = await loadProgress(trilhaId);
        
        // Add study time (estimate based on time spent on current activity)
        if (startTime) {
            const timeSpent = Math.round((Date.now() - startTime) / 60000); // minutes
            if (timeSpent > 0) {
                await addStudyTime(trilhaId, timeSpent);
            }
            startTime = Date.now(); // Reset for next activity
        }
        
    } catch (error) {
        console.error('Erro ao salvar progresso:', error);
    }
}

/**
 * Complete trilha
 */
async function completeTrilha() {
    try {
        // Save final progress
        await saveCurrentActivityProgress();
        
        // Show completion message
        showCompletionModal();
        
    } catch (error) {
        console.error('Erro ao completar trilha:', error);
        alert('Erro ao salvar conclusão da trilha');
    }
}

/**
 * Toggle favorite status for current activity
 */
async function toggleFavorite(blockId) {
    try {
        const { toggleFavoriteBlock } = await import('../../progress-manager.js');
        await toggleFavoriteBlock(trilhaId, blockId);
        
        // Refresh progress data and update display
        progressData = await loadProgress(trilhaId);
        displayActivity(currentActivityIndex);
        
    } catch (error) {
        console.error('Erro ao favoritar bloco:', error);
    }
}

/**
 * Show completion modal
 */
function showCompletionModal() {
    const completedBlocks = progressData.blocosConcluidos.length;
    const totalTime = progressData.tempoTotal || 0;
    const completionPercent = getCompletionPercentage(progressData, trilhaData.trilha.length);
    
    const modalHtml = `
        <div class="modal completion-modal" style="display: flex;">
            <div class="modal-content completion-content">
                <div class="completion-icon">
                    <span class="material-symbols-sharp">check_circle</span>
                </div>
                <h2>Parabéns!</h2>
                <p>Você concluiu com sucesso a trilha "<strong>${trilhaData.titulo}</strong>"!</p>
                <div class="completion-stats">
                    <div class="stat">
                        <span class="material-symbols-sharp">assignment_turned_in</span>
                        <span>${completedBlocks} atividades completadas (${completionPercent}%)</span>
                    </div>
                    ${totalTime > 0 ? `
                    <div class="stat">
                        <span class="material-symbols-sharp">schedule</span>
                        <span>${totalTime} minutos de estudo</span>
                    </div>` : ''}
                </div>
                <div class="modal-actions">
                    <button id="back-to-trilhas" class="btn primary">
                        <span class="material-symbols-sharp">arrow_back</span>
                        Voltar às trilhas
                    </button>
                    <button id="review-favorites" class="btn secondary" ${progressData.favoritos && progressData.favoritos.length > 0 ? '' : 'style="display:none"'}">
                        <span class="material-symbols-sharp">favorite</span>
                        Revisar favoritos (${progressData.favoritos ? progressData.favoritos.length : 0})
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const backBtn = document.getElementById('back-to-trilhas');
    const reviewBtn = document.getElementById('review-favorites');
    
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'trilhas/trilha_conteudo.html';
        });
    }
    
    if (reviewBtn) {
        reviewBtn.addEventListener('click', () => {
            // Could implement favorites review functionality
            alert('Funcionalidade de revisão em desenvolvimento!');
        });
    }
}

/**
 * Show error message
 */
function showError(message) {
    const contentContainer = document.getElementById('trilha-content');
    if (contentContainer) {
        contentContainer.innerHTML = `
            <div class="error-message">
                <span class="material-symbols-sharp">error</span>
                <h3>Erro</h3>
                <p>${message}</p>
                <button onclick="window.location.href='trilhas/trilha_conteudo.html'" class="btn primary">
                    Voltar às trilhas
                </button>
            </div>
        `;
    }
}

/**
 * Setup back button
 */
function setupBackButton() {
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = 'trilhas/trilha_conteudo.html';
        });
    }
}

// Export current state getters
export function getCurrentTrilhaData() {
    return trilhaData;
}

export function getCurrentActivityIndex() {
    return currentActivityIndex;
}

import { setupNavigation, setupMobileNavigation, initThemeSwitcher } from './trilha-navigation.js';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await initViewer();
    setupNavigation();
    setupMobileNavigation();
    initThemeSwitcher();
});