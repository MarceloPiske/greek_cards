/**
 * Word Progress Manager - Handles word learning progress
 */

import { initDB } from '../indexedDB.js';

const DB_NAME = 'koineAppDB';
const STORE_USER_PROGRESS = 'wordProgress';

// Progress status constants
export const PROGRESS_STATUS = {
    NEW: 'new',
    LEARNING: 'learning',
    FAMILIAR: 'familiar',
    MEMORIZED: 'memorized',
    MASTERED: 'mastered'
};

/**
 * Check if user can sync to cloud
 */
async function shouldSyncToCloud() {
    if (typeof window === 'undefined' || !window.firebaseAuth || !window.firebaseAuth.isAuthenticated()) {
        return false;
    }
    
    try {
        const { canSyncToCloud } = await import('../plan-manager.js');
        return canSyncToCloud();
    } catch (error) {
        console.warn('Could not check plan permissions:', error);
        return false;
    }
}

/**
 * Sync word progress to Firebase
 */
async function syncWordProgressToCloud(progressData) {
    if (!(await shouldSyncToCloud())) return;
    
    try {
        const user = window.firebaseAuth.getCurrentUser();
        if (!user || !window.firebaseAuth.db) return;
        
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const docRef = doc(window.firebaseAuth.db, 'users', user.uid, 'wordProgress', progressData.wordId);
        await setDoc(docRef, {
            ...progressData,
            syncedAt: new Date().toISOString()
        });
        
        console.log(`Word progress synced to cloud: ${progressData.wordId}`);
    } catch (error) {
        console.warn('Failed to sync word progress to cloud:', error);
    }
}

/**
 * Load word progress from Firebase
 */
async function loadWordProgressFromCloud() {
    if (!(await shouldSyncToCloud())) return [];
    
    try {
        const user = window.firebaseAuth.getCurrentUser();
        if (!user || !window.firebaseAuth.db) return [];
        
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const querySnapshot = await getDocs(collection(window.firebaseAuth.db, 'users', user.uid, 'wordProgress'));
        const cloudProgress = [];
        
        querySnapshot.forEach((doc) => {
            cloudProgress.push(doc.data());
        });
        
        return cloudProgress;
    } catch (error) {
        console.warn('Failed to load word progress from cloud:', error);
        return [];
    }
}

/**
 * Sync word progress between local and cloud
 */
async function syncWordProgress() {
    if (!(await shouldSyncToCloud())) return;
    
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_USER_PROGRESS, 'readwrite');
        const store = tx.objectStore(STORE_USER_PROGRESS);
        
        // Get local progress
        const localProgress = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        // Get cloud progress
        const cloudProgress = await loadWordProgressFromCloud();
        
        // Sync logic: merge based on updatedAt timestamp
        const mergedProgress = new Map();
        
        // Add local progress
        localProgress.forEach(progress => {
            if (progress.userId === window.firebaseAuth.getCurrentUser()?.uid) {
                mergedProgress.set(progress.wordId, progress);
            }
        });
        
        // Merge with cloud progress (cloud takes precedence if newer)
        cloudProgress.forEach(cloudProg => {
            const localProg = mergedProgress.get(cloudProg.wordId);
            if (!localProg || new Date(cloudProg.updatedAt) > new Date(localProg.updatedAt)) {
                mergedProgress.set(cloudProg.wordId, cloudProg);
            }
        });
        
        // Update local storage with merged data
        for (const [wordId, progress] of mergedProgress) {
            const localProg = localProgress.find(p => p.wordId === wordId);
            if (!localProg || new Date(progress.updatedAt) > new Date(localProg.updatedAt)) {
                await new Promise((resolve, reject) => {
                    const request = store.put(progress);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }
        }
        
        // Sync any newer local progress to cloud
        for (const localProg of localProgress) {
            if (localProg.userId === window.firebaseAuth.getCurrentUser()?.uid) {
                const cloudProg = cloudProgress.find(p => p.wordId === localProg.wordId);
                if (!cloudProg || new Date(localProg.updatedAt) > new Date(cloudProg.updatedAt)) {
                    await syncWordProgressToCloud(localProg);
                }
            }
        }
        
        console.log('Word progress synchronized');
    } catch (error) {
        console.error('Error syncing word progress:', error);
    }
}

/**
 * Get progress for a specific word
 */
export async function getWordProgress(wordId) {
    try {
        // Sync with cloud if user has cloud plan
        if (await shouldSyncToCloud()) {
            await syncWordProgress();
        }
        
        const db = await initDB();
        const tx = db.transaction(STORE_USER_PROGRESS, 'readonly');
        const store = tx.objectStore(STORE_USER_PROGRESS);
        
        return new Promise((resolve, reject) => {
            const request = store.get(wordId);
            
            request.onsuccess = () => {
                const progress = request.result;
                if (progress) {
                    resolve(progress);
                } else {
                    // Return default progress for new words
                    resolve({
                        id: wordId,
                        wordId: wordId,
                        status: PROGRESS_STATUS.NEW,
                        reviewCount: 0,
                        correctCount: 0,
                        incorrectCount: 0,
                        lastReviewed: null,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        userId: window.firebaseAuth?.getCurrentUser()?.uid || null
                    });
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting word progress:', error);
        return null;
    }
}

/**
 * Update word progress based on performance
 */
export async function updateWordProgress(wordId, isCorrect, timeSpent = 0) {
    try {
        const currentProgress = await getWordProgress(wordId);
        if (!currentProgress) return null;
        
        const db = await initDB();
        const tx = db.transaction(STORE_USER_PROGRESS, 'readwrite');
        const store = tx.objectStore(STORE_USER_PROGRESS);
        
        // Update progress data
        const updatedProgress = {
            ...currentProgress,
            reviewCount: currentProgress.reviewCount + 1,
            correctCount: isCorrect ? currentProgress.correctCount + 1 : currentProgress.correctCount,
            incorrectCount: isCorrect ? currentProgress.incorrectCount : currentProgress.incorrectCount + 1,
            lastReviewed: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: calculateNewStatus(currentProgress, isCorrect),
            userId: window.firebaseAuth?.getCurrentUser()?.uid || null
        };
        
        // Add time spent if provided
        if (timeSpent > 0) {
            updatedProgress.totalTimeSpent = (currentProgress.totalTimeSpent || 0) + timeSpent;
        }
        
        return new Promise((resolve, reject) => {
            const request = store.put(updatedProgress);
            
            request.onsuccess = async () => {
                console.log(`Word progress updated for ${wordId}: ${updatedProgress.status}`);
                
                // Sync to cloud if user has cloud plan
                if (await shouldSyncToCloud()) {
                    await syncWordProgressToCloud(updatedProgress);
                }
                
                resolve(updatedProgress);
            };
            
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error updating word progress:', error);
        throw error;
    }
}

/**
 * Calculate new status based on performance - Updated requirements
 */
function calculateNewStatus(currentProgress, isCorrect) {
    const { status, reviewCount, correctCount, incorrectCount } = currentProgress;
    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;
    const newIncorrectCount = isCorrect ? incorrectCount : incorrectCount + 1;
    const newReviewCount = reviewCount + 1;
    
    // New requirements: 5 correct = memorized, 3 correct = familiar, 1 seen = learning
    if (newCorrectCount >= 5) {
        return PROGRESS_STATUS.MEMORIZED;
    } else if (newCorrectCount >= 3) {
        return PROGRESS_STATUS.FAMILIAR;
    } else if (newReviewCount >= 1) {
        return PROGRESS_STATUS.LEARNING;
    } else {
        return PROGRESS_STATUS.NEW;
    }
}

/**
 * Get progress for multiple words
 */
export async function getWordsProgress(wordIds) {
    try {
        const progressMap = new Map();
        
        for (const wordId of wordIds) {
            const progress = await getWordProgress(wordId);
            if (progress) {
                progressMap.set(wordId, progress);
            }
        }
        
        return progressMap;
    } catch (error) {
        console.error('Error getting words progress:', error);
        return new Map();
    }
}

/**
 * Get progress statistics for a word list
 */
export async function getListProgressStats(wordIds) {
    try {
        const progressMap = await getWordsProgress(wordIds);
        const stats = {
            total: wordIds.length,
            new: 0,
            learning: 0,
            familiar: 0,
            memorized: 0,
            mastered: 0
        };
        
        wordIds.forEach(wordId => {
            const progress = progressMap.get(wordId);
            const status = progress ? progress.status : PROGRESS_STATUS.NEW;
            stats[status]++;
        });
        
        return stats;
    } catch (error) {
        console.error('Error getting list progress stats:', error);
        return null;
    }
}

/**
 * Get progress status display info
 */
export function getStatusDisplayInfo(status) {
    const statusInfo = {
        [PROGRESS_STATUS.NEW]: {
            label: 'Novo',
            color: '#gray',
            icon: 'fiber_new',
            description: 'Ainda não estudada'
        },
        [PROGRESS_STATUS.LEARNING]: {
            label: 'Aprendendo',
            color: '#ff9800',
            icon: 'school',
            description: 'Em processo de aprendizado'
        },
        [PROGRESS_STATUS.FAMILIAR]: {
            label: 'Familiar',
            color: '#2196f3',
            icon: 'visibility',
            description: 'Já conhece, mas precisa praticar'
        },
        [PROGRESS_STATUS.MEMORIZED]: {
            label: 'Memorizada',
            color: '#4caf50',
            icon: 'check_circle',
            description: 'Bem memorizada'
        },
        [PROGRESS_STATUS.MASTERED]: {
            label: 'Dominada',
            color: '#9c27b0',
            icon: 'stars',
            description: 'Completamente dominada'
        }
    };
    
    return statusInfo[status] || statusInfo[PROGRESS_STATUS.NEW];
}