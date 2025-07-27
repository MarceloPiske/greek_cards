/**
 * Word Lists Synchronization Manager
 * Handles sync status tracking, error handling, and background operations
 */

import { 
    getAllWordListsDB,
    getListsNeedingSyncDB,
    markListAsSyncedDB
} from './lists-db.js';

import {
    getAllWordListsFirestore,
    wordListExistsFirestore,
    createWordListFirestore,
    updateWordListFirestore,
} from './lists-firestore.js';

import { canSyncToCloud } from '../plan-manager.js';

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
    console.log('Connection restored - attempting to sync pending changes...');
    
    if (await canSyncToCloud()) {
        try {
            await syncPendingChanges();
        } catch (error) {
            console.warn('Auto-sync on reconnection failed:', error);
            showSyncError('Falha na sincronização automática. Tente novamente mais tarde.');
        }
    }
}

/**
 * Handle when user goes offline
 */
function handleOffline() {
    onlineStatus = false;
    console.log('Connection lost - operations will be queued for sync');
}

/**
 * Show sync error to user
 */
function showSyncError(message) {
    lastSyncError = message;
    
    // Create or update error notification
    let errorDiv = document.getElementById('sync-error-notification');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'sync-error-notification';
        errorDiv.className = 'sync-error-notification';
        document.body.appendChild(errorDiv);
    }
    
    errorDiv.innerHTML = `
        <div class="sync-error-content">
            <span class="material-symbols-sharp">sync_problem</span>
            <span class="error-message">${message}</span>
            <button class="retry-sync-btn" onclick="window.listsSyncManager.retrySyncAll()">
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
 * Perform background synchronization without blocking UI
 */
export async function performBackgroundSync(localLists) {
    try {
        syncInProgress = true;
        
        // Get cloud lists
        const cloudLists = await getAllWordListsFirestore();
        
        // Merge and sync
        const syncResults = await syncListCollections(localLists, cloudLists);
        
        if (syncResults.updated > 0) {
            // Update cache with new data
            listsCache = await getAllWordListsDB();
            lastCacheTime = Date.now();
            
            // Notify UI if lists were updated
            if (window.listsUpdatedCallback) {
                window.listsUpdatedCallback();
            }
        }
        
    } catch (error) {
        console.warn('Background sync failed:', error);
    } finally {
        syncInProgress = false;
    }
}

/**
 * Clear cache when lists are modified
 */
export function clearListsCache() {
    listsCache = null;
    lastCacheTime = 0;
}

/**
 * Sync collections between local and cloud
 */
async function syncListCollections(localLists, cloudLists) {
    let updated = 0;
    let conflicts = 0;
    
    // Create maps for easier lookup
    const localMap = new Map(localLists.map(list => [list.id, list]));
    const cloudMap = new Map(cloudLists.map(list => [list.id, list]));
    
    // Process cloud lists (download newer ones)
    for (const cloudList of cloudLists) {
        const localList = localMap.get(cloudList.id);
        
        if (!localList) {
            // New list from cloud, add locally
            const { createWordListDB } = await import('./lists-db.js');
            await createWordListDB(cloudList);
            updated++;
        } else {
            // Compare timestamps
            const localDate = new Date(localList.updatedAt || localList.createdAt);
            const cloudDate = new Date(cloudList.updatedAt || cloudList.createdAt);
            
            if (cloudDate > localDate) {
                // Cloud is newer, update local
                const { updateWordListDB } = await import('./lists-db.js');
                await updateWordListDB(cloudList.id, cloudList);
                updated++;
            } else if (localDate > cloudDate) {
                // Local is newer, but cloud exists - potential conflict
                try {
                    await updateWordListFirestore(cloudList.id, {
                        name: localList.name,
                        description: localList.description,
                        wordIds: localList.wordIds,
                        updatedAt: localList.updatedAt
                    });
                    await markListAsSyncedDB(localList.id);
                    updated++;
                } catch (error) {
                    console.warn(`Conflict updating cloud list ${cloudList.id}:`, error);
                    conflicts++;
                }
            } else {
                // Timestamps are equal, ensure local list is marked as synced
                if (!localList.syncedAt || new Date(localList.syncedAt) < new Date(localList.updatedAt)) {
                    await markListAsSyncedDB(localList.id, cloudList.syncedAt || new Date().toISOString());
                    updated++;
                }
            }
        }
    }
    
    // Process local lists that don't exist in cloud (upload new ones)
    for (const localList of localLists) {
        if (!cloudMap.has(localList.id) && (!localList.syncedAt || localList.updatedAt > localList.syncedAt)) {
            try {
                await createWordListFirestore(localList);
                await markListAsSyncedDB(localList.id);
                updated++;
            } catch (error) {
                console.warn(`Failed to upload local list ${localList.id}:`, error);
                conflicts++;
            }
        }
    }
    
    return { updated, conflicts };
}

/**
 * Sync pending changes to cloud
 */
async function syncPendingChanges() {
    if (!await canSyncToCloud() || !onlineStatus) {
        return;
    }
    
    try {
        const pendingLists = await getListsNeedingSyncDB();
        
        if (pendingLists.length === 0) {
            return;
        }
        
        console.log(`Syncing ${pendingLists.length} pending changes...`);
        
        let synced = 0;
        let failed = 0;
        
        for (const list of pendingLists) {
            try {
                const exists = await wordListExistsFirestore(list.id);
                
                if (exists) {
                    const updatedList = await updateWordListFirestore(list.id, {
                        name: list.name,
                        description: list.description,
                        wordIds: list.wordIds,
                        updatedAt: list.updatedAt
                    });
                    await markListAsSyncedDB(list.id, updatedList.syncedAt);
                } else {
                    const createdList = await createWordListFirestore(list);
                    await markListAsSyncedDB(list.id, createdList.syncedAt);
                }
                
                synced++;
            } catch (error) {
                console.warn(`Failed to sync list ${list.id}:`, error);
                failed++;
            }
        }
        
        if (synced > 0) {
            showSyncSuccess(`${synced} listas sincronizadas com sucesso.`);
            // Clear cache to force reload with updated sync status
            clearListsCache();
        }
        
        if (failed > 0) {
            showSyncError(`${failed} listas falharam na sincronização.`);
        }
        
    } catch (error) {
        console.error('Error syncing pending changes:', error);
        throw error;
    }
}

/**
 * Retry sync all pending changes
 */
export async function retrySyncAll() {
    try {
        const errorNotification = document.getElementById('sync-error-notification');
        if (errorNotification) {
            errorNotification.remove();
        }
        
        await syncPendingChanges();
        lastSyncError = null;
    } catch (error) {
        console.error('Retry sync failed:', error);
        showSyncError('Tentativa de sincronização falhou: ' + error.message);
    }
}

/**
 * Get sync status information
 */
export async function getSyncStatus() {
    try {
        const needsSync = await getListsNeedingSyncDB();
        
        return {
            online: onlineStatus,
            canSync: await canSyncToCloud(),
            syncInProgress,
            pendingCount: needsSync.length,
            lastError: lastSyncError,
            isAuthenticated: window.firebaseAuth?.isAuthenticated() || false
        };
    } catch (error) {
        console.error('Error getting sync status:', error);
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
 * Initialize synchronization system
 */
export async function initSyncSystem() {
    console.log('Initializing word lists sync system...');
    
    // Initial sync if user is premium and online
    if (await canSyncToCloud() && onlineStatus && window.firebaseAuth?.isAuthenticated()) {
        setTimeout(async () => {
            try {
                await syncPendingChanges();
            } catch (error) {
                console.warn('Initial sync failed:', error);
            }
        }, 2000); // Wait 2 seconds after initialization
    }
    
    return true;
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
.sync-error-notification, .sync-success-notification {
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 10000;
    max-width: 400px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    animation: slideInRight 0.3s ease-out;
}

.sync-error-notification {
    background: #ff4444;
    color: white;
}

.sync-success-notification {
    background: #4CAF50;
    color: white;
}

.sync-error-content, .sync-success-content {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 1rem;
}

.error-message, .success-message {
    flex: 1;
    font-size: 0.9rem;
}

.retry-sync-btn {
    background: rgba(255,255,255,0.2);
    color: white;
    border: none;
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: background 0.3s ease;
}

.retry-sync-btn:hover {
    background: rgba(255,255,255,0.3);
}

.close-error-btn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0.2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    opacity: 0.8;
    transition: opacity 0.3s ease;
}

.close-error-btn:hover {
    opacity: 1;
    background: rgba(255,255,255,0.1);
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
`;
document.head.appendChild(style);

// Export for global access
if (typeof window !== 'undefined') {
    window.listsSyncManager = {
        retrySyncAll,
        getSyncStatus,
        initSyncSystem
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSyncSystem);
    } else {
        initSyncSystem();
    }
}