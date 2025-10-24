/**
 * IndexedDB Module for Trilha Progress Management
<<<<<<< HEAD
 * Handles local storage of trilha progress data with multi-user support
 */

const DB_NAME = 'koineAppDB';
const DB_VERSION = 6; // Increased version to force upgrade
const STORE_TRILHA_PROGRESS = 'progresso';
const STORE_USER_DATA = 'userData';

/**
 * Initialize IndexedDB for trilha progress with multi-user support
=======
 * Handles local storage of trilha progress data
 */

const DB_NAME = 'koineAppDB';
const DB_VERSION = 4;
const STORE_TRILHA_PROGRESS = 'progresso';

/**
 * Initialize IndexedDB for trilha progress
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
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
<<<<<<< HEAD
            
            // Verify that required stores exist
            if (!db.objectStoreNames.contains(STORE_TRILHA_PROGRESS) || 
                !db.objectStoreNames.contains(STORE_USER_DATA)) {
                console.warn('Required stores missing, closing and recreating database...');
                db.close();
                
                // Delete the database and recreate it
                const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
                deleteRequest.onsuccess = () => {
                    console.log('Database deleted, recreating...');
                    // Recursively call init again
                    initTrilhaProgressDB().then(resolve).catch(reject);
                };
                deleteRequest.onerror = () => {
                    reject(new Error('Failed to delete and recreate database'));
                };
                return;
            }
            
=======
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
<<<<<<< HEAD
            const transaction = event.target.transaction;
            
            console.log('Upgrading database from version', event.oldVersion, 'to', event.newVersion);
            
            try {
                // Create or upgrade progress store with composite key
                if (!db.objectStoreNames.contains(STORE_TRILHA_PROGRESS)) {
                    console.log('Creating trilha progress store...');
                    const store = db.createObjectStore(STORE_TRILHA_PROGRESS, { 
                        keyPath: ['userId', 'modulo_id'] 
                    });
                    store.createIndex('userId', 'userId', { unique: false });
                    store.createIndex('modulo_id', 'modulo_id', { unique: false });
                    store.createIndex('syncStatus', 'syncStatus', { unique: false });
                } else {
                    console.log('Migrating existing trilha progress store...');
                    // Migrate existing data if needed
                    const store = transaction.objectStore(STORE_TRILHA_PROGRESS);
                    
                    // Ensure indices exist
                    if (!store.indexNames.contains('userId')) {
                        store.createIndex('userId', 'userId', { unique: false });
                    }
                    if (!store.indexNames.contains('modulo_id')) {
                        store.createIndex('modulo_id', 'modulo_id', { unique: false });
                    }
                    if (!store.indexNames.contains('syncStatus')) {
                        store.createIndex('syncStatus', 'syncStatus', { unique: false });
                    }
                    
                    // Check if we need to migrate old data structure
                    const getAllRequest = store.getAll();
                    getAllRequest.onsuccess = () => {
                        const records = getAllRequest.result;
                        console.log(`Found ${records.length} existing progress records`);
                        
                        records.forEach(record => {
                            if (!record.userId) {
                                console.log('Migrating record without userId:', record.modulo_id);
                                // Migrate old records to anonymous user
                                const newRecord = {
                                    ...record,
                                    userId: 'anonymous',
                                    migratedAt: new Date().toISOString(),
                                    syncStatus: 'none'
                                };
                                
                                // Delete old record and add new one
                                try {
                                    store.delete(record.modulo_id);
                                    store.put(newRecord);
                                } catch (error) {
                                    console.error('Error migrating record:', error);
                                }
                            } else if (!record.syncStatus) {
                                // Add missing syncStatus field
                                const updatedRecord = {
                                    ...record,
                                    syncStatus: 'none'
                                };
                                store.put(updatedRecord);
                            }
                        });
                    };
                    getAllRequest.onerror = (error) => {
                        console.error('Error reading existing records for migration:', error);
                    };
                }
                
                // Create user data store for offline user management
                if (!db.objectStoreNames.contains(STORE_USER_DATA)) {
                    console.log('Creating user data store...');
                    const userStore = db.createObjectStore(STORE_USER_DATA, { keyPath: 'userId' });
                    userStore.createIndex('email', 'email', { unique: false });
                    userStore.createIndex('lastLogin', 'lastLogin', { unique: false });
                    userStore.createIndex('plan', 'plan', { unique: false });
                } else {
                    console.log('User data store already exists');
                    const userStore = transaction.objectStore(STORE_USER_DATA);
                    
                    // Ensure indices exist
                    if (!userStore.indexNames.contains('email')) {
                        userStore.createIndex('email', 'email', { unique: false });
                    }
                    if (!userStore.indexNames.contains('lastLogin')) {
                        userStore.createIndex('lastLogin', 'lastLogin', { unique: false });
                    }
                    if (!userStore.indexNames.contains('plan')) {
                        userStore.createIndex('plan', 'plan', { unique: false });
                    }
                }
                
                console.log('Database upgrade completed successfully');
                
            } catch (error) {
                console.error('Error during database upgrade:', error);
                transaction.abort();
                reject(error);
            }
        };
        
        request.onblocked = (event) => {
            console.warn('Database upgrade blocked. Please close other tabs with this app.');
            reject(new Error('Database upgrade blocked'));
        };
=======
            
            if (!db.objectStoreNames.contains(STORE_TRILHA_PROGRESS)) {
                db.createObjectStore(STORE_TRILHA_PROGRESS, { keyPath: 'modulo_id' });
            }
        };
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
    });
}

/**
<<<<<<< HEAD
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
        
        // Verify store exists before creating transaction
        if (!db.objectStoreNames.contains(STORE_TRILHA_PROGRESS)) {
            throw new Error(`Store ${STORE_TRILHA_PROGRESS} not found in database`);
        }
        
        const tx = db.transaction(STORE_TRILHA_PROGRESS, 'readwrite');
        const store = tx.objectStore(STORE_TRILHA_PROGRESS);
        
        const currentUserId = userId || getCurrentUserId();
        
        const progressRecord = {
            userId: currentUserId,
=======
 * Save trilha progress to IndexedDB
 */
export async function saveTrilhaProgressLocal(moduleId, progressData) {
    try {
        const db = await initTrilhaProgressDB();
        const tx = db.transaction(STORE_TRILHA_PROGRESS, 'readwrite');
        const store = tx.objectStore(STORE_TRILHA_PROGRESS);
        
        const progressRecord = {
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
            modulo_id: moduleId,
            ultimaAtualizacao: new Date().toISOString(),
            blocosConcluidos: progressData.blocosConcluidos || [],
            respostas: progressData.respostas || {},
            tempoTotal: progressData.tempoTotal || 0,
            notasPessoais: progressData.notasPessoais || '',
            favoritos: progressData.favoritos || [],
<<<<<<< HEAD
            versaoLocal: Date.now(),
            syncStatus: 'pending' // Track sync status
=======
            versaoLocal: Date.now() // For conflict resolution
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
        };
        
        await new Promise((resolve, reject) => {
            const request = store.put(progressRecord);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
<<<<<<< HEAD
        console.log(`Trilha progress saved locally for user ${currentUserId}, module: ${moduleId}`);
=======
        console.log(`Trilha progress saved locally for module: ${moduleId}`);
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
        return progressRecord;
    } catch (error) {
        console.error('Error saving trilha progress locally:', error);
        throw error;
    }
}

/**
<<<<<<< HEAD
 * Load trilha progress from IndexedDB for specific user
 */
export async function loadTrilhaProgressLocal(moduleId, userId = null) {
    try {
        const db = await initTrilhaProgressDB();
        
        // Verify store exists before creating transaction
        if (!db.objectStoreNames.contains(STORE_TRILHA_PROGRESS)) {
            console.warn(`Store ${STORE_TRILHA_PROGRESS} not found, returning default progress`);
            return createDefaultProgress(moduleId, userId);
        }
        
        const tx = db.transaction(STORE_TRILHA_PROGRESS, 'readonly');
        const store = tx.objectStore(STORE_TRILHA_PROGRESS);
        
        const currentUserId = userId || getCurrentUserId();
        
        return new Promise((resolve, reject) => {
            const request = store.get([currentUserId, moduleId]);
            request.onsuccess = () => {
                const result = request.result || createDefaultProgress(moduleId, currentUserId);
                resolve(result);
            };
            request.onerror = () => {
                console.error('Error loading progress from IndexedDB:', request.error);
                resolve(createDefaultProgress(moduleId, currentUserId));
            };
        });
    } catch (error) {
        console.error('Error loading trilha progress locally:', error);
        return createDefaultProgress(moduleId, userId);
=======
 * Load trilha progress from IndexedDB
 */
export async function loadTrilhaProgressLocal(moduleId) {
    try {
        const db = await initTrilhaProgressDB();
        const tx = db.transaction(STORE_TRILHA_PROGRESS, 'readonly');
        const store = tx.objectStore(STORE_TRILHA_PROGRESS);
        
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
                    favoritos: [],
                    versaoLocal: 0
                };
                resolve(result);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error loading trilha progress locally:', error);
        return {
            modulo_id: moduleId,
            ultimaAtualizacao: null,
            blocosConcluidos: [],
            respostas: {},
            tempoTotal: 0,
            notasPessoais: '',
            favoritos: [],
            versaoLocal: 0
        };
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
    }
}

/**
<<<<<<< HEAD
 * Create default progress object
 */
function createDefaultProgress(moduleId, userId = null) {
    const currentUserId = userId || getCurrentUserId();
    return {
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
}

/**
 * Get all trilha progress from IndexedDB for specific user
 */
export async function getAllTrilhaProgressLocal(userId = null) {
    try {
        const db = await initTrilhaProgressDB();
        
        // Verify store exists before creating transaction
        if (!db.objectStoreNames.contains(STORE_TRILHA_PROGRESS)) {
            console.warn(`Store ${STORE_TRILHA_PROGRESS} not found, returning empty array`);
            return [];
        }
        
        const tx = db.transaction(STORE_TRILHA_PROGRESS, 'readonly');
        const store = tx.objectStore(STORE_TRILHA_PROGRESS);
        
        const currentUserId = userId || getCurrentUserId();
        
        return new Promise((resolve, reject) => {
            const index = store.index('userId');
            const request = index.getAll(currentUserId);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => {
                console.error('Error getting all progress from IndexedDB:', request.error);
                resolve([]);
            };
=======
 * Get all trilha progress from IndexedDB
 */
export async function getAllTrilhaProgressLocal() {
    try {
        const db = await initTrilhaProgressDB();
        const tx = db.transaction(STORE_TRILHA_PROGRESS, 'readonly');
        const store = tx.objectStore(STORE_TRILHA_PROGRESS);
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
        });
    } catch (error) {
        console.error('Error getting all trilha progress locally:', error);
        return [];
    }
}

/**
 * Delete trilha progress from IndexedDB
 */
<<<<<<< HEAD
export async function deleteTrilhaProgressLocal(moduleId, userId = null) {
=======
export async function deleteTrilhaProgressLocal(moduleId) {
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
    try {
        const db = await initTrilhaProgressDB();
        const tx = db.transaction(STORE_TRILHA_PROGRESS, 'readwrite');
        const store = tx.objectStore(STORE_TRILHA_PROGRESS);
        
<<<<<<< HEAD
        const currentUserId = userId || getCurrentUserId();
        
        await new Promise((resolve, reject) => {
            const request = store.delete([currentUserId, moduleId]);
=======
        await new Promise((resolve, reject) => {
            const request = store.delete(moduleId);
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
<<<<<<< HEAD
        console.log(`Trilha progress deleted locally for user ${currentUserId}, module: ${moduleId}`);
=======
        console.log(`Trilha progress deleted locally for module: ${moduleId}`);
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
    } catch (error) {
        console.error('Error deleting trilha progress locally:', error);
        throw error;
    }
}

/**
 * Mark progress as needing sync (for offline changes)
 */
<<<<<<< HEAD
export async function markTrilhaProgressForSync(moduleId, userId = null) {
    try {
        const progress = await loadTrilhaProgressLocal(moduleId, userId);
        progress.syncStatus = 'pending';
        progress.lastModified = Date.now();
        await saveTrilhaProgressLocal(moduleId, progress, userId);
=======
export async function markTrilhaProgressForSync(moduleId) {
    try {
        const progress = await loadTrilhaProgressLocal(moduleId);
        progress.needsSync = true;
        progress.lastModified = Date.now();
        await saveTrilhaProgressLocal(moduleId, progress);
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
    } catch (error) {
        console.error('Error marking trilha progress for sync:', error);
    }
}

/**
<<<<<<< HEAD
 * Get all progress that needs sync for a user
 */
export async function getTrilhaProgressNeedingSync(userId = null) {
    try {
        const allProgress = await getAllTrilhaProgressLocal(userId);
        return allProgress.filter(progress => progress.syncStatus === 'pending');
=======
 * Get all progress that needs sync
 */
export async function getTrilhaProgressNeedingSync() {
    try {
        const allProgress = await getAllTrilhaProgressLocal();
        return allProgress.filter(progress => progress.needsSync === true);
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
    } catch (error) {
        console.error('Error getting trilha progress needing sync:', error);
        return [];
    }
<<<<<<< HEAD
}

/**
 * Save user data for offline access
 */
export async function saveUserDataLocal(userData) {
    try {
        const db = await initTrilhaProgressDB();
        
        // Verify store exists before creating transaction
        if (!db.objectStoreNames.contains(STORE_USER_DATA)) {
            console.warn(`Store ${STORE_USER_DATA} not found, cannot save user data`);
            return;
        }
        
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
        
        // Verify store exists before creating transaction
        if (!db.objectStoreNames.contains(STORE_USER_DATA)) {
            console.warn(`Store ${STORE_USER_DATA} not found, returning null`);
            return null;
        }
        
        const tx = db.transaction(STORE_USER_DATA, 'readonly');
        const store = tx.objectStore(STORE_USER_DATA);
        
        return new Promise((resolve, reject) => {
            const request = store.get(userId);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => {
                console.error('Error loading user data from IndexedDB:', request.error);
                resolve(null);
            };
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
=======
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
}