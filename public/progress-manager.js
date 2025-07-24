/**
 * Progress Management System
 * Handles local (IndexedDB) and cloud (Firestore) progress tracking
 */

import { initDB } from './indexedDB.js';
import { canSyncToCloud } from './cards/plan-manager.js';

// Database configuration
const PROGRESS_DB_NAME = 'grekoine-db';
const PROGRESS_STORE = 'progresso';

/**
 * Initialize progress database
 */
export async function initProgressDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(PROGRESS_DB_NAME, 1);
        
        request.onerror = (event) => {
            console.error('Error opening progress database:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
                db.createObjectStore(PROGRESS_STORE, { keyPath: 'modulo_id' });
            }
        };
    });
}

/**
 * Save progress locally to IndexedDB
 */
export async function saveProgressLocal(moduleId, progressData) {
    try {
        const db = await initProgressDB();
        const tx = db.transaction(PROGRESS_STORE, 'readwrite');
        const store = tx.objectStore(PROGRESS_STORE);
        
        const progressRecord = {
            modulo_id: moduleId,
            ultimaAtualizacao: new Date().toISOString(),
            blocosConcluidos: progressData.blocosConcluidos || [],
            respostas: progressData.respostas || {},
            tempoTotal: progressData.tempoTotal || 0,
            notasPessoais: progressData.notasPessoais || '',
            favoritos: progressData.favoritos || []
        };
        
        await new Promise((resolve, reject) => {
            const request = store.put(progressRecord);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
        console.log(`Progress saved locally for module: ${moduleId}`);
        return progressRecord;
    } catch (error) {
        console.error('Error saving progress locally:', error);
        throw error;
    }
}

/**
 * Load progress from IndexedDB
 */
export async function loadProgressLocal(moduleId) {
    try {
        const db = await initProgressDB();
        const tx = db.transaction(PROGRESS_STORE, 'readonly');
        const store = tx.objectStore(PROGRESS_STORE);
        
        return new Promise((resolve, reject) => {
            const request = store.get(moduleId);
            request.onsuccess = () => {
                const result = request.result || {
                    modulo_id: moduleId,
                    ultimaAtualizacao: null,
                    blocosConcluidos: [],
                    respostas: {},
                    tempoTotal: 0,
                    notasPessoais: '',
                    favoritos: []
                };
                resolve(result);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error loading progress locally:', error);
        return {
            modulo_id: moduleId,
            ultimaAtualizacao: null,
            blocosConcluidos: [],
            respostas: {},
            tempoTotal: 0,
            notasPessoais: '',
            favoritos: []
        };
    }
}

/**
 * Check if user can sync to cloud based on new plan structure
 */
async function shouldSyncToCloud() {
    if (typeof window === 'undefined' || !window.firebaseAuth || !window.firebaseAuth.isAuthenticated()) {
        return false;
    }
    
    try {
        // Import plan manager to check if user can sync to cloud
        const { canSyncToCloud } = await import('./cards/plan-manager.js');
        return canSyncToCloud(); // This now checks for 'cloud' or 'ai' plans
    } catch (error) {
        console.warn('Could not check plan permissions:', error);
        return false;
    }
}

/**
 * Save progress to Firestore (cloud and ai plan users)
 */
export async function saveProgressCloud(moduleId, progressData) {
    if (!(await shouldSyncToCloud()) || !window.firebaseAuth?.isAuthenticated()) {
        console.log('Cloud sync not available - user needs cloud or ai plan');
        return null;
    }
    
    try {
        const user = window.firebaseAuth.getCurrentUser();
        if (!user || !window.firebaseAuth.db) return null;
        
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const progressRecord = {
            modulo_id: moduleId,
            ultimaAtualizacao: new Date().toISOString(),
            versaoModulo: 'v1.0',
            blocosConcluidos: progressData.blocosConcluidos || [],
            respostas: progressData.respostas || {},
            tempoTotal: progressData.tempoTotal || 0,
            notasPessoais: progressData.notasPessoais || '',
            favoritos: progressData.favoritos || []
        };
        
        const docRef = doc(window.firebaseAuth.db, 'users', user.uid, 'progresso', moduleId);
        await setDoc(docRef, progressRecord);
        
        console.log(`Progress synced to cloud for module: ${moduleId}`);
        return progressRecord;
    } catch (error) {
        console.error('Error saving progress to cloud:', error);
        throw error;
    }
}

/**
 * Load progress from Firestore (cloud and ai plan users)
 */
export async function loadProgressCloud(moduleId) {
    if (!(await shouldSyncToCloud()) || !window.firebaseAuth?.isAuthenticated()) {
        return null;
    }
    
    try {
        const user = window.firebaseAuth.getCurrentUser();
        if (!user || !window.firebaseAuth.db) return null;
        
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const docRef = doc(window.firebaseAuth.db, 'users', user.uid, 'progresso', moduleId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error loading progress from cloud:', error);
        return null;
    }
}

/**
 * Main function to save progress (handles local vs cloud based on plan)
 */
export async function saveProgress(moduleId, progressData) {
    try {
        // Always save locally first (for offline access)
        const localProgress = await saveProgressLocal(moduleId, progressData);
        
        // Try to sync to cloud if user has cloud or ai plan
        if (await shouldSyncToCloud() && window.firebaseAuth?.isAuthenticated()) {
            try {
                await saveProgressCloud(moduleId, progressData);
                console.log('Progress synced to cloud (cloud/ai plan user)');
            } catch (error) {
                console.warn('Cloud sync failed, progress saved locally only:', error);
            }
        } else {
            console.log('Using local storage only (free plan user)');
        }
        
        return localProgress;
    } catch (error) {
        console.error('Error saving progress:', error);
        throw error;
    }
}

/**
 * Main function to load progress (handles local vs cloud based on plan)
 */
export async function loadProgress(moduleId) {
    try {
        let localProgress = await loadProgressLocal(moduleId);
        
        // If cloud or ai plan user, check cloud and sync
        if (await shouldSyncToCloud() && window.firebaseAuth?.isAuthenticated()) {
            try {
                const cloudProgress = await loadProgressCloud(moduleId);
                
                if (cloudProgress) {
                    const localDate = localProgress.ultimaAtualizacao ? new Date(localProgress.ultimaAtualizacao) : new Date(0);
                    const cloudDate = new Date(cloudProgress.ultimaAtualizacao);
                    
                    // Use most recent progress
                    if (cloudDate > localDate) {
                        // Cloud is more recent, update local
                        await saveProgressLocal(moduleId, cloudProgress);
                        localProgress = cloudProgress;
                        console.log('Synced newer progress from cloud');
                    } else if (localDate > cloudDate) {
                        // Local is more recent, update cloud
                        await saveProgressCloud(moduleId, localProgress);
                        console.log('Updated cloud with newer local progress');
                    }
                }
            } catch (error) {
                console.warn('Could not sync with cloud, using local progress:', error);
            }
        }
        
        return localProgress;
    } catch (error) {
        console.error('Error loading progress:', error);
        throw error;
    }
}

/**
 * Mark a block as completed
 */
export async function markBlockCompleted(moduleId, blockId) {
    try {
        const progress = await loadProgress(moduleId);
        
        if (!progress.blocosConcluidos.includes(blockId)) {
            progress.blocosConcluidos.push(blockId);
        }
        
        return await saveProgress(moduleId, progress);
    } catch (error) {
        console.error('Error marking block as completed:', error);
        throw error;
    }
}

/**
 * Save answer for a block
 */
export async function saveBlockAnswer(moduleId, blockId, answer, isCorrect) {
    try {
        const progress = await loadProgress(moduleId);
        
        if (!progress.respostas) {
            progress.respostas = {};
        }
        
        progress.respostas[blockId] = {
            resposta: answer,
            correta: isCorrect,
            timestamp: new Date().toISOString()
        };
        
        return await saveProgress(moduleId, progress);
    } catch (error) {
        console.error('Error saving block answer:', error);
        throw error;
    }
}

/**
 * Add time spent studying
 */
export async function addStudyTime(moduleId, minutes) {
    try {
        const progress = await loadProgress(moduleId);
        progress.tempoTotal = (progress.tempoTotal || 0) + minutes;
        
        return await saveProgress(moduleId, progress);
    } catch (error) {
        console.error('Error adding study time:', error);
        throw error;
    }
}

/**
 * Toggle favorite block
 */
export async function toggleFavoriteBlock(moduleId, blockId) {
    try {
        const progress = await loadProgress(moduleId);
        
        if (!progress.favoritos) {
            progress.favoritos = [];
        }
        
        const index = progress.favoritos.indexOf(blockId);
        if (index > -1) {
            progress.favoritos.splice(index, 1);
        } else {
            progress.favoritos.push(blockId);
        }
        
        return await saveProgress(moduleId, progress);
    } catch (error) {
        console.error('Error toggling favorite block:', error);
        throw error;
    }
}

/**
 * Get completion percentage for a module
 */
export function getCompletionPercentage(progress, totalBlocks) {
    if (!progress || !progress.blocosConcluidos || totalBlocks === 0) {
        return 0;
    }
    
    return Math.round((progress.blocosConcluidos.length / totalBlocks) * 100);
}

/**
 * Check if user can access premium features
 */
export async function canAccessPremiumProgress() {
    return await canSyncToCloud();
}

// Export for global access
if (typeof window !== 'undefined') {
    window.progressManager = {
        saveProgress,
        loadProgress,
        markBlockCompleted,
        saveBlockAnswer,
        addStudyTime,
        toggleFavoriteBlock,
        getCompletionPercentage,
        canAccessPremiumProgress,
        initProgressDB
    };
}