/**
 * Word Lists Core Synchronization Operations
 * Handles the main CRUD operations that integrate IndexedDB and Firestore
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
    
} from './lists-db.js?v=1.1';

import {
    createWordListFirestore,
    getWordListFirestore,
    updateWordListFirestore,
    deleteWordListFirestore,
    addWordsToListFirestore,
    removeWordsFromListFirestore,
    performFullListSync
} from './lists-firestore.js?v=1.1';

import { canSyncToCloud, getCurrentUserPlan, getMaxListsAllowed } from '../plan-manager.js?v=1.1';

/**
 * Unified create word list (handles both local and cloud)
 */
export async function createWordList(listData) {
    try {
        // Check if user has reached the limit based on their plan
        const currentCount = await getWordListCountDB();
        const maxAllowed = getMaxListsAllowed();
        
        if (currentCount >= maxAllowed) {
            const currentPlan = getCurrentUserPlan();
            const planName = currentPlan === 'free' ? 'gratuito' : currentPlan === 'cloud' ? 'nuvem' : 'inteligente';
            throw new Error(`Você atingiu o limite máximo de ${maxAllowed} listas do plano ${planName}. Exclua uma lista existente para criar uma nova.`);
        }

        // Always create locally first - this should be fast
        const localList = await createWordListDB(listData);
        
        // Try to sync to cloud in background (non-blocking)
        if (await canSyncToCloud() && navigator.onLine) {
            // Don't await this - let it run in background
            syncToCloudInBackground(localList).catch(error => {
                console.warn('Background cloud sync failed during creation:', error);
            });
        } else if (await canSyncToCloud() && !navigator.onLine) {
            console.log('List created offline - will sync when connection is restored');
        }
        
        // Return immediately with local data
        return localList;
    } catch (error) {
        console.error('Error creating word list:', error);
        throw new Error('Erro ao criar lista de palavras: ' + error.message);
    }
}

/**
 * Background sync helper function
 */
async function syncToCloudInBackground(localList) {
    try {
        const cloudList = await Promise.race([
            createWordListFirestore(localList),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)) // 5 second timeout
        ]);
        
        // Update local with sync timestamp
        await markListAsSyncedDB(localList.id, cloudList.syncedAt);
        console.log(`Word list synced to cloud in background: ${localList.id}`);
    } catch (error) {
        console.warn('Background sync failed:', error);
    }
}

/**
 * Unified get word list (with sync check)
 */
export async function getWordList(listId) {
    try {
        // Get from local storage first - this should be fast
        const localList = await getWordListDB(listId);
        
        // If cloud access available and online, check for newer version in background
        if (await canSyncToCloud() && navigator.onLine && localList) {
            // Don't await this - let it run in background
            checkCloudVersionInBackground(listId, localList).catch(error => {
                console.warn('Background cloud check failed:', error);
            });
        }
        
        // Return local data immediately
        return localList;
    } catch (error) {
        console.error('Error getting word list:', error);
        throw error;
    }
}

/**
 * Background cloud version check
 */
async function checkCloudVersionInBackground(listId, localList) {
    try {
        const cloudList = await Promise.race([
            getWordListFirestore(listId),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)) // 3 second timeout
        ]);
        
        if (cloudList) {
            const localDate = new Date(localList.updatedAt || localList.createdAt);
            const cloudDate = new Date(cloudList.updatedAt || cloudList.createdAt);
            
            // Use most recent version
            if (cloudDate > localDate) {
                // Cloud is newer, update local
                await updateWordListDB(listId, cloudList);
                console.log(`Updated local list from cloud in background: ${listId}`);
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
                    console.log(`Updated cloud list from local in background: ${listId}`);
                } catch (error) {
                    console.warn('Failed to update cloud with local changes:', error);
                }
            }
        }
    } catch (error) {
        if (error.message !== 'Timeout') {
            console.warn('Could not check cloud version:', error);
        }
    }
}

/**
 * Unified get all word lists
 */
export async function getAllWordLists() {
    try {
        // Get local lists first (always fast)
        const localLists = await getAllWordListsDB();
        return localLists;
    } catch (error) {
        console.error('Error getting all word lists:', error);
        return [];
    }
}

/**
 * Unified update word list
 */
export async function updateWordList(listId, updateData) {
    try {
        // Update locally first - this should be fast
        const updatedList = await updateWordListDB(listId, updateData);
        
        // Try to sync to cloud in background
        if (await canSyncToCloud() && navigator.onLine) {
            // Don't await this - let it run in background
            updateCloudInBackground(listId, updateData, updatedList).catch(error => {
                console.warn('Background cloud update failed:', error);
            });
        }
        
        // Return local data immediately
        return updatedList;
    } catch (error) {
        console.error('Error updating word list:', error);
        throw new Error('Erro ao atualizar lista: ' + error.message);
    }
}

/**
 * Background cloud update helper
 */
async function updateCloudInBackground(listId, updateData, updatedList) {
    try {
        const cloudList = await Promise.race([
            updateWordListFirestore(listId, updateData),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)) // 5 second timeout
        ]);
        
        await markListAsSyncedDB(listId, cloudList.syncedAt);
        console.log(`Word list updated in cloud in background: ${listId}`);
    } catch (error) {
        console.warn('Background update failed:', error);
    }
}

/**
 * Unified delete word list
 */
export async function deleteWordList(listId) {
    try {
        console.log(`Starting deletion of word list: ${listId}`);
        
        // Delete locally first - this should be fast
        const localDeleted = await deleteWordListDB(listId);
        if (localDeleted) {
            console.log(`Word list deleted locally: ${listId}`);
        }
        
        // Delete from cloud in background
        if (await canSyncToCloud() && navigator.onLine) {
            // Don't await this - let it run in background
            deleteFromCloudInBackground(listId).catch(error => {
                console.warn('Background cloud deletion failed:', error);
            });
        }
        
        // Return immediately
        return true;
    } catch (error) {
        console.error('Error deleting word list:', error);
        throw new Error('Erro ao excluir lista: ' + error.message);
    }
}

/**
 * Background cloud deletion helper
 */
async function deleteFromCloudInBackground(listId) {
    try {
        await Promise.race([
            deleteWordListFirestore(listId),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)) // 5 second timeout
        ]);
        console.log(`Word list deleted from cloud in background: ${listId}`);
    } catch (error) {
        console.warn('Background deletion failed:', error);
    }
}

/**
 * Unified add words to list
 */
export async function addWordsToList(listId, wordIds) {
    try {
        // Add locally first - this should be fast
        const updatedList = await addWordsToListDB(listId, wordIds);
        
        // Sync to cloud in background
        if (await canSyncToCloud() && navigator.onLine) {
            // Don't await this - let it run in background
            addWordsToCloudInBackground(listId, wordIds, updatedList).catch(error => {
                console.warn('Background cloud sync failed after adding words:', error);
            });
        }
        
        // Return local data immediately
        return updatedList;
    } catch (error) {
        console.error('Error adding words to list:', error);
        throw new Error('Erro ao adicionar palavras: ' + error.message);
    }
}

/**
 * Background add words to cloud helper
 */
async function addWordsToCloudInBackground(listId, wordIds, updatedList) {
    try {
        const cloudList = await Promise.race([
            addWordsToListFirestore(listId, wordIds),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)) // 5 second timeout
        ]);
        
        await markListAsSyncedDB(listId, cloudList.syncedAt);
        console.log(`Words added and synced to cloud in background: ${listId}`);
    } catch (error) {
        console.warn('Background sync failed:', error);
    }
}

/**
 * Unified remove words from list
 */
export async function removeWordsFromList(listId, wordIds) {
    try {
        // Remove locally first - this should be fast
        const updatedList = await removeWordsFromListDB(listId, wordIds);
        
        // Sync to cloud in background
        if (await canSyncToCloud() && navigator.onLine) {
            // Don't await this - let it run in background
            removeWordsFromCloudInBackground(listId, wordIds, updatedList).catch(error => {
                console.warn('Background cloud sync failed after removing words:', error);
            });
        }
        
        // Return local data immediately
        return updatedList;
    } catch (error) {
        console.error('Error removing words from list:', error);
        throw new Error('Erro ao remover palavras: ' + error.message);
    }
}

/**
 * Background remove words from cloud helper
 */
async function removeWordsFromCloudInBackground(listId, wordIds, updatedList) {
    try {
        const cloudList = await Promise.race([
            removeWordsFromListFirestore(listId, wordIds),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)) // 5 second timeout
        ]);
        
        await markListAsSyncedDB(listId, cloudList.syncedAt);
        console.log(`Words removed and synced from cloud in background: ${listId}`);
    } catch (error) {
        console.warn('Background sync failed:', error);
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
 * Force full synchronization
 */
export async function forceFullSync() {
    if (!await canSyncToCloud()) {
        throw new Error('Sincronização na nuvem não disponível para seu plano');
    }
    
    if (!navigator.onLine) {
        throw new Error('Você está offline. Verifique sua conexão e tente novamente.');
    }
    
    try {
        console.log('Starting forced full synchronization...');
        
        const result = await performFullListSync();
        
        console.log(`Full sync completed: ${result.uploaded} uploaded, ${result.downloaded} downloaded`);
        
        return result;
    } catch (error) {
        console.error('Forced sync failed:', error);
        const errorMessage = 'Falha na sincronização forçada: ' + error.message;
        throw new Error(errorMessage);
    }
}