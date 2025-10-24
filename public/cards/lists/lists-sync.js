/**
 * Word Lists Synchronization Manager
 * Unified CRUD interface that integrates IndexedDB and Firestore
 * with automatic synchronization and conflict resolution
 */

import { 
    createWordListDB, 
    getWordListDB, 
    getAllWordListsDB, 
    updateWordListDB, 
    deleteWordListDB,
    addWordsToListDB,
    removeWordsFromListDB,
    getWordListCountDB,
    wordListExistsDB,
    markListAsSyncedDB,
    getListsNeedingSyncDB
} from './lists-db.js';

import {
    createWordListFirestore,
    getWordListFirestore,
    getAllWordListsFirestore,
    updateWordListFirestore,
    deleteWordListFirestore,
    addWordsToListFirestore,
    removeWordsFromListFirestore,
    getWordListCountFirestore,
    wordListExistsFirestore,
    performFullListSync
} from './lists-firestore.js';

import { canSyncToCloud } from '../../plan-manager.js';

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
 * Unified create word list (handles both local and cloud)
 */
export async function createWordList(listData) {
    try {
        // Always create locally first
        const localList = await createWordListDB(listData);
        
        // Try to sync to cloud if user has cloud access
        if (await canSyncToCloud() && onlineStatus) {
            try {
                const cloudList = await createWordListFirestore(localList);
                // Update local with sync timestamp
                await markListAsSyncedDB(localList.id, cloudList.syncedAt);
                
                console.log(`Word list created and synced: ${localList.id}`);
                return { ...localList, syncedAt: cloudList.syncedAt };
            } catch (error) {
                console.warn('Cloud sync failed during creation:', error);
                showSyncError('Lista criada localmente. Sincronização com a nuvem falhará quando a conexão for restaurada.');
            }
        } else if (await canSyncToCloud() && !onlineStatus) {
            console.log('List created offline - will sync when connection is restored');
        }
        
        return localList;
    } catch (error) {
        console.error('Error creating word list:', error);
        throw new Error('Erro ao criar lista de palavras: ' + error.message);
    }
}

/**
 * Unified get word list (with sync check)
 */
export async function getWordList(listId) {
    try {
        // Get from local storage first
        const localList = await getWordListDB(listId);
        
        // If cloud access available and online, check for newer version
        if (await canSyncToCloud() && onlineStatus && localList) {
            try {
                const cloudList = await getWordListFirestore(listId);
                
                if (cloudList) {
                    const localDate = new Date(localList.updatedAt || localList.createdAt);
                    const cloudDate = new Date(cloudList.updatedAt || cloudList.createdAt);
                    
                    // Use most recent version
                    if (cloudDate > localDate) {
                        // Cloud is newer, update local
                        await updateWordListDB(listId, cloudList);
                        console.log(`Updated local list from cloud: ${listId}`);
                        return cloudList;
                    } else if (localDate > cloudDate) {
                        // Local is newer, update cloud
                        try {
                            await updateWordListFirestore(listId, {
                                name: localList.name,
                                description: localList.description,
                                wordIds: localList.wordIds,
                                updatedAt: localList.updatedAt
                            });
                            await markListAsSyncedDB(listId);
                            console.log(`Updated cloud list from local: ${listId}`);
                        } catch (error) {
                            console.warn('Failed to update cloud with local changes:', error);
                        }
                    }
                }
            } catch (error) {
                console.warn('Could not check cloud version:', error);
            }
        }
        
        return localList;
    } catch (error) {
        console.error('Error getting word list:', error);
        throw error;
    }
}

/**
 * Unified get all word lists (with sync)
 */
export async function getAllWordLists() {
    try {
        // Always get local lists first
        const localLists = await getAllWordListsDB();
        
        // If cloud access available and online, perform sync
        if (await canSyncToCloud() && onlineStatus && !syncInProgress) {
            try {
                syncInProgress = true;
                
                // Get cloud lists
                const cloudLists = await getAllWordListsFirestore();
                
                // Merge and sync
                const syncResults = await syncListCollections(localLists, cloudLists);
                
                if (syncResults.conflicts > 0) {
                    showSyncError(`${syncResults.conflicts} conflitos de sincronização detectados. Algumas alterações podem ter sido perdidas.`);
                } else if (syncResults.updated > 0) {
                    showSyncSuccess(`${syncResults.updated} listas sincronizadas com sucesso.`);
                }
                
                // Return updated local lists
                return await getAllWordListsDB();
            } catch (error) {
                console.warn('Sync failed during list retrieval:', error);
                showSyncError('Falha na sincronização. Mostrando dados locais.');
            } finally {
                syncInProgress = false;
            }
        }
        
        return localLists;
    } catch (error) {
        console.error('Error getting all word lists:', error);
        throw error;
    }
}

/**
 * Unified update word list
 */
export async function updateWordList(listId, updateData) {
    try {
        // Update locally first
        const updatedList = await updateWordListDB(listId, updateData);
        
        // Try to sync to cloud
        if (await canSyncToCloud() && onlineStatus) {
            try {
                const cloudList = await updateWordListFirestore(listId, updateData);
                await markListAsSyncedDB(listId, cloudList.syncedAt);
                
                console.log(`Word list updated and synced: ${listId}`);
                return { ...updatedList, syncedAt: cloudList.syncedAt };
            } catch (error) {
                console.warn('Cloud sync failed during update:', error);
                showSyncError('Alterações salvas localmente. Sincronização pendente.');
            }
        }
        
        return updatedList;
    } catch (error) {
        console.error('Error updating word list:', error);
        throw new Error('Erro ao atualizar lista: ' + error.message);
    }
}

/**
 * Unified delete word list
 */
export async function deleteWordList(listId) {
    try {
        // Delete from cloud first if possible (to avoid orphaned cloud data)
        if (await canSyncToCloud() && onlineStatus) {
            try {
                await deleteWordListFirestore(listId);
                console.log(`Word list deleted from cloud: ${listId}`);
            } catch (error) {
                console.warn('Cloud deletion failed:', error);
                // Continue with local deletion anyway
            }
        }
        
        // Delete locally
        await deleteWordListDB(listId);
        console.log(`Word list deleted locally: ${listId}`);
        
        return true;
    } catch (error) {
        console.error('Error deleting word list:', error);
        throw new Error('Erro ao excluir lista: ' + error.message);
    }
}

/**
 * Unified add words to list
 */
export async function addWordsToList(listId, wordIds) {
    try {
        // Add locally first
        const updatedList = await addWordsToListDB(listId, wordIds);
        
        // Sync to cloud
        if (await canSyncToCloud() && onlineStatus) {
            try {
                const cloudList = await addWordsToListFirestore(listId, wordIds);
                await markListAsSyncedDB(listId, cloudList.syncedAt);
                
                console.log(`Words added and synced to list: ${listId}`);
                return { ...updatedList, syncedAt: cloudList.syncedAt };
            } catch (error) {
                console.warn('Cloud sync failed after adding words:', error);
                showSyncError('Palavras adicionadas localmente. Sincronização pendente.');
            }
        }
        
        return updatedList;
    } catch (error) {
        console.error('Error adding words to list:', error);
        throw new Error('Erro ao adicionar palavras: ' + error.message);
    }
}

/**
 * Unified remove words from list
 */
export async function removeWordsFromList(listId, wordIds) {
    try {
        // Remove locally first
        const updatedList = await removeWordsFromListDB(listId, wordIds);
        
        // Sync to cloud
        if (await canSyncToCloud() && onlineStatus) {
            try {
                const cloudList = await removeWordsFromListFirestore(listId, wordIds);
                await markListAsSyncedDB(listId, cloudList.syncedAt);
                
                console.log(`Words removed and synced from list: ${listId}`);
                return { ...updatedList, syncedAt: cloudList.syncedAt };
            } catch (error) {
                console.warn('Cloud sync failed after removing words:', error);
                showSyncError('Palavras removidas localmente. Sincronização pendente.');
            }
        }
        
        return updatedList;
    } catch (error) {
        console.error('Error removing words from list:', error);
        throw new Error('Erro ao remover palavras: ' + error.message);
    }
}

/**
 * Get word list count (unified)
 */
export async function getWordListCount() {
    try {
        // Always return local count for consistency
        return await getWordListCountDB();
    } catch (error) {
        console.error('Error getting word list count:', error);
        return 0;
    }
}

/**
 * Check if word list exists (unified)
 */
export async function wordListExists(listId) {
    try {
        return await wordListExistsDB(listId);
    } catch (error) {
        console.error('Error checking if word list exists:', error);
        return false;
    }
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
            await createWordListDB(cloudList);
            updated++;
        } else {
            // Compare timestamps
            const localDate = new Date(localList.updatedAt || localList.createdAt);
            const cloudDate = new Date(cloudList.updatedAt || cloudList.createdAt);
            
            if (cloudDate > localDate) {
                // Cloud is newer, update local
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
                    await updateWordListFirestore(list.id, {
                        name: list.name,
                        description: list.description,
                        wordIds: list.wordIds,
                        updatedAt: list.updatedAt
                    });
                } else {
                    await createWordListFirestore(list);
                }
                
                await markListAsSyncedDB(list.id);
                synced++;
            } catch (error) {
                console.warn(`Failed to sync list ${list.id}:`, error);
                failed++;
            }
        }
        
        if (synced > 0) {
            showSyncSuccess(`${synced} listas sincronizadas com sucesso.`);
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
 * Force full synchronization
 */
export async function forceFullSync() {
    if (!await canSyncToCloud()) {
        throw new Error('Sincronização na nuvem não disponível para seu plano');
    }
    
    if (!onlineStatus) {
        throw new Error('Você está offline. Verifique sua conexão e tente novamente.');
    }
    
    try {
        syncInProgress = true;
        
        console.log('Starting forced full synchronization...');
        
        const result = await performFullListSync();
        
        showSyncSuccess(`Sincronização completa: ${result.uploaded} enviadas, ${result.downloaded} baixadas.`);
        
        lastSyncError = null;
        return result;
    } catch (error) {
        console.error('Forced sync failed:', error);
        const errorMessage = 'Falha na sincronização forçada: ' + error.message;
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
        createWordList,
        getWordList,
        getAllWordLists,
        updateWordList,
        deleteWordList,
        addWordsToList,
        removeWordsFromList,
        getWordListCount,
        wordListExists,
        forceFullSync,
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