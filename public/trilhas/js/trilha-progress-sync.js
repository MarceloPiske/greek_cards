/**
 * Trilha Progress Synchronization Module
 * Main coordinator for local and cloud trilha progress sync with enhanced user separation
 */

import { 
    saveTrilhaProgressLocal, 
    loadTrilhaProgressLocal, 
    getAllTrilhaProgressLocal,
    deleteTrilhaProgressLocal,
    markTrilhaProgressForSync,
    getTrilhaProgressNeedingSync,
    saveUserDataLocal,
    loadUserDataLocal,
    exportUserData,
    importUserData
} from './trilha-progress-indexeddb.js?v=1.1';

import { 
    saveTrilhaProgressCloud, 
    loadTrilhaProgressCloud, 
    getAllTrilhaProgressCloud,
    deleteTrilhaProgressCloud,
    batchSyncTrilhaProgressCloud,
    isCloudDataNewer,
    mergeTrilhaProgressData,
    backupUserDataCloud,
    downloadUserDataFromCloud
} from './trilha-progress-firestore.js?v=1.1';

// Sync status tracking
let syncInProgress = false;
let lastSyncTime = null;
let currentUserId = null;

/**
 * Initialize user session
 */
export async function initializeUserSession(user) {
    try {
        currentUserId = user ? user.uid : 'anonymous';
        
        if (user) {
            // Save user data locally for offline access
            await saveUserDataLocal({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                plan: window.planManager?.getCurrentUserPlan() || 'free'
            });
            
            // For premium users, download and sync data from cloud
            if (canSyncToCloud()) {
                setTimeout(async () => {
                    await downloadAndSyncUserData();
                }, 2000);
            }
        }
        
        console.log(`User session initialized for: ${currentUserId}`);
    } catch (error) {
        console.error('Error initializing user session:', error);
    }
}

/**
 * Download and sync user data from cloud for premium users
 */
export async function downloadAndSyncUserData() {
    if (!canSyncToCloud() || syncInProgress) {
        return { success: false, reason: 'Not available or sync in progress' };
    }
    
    try {
        syncInProgress = true;
        console.log('Starting user data download and sync...');
        
        // Download data from cloud
        const cloudData = await downloadUserDataFromCloud();
        
        if (cloudData && cloudData.progressData.length > 0) {
            // Import cloud data to local IndexedDB
            await importUserData(cloudData);
            
            console.log(`Successfully synced ${cloudData.progressData.length} progress records from cloud`);
            
            // Backup updated data
            const exportedData = await exportUserData(currentUserId);
            await backupUserDataCloud(exportedData);
            
            lastSyncTime = Date.now();
            
            return { 
                success: true, 
                recordsSynced: cloudData.progressData.length,
                lastSync: new Date().toISOString()
            };
        }
        
        return { success: true, recordsSynced: 0 };
        
    } catch (error) {
        console.error('Error downloading and syncing user data:', error);
        return { success: false, error: error.message };
    } finally {
        syncInProgress = false;
    }
}

/**
 * Check if user can sync to cloud
 */
function canSyncToCloud() {
    return window.planManager && 
           (window.planManager.getCurrentUserPlan() === 'cloud' || 
            window.planManager.getCurrentUserPlan() === 'ai') &&
           window.firebaseAuth && 
           window.firebaseAuth.isAuthenticated();
}

/**
 * Save trilha progress (main function used throughout the app)
 */
export async function saveTrilhaProgress(moduleId, progressData) {
    try {
        // Always save locally first for immediate feedback
        const localProgress = await saveTrilhaProgressLocal(moduleId, progressData, currentUserId);
        
        // If user can sync to cloud, sync asynchronously
        if (canSyncToCloud()) {
            // Non-blocking cloud sync
            saveTrilhaProgressCloud(moduleId, progressData).catch(error => {
                console.warn(`Cloud sync failed for ${moduleId}, will retry later:`, error);
                markTrilhaProgressForSync(moduleId, currentUserId);
            });
            
            console.log(`Trilha progress saved locally and queued for cloud sync: ${moduleId}`);
        } else {
            console.log(`Using local storage only for ${moduleId} (free plan user)`);
        }
        
        return localProgress;
    } catch (error) {
        console.error('Error saving trilha progress:', error);
        throw error;
    }
}

/**
 * Load trilha progress (main function used throughout the app)
 */
export async function loadTrilhaProgress(moduleId) {
    try {
        let localProgress = await loadTrilhaProgressLocal(moduleId, currentUserId);
        
        // If user can sync to cloud, check for cloud data
        if (canSyncToCloud() && navigator.onLine) {
            try {
                const cloudProgress = await loadTrilhaProgressCloud(moduleId);
                
                if (cloudProgress) {
                    // Merge local and cloud data intelligently
                    const mergedProgress = mergeTrilhaProgressData(localProgress, cloudProgress);
                    
                    // Save merged data locally
                    await saveTrilhaProgressLocal(moduleId, mergedProgress, currentUserId);
                    
                    // If cloud was newer or merged, update cloud asynchronously
                    if (mergedProgress.merged || isCloudDataNewer(localProgress, cloudProgress)) {
                        saveTrilhaProgressCloud(moduleId, mergedProgress);
                    }
                    
                    console.log(`Trilha progress synced for ${moduleId}`);
                    return mergedProgress;
                }
            } catch (error) {
                console.warn(`Could not sync with cloud for ${moduleId}, using local progress:`, error);
            }
        }
        
        return localProgress;
    } catch (error) {
        console.error('Error loading trilha progress:', error);
        throw error;
    }
}

/**
 * Mark a block as completed
 */
export async function markBlockCompleted(moduleId, blockId) {
    try {
        const progress = await loadTrilhaProgress(moduleId);
        
        if (!progress.blocosConcluidos.includes(blockId)) {
            progress.blocosConcluidos.push(blockId);
            progress.ultimaAtualizacao = new Date().toISOString();
        }
        
        return await saveTrilhaProgress(moduleId, progress);
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
        const progress = await loadTrilhaProgress(moduleId);
        
        if (!progress.respostas) {
            progress.respostas = {};
        }
        
        progress.respostas[blockId] = {
            resposta: answer,
            correta: isCorrect,
            timestamp: new Date().toISOString()
        };
        
        progress.ultimaAtualizacao = new Date().toISOString();
        
        return await saveTrilhaProgress(moduleId, progress);
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
        const progress = await loadTrilhaProgress(moduleId);
        progress.tempoTotal = (progress.tempoTotal || 0) + minutes;
        progress.ultimaAtualizacao = new Date().toISOString();
        
        return await saveTrilhaProgress(moduleId, progress);
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
        const progress = await loadTrilhaProgress(moduleId);
        
        if (!progress.favoritos) {
            progress.favoritos = [];
        }
        
        const index = progress.favoritos.indexOf(blockId);
        if (index > -1) {
            progress.favoritos.splice(index, 1);
        } else {
            progress.favoritos.push(blockId);
        }
        
        progress.ultimaAtualizacao = new Date().toISOString();
        
        return await saveTrilhaProgress(moduleId, progress);
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
 * Reset progress for a module
 */
export async function resetTrilhaProgress(moduleId) {
    try {
        const emptyProgress = {
            modulo_id: moduleId,
            ultimaAtualizacao: new Date().toISOString(),
            blocosConcluidos: [],
            respostas: {},
            tempoTotal: 0,
            notasPessoais: '',
            favoritos: []
        };
        
        return await saveTrilhaProgress(moduleId, emptyProgress);
    } catch (error) {
        console.error('Error resetting trilha progress:', error);
        throw error;
    }
}

/**
 * Sync offline changes when user comes back online
 */
export async function syncOfflineChanges() {
    if (syncInProgress || !canSyncToCloud() || !navigator.onLine) {
        return { success: 0, failed: 0 };
    }
    
    syncInProgress = true;
    
    try {
        console.log('Starting offline changes sync...');
        
        const progressNeedingSync = await getTrilhaProgressNeedingSync(currentUserId);
        
        if (progressNeedingSync.length === 0) {
            console.log('No offline changes to sync');
            return { success: 0, failed: 0 };
        }
        
        const results = await batchSyncTrilhaProgressCloud(progressNeedingSync);
        
        // Mark successfully synced items as no longer needing sync
        for (const progress of progressNeedingSync) {
            if (results.errors.find(e => e.moduleId === progress.modulo_id)) {
                continue; // Skip failed syncs
            }
            
            progress.syncStatus = 'synced';
            await saveTrilhaProgressLocal(progress.modulo_id, progress, currentUserId);
        }
        
        lastSyncTime = Date.now();
        console.log(`Offline sync completed: ${results.success} synced, ${results.failed} failed`);
        
        return results;
    } catch (error) {
        console.error('Error syncing offline changes:', error);
        return { success: 0, failed: 1, errors: [error.message] };
    } finally {
        syncInProgress = false;
    }
}

/**
 * Full bidirectional sync between local and cloud
 */
export async function fullTrilhaSync() {
    if (syncInProgress || !canSyncToCloud()) {
        return false;
    }
    
    syncInProgress = true;
    
    try {
        console.log('Starting full trilha sync...');
        
        const [localProgress, cloudProgress] = await Promise.all([
            getAllTrilhaProgressLocal(currentUserId),
            getAllTrilhaProgressCloud()
        ]);
        
        // Create maps for easier lookup
        const localMap = new Map(localProgress.map(p => [p.modulo_id, p]));
        const cloudMap = new Map(cloudProgress.map(p => [p.modulo_id, p]));
        
        // Get all unique module IDs
        const allModuleIds = new Set([...localMap.keys(), ...cloudMap.keys()]);
        
        let syncCount = 0;
        
        for (const moduleId of allModuleIds) {
            const local = localMap.get(moduleId);
            const cloud = cloudMap.get(moduleId);
            
            try {
                if (!local && cloud) {
                    // Cloud only - download to local
                    await saveTrilhaProgressLocal(moduleId, cloud, currentUserId);
                    syncCount++;
                } else if (local && !cloud) {
                    // Local only - upload to cloud (async)
                    saveTrilhaProgressCloud(moduleId, local);
                    syncCount++;
                } else if (local && cloud) {
                    // Both exist - merge intelligently
                    const merged = mergeTrilhaProgressData(local, cloud);
                    
                    if (merged.merged) {
                        await saveTrilhaProgressLocal(moduleId, merged, currentUserId);
                        saveTrilhaProgressCloud(moduleId, merged); // Async
                        syncCount++;
                    }
                }
            } catch (error) {
                console.error(`Error syncing module ${moduleId}:`, error);
            }
        }
        
        lastSyncTime = Date.now();
        console.log(`Full sync completed: ${syncCount} modules synced`);
        
        return true;
    } catch (error) {
        console.error('Error during full sync:', error);
        return false;
    } finally {
        syncInProgress = false;
    }
}

/**
 * Initialize sync system
 */
export async function initTrilhaProgressSync() {
    // Initialize with current user
    const user = window.firebaseAuth?.getCurrentUser();
    await initializeUserSession(user);
    
    // Set up online/offline event listeners
    if (typeof window !== 'undefined') {
        window.addEventListener('online', async () => {
            console.log('Connection restored, syncing offline changes...');
            setTimeout(async () => {
                await syncOfflineChanges();
            }, 1000);
        });
        
        window.addEventListener('offline', () => {
            console.log('Connection lost, changes will be saved locally');
        });
        
        // Listen for user changes
        if (window.firebaseAuth) {
            // Re-initialize when user changes
            const originalUpdateUI = window.firebaseAuth.updateUIForUser;
            if (originalUpdateUI) {
                window.firebaseAuth.updateUIForUser = function(user) {
                    originalUpdateUI.call(this, user);
                    initializeUserSession(user);
                };
            }
        }
    }
}

/**
 * Get sync status
 */
export function getSyncStatus() {
    return {
        canSync: canSyncToCloud(),
        syncInProgress,
        lastSyncTime,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        currentUserId
    };
}

// Initialize sync system when module loads
initTrilhaProgressSync();

// Export for global access
if (typeof window !== 'undefined') {
    window.trilhaProgressSync = {
        saveTrilhaProgress,
        loadTrilhaProgress,
        markBlockCompleted,
        saveBlockAnswer,
        addStudyTime,
        toggleFavoriteBlock,
        getCompletionPercentage,
        resetTrilhaProgress,
        syncOfflineChanges,
        fullTrilhaSync,
        downloadAndSyncUserData,
        getSyncStatus,
        initializeUserSession
    };
}