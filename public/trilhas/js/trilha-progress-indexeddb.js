/**
 * IndexedDB Module for Trilha Progress Management
 * Handles local storage of trilha progress data with multi-user support
 */

const DB_NAME = 'koineAppDB';
const DB_VERSION = 6; // Increased version for schema changes
const STORE_TRILHA_PROGRESS = 'progresso';
const STORE_USER_DATA = 'userData';

/**
 * Initialize IndexedDB for trilha progress with multi-user support
 */
export async function initTrilhaProgressDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => {
            console.error('Error opening trilha progress database:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create or upgrade progress store with composite key
            if (!db.objectStoreNames.contains(STORE_TRILHA_PROGRESS)) {
                const store = db.createObjectStore(STORE_TRILHA_PROGRESS, { 
                    keyPath: ['userId', 'modulo_id'] 
                });
                store.createIndex('userId', 'userId', { unique: false });
                store.createIndex('modulo_id', 'modulo_id', { unique: false });
            } else {
                // Migrate existing data if needed
                const transaction = event.target.transaction;
                const store = transaction.objectStore(STORE_TRILHA_PROGRESS);
                
                // Check if we need to migrate old data structure
                const getAllRequest = store.getAll();
                getAllRequest.onsuccess = () => {
                    const records = getAllRequest.result;
                    records.forEach(record => {
                        if (!record.userId) {
                            // Migrate old records to anonymous user
                            const newRecord = {
                                ...record,
                                userId: 'anonymous',
                                migratedAt: new Date().toISOString()
                            };
                            store.delete(record.modulo_id);
                            store.put(newRecord);
                        }
                    });
                };
            }
            
            // Create user data store for offline user management
            if (!db.objectStoreNames.contains(STORE_USER_DATA)) {
                const userStore = db.createObjectStore(STORE_USER_DATA, { keyPath: 'userId' });
                userStore.createIndex('email', 'email', { unique: false });
                userStore.createIndex('lastLogin', 'lastLogin', { unique: false });
            }
        };
    });
}

/**
 * Get current user ID for IndexedDB operations
 */
function getCurrentUserId() {
    if (typeof window !== 'undefined' && window.firebaseAuth?.getCurrentUser()) {
        return window.firebaseAuth.getCurrentUser().uid;
    }
    return 'anonymous'; // For offline users
}

/**
 * Save trilha progress to IndexedDB with user separation
 */
export async function saveTrilhaProgressLocal(moduleId, progressData, userId = null) {
    try {
        const db = await initTrilhaProgressDB();
        const tx = db.transaction(STORE_TRILHA_PROGRESS, 'readwrite');
        const store = tx.objectStore(STORE_TRILHA_PROGRESS);
        
        const currentUserId = userId || getCurrentUserId();
        
        const progressRecord = {
            userId: currentUserId,
            modulo_id: moduleId,
            ultimaAtualizacao: new Date().toISOString(),
            blocosConcluidos: progressData.blocosConcluidos || [],
            respostas: progressData.respostas || {},
            tempoTotal: progressData.tempoTotal || 0,
            notasPessoais: progressData.notasPessoais || '',
            favoritos: progressData.favoritos || [],
            versaoLocal: Date.now(),
            syncStatus: 'pending' // Track sync status
        };
        
        await new Promise((resolve, reject) => {
            const request = store.put(progressRecord);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
        console.log(`Trilha progress saved locally for user ${currentUserId}, module: ${moduleId}`);
        return progressRecord;
    } catch (error) {
        console.error('Error saving trilha progress locally:', error);
        throw error;
    }
}

/**
 * Load trilha progress from IndexedDB for specific user
 */
export async function loadTrilhaProgressLocal(moduleId, userId = null) {
    try {
        const db = await initTrilhaProgressDB();
        const tx = db.transaction(STORE_TRILHA_PROGRESS, 'readonly');
        const store = tx.objectStore(STORE_TRILHA_PROGRESS);
        
        const currentUserId = userId || getCurrentUserId();
        
        return new Promise((resolve, reject) => {
            const request = store.get([currentUserId, moduleId]);
            request.onsuccess = () => {
                const result = request.result || {
                    userId: currentUserId,
                    modulo_id: moduleId,
                    ultimaAtualizacao: null,
                    blocosConcluidos: [],
                    respostas: {},
                    tempoTotal: 0,
                    notasPessoais: '',
                    favoritos: [],
                    versaoLocal: 0,
                    syncStatus: 'none'
                };
                resolve(result);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error loading trilha progress locally:', error);
        return {
            userId: getCurrentUserId(),
            modulo_id: moduleId,
            ultimaAtualizacao: null,
            blocosConcluidos: [],
            respostas: {},
            tempoTotal: 0,
            notasPessoais: '',
            favoritos: [],
            versaoLocal: 0,
            syncStatus: 'none'
        };
    }
}

/**
 * Get all trilha progress from IndexedDB for specific user
 */
export async function getAllTrilhaProgressLocal(userId = null) {
    try {
        const db = await initTrilhaProgressDB();
        const tx = db.transaction(STORE_TRILHA_PROGRESS, 'readonly');
        const store = tx.objectStore(STORE_TRILHA_PROGRESS);
        
        const currentUserId = userId || getCurrentUserId();
        
        return new Promise((resolve, reject) => {
            const index = store.index('userId');
            const request = index.getAll(currentUserId);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting all trilha progress locally:', error);
        return [];
    }
}

/**
 * Delete trilha progress from IndexedDB
 */
export async function deleteTrilhaProgressLocal(moduleId, userId = null) {
    try {
        const db = await initTrilhaProgressDB();
        const tx = db.transaction(STORE_TRILHA_PROGRESS, 'readwrite');
        const store = tx.objectStore(STORE_TRILHA_PROGRESS);
        
        const currentUserId = userId || getCurrentUserId();
        
        await new Promise((resolve, reject) => {
            const request = store.delete([currentUserId, moduleId]);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
        console.log(`Trilha progress deleted locally for user ${currentUserId}, module: ${moduleId}`);
    } catch (error) {
        console.error('Error deleting trilha progress locally:', error);
        throw error;
    }
}

/**
 * Mark progress as needing sync (for offline changes)
 */
export async function markTrilhaProgressForSync(moduleId, userId = null) {
    try {
        const progress = await loadTrilhaProgressLocal(moduleId, userId);
        progress.syncStatus = 'pending';
        progress.lastModified = Date.now();
        await saveTrilhaProgressLocal(moduleId, progress, userId);
    } catch (error) {
        console.error('Error marking trilha progress for sync:', error);
    }
}

/**
 * Get all progress that needs sync for a user
 */
export async function getTrilhaProgressNeedingSync(userId = null) {
    try {
        const allProgress = await getAllTrilhaProgressLocal(userId);
        return allProgress.filter(progress => progress.syncStatus === 'pending');
    } catch (error) {
        console.error('Error getting trilha progress needing sync:', error);
        return [];
    }
}

/**
 * Save user data for offline access
 */
export async function saveUserDataLocal(userData) {
    try {
        const db = await initTrilhaProgressDB();
        const tx = db.transaction(STORE_USER_DATA, 'readwrite');
        const store = tx.objectStore(STORE_USER_DATA);
        
        const userRecord = {
            userId: userData.uid,
            email: userData.email,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            plan: userData.plan || 'free',
            lastLogin: new Date().toISOString(),
            offlineCapable: true
        };
        
        await new Promise((resolve, reject) => {
            const request = store.put(userRecord);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
        console.log(`User data saved locally for: ${userData.uid}`);
    } catch (error) {
        console.error('Error saving user data locally:', error);
    }
}

/**
 * Load user data from local storage
 */
export async function loadUserDataLocal(userId) {
    try {
        const db = await initTrilhaProgressDB();
        const tx = db.transaction(STORE_USER_DATA, 'readonly');
        const store = tx.objectStore(STORE_USER_DATA);
        
        return new Promise((resolve, reject) => {
            const request = store.get(userId);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error loading user data locally:', error);
        return null;
    }
}

/**
 * Export user data for backup/sync
 */
export async function exportUserData(userId = null) {
    try {
        const currentUserId = userId || getCurrentUserId();
        const progressData = await getAllTrilhaProgressLocal(currentUserId);
        const userData = await loadUserDataLocal(currentUserId);
        
        return {
            userId: currentUserId,
            userData,
            progressData,
            exportedAt: new Date().toISOString(),
            version: DB_VERSION
        };
    } catch (error) {
        console.error('Error exporting user data:', error);
        throw error;
    }
}

/**
 * Import user data from backup/sync
 */
export async function importUserData(exportedData) {
    try {
        const { userId, userData, progressData } = exportedData;
        
        // Save user data
        if (userData) {
            await saveUserDataLocal(userData);
        }
        
        // Save progress data
        for (const progress of progressData) {
            await saveTrilhaProgressLocal(progress.modulo_id, progress, userId);
        }
        
        console.log(`User data imported for: ${userId}`);
        return true;
    } catch (error) {
        console.error('Error importing user data:', error);
        throw error;
    }
}