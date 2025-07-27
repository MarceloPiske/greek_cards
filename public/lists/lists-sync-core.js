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
    
} from './lists-db.js';

import {
    createWordListFirestore,
    getWordListFirestore,
    updateWordListFirestore,
    deleteWordListFirestore,
    addWordsToListFirestore,
    removeWordsFromListFirestore,
    performFullListSync
} from './lists-firestore.js';

import { canSyncToCloud } from '../plan-manager.js';

/**
 * Unified create word list (handles both local and cloud)
 */
export async function createWordList(listData) {
    try {
        // Check if user has reached the limit of 5 lists
        const currentCount = await getWordListCountDB();
        if (currentCount >= 5) {
            throw new Error('Você atingiu o limite máximo de 5 listas. Exclua uma lista existente para criar uma nova.');
        }

        // Always create locally first
        const localList = await createWordListDB(listData);
        
        // Try to sync to cloud if user has cloud access
        if (await canSyncToCloud() && navigator.onLine) {
            try {
                const cloudList = await createWordListFirestore(localList);
                // Update local with sync timestamp
                await markListAsSyncedDB(localList.id, cloudList.syncedAt);
                
                console.log(`Word list created and synced: ${localList.id}`);
                return { ...localList, syncedAt: cloudList.syncedAt };
            } catch (error) {
                console.warn('Cloud sync failed during creation:', error);
            }
        } else if (await canSyncToCloud() && !navigator.onLine) {
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
        if (await canSyncToCloud() && navigator.onLine && localList) {
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
        // Update locally first
        const updatedList = await updateWordListDB(listId, updateData);
        
        // Try to sync to cloud
        if (await canSyncToCloud() && navigator.onLine) {
            try {
                const cloudList = await updateWordListFirestore(listId, updateData);
                await markListAsSyncedDB(listId, cloudList.syncedAt);
                
                console.log(`Word list updated and synced: ${listId}`);
                return { ...updatedList, syncedAt: cloudList.syncedAt };
            } catch (error) {
                console.warn('Cloud sync failed during update:', error);
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
        if (await canSyncToCloud() && navigator.onLine) {
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
        if (await canSyncToCloud() && navigator.onLine) {
            try {
                const cloudList = await addWordsToListFirestore(listId, wordIds);
                await markListAsSyncedDB(listId, cloudList.syncedAt);
                
                console.log(`Words added and synced to list: ${listId}`);
                return { ...updatedList, syncedAt: cloudList.syncedAt };
            } catch (error) {
                console.warn('Cloud sync failed after adding words:', error);
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
        if (await canSyncToCloud() && navigator.onLine) {
            try {
                const cloudList = await removeWordsFromListFirestore(listId, wordIds);
                await markListAsSyncedDB(listId, cloudList.syncedAt);
                
                console.log(`Words removed and synced from list: ${listId}`);
                return { ...updatedList, syncedAt: cloudList.syncedAt };
            } catch (error) {
                console.warn('Cloud sync failed after removing words:', error);
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