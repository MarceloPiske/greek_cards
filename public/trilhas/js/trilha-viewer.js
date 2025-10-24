/**
 * Trilha Viewer Core Logic
 */

<<<<<<< HEAD
import * as UIManager from './trilha-viewer-ui.js?v=1.1';
import * as InteractionManager from './trilha-viewer-interactions.js?v=1.1';
=======
import { saveProgress, loadProgress, markBlockCompleted, addStudyTime } from '../../progress-manager.js';
import * as UIManager from './trilha-viewer-ui.js';
import * as InteractionManager from './trilha-viewer-interactions.js';
>>>>>>> 485a7111651673321d36bac1405974bd151865fc

// Import new sync system
import { 
    loadTrilhaProgress, 
    markBlockCompleted as markBlockCompletedSync, 
    addStudyTime as addStudyTimeSync 
<<<<<<< HEAD
} from './trilha-progress-sync.js?v=1.1';
=======
} from './trilha-progress-sync.js';
>>>>>>> 485a7111651673321d36bac1405974bd151865fc

// --- STATE MANAGEMENT ---
let currentActivityIndex = 0;
let trilhaData = null;
let progressData = null;
let sessionStats = {
    startTime: null,
    totalTimeSpent: 0
};

const urlParams = new URLSearchParams(window.location.search);
const trilhaId = urlParams.get('trilha');

/**
 * Initializes the viewer by loading data and setting up the initial view.
 */
export async function initViewer() {
    if (!trilhaId) {
        UIManager.showError('Nenhuma trilha especificada.');
        return;
    }
    sessionStats.startTime = Date.now();
    await loadTrilhaData(trilhaId);
}

/**
 * Loads trilha content and user progress from storage.
 */
async function loadTrilhaData(moduleId) {
    try {
        UIManager.showLoadingState('Carregando conteúdo do módulo...');
        
<<<<<<< HEAD
        const response = await fetch(`./trilhas/${moduleId}.json`);
=======
        const response = await fetch(`trilhas/trilhas/${moduleId}.json`);
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
        if (!response.ok) throw new Error(`Trilha não encontrada: ${moduleId}`);
        
        const data = await response.json();
        trilhaData = {
            id: data.modulo.id,
            titulo: data.modulo.titulo,
            descricao: data.modulo.descricao,
            nivel: data.modulo.nivel,
            trilha: data.trilha
        };

        // Use new sync system
        progressData = await loadTrilhaProgress(moduleId);
        currentActivityIndex = findFirstIncompleteActivity();
        
        UIManager.updatePageMetadata(trilhaData);
        await renderCurrentActivity();
        
    } catch (error) {
        console.error('Erro ao carregar trilha:', error);
        UIManager.showError('Não foi possível carregar o conteúdo da trilha. Tente novamente.');
    } finally {
        UIManager.hideLoadingState();
    }
}

/**
 * Finds the first activity that the user has not completed.
 * @returns {number} The index of the first incomplete activity.
 */
function findFirstIncompleteActivity() {
    if (!progressData || !progressData.blocosConcluidos || progressData.blocosConcluidos.length === 0) {
        return 0;
    }
    for (let i = 0; i < trilhaData.trilha.length; i++) {
        if (!progressData.blocosConcluidos.includes(trilhaData.trilha[i].id)) {
            return i;
        }
    }
    return trilhaData.trilha.length - 1; // All completed, show last one
}

/**
 * Renders the current activity, updates navigation and interactions.
 */
async function renderCurrentActivity() {
    if (!trilhaData) return;
    const activity = trilhaData.trilha[currentActivityIndex];
    UIManager.displayActivity(activity, progressData);
    UIManager.updateNavigation(currentActivityIndex, trilhaData.trilha.length, progressData);
    InteractionManager.setupActivityInteractions(activity, trilhaData, handleFavoriteToggle);
}

/**
 * Handles the favorite toggle callback to update progress data locally.
 */
function handleFavoriteToggle(activityId, isFavorited) {
    if (!progressData.favoritos) progressData.favoritos = [];
    
    const index = progressData.favoritos.indexOf(activityId);
    if (isFavorited && index === -1) {
        progressData.favoritos.push(activityId);
    } else if (!isFavorited && index > -1) {
        progressData.favoritos.splice(index, 1);
    }
}

// --- NAVIGATION LOGIC ---

/**
 * Navigates to the previous activity.
 */
export function navigatePrevious() {
    if (currentActivityIndex > 0) {
        currentActivityIndex--;
        renderCurrentActivity();
    }
}

/**
 * Navigates to the next activity or completes the module.
 */
export async function navigateNext() {
    if (!trilhaData) return;
    
    await markCurrentActivityAsCompleted();
    
    if (currentActivityIndex < trilhaData.trilha.length - 1) {
        currentActivityIndex++;
        await renderCurrentActivity();
    } else {
        await completeTrilha();
    }
}

// --- PROGRESS MANAGEMENT ---

/**
 * Marks the current activity as completed and saves progress.
 */
async function markCurrentActivityAsCompleted() {
    if (!trilhaData) return;
    const activityId = trilhaData.trilha[currentActivityIndex].id;
    if (!progressData.blocosConcluidos.includes(activityId)) {
        // Use new sync system
        progressData = await markBlockCompletedSync(trilhaId, activityId);
    }
}

/**
 * Finalizes the trilha, saves final progress, and shows completion modal.
 */
async function completeTrilha() {
    try {
        sessionStats.totalTimeSpent = Math.round((Date.now() - sessionStats.startTime) / 60000);
        // Use new sync system
        await addStudyTimeSync(trilhaId, sessionStats.totalTimeSpent);
        progressData = await loadTrilhaProgress(trilhaId); // reload to get final time

        UIManager.showEnhancedCompletionModal(trilhaData, progressData, sessionStats);
        
        // Setup interactions for the new modal
        InteractionManager.setupActivityInteractions(null, trilhaData, null);

    } catch (error) {
        console.error('Erro ao completar a trilha:', error);
        UIManager.showError('Ocorreu um erro ao finalizar o módulo.');
    }
}