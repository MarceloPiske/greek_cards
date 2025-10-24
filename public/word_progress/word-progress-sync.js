/**
 * Word Progress Synchronization Manager
 * Unified CRUD interface that integrates IndexedDB and Firestore
 * with automatic synchronization and conflict resolution for word progress
 */

import { 
    saveWordProgressDB, 
    getWordProgressDB, 
    getAllWordProgressDB, 
    deleteWordProgressDB,
    getWordProgressCountDB,
    getWordProgressByStatusDB,
    getWordProgressStatsDB,
    markWordProgressAsSyncedDB,
    getWordProgressNeedingSyncDB,
    bulkUpdateWordProgressDB
<<<<<<< HEAD
} from './word-progress-db.js?v=1.1';
=======
} from './word-progress-db.js';
>>>>>>> 485a7111651673321d36bac1405974bd151865fc

import {
    saveWordProgressFirestore,
    getWordProgressFirestore,
    getAllWordProgressFirestore,
    deleteWordProgressFirestore,
    getWordProgressCountFirestore,
    getWordProgressByStatusFirestore,
    getWordProgressStatsFirestore,
    wordProgressExistsFirestore,
    performFullWordProgressSync
<<<<<<< HEAD
} from './word-progress-firestore.js?v=1.1';

import { canSyncToCloud } from '../plan-manager.js?v=1.1';
=======
} from './word-progress-firestore.js';

import { canSyncToCloud } from '../plan-manager.js';
>>>>>>> 485a7111651673321d36bac1405974bd151865fc

// Sync status tracking
let syncInProgress = false;
let lastSyncError = null;
let onlineStatus = navigator.onLine;

// Event listeners for online/offline status
window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);

/**
 * Handle when user comes back online
 */
async function handleOnline() {
    onlineStatus = true;
    console.log('Connection restored - attempting to sync pending word progress...');
    
    if (await canSyncToCloud()) {
        try {
            await syncPendingWordProgress();
        } catch (error) {
            console.warn('Auto-sync of word progress on reconnection failed:', error);
            showSyncError('Falha na sincronização automática do progresso. Tente novamente mais tarde.');
        }
    }
}

/**
 * Handle when user goes offline
 */
function handleOffline() {
    onlineStatus = false;
    console.log('Connection lost - word progress operations will be queued for sync');
}

/**
 * Show sync error to user
 */
function showSyncError(message) {
    lastSyncError = message;
    
    // Create or update error notification
    let errorDiv = document.getElementById('word-progress-sync-error');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'word-progress-sync-error';
        errorDiv.className = 'sync-error-notification';
        document.body.appendChild(errorDiv);
    }
    
    errorDiv.innerHTML = `
        <div class="sync-error-content">
            <span class="material-symbols-sharp">sync_problem</span>
            <span class="error-message">${message}</span>
            <button class="retry-sync-btn" onclick="window.wordProgressSyncManager.retrySyncAll()">
                Tentar novamente
            </button>
            <button class="close-error-btn" onclick="this.parentElement.parentElement.remove()">
                <span class="material-symbols-sharp">close</span>
            </button>
        </div>
    `;
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        if (errorDiv && errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 10000);
}

/**
 * Show sync success notification
 */
function showSyncSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'sync-success-notification';
    successDiv.innerHTML = `
        <div class="sync-success-content">
            <span class="material-symbols-sharp">cloud_done</span>
            <span class="success-message">${message}</span>
        </div>
    `;
    
    document.body.appendChild(successDiv);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        if (successDiv && successDiv.parentNode) {
            successDiv.remove();
        }
    }, 3000);
}

/**
 * Unified save word progress (handles both local and cloud)
 */
export async function saveWordProgress(wordId, progressData) {
    try {
<<<<<<< HEAD
        // Always save locally first - this should be fast
        const localProgress = await saveWordProgressDB(wordId, progressData);
        
        // Try to sync to cloud in background if user has cloud access
        if (await canSyncToCloud() && onlineStatus) {
            // Don't await this - let it run in background
            syncProgressToCloudInBackground(wordId, progressData, localProgress).catch(error => {
                console.warn('Background cloud sync failed during word progress save:', error);
            });
=======
        // Always save locally first
        const localProgress = await saveWordProgressDB(wordId, progressData);
        
        // Try to sync to cloud if user has cloud access
        if (await canSyncToCloud() && onlineStatus) {
            try {
                const cloudProgress = await saveWordProgressFirestore(wordId, progressData);
                // Update local with sync timestamp
                await markWordProgressAsSyncedDB(wordId, cloudProgress.syncedAt);
                
                console.log(`Word progress saved and synced: ${wordId}`);
                return { ...localProgress, syncedAt: cloudProgress.syncedAt };
            } catch (error) {
                console.warn('Cloud sync failed during word progress save:', error);
                showSyncError('Progresso salvo localmente. Sincronização com a nuvem falhará quando a conexão for restaurada.');
            }
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
        } else if (await canSyncToCloud() && !onlineStatus) {
            console.log('Word progress saved offline - will sync when connection is restored');
        }
        
<<<<<<< HEAD
        // Return local data immediately
=======
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
        return localProgress;
    } catch (error) {
        console.error('Error saving word progress:', error);
        throw new Error('Erro ao salvar progresso da palavra: ' + error.message);
    }
}

/**
<<<<<<< HEAD
 * Background sync helper for word progress
 */
async function syncProgressToCloudInBackground(wordId, progressData, localProgress) {
    try {
        const cloudProgress = await Promise.race([
            saveWordProgressFirestore(wordId, progressData),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)) // 5 second timeout
        ]);
        
        // Update local with sync timestamp
        await markWordProgressAsSyncedDB(wordId, cloudProgress.syncedAt);
        console.log(`Word progress synced to cloud in background: ${wordId}`);
    } catch (error) {
        console.warn('Background sync failed:', error);
    }
}

/**
=======
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
 * Unified get word progress (with sync check)
 */
export async function getWordProgress(wordId) {
    try {
<<<<<<< HEAD
        // Get from local storage first - this should be fast
        const localProgress = await getWordProgressDB(wordId);
        
        // If cloud access available and online, check for newer version in background
        if (await canSyncToCloud() && onlineStatus && localProgress) {
            // Don't await this - let it run in background
            checkCloudProgressInBackground(wordId, localProgress).catch(error => {
                console.warn('Background cloud check failed for word progress:', error);
            });
        }
        
        // Return local data immediately
=======
        // Get from local storage first
        const localProgress = await getWordProgressDB(wordId);
        
        // If cloud access available and online, check for newer version
        if (await canSyncToCloud() && onlineStatus && localProgress) {
            try {
                const cloudProgress = await getWordProgressFirestore(wordId);
                
                if (cloudProgress) {
                    const localDate = new Date(localProgress.updatedAt || localProgress.createdAt);
                    const cloudDate = new Date(cloudProgress.updatedAt || cloudProgress.createdAt);
                    
                    // Use most recent version
                    if (cloudDate > localDate) {
                        // Cloud is newer, update local
                        await saveWordProgressDB(wordId, cloudProgress);
                        console.log(`Updated local word progress from cloud: ${wordId}`);
                        return cloudProgress;
                    } else if (localDate > cloudDate) {
                        // Local is newer, update cloud
                        try {
                            await saveWordProgressFirestore(wordId, {
                                status: localProgress.status,
                                reviewCount: localProgress.reviewCount,
                                lastReviewed: localProgress.lastReviewed,
                                updatedAt: localProgress.updatedAt
                            });
                            await markWordProgressAsSyncedDB(wordId);
                            console.log(`Updated cloud word progress from local: ${wordId}`);
                        } catch (error) {
                            console.warn('Failed to update cloud with local word progress changes:', error);
                        }
                    }
                }
            } catch (error) {
                console.warn('Could not check cloud word progress version:', error);
            }
        }
        
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
        return localProgress;
    } catch (error) {
        console.error('Error getting word progress:', error);
        throw error;
    }
}

/**
<<<<<<< HEAD
 * Background cloud check for word progress
 */
async function checkCloudProgressInBackground(wordId, localProgress) {
    try {
        const cloudProgress = await Promise.race([
            getWordProgressFirestore(wordId),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)) // 3 second timeout
        ]);
        
        if (cloudProgress) {
            const localDate = new Date(localProgress.updatedAt || localProgress.createdAt);
            const cloudDate = new Date(cloudProgress.updatedAt || cloudProgress.createdAt);
            
            // Use most recent version
            if (cloudDate > localDate) {
                // Cloud is newer, update local
                await saveWordProgressDB(wordId, cloudProgress);
                console.log(`Updated local word progress from cloud in background: ${wordId}`);
            } else if (localDate > cloudDate) {
                // Local is newer, update cloud
                try {
                    await saveWordProgressFirestore(wordId, {
                        status: localProgress.status,
                        reviewCount: localProgress.reviewCount,
                        lastReviewed: localProgress.lastReviewed,
                        updatedAt: localProgress.updatedAt
                    });
                    await markWordProgressAsSyncedDB(wordId);
                    console.log(`Updated cloud word progress from local in background: ${wordId}`);
                } catch (error) {
                    console.warn('Failed to update cloud with local word progress changes:', error);
                }
            }
        }
    } catch (error) {
        if (error.message !== 'Timeout') {
            console.warn('Could not check cloud word progress version:', error);
        }
    }
}

/**
=======
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
 * Unified get all word progress (with sync)
 */
export async function getAllWordProgress() {
    try {
<<<<<<< HEAD
        // Always get local progress first - this should be fast
        const localProgress = await getAllWordProgressDB();
        
        // If cloud access available and online, perform sync in background
        if (await canSyncToCloud() && onlineStatus && !syncInProgress) {
            // Don't await this - let it run in background
            syncAllProgressInBackground(localProgress).catch(error => {
                console.warn('Background sync failed during word progress retrieval:', error);
            });
        }
        
        // Return local data immediately
=======
        // Always get local progress first
        const localProgress = await getAllWordProgressDB();
        
        // If cloud access available and online, perform sync
        if (await canSyncToCloud() && onlineStatus && !syncInProgress) {
            try {
                syncInProgress = true;
                
                // Get cloud progress
                const cloudProgress = await getAllWordProgressFirestore();
                
                // Merge and sync
                const syncResults = await syncProgressCollections(localProgress, cloudProgress);
                
                if (syncResults.conflicts > 0) {
                    showSyncError(`${syncResults.conflicts} conflitos de sincronização detectados. Algumas alterações podem ter sido perdidas.`);
                } else if (syncResults.updated > 0) {
                    showSyncSuccess(`${syncResults.updated} registros de progresso sincronizados com sucesso.`);
                }
                
                // Return updated local progress
                return await getAllWordProgressDB();
            } catch (error) {
                console.warn('Sync failed during word progress retrieval:', error);
                showSyncError('Falha na sincronização do progresso. Mostrando dados locais.');
            } finally {
                syncInProgress = false;
            }
        }
        
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
        return localProgress;
    } catch (error) {
        console.error('Error getting all word progress:', error);
        throw error;
    }
}

/**
<<<<<<< HEAD
 * Background sync for all progress
 */
async function syncAllProgressInBackground(localProgress) {
    try {
        syncInProgress = true;
        
        // Get cloud progress with timeout
        const cloudProgress = await Promise.race([
            getAllWordProgressFirestore(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000)) // 10 second timeout
        ]);
        
        // Merge and sync
        const syncResults = await syncProgressCollections(localProgress, cloudProgress);
        
        if (syncResults.conflicts > 0) {
            showSyncError(`${syncResults.conflicts} conflitos de sincronização detectados. Algumas alterações podem ter sido perdidas.`);
        } else if (syncResults.updated > 0) {
            showSyncSuccess(`${syncResults.updated} registros de progresso sincronizados em background.`);
        }
    } catch (error) {
        if (error.message !== 'Timeout') {
            console.warn('Background sync failed:', error);
        }
    } finally {
        syncInProgress = false;
    }
}

/**
=======
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
 * Unified delete word progress
 */
export async function deleteWordProgress(wordId) {
    try {
<<<<<<< HEAD
        // Delete locally first - this should be fast
        await deleteWordProgressDB(wordId);
        console.log(`Word progress deleted locally: ${wordId}`);
        
        // Delete from cloud in background if possible
        if (await canSyncToCloud() && onlineStatus) {
            // Don't await this - let it run in background
            deleteProgressFromCloudInBackground(wordId).catch(error => {
                console.warn('Background cloud deletion failed:', error);
            });
        }
        
        // Return immediately
=======
        // Delete from cloud first if possible (to avoid orphaned cloud data)
        if (await canSyncToCloud() && onlineStatus) {
            try {
                await deleteWordProgressFirestore(wordId);
                console.log(`Word progress deleted from cloud: ${wordId}`);
            } catch (error) {
                console.warn('Cloud deletion failed:', error);
                // Continue with local deletion anyway
            }
        }
        
        // Delete locally
        await deleteWordProgressDB(wordId);
        console.log(`Word progress deleted locally: ${wordId}`);
        
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
        return true;
    } catch (error) {
        console.error('Error deleting word progress:', error);
        throw new Error('Erro ao excluir progresso da palavra: ' + error.message);
    }
}

/**
<<<<<<< HEAD
 * Background cloud deletion for word progress
 */
async function deleteProgressFromCloudInBackground(wordId) {
    try {
        await Promise.race([
            deleteWordProgressFirestore(wordId),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)) // 5 second timeout
        ]);
        console.log(`Word progress deleted from cloud in background: ${wordId}`);
    } catch (error) {
        console.warn('Background deletion failed:', error);
    }
}

/**
=======
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
 * Get word progress count (unified)
 */
export async function getWordProgressCount() {
    try {
        // Always return local count for consistency
        return await getWordProgressCountDB();
    } catch (error) {
        console.error('Error getting word progress count:', error);
        return 0;
    }
}

/**
 * Get word progress by status (unified)
 */
export async function getWordProgressByStatus(status) {
    try {
        return await getWordProgressByStatusDB(status);
    } catch (error) {
        console.error('Error getting word progress by status:', error);
        return [];
    }
}

/**
 * Get word progress statistics (unified)
 */
export async function getWordProgressStats() {
    try {
        return await getWordProgressStatsDB();
    } catch (error) {
        console.error('Error getting word progress stats:', error);
        return {
            total: 0,
            unread: 0,
            reading: 0,
            familiar: 0,
            memorized: 0,
            totalReviews: 0
        };
    }
}

/**
 * Sync collections between local and cloud word progress
 */
async function syncProgressCollections(localProgress, cloudProgress) {
    let updated = 0;
    let conflicts = 0;
    
    // Create maps for easier lookup
    const localMap = new Map(localProgress.map(progress => [progress.wordId, progress]));
    const cloudMap = new Map(cloudProgress.map(progress => [progress.wordId, progress]));
    
    // Process cloud progress (download newer ones)
    for (const cloudRecord of cloudProgress) {
        const localRecord = localMap.get(cloudRecord.wordId);
        
        if (!localRecord) {
            // New progress from cloud, add locally
            await saveWordProgressDB(cloudRecord.wordId, cloudRecord);
            updated++;
        } else {
            // Compare timestamps
            const localDate = new Date(localRecord.updatedAt || localRecord.createdAt);
            const cloudDate = new Date(cloudRecord.updatedAt || cloudRecord.createdAt);
            
            if (cloudDate > localDate) {
                // Cloud is newer, update local
                await saveWordProgressDB(cloudRecord.wordId, cloudRecord);
                updated++;
            } else if (localDate > cloudDate) {
                // Local is newer, but cloud exists - potential conflict
                try {
                    await saveWordProgressFirestore(cloudRecord.wordId, {
                        status: localRecord.status,
                        reviewCount: localRecord.reviewCount,
                        lastReviewed: localRecord.lastReviewed,
                        updatedAt: localRecord.updatedAt
                    });
                    await markWordProgressAsSyncedDB(localRecord.wordId);
                    updated++;
                } catch (error) {
                    console.warn(`Conflict updating cloud word progress ${cloudRecord.wordId}:`, error);
                    conflicts++;
                }
            }
        }
    }
    
    // Process local progress that don't exist in cloud (upload new ones)
    for (const localRecord of localProgress) {
        if (!cloudMap.has(localRecord.wordId) && (!localRecord.syncedAt || localRecord.updatedAt > localRecord.syncedAt)) {
            try {
                await saveWordProgressFirestore(localRecord.wordId, localRecord);
                await markWordProgressAsSyncedDB(localRecord.wordId);
                updated++;
            } catch (error) {
                console.warn(`Failed to upload local word progress ${localRecord.wordId}:`, error);
                conflicts++;
            }
        }
    }
    
    return { updated, conflicts };
}

/**
 * Sync pending changes to cloud
 */
async function syncPendingWordProgress() {
    if (!await canSyncToCloud() || !onlineStatus) {
        return;
    }
    
    try {
        const pendingProgress = await getWordProgressNeedingSyncDB();
        
        if (pendingProgress.length === 0) {
            return;
        }
        
        console.log(`Syncing ${pendingProgress.length} pending word progress changes...`);
        
        let synced = 0;
        let failed = 0;
        
        for (const progress of pendingProgress) {
            try {
                const exists = await wordProgressExistsFirestore(progress.wordId);
                
                if (exists) {
                    await saveWordProgressFirestore(progress.wordId, {
                        status: progress.status,
                        reviewCount: progress.reviewCount,
                        lastReviewed: progress.lastReviewed,
                        updatedAt: progress.updatedAt
                    });
                } else {
                    await saveWordProgressFirestore(progress.wordId, progress);
                }
                
                await markWordProgressAsSyncedDB(progress.wordId);
                synced++;
            } catch (error) {
                console.warn(`Failed to sync word progress ${progress.wordId}:`, error);
                failed++;
            }
        }
        
        if (synced > 0) {
            showSyncSuccess(`${synced} registros de progresso sincronizados com sucesso.`);
        }
        
        if (failed > 0) {
            showSyncError(`${failed} registros de progresso falharam na sincronização.`);
        }
        
    } catch (error) {
        console.error('Error syncing pending word progress:', error);
        throw error;
    }
}

/**
 * Force full synchronization
 */
export async function forceFullWordProgressSync() {
    if (!await canSyncToCloud()) {
        throw new Error('Sincronização na nuvem não disponível para seu plano');
    }
    
    if (!onlineStatus) {
        throw new Error('Você está offline. Verifique sua conexão e tente novamente.');
    }
    
    try {
        syncInProgress = true;
        
        console.log('Starting forced full word progress synchronization...');
        
        const result = await performFullWordProgressSync();
        
        showSyncSuccess(`Sincronização completa do progresso: ${result.uploaded} enviados, ${result.downloaded} baixados.`);
        
        lastSyncError = null;
        return result;
    } catch (error) {
        console.error('Forced word progress sync failed:', error);
        const errorMessage = 'Falha na sincronização forçada do progresso: ' + error.message;
        showSyncError(errorMessage);
        throw new Error(errorMessage);
    } finally {
        syncInProgress = false;
    }
}

/**
 * Retry sync all pending changes
 */
export async function retrySyncAll() {
    try {
        const errorNotification = document.getElementById('word-progress-sync-error');
        if (errorNotification) {
            errorNotification.remove();
        }
        
        await syncPendingWordProgress();
        lastSyncError = null;
    } catch (error) {
        console.error('Retry word progress sync failed:', error);
        showSyncError('Tentativa de sincronização do progresso falhou: ' + error.message);
    }
}

/**
 * Get sync status information
 */
export async function getWordProgressSyncStatus() {
    try {
        const needsSync = await getWordProgressNeedingSyncDB();
        
        return {
            online: onlineStatus,
            canSync: await canSyncToCloud(),
            syncInProgress,
            pendingCount: needsSync.length,
            lastError: lastSyncError,
            isAuthenticated: window.firebaseAuth?.isAuthenticated() || false
        };
    } catch (error) {
        console.error('Error getting word progress sync status:', error);
        return {
            online: onlineStatus,
            canSync: false,
            syncInProgress: false,
            pendingCount: 0,
            lastError: 'Erro ao verificar status',
            isAuthenticated: false
        };
    }
}

/**
 * Initialize word progress synchronization system
 */
export async function initWordProgressSyncSystem() {
    console.log('Initializing word progress sync system...');
    
    // Initial sync if user is premium and online
    if (await canSyncToCloud() && onlineStatus && window.firebaseAuth?.isAuthenticated()) {
        setTimeout(async () => {
            try {
                await syncPendingWordProgress();
            } catch (error) {
                console.warn('Initial word progress sync failed:', error);
            }
        }, 3000); // Wait 3 seconds after initialization
    }
    
    return true;
}

// Export for global access
if (typeof window !== 'undefined') {
    window.wordProgressSyncManager = {
        saveWordProgress,
        getWordProgress,
        getAllWordProgress,
        deleteWordProgress,
        getWordProgressCount,
        getWordProgressByStatus,
        getWordProgressStats,
        forceFullWordProgressSync,
        retrySyncAll,
        getWordProgressSyncStatus,
        initWordProgressSyncSystem
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWordProgressSyncSystem);
    } else {
        initWordProgressSyncSystem();
    }
}