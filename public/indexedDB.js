// Sistema de armazenamento usando IndexedDB
const DB_NAME = 'koineAppDB';
const DB_VERSION = 3; 
const STORE_PROGRESS = 'userProgress';
const STORE_FEEDBACK = 'userFeedback';
const STORE_MODULE_COMPLETION = 'moduleCompletion';
const STORE_VOCABULARY = 'vocabularyWords';
const STORE_WORD_LISTS = 'wordLists';
const STORE_SYSTEM_VOCABULARY = 'systemVocabulary';
const STORE_USER_PROGRESS = 'wordProgress';

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
        };
    });
}

// Salvar progresso
export function saveProgress(trilhaId, progresso) {
    return new Promise(async (resolve, reject) => {
        try {
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
            
            request.onsuccess = () => resolve();
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
            
            request.onsuccess = () => resolve();
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
            
            request.onsuccess = () => resolve();
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

// Para compatibilidade com código não-modular
if (typeof window !== 'undefined') {
    window.initDB = initDB;
    window.saveProgress = saveProgress;
    window.loadProgress = loadProgress;
    window.saveFeedback = saveFeedback;
    window.saveModuleCompletion = saveModuleCompletion;
    window.checkModuleCompletion = checkModuleCompletion;
}