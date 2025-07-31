/**
 * Firestore Module for Trilha Progress Management
 * Handles cloud storage of trilha progress data
 */

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
 * Save trilha progress to Firestore
 */
export async function saveTrilhaProgressCloud(moduleId, progressData) {
    if (!isFirestoreAvailable()) {
        throw new Error('Firestore not available or user not authenticated');
    }
    
    try {
        const user = window.firebaseAuth.getCurrentUser();
        const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const progressRecord = {
            modulo_id: moduleId,
            ultimaAtualizacao: new Date().toISOString(),
            versaoModulo: 'v1.0',
            blocosConcluidos: progressData.blocosConcluidos || [],
            respostas: progressData.respostas || {},
            tempoTotal: progressData.tempoTotal || 0,
            notasPessoais: progressData.notasPessoais || '',
            favoritos: progressData.favoritos || [],
            syncedAt: serverTimestamp(),
            versaoCloud: Date.now()
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
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
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
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
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
 * Delete trilha progress from Firestore
 */
export async function deleteTrilhaProgressCloud(moduleId) {
    if (!isFirestoreAvailable()) {
        throw new Error('Firestore not available or user not authenticated');
    }
    
    try {
        const user = window.firebaseAuth.getCurrentUser();
        const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
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
    
    for (const progress of progressRecords) {
        try {
            await saveTrilhaProgressCloud(progress.modulo_id, progress);
            results.success++;
        } catch (error) {
            results.failed++;
            results.errors.push({
                moduleId: progress.modulo_id,
                error: error.message
            });
        }
    }
    
    console.log(`Batch sync completed: ${results.success} success, ${results.failed} failed`);
    return results;
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
        merged: true
    };
}