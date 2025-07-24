/**
 * Vocabulary Cards Synchronization System
 * Handles offline/online data sync for vocabulary progress and lists
 */

import { getCurrentUserPlan, canSyncToCloud } from './plan-manager.js';
import { initVocabularyDB } from './vocabulary-db.js';

// Sync configuration
const SYNC_COLLECTIONS = {
    WORD_PROGRESS: 'wordProgress',
    WORD_LISTS: 'wordLists',
    VOCABULARY_WORDS: 'vocabularyWords'
};

// Track online/offline status
let isOnline = navigator.onLine;
let syncQueue = [];

/**
 * Initialize synchronization system
 */
export async function initCardsSyncSystem() {
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial sync if user is premium and online
    if (isOnline && await canSyncToCloud()) {
        await syncAllDataToCloud();
    }
    
    console.log('Cards sync system initialized');
}

/**
 * Handle when user comes back online
 */
async function handleOnline() {
    isOnline = true;
    console.log('Connection restored - syncing data...');
    
    if (await canSyncToCloud()) {
        await processSyncQueue();
        await syncAllDataToCloud();
    }
}

/**
 * Handle when user goes offline
 */
function handleOffline() {
    isOnline = false;
    console.log('Connection lost - will queue sync operations');
}

/**
 * Save data with automatic sync strategy
 */
export async function saveDataWithSync(collection, data, docId = null) {
    try {
        // Always save locally first
        await saveDataLocal(collection, data, docId);
        
        // If premium user and online, sync to cloud
        if (await canSyncToCloud() && isOnline) {
            try {
                await saveDataToCloud(collection, data, docId);
                console.log(`Data synced to cloud: ${collection}`);
            } catch (error) {
                console.warn(`Cloud sync failed, queuing for later: ${error.message}`);
                addToSyncQueue('save', collection, data, docId);
            }
        } else if (await canSyncToCloud() && !isOnline) {
            // Queue for later sync
            addToSyncQueue('save', collection, data, docId);
        }
        
        return data;
    } catch (error) {
        console.error('Error saving data with sync:', error);
        throw error;
    }
}

/**
 * Load data with sync strategy
 */
export async function loadDataWithSync(collection, docId) {
    try {
        // Always load from local first
        let localData = await loadDataLocal(collection, docId);
        
        // If premium user and online, check cloud for newer version
        if (await canSyncToCloud() && isOnline) {
            try {
                const cloudData = await loadDataFromCloud(collection, docId);
                
                if (cloudData && localData) {
                    // Compare timestamps and use most recent
                    const localTime = new Date(localData.updatedAt || localData.createdAt || 0);
                    const cloudTime = new Date(cloudData.updatedAt || cloudData.createdAt || 0);
                    
                    if (cloudTime > localTime) {
                        // Cloud is newer, update local
                        await saveDataLocal(collection, cloudData, docId);
                        localData = cloudData;
                        console.log(`Updated local data from cloud: ${collection}/${docId}`);
                    } else if (localTime > cloudTime) {
                        // Local is newer, update cloud
                        await saveDataToCloud(collection, localData, docId);
                        console.log(`Updated cloud data from local: ${collection}/${docId}`);
                    }
                } else if (cloudData && !localData) {
                    // Only cloud has data
                    await saveDataLocal(collection, cloudData, docId);
                    localData = cloudData;
                } else if (localData && !cloudData) {
                    // Only local has data, sync to cloud
                    await saveDataToCloud(collection, localData, docId);
                }
            } catch (error) {
                console.warn(`Cloud sync check failed: ${error.message}`);
            }
        }
        
        return localData;
    } catch (error) {
        console.error('Error loading data with sync:', error);
        throw error;
    }
}

/**
 * Save data locally to IndexedDB
 */
async function saveDataLocal(collection, data, docId = null) {
    const db = await initVocabularyDB();
    const tx = db.transaction(collection, 'readwrite');
    const store = tx.objectStore(collection);
    
    // Add/update timestamp
    const dataWithTimestamp = {
        ...data,
        updatedAt: new Date().toISOString(),
        syncedAt: null // Mark as not synced yet
    };
    
    return new Promise((resolve, reject) => {
        const request = store.put(dataWithTimestamp);
        request.onsuccess = () => resolve(dataWithTimestamp);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Load data locally from IndexedDB
 */
async function loadDataLocal(collection, docId) {
    const db = await initVocabularyDB();
    const tx = db.transaction(collection, 'readonly');
    const store = tx.objectStore(collection);
    
    return new Promise((resolve, reject) => {
        const request = store.get(docId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Save data to Firebase Cloud
 */
async function saveDataToCloud(collection, data, docId = null) {
    if (!window.firebaseAuth?.isAuthenticated() || !window.firebaseAuth.db) {
        throw new Error('Firebase not available');
    }
    
    const user = window.firebaseAuth.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    // Import Firebase functions
    const { doc, setDoc, collection: firestoreCollection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const docRef = doc(
        window.firebaseAuth.db,
        'users',
        user.uid,
        'vocabulary',
        collection,
        docId || data.id || data.wordId || generateId()
    );
    
    const cloudData = {
        ...data,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
        syncedAt: new Date().toISOString()
    };
    
    await setDoc(docRef, cloudData, { merge: true });
    
    // Update local data to mark as synced
    await markAsSynced(collection, docId || data.id, cloudData.syncedAt);
    
    return cloudData;
}

/**
 * Load data from Firebase Cloud
 */
async function loadDataFromCloud(collection, docId) {
    if (!window.firebaseAuth?.isAuthenticated() || !window.firebaseAuth.db) {
        return null;
    }
    
    const user = window.firebaseAuth.getCurrentUser();
    if (!user) return null;
    
    try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const docRef = doc(
            window.firebaseAuth.db,
            'users',
            user.uid,
            'vocabulary',
            collection,
            docId
        );
        
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
        console.error('Error loading data from cloud:', error);
        return null;
    }
}

/**
 * Mark local data as synced
 */
async function markAsSynced(collection, docId, syncedAt) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(collection, 'readwrite');
        const store = tx.objectStore(collection);
        
        // Get current data
        const current = await new Promise((resolve, reject) => {
            const request = store.get(docId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        if (current) {
            current.syncedAt = syncedAt;
            store.put(current);
        }
    } catch (error) {
        console.warn('Could not mark data as synced:', error);
    }
}

/**
 * Add operation to sync queue
 */
function addToSyncQueue(operation, collection, data, docId) {
    syncQueue.push({
        id: generateId(),
        operation,
        collection,
        data,
        docId,
        timestamp: new Date().toISOString()
    });
    
    console.log(`Added to sync queue: ${operation} ${collection}/${docId}`);
}

/**
 * Process all queued sync operations
 */
async function processSyncQueue() {
    if (syncQueue.length === 0) return;
    
    console.log(`Processing ${syncQueue.length} queued sync operations...`);
    
    const processedQueue = [];
    
    for (const item of syncQueue) {
        try {
            if (item.operation === 'save') {
                await saveDataToCloud(item.collection, item.data, item.docId);
            }
            processedQueue.push(item.id);
            console.log(`Processed sync: ${item.collection}/${item.docId}`);
        } catch (error) {
            console.error(`Failed to process sync item: ${error.message}`);
        }
    }
    
    // Remove processed items from queue
    syncQueue = syncQueue.filter(item => !processedQueue.includes(item.id));
}

/**
 * Sync all local data to cloud (initial sync)
 */
async function syncAllDataToCloud() {
    if (!await canSyncToCloud()) return;
    
    try {
        console.log('Starting full data sync to cloud...');
        
        const db = await initVocabularyDB();
        
        // Sync word progress
        await syncCollectionToCloud(db, SYNC_COLLECTIONS.WORD_PROGRESS);
        
        // Sync word lists
        await syncCollectionToCloud(db, SYNC_COLLECTIONS.WORD_LISTS);
        
        // Sync custom vocabulary words
        await syncCollectionToCloud(db, SYNC_COLLECTIONS.VOCABULARY_WORDS);
        
        console.log('Full sync completed');
    } catch (error) {
        console.error('Error during full sync:', error);
    }
}

/**
 * Sync specific collection to cloud
 */
async function syncCollectionToCloud(db, collectionName) {
    try {
        const tx = db.transaction(collectionName, 'readonly');
        const store = tx.objectStore(collectionName);
        
        const allData = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        for (const item of allData) {
            // Only sync if not already synced or if updated after last sync
            if (!item.syncedAt || (item.updatedAt && item.updatedAt > item.syncedAt)) {
                try {
                    await saveDataToCloud(collectionName, item, item.id || item.wordId);
                } catch (error) {
                    console.warn(`Failed to sync item ${item.id}:`, error);
                }
            }
        }
        
        console.log(`Synced ${allData.length} items from ${collectionName}`);
    } catch (error) {
        console.error(`Error syncing collection ${collectionName}:`, error);
    }
}

/**
 * Load all user data from cloud (for first login)
 */
export async function loadAllUserDataFromCloud() {
    if (!await canSyncToCloud() || !isOnline) return;
    
    try {
        console.log('Loading all user data from cloud...');
        
        // Load each collection
        await loadCollectionFromCloud(SYNC_COLLECTIONS.WORD_PROGRESS);
        await loadCollectionFromCloud(SYNC_COLLECTIONS.WORD_LISTS);
        await loadCollectionFromCloud(SYNC_COLLECTIONS.VOCABULARY_WORDS);
        
        console.log('All user data loaded from cloud');
    } catch (error) {
        console.error('Error loading user data from cloud:', error);
    }
}

/**
 * Load collection from cloud
 */
async function loadCollectionFromCloud(collectionName) {
    if (!window.firebaseAuth?.isAuthenticated()) return;
    
    const user = window.firebaseAuth.getCurrentUser();
    if (!user) return;
    
    try {
        const { collection, getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const collectionRef = collection(
            window.firebaseAuth.db,
            'users',
            user.uid,
            'vocabulary',
            collectionName
        );
        
        const querySnapshot = await getDocs(collectionRef);
        
        if (!querySnapshot.empty) {
            const db = await initVocabularyDB();
            const tx = db.transaction(collectionName, 'readwrite');
            const store = tx.objectStore(collectionName);
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                store.put(data);
            });
            
            console.log(`Loaded ${querySnapshot.size} items for ${collectionName}`);
        }
    } catch (error) {
        console.error(`Error loading collection ${collectionName}:`, error);
    }
}

/**
 * Generate unique ID
 */
function generateId() {
    return 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Get sync status for debugging
 */
export function getSyncStatus() {
    return {
        isOnline,
        queuedOperations: syncQueue.length,
        canSync: canSyncToCloud()
    };
}

// Initialize when module loads
if (typeof window !== 'undefined') {
    // Auto-initialize when Firebase auth is ready
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(async () => {
            if (window.firebaseAuth) {
                await initCardsSyncSystem();
            }
        }, 1000);
    });
}