/**
 * IndexedDB Module for Trilha Progress Management
 * Handles local storage of trilha progress data
 */

const DB_NAME = 'koineAppDB';
const DB_VERSION = 4;
const STORE_TRILHA_PROGRESS = 'progresso';

/**
 * Initialize IndexedDB for trilha progress
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
            
            if (!db.objectStoreNames.contains(STORE_TRILHA_PROGRESS)) {
                db.createObjectStore(STORE_TRILHA_PROGRESS, { keyPath: 'modulo_id' });
            }
        };
    });
}

/**
 * Save trilha progress to IndexedDB
 */
export async function saveTrilhaProgressLocal(moduleId, progressData) {
    try {
        const db = await initTrilhaProgressDB();
        const tx = db.transaction(STORE_TRILHA_PROGRESS, 'readwrite');
        const store = tx.objectStore(STORE_TRILHA_PROGRESS);
        
        const progressRecord = {
            modulo_id: moduleId,
            ultimaAtualizacao: new Date().toISOString(),
            blocosConcluidos: progressData.blocosConcluidos || [],
            respostas: progressData.respostas || {},
            tempoTotal: progressData.tempoTotal || 0,
            notasPessoais: progressData.notasPessoais || '',
            favoritos: progressData.favoritos || [],
            versaoLocal: Date.now() // For conflict resolution
        };
        
        await new Promise((resolve, reject) => {
            const request = store.put(progressRecord);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
        console.log(`Trilha progress saved locally for module: ${moduleId}`);
        return progressRecord;
    } catch (error) {
        console.error('Error saving trilha progress locally:', error);
        throw error;
    }
}

/**
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
    }
}

/**
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
        });
    } catch (error) {
        console.error('Error getting all trilha progress locally:', error);
        return [];
    }
}

/**
 * Delete trilha progress from IndexedDB
 */
export async function deleteTrilhaProgressLocal(moduleId) {
    try {
        const db = await initTrilhaProgressDB();
        const tx = db.transaction(STORE_TRILHA_PROGRESS, 'readwrite');
        const store = tx.objectStore(STORE_TRILHA_PROGRESS);
        
        await new Promise((resolve, reject) => {
            const request = store.delete(moduleId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
        console.log(`Trilha progress deleted locally for module: ${moduleId}`);
    } catch (error) {
        console.error('Error deleting trilha progress locally:', error);
        throw error;
    }
}

/**
 * Mark progress as needing sync (for offline changes)
 */
export async function markTrilhaProgressForSync(moduleId) {
    try {
        const progress = await loadTrilhaProgressLocal(moduleId);
        progress.needsSync = true;
        progress.lastModified = Date.now();
        await saveTrilhaProgressLocal(moduleId, progress);
    } catch (error) {
        console.error('Error marking trilha progress for sync:', error);
    }
}

/**
 * Get all progress that needs sync
 */
export async function getTrilhaProgressNeedingSync() {
    try {
        const allProgress = await getAllTrilhaProgressLocal();
        return allProgress.filter(progress => progress.needsSync === true);
    } catch (error) {
        console.error('Error getting trilha progress needing sync:', error);
        return [];
    }
}