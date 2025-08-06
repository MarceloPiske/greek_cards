/**
 * Firestore Module for Trilha Progress Management
 * Handles cloud storage of trilha progress data with async operations
 */

// Queue for async operations
const syncQueue = new Map();
let isProcessingQueue = false;

/**
 * Check if Firestore is available and user is authenticated
 */
function isFirestoreAvailable() {
    return typeof window !== 'undefined' && 
           window.firebaseAuth && 
           window.firebaseAuth.isAuthenticated() &&
           window.firebaseAuth.db;
}

/**
 * Add operation to async queue
 */
function addToSyncQueue(operation, data) {
    const operationId = `${operation}_${data.moduleId || data.userId}_${Date.now()}`;
    syncQueue.set(operationId, { operation, data, timestamp: Date.now() });
    
    // Process queue asynchronously
    if (!isProcessingQueue) {
        setTimeout(processQueueAsync, 100);
    }
    
    return operationId;
}

/**
 * Process sync queue asynchronously without blocking UI
 */
async function processQueueAsync() {
    if (isProcessingQueue || syncQueue.size === 0) return;
    
    isProcessingQueue = true;
    
    try {
        const operations = Array.from(syncQueue.entries());
        
        for (const [operationId, { operation, data }] of operations) {
            try {
                switch (operation) {
                    case 'save':
                        await saveTrilhaProgressCloudDirect(data.moduleId, data.progressData);
                        break;
                    case 'delete':
                        await deleteTrilhaProgressCloudDirect(data.moduleId);
                        break;
                    case 'backup':
                        await backupUserDataCloudDirect(data.userData);
                        break;
                }
                
                syncQueue.delete(operationId);
                console.log(`Async operation completed: ${operation} for ${data.moduleId || data.userId}`);
                
            } catch (error) {
                console.error(`Async operation failed: ${operation}`, error);
                
                // Retry failed operations after delay
                const retryData = syncQueue.get(operationId);
                if (retryData && !retryData.retryCount) {
                    retryData.retryCount = 1;
                    retryData.retryAt = Date.now() + 30000; // Retry in 30 seconds
                } else if (retryData && retryData.retryCount < 3) {
                    retryData.retryCount++;
                    retryData.retryAt = Date.now() + (retryData.retryCount * 60000); // Exponential backoff
                } else {
                    syncQueue.delete(operationId);
                    console.error(`Operation failed permanently: ${operationId}`);
                }
            }
            
            // Small delay between operations to prevent overwhelming
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    } catch (error) {
        console.error('Error processing sync queue:', error);
    } finally {
        isProcessingQueue = false;
        
        // Check for retry operations
        const retryOperations = Array.from(syncQueue.values())
            .filter(op => op.retryAt && op.retryAt <= Date.now());
        
        if (retryOperations.length > 0) {
            setTimeout(processQueueAsync, 1000);
        }
    }
}

/**
 * Save trilha progress to Firestore (async)
 */
export async function saveTrilhaProgressCloud(moduleId, progressData) {
    if (!isFirestoreAvailable()) {
        console.log('Firestore not available, queuing for later sync');
        return null;
    }
    
    // Add to async queue for non-blocking operation
    addToSyncQueue('save', { moduleId, progressData });
    
    // Return immediately for UI responsiveness
    return { queued: true, moduleId };
}

/**
 * Direct save to Firestore (used by queue processor)
 */
async function saveTrilhaProgressCloudDirect(moduleId, progressData) {
    try {
        const user = window.firebaseAuth.getCurrentUser();
        const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js?v=1.1');
        
        const progressRecord = {
            modulo_id: moduleId,
            userId: user.uid,
            ultimaAtualizacao: new Date().toISOString(),
            versaoModulo: 'v1.0',
            blocosConcluidos: progressData.blocosConcluidos || [],
            respostas: progressData.respostas || {},
            tempoTotal: progressData.tempoTotal || 0,
            notasPessoais: progressData.notasPessoais || '',
            favoritos: progressData.favoritos || [],
            syncedAt: serverTimestamp(),
            versaoCloud: Date.now(),
            deviceInfo: {
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            }
        };
        
        const docRef = doc(window.firebaseAuth.db, 'users', user.uid, 'trilhaProgress', moduleId);
        await setDoc(docRef, progressRecord);
        
        console.log(`Trilha progress synced to cloud for module: ${moduleId}`);
        return progressRecord;
    } catch (error) {
        console.error('Error saving trilha progress to cloud:', error);
        throw error;
    }
}

/**
 * Load trilha progress from Firestore
 */
export async function loadTrilhaProgressCloud(moduleId) {
    if (!isFirestoreAvailable()) {
        return null;
    }
    
    try {
        const user = window.firebaseAuth.getCurrentUser();
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js?v=1.1');
        
        const docRef = doc(window.firebaseAuth.db, 'users', user.uid, 'trilhaProgress', moduleId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log(`Trilha progress loaded from cloud for module: ${moduleId}`);
            return data;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error loading trilha progress from cloud:', error);
        return null;
    }
}

/**
 * Get all trilha progress from Firestore
 */
export async function getAllTrilhaProgressCloud() {
    if (!isFirestoreAvailable()) {
        return [];
    }
    
    try {
        const user = window.firebaseAuth.getCurrentUser();
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js?v=1.1');
        
        const collectionRef = collection(window.firebaseAuth.db, 'users', user.uid, 'trilhaProgress');
        const querySnapshot = await getDocs(collectionRef);
        
        const progressList = [];
        querySnapshot.forEach((doc) => {
            progressList.push(doc.data());
        });
        
        console.log(`Loaded ${progressList.length} trilha progress records from cloud`);
        return progressList;
    } catch (error) {
        console.error('Error getting all trilha progress from cloud:', error);
        return [];
    }
}

/**
 * Delete trilha progress from Firestore (async)
 */
export async function deleteTrilhaProgressCloud(moduleId) {
    if (!isFirestoreAvailable()) {
        return null;
    }
    
    // Add to async queue
    addToSyncQueue('delete', { moduleId });
    return { queued: true, moduleId };
}

/**
 * Direct delete from Firestore (used by queue processor)
 */
async function deleteTrilhaProgressCloudDirect(moduleId) {
    try {
        const user = window.firebaseAuth.getCurrentUser();
        const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js?v=1.1');
        
        const docRef = doc(window.firebaseAuth.db, 'users', user.uid, 'trilhaProgress', moduleId);
        await deleteDoc(docRef);
        
        console.log(`Trilha progress deleted from cloud for module: ${moduleId}`);
    } catch (error) {
        console.error('Error deleting trilha progress from cloud:', error);
        throw error;
    }
}

/**
 * Batch sync multiple progress records to Firestore
 */
export async function batchSyncTrilhaProgressCloud(progressRecords) {
    if (!isFirestoreAvailable() || !progressRecords.length) {
        return { success: 0, failed: 0, errors: [] };
    }
    
    const results = { success: 0, failed: 0, errors: [] };
    
    // Process in batches to avoid overwhelming Firestore
    const batchSize = 5;
    for (let i = 0; i < progressRecords.length; i += batchSize) {
        const batch = progressRecords.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (progress) => {
            try {
                await saveTrilhaProgressCloudDirect(progress.modulo_id, progress);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    moduleId: progress.modulo_id,
                    error: error.message
                });
            }
        }));
        
        // Small delay between batches
        if (i + batchSize < progressRecords.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    console.log(`Batch sync completed: ${results.success} success, ${results.failed} failed`);
    return results;
}

/**
 * Backup all user data to cloud (async)
 */
export async function backupUserDataCloud(userData) {
    if (!isFirestoreAvailable()) {
        return null;
    }
    
    addToSyncQueue('backup', { userData });
    return { queued: true, userId: userData.userId };
}

/**
 * Direct backup to cloud (used by queue processor)
 */
async function backupUserDataCloudDirect(userData) {
    try {
        const user = window.firebaseAuth.getCurrentUser();
        const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js?v=1.1');
        
        const backupRecord = {
            ...userData,
            backedUpAt: serverTimestamp(),
            version: userData.version || 1,
            deviceInfo: {
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            }
        };
        
        const docRef = doc(window.firebaseAuth.db, 'users', user.uid, 'backups', 'userData');
        await setDoc(docRef, backupRecord);
        
        console.log(`User data backup completed for: ${user.uid}`);
    } catch (error) {
        console.error('Error backing up user data:', error);
        throw error;
    }
}

/**
 * Download user data from cloud for premium users
 */
export async function downloadUserDataFromCloud() {
    if (!isFirestoreAvailable()) {
        throw new Error('Cloud access not available');
    }
    
    try {
        const user = window.firebaseAuth.getCurrentUser();
        const { doc, getDoc, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js?v=1.1');
        
        // Get backup data
        const backupRef = doc(window.firebaseAuth.db, 'users', user.uid, 'backups', 'userData');
        const backupSnap = await getDoc(backupRef);
        
        // Get all progress data
        const progressRef = collection(window.firebaseAuth.db, 'users', user.uid, 'trilhaProgress');
        const progressSnap = await getDocs(progressRef);
        
        const progressData = [];
        progressSnap.forEach((doc) => {
            progressData.push(doc.data());
        });
        
        const downloadData = {
            userId: user.uid,
            userData: backupSnap.exists() ? backupSnap.data() : null,
            progressData,
            downloadedAt: new Date().toISOString(),
            version: 5
        };
        
        console.log(`Downloaded user data for: ${user.uid}`);
        return downloadData;
        
    } catch (error) {
        console.error('Error downloading user data from cloud:', error);
        throw error;
    }
}

/**
 * Check if cloud data is newer than local data
 */
export function isCloudDataNewer(localData, cloudData) {
    if (!cloudData) return false;
    if (!localData.ultimaAtualizacao) return true;
    
    const localTime = new Date(localData.ultimaAtualizacao).getTime();
    const cloudTime = new Date(cloudData.ultimaAtualizacao).getTime();
    
    return cloudTime > localTime;
}

/**
 * Merge local and cloud progress data intelligently
 */
export function mergeTrilhaProgressData(localData, cloudData) {
    if (!cloudData) return localData;
    if (!localData) return cloudData;
    
    // Use most recent timestamp as base
    const baseData = isCloudDataNewer(localData, cloudData) ? cloudData : localData;
    const otherData = baseData === cloudData ? localData : cloudData;
    
    // Merge arrays (union of both)
    const mergedBlocosConcluidos = [...new Set([
        ...(baseData.blocosConcluidos || []),
        ...(otherData.blocosConcluidos || [])
    ])];
    
    const mergedFavoritos = [...new Set([
        ...(baseData.favoritos || []),
        ...(otherData.favoritos || [])
    ])];
    
    // Merge responses (prefer more recent)
    const mergedRespostas = {
        ...(otherData.respostas || {}),
        ...(baseData.respostas || {})
    };
    
    return {
        ...baseData,
        blocosConcluidos: mergedBlocosConcluidos,
        favoritos: mergedFavoritos,
        respostas: mergedRespostas,
        tempoTotal: Math.max(baseData.tempoTotal || 0, otherData.tempoTotal || 0),
        notasPessoais: baseData.notasPessoais || otherData.notasPessoais || '',
        ultimaAtualizacao: new Date().toISOString(),
        merged: true,
        syncStatus: 'synced'
    };
}

// Initialize queue processor
if (typeof window !== 'undefined') {
    // Process queue periodically
    setInterval(() => {
        if (syncQueue.size > 0 && !isProcessingQueue) {
            processQueueAsync();
        }
    }, 30000); // Every 30 seconds
    
    // Process queue when coming back online
    window.addEventListener('online', () => {
        if (syncQueue.size > 0) {
            setTimeout(processQueueAsync, 1000);
        }
    });
}