// Sistema de armazenamento usando IndexedDB
const DB_NAME = 'koineAppDB';
const DB_VERSION = 4; // Increased version for progress system
const STORE_PROGRESS = 'userProgress';
const STORE_FEEDBACK = 'userFeedback';
const STORE_MODULE_COMPLETION = 'moduleCompletion';
const STORE_VOCABULARY = 'vocabularyWords';
const STORE_WORD_LISTS = 'wordLists';
const STORE_SYSTEM_VOCABULARY = 'systemVocabulary';
const STORE_USER_PROGRESS = 'wordProgress';
const STORE_TRILHA_PROGRESS = 'progresso'; // New store for trilha progress

// Firebase integration flag
let firebaseEnabled = false;
let firebaseDb = null;

/**
 * Enable Firebase integration
 */
export function enableFirebaseIntegration(db) {
    firebaseEnabled = true;
    firebaseDb = db;
}

/**
 * Check if user is authenticated and Firebase is enabled
 */
function shouldSyncToFirebase() {
    return firebaseEnabled && firebaseDb && typeof window !== 'undefined' && 
           window.firebaseAuth && window.firebaseAuth.isAuthenticated();
}

/**
 * Sync data to Firebase if user is authenticated
 */
async function syncToFirebase(collectionName, data, docId = null) {
    if (!shouldSyncToFirebase()) return;
    
    try {
        const user = window.firebaseAuth.getCurrentUser();
        if (!user) return;
        
        // Import Firebase functions
        const { doc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const userCollectionRef = collection(firebaseDb, 'users', user.uid, collectionName);
        const docRef = doc(userCollectionRef, docId || data.id || data.moduloId || data.wordId);
        
        await setDoc(docRef, {
            ...data,
            syncedAt: new Date().toISOString()
        });
        
        console.log(`Synced ${collectionName} to Firebase`);
    } catch (error) {
        console.warn(`Failed to sync ${collectionName} to Firebase:`, error);
    }
}

// Inicializar o banco de dados
export function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => {
            console.error('Erro ao abrir banco de dados:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Criar store para progresso do usuário
            if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
                db.createObjectStore(STORE_PROGRESS, { keyPath: 'id' });
            }
            
            // Criar store para feedback
            if (!db.objectStoreNames.contains(STORE_FEEDBACK)) {
                db.createObjectStore(STORE_FEEDBACK, { keyPath: 'id', autoIncrement: true });
            }
            
            // Criar store para conclusão de módulos
            if (!db.objectStoreNames.contains(STORE_MODULE_COMPLETION)) {
                db.createObjectStore(STORE_MODULE_COMPLETION, { keyPath: 'moduloId' });
            }
            
            // Create store for vocabulary words
            if (!db.objectStoreNames.contains(STORE_VOCABULARY)) {
                db.createObjectStore(STORE_VOCABULARY, { keyPath: 'id' });
            }
            
            // Create store for word lists
            if (!db.objectStoreNames.contains(STORE_WORD_LISTS)) {
                db.createObjectStore(STORE_WORD_LISTS, { keyPath: 'id' });
            }
            
            // Create store for system vocabulary by module
            if (!db.objectStoreNames.contains(STORE_SYSTEM_VOCABULARY)) {
                db.createObjectStore(STORE_SYSTEM_VOCABULARY, { keyPath: 'ID' });
            }
            
            // Create store for word learning progress
            if (!db.objectStoreNames.contains(STORE_USER_PROGRESS)) {
                db.createObjectStore(STORE_USER_PROGRESS, { keyPath: 'wordId' });
            }
            
            // Create store for trilha progress (new)
            if (!db.objectStoreNames.contains(STORE_TRILHA_PROGRESS)) {
                db.createObjectStore(STORE_TRILHA_PROGRESS, { keyPath: 'modulo_id' });
            }
        };
    });
}

// Legacy functions - maintained for backward compatibility but will delegate to progress-manager

// Salvar progresso
export function saveProgress(trilhaId, progresso) {
    return new Promise(async (resolve, reject) => {
        try {
            // Try to use new progress manager if available
            if (window.progressManager) {
                const progressData = {
                    blocosConcluidos: progresso.trilhaCompletada || [],
                    tempoTotal: 0
                };
                await window.progressManager.saveProgress(trilhaId, progressData);
                resolve();
                return;
            }
            
            // Fallback to old system
            const db = await initDB();
            const tx = db.transaction(STORE_PROGRESS, 'readwrite');
            const store = tx.objectStore(STORE_PROGRESS);
            
            const item = {
                id: `trilha_${trilhaId}`,
                indiceAtual: progresso.indiceAtual,
                trilhaCompletada: progresso.trilhaCompletada,
                ultimoAcesso: new Date().toISOString()
            };
            
            const request = store.put(item);
            
            request.onsuccess = async () => {
                // Sync to Firebase
                await syncToFirebase('userProgress', item, item.id);
                resolve();
            };
            request.onerror = (event) => reject(event.target.error);
            
            tx.oncomplete = () => db.close();
        } catch (error) {
            reject(error);
        }
    });
}

// Carregar progresso
export function loadProgress(trilhaId) {
    return new Promise(async (resolve, reject) => {
        try {
            // Try to use new progress manager if available
            if (window.progressManager) {
                const progress = await window.progressManager.loadProgress(trilhaId);
                // Convert to legacy format
                const legacyProgress = {
                    indiceAtual: progress.blocosConcluidos.length,
                    trilhaCompletada: progress.blocosConcluidos
                };
                resolve(legacyProgress);
                return;
            }
            
            // Fallback to old system
            const db = await initDB();
            const tx = db.transaction(STORE_PROGRESS, 'readonly');
            const store = tx.objectStore(STORE_PROGRESS);
            
            const request = store.get(`trilha_${trilhaId}`);
            
            request.onsuccess = () => {
                const progresso = request.result || { 
                    indiceAtual: 0, 
                    trilhaCompletada: [] 
                };
                resolve(progresso);
            };
            
            request.onerror = (event) => reject(event.target.error);
            
            tx.oncomplete = () => db.close();
        } catch (error) {
            reject(error);
        }
    });
}

// Salvar feedback do usuário
export function saveFeedback(trilhaId, dados) {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const tx = db.transaction(STORE_FEEDBACK, 'readwrite');
            const store = tx.objectStore(STORE_FEEDBACK);
            
            const feedback = {
                trilhaId,
                avaliacao: dados.avaliacao,
                comentario: dados.comentario,
                sugestoes: dados.sugestoes,
                dataEnvio: new Date().toISOString()
            };
            
            const request = store.add(feedback);
            
            request.onsuccess = async () => {
                // Get the generated ID
                feedback.id = request.result;
                // Sync to Firebase
                await syncToFirebase('feedback', feedback, feedback.id.toString());
                resolve();
            };
            request.onerror = (event) => reject(event.target.error);
            
            tx.oncomplete = () => db.close();
        } catch (error) {
            reject(error);
        }
    });
}

// Salvar conclusão de módulo
export function saveModuleCompletion(moduloId) {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const tx = db.transaction(STORE_MODULE_COMPLETION, 'readwrite');
            const store = tx.objectStore(STORE_MODULE_COMPLETION);
            
            const item = {
                moduloId,
                concluido: true,
                dataConclusao: new Date().toISOString()
            };
            
            const request = store.put(item);
            
            request.onsuccess = async () => {
                // Sync to Firebase
                await syncToFirebase('moduleCompletion', item, item.moduloId);
                resolve();
            };
            request.onerror = (event) => reject(event.target.error);
            
            tx.oncomplete = () => db.close();
        } catch (error) {
            reject(error);
        }
    });
}

// Verificar conclusão de módulo
export function checkModuleCompletion(moduloId) {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const tx = db.transaction(STORE_MODULE_COMPLETION, 'readonly');
            const store = tx.objectStore(STORE_MODULE_COMPLETION);
            
            const request = store.get(moduloId);
            
            request.onsuccess = () => {
                const conclusao = request.result;
                resolve(conclusao ? conclusao.concluido : false);
            };
            
            request.onerror = (event) => reject(event.target.error);
            
            tx.oncomplete = () => db.close();
        } catch (error) {
            reject(error);
        }
    });
}

// Initialize Firebase integration when available
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        // Wait for Firebase to be initialized
        setTimeout(async () => {
            if (window.firebaseAuth && window.firebaseAuth.db) {
                enableFirebaseIntegration(window.firebaseAuth.db);
            }
        }, 1000);
    });
}

// Para compatibilidade com código não-modular
if (typeof window !== 'undefined') {
    window.initDB = initDB;
    window.saveProgress = saveProgress;
    window.loadProgress = loadProgress;
    window.saveFeedback = saveFeedback;
    window.saveModuleCompletion = saveModuleCompletion;
    window.checkModuleCompletion = checkModuleCompletion;
}