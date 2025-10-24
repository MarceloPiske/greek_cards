/**
 * Word List Manager - Handles word list operations
 */

<<<<<<< HEAD
import { initDB } from '../indexedDB.js?v=1.1';
=======
import { initDB } from '../indexedDB.js';
>>>>>>> 485a7111651673321d36bac1405974bd151865fc

const DB_NAME = 'koineAppDB';
const STORE_WORD_LISTS = 'wordLists';
const STORE_SYSTEM_VOCABULARY = 'systemVocabulary';

/**
 * Check if user can sync to cloud
 */
async function shouldSyncToCloud() {
    if (typeof window === 'undefined' || !window.firebaseAuth || !window.firebaseAuth.isAuthenticated()) {
        return false;
    }
    
    try {
<<<<<<< HEAD
        const { canSyncToCloud } = await import('../plan-manager.js?v=1.1');
=======
        const { canSyncToCloud } = await import('../plan-manager.js');
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
        return canSyncToCloud();
    } catch (error) {
        console.warn('Could not check plan permissions:', error);
        return false;
    }
}

/**
 * Sync word list to Firebase
 */
async function syncWordListToCloud(wordList) {
    if (!(await shouldSyncToCloud())) return;
    
    try {
        const user = window.firebaseAuth.getCurrentUser();
        if (!user || !window.firebaseAuth.db) return;
        
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const docRef = doc(window.firebaseAuth.db, 'users', user.uid, 'wordLists', wordList.id);
        await setDoc(docRef, {
            ...wordList,
            syncedAt: new Date().toISOString()
        });
        
        console.log(`Word list synced to cloud: ${wordList.id}`);
    } catch (error) {
        console.warn('Failed to sync word list to cloud:', error);
    }
}

/**
 * Load word lists from Firebase
 */
async function loadWordListsFromCloud() {
    if (!(await shouldSyncToCloud())) return [];
    
    try {
        const user = window.firebaseAuth.getCurrentUser();
        if (!user || !window.firebaseAuth.db) return [];
        
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const querySnapshot = await getDocs(collection(window.firebaseAuth.db, 'users', user.uid, 'wordLists'));
        const cloudLists = [];
        
        querySnapshot.forEach((doc) => {
            cloudLists.push(doc.data());
        });
        
        return cloudLists;
    } catch (error) {
        console.warn('Failed to load word lists from cloud:', error);
        return [];
    }
}

/**
 * Sync word lists between local and cloud
 */
async function syncWordLists() {
    if (!(await shouldSyncToCloud())) return;
    
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readwrite');
        const store = tx.objectStore(STORE_WORD_LISTS);
        
        // Get local lists
        const localLists = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        // Get cloud lists
        const cloudLists = await loadWordListsFromCloud();
        
        // Sync logic: merge based on updatedAt timestamp
        const mergedLists = new Map();
        
        // Add local lists
        localLists.forEach(list => {
            if (list.userId === window.firebaseAuth.getCurrentUser()?.uid) {
                mergedLists.set(list.id, list);
            }
        });
        
        // Merge with cloud lists (cloud takes precedence if newer)
        cloudLists.forEach(cloudList => {
            const localList = mergedLists.get(cloudList.id);
            if (!localList || new Date(cloudList.updatedAt) > new Date(localList.updatedAt)) {
                mergedLists.set(cloudList.id, cloudList);
            }
        });
        
        // Update local storage with merged data
        for (const [id, list] of mergedLists) {
            const localList = localLists.find(l => l.id === id);
            if (!localList || new Date(list.updatedAt) > new Date(localList.updatedAt)) {
                await new Promise((resolve, reject) => {
                    const request = store.put(list);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }
        }
        
        // Sync any newer local lists to cloud
        for (const localList of localLists) {
            if (localList.userId === window.firebaseAuth.getCurrentUser()?.uid) {
                const cloudList = cloudLists.find(l => l.id === localList.id);
                if (!cloudList || new Date(localList.updatedAt) > new Date(cloudList.updatedAt)) {
                    await syncWordListToCloud(localList);
                }
            }
        }
        
        console.log('Word lists synchronized');
    } catch (error) {
        console.error('Error syncing word lists:', error);
    }
}

/**
 * Get all word lists for current user
 */
export async function getUserWordLists() {
    try {
        // Sync with cloud if user has cloud plan
        if (await shouldSyncToCloud()) {
            await syncWordLists();
        }
        
        const db = await initDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readonly');
        const store = tx.objectStore(STORE_WORD_LISTS);
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            
            request.onsuccess = () => {
                const wordLists = request.result;
                
                // Filter by current user if logged in
                const currentUser = window.firebaseAuth?.getCurrentUser();
                if (currentUser) {
                    const userLists = wordLists.filter(list => list.userId === currentUser.uid);
                    resolve(userLists);
                } else {
                    // For free users, show lists without userId or with null userId
                    const freeLists = wordLists.filter(list => !list.userId || list.userId === null);
                    resolve(freeLists);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting user word lists:', error);
        return [];
    }
}

/**
 * Get words from a specific list
 */
export async function getWordsFromList(listId) {
    try {
        console.log('Getting words from list:', listId);
        const db = await initDB();
        
        // Get the word list
        const listTx = db.transaction(STORE_WORD_LISTS, 'readonly');
        const listStore = listTx.objectStore(STORE_WORD_LISTS);
        
        return new Promise((resolve, reject) => {
            const listRequest = listStore.get(listId);
            
            listRequest.onsuccess = async () => {
                const wordList = listRequest.result;
                console.log('Retrieved word list:', wordList);
                
                if (!wordList || !wordList.wordIds || wordList.wordIds.length === 0) {
                    console.warn('Word list not found or empty:', listId);
                    resolve([]);
                    return;
                }
                
                // Get the actual words from system vocabulary
                const vocabTx = db.transaction(STORE_SYSTEM_VOCABULARY, 'readonly');
                const vocabStore = vocabTx.objectStore(STORE_SYSTEM_VOCABULARY);
                const words = [];
                
                let completedRequests = 0;
                const totalRequests = wordList.wordIds.length;
                
                if (totalRequests === 0) {
                    resolve([]);
                    return;
                }
                
                wordList.wordIds.forEach(wordId => {
                    // Handle different ID formats: 'g10', 'g1021', etc.
                    let lookupId = wordId;
                    
                    // If wordId is a string starting with 'g', extract numeric part
                    if (typeof wordId === 'string' && wordId.startsWith('g')) {
                        const numericPart = wordId.replace('g', '');
                        if (!isNaN(parseInt(numericPart))) {
                            lookupId = wordId; // Keep as string with 'g' prefix
                        } else {
                            console.warn('Invalid wordId format:', wordId);
                            completedRequests++;
                            if (completedRequests === totalRequests) {
                                console.log('Final words array:', words);
                                resolve(words);
                            }
                            return;
                        }
                    } else if (typeof wordId === 'number') {
                        // Convert number to string format expected by systemVocabulary
                        lookupId = `g${wordId}`;
                    } else if (typeof wordId === 'string' && !isNaN(parseInt(wordId))) {
                        // Convert numeric string to proper format
                        lookupId = `g${wordId}`;
                    } else {
                        console.warn('Invalid wordId format:', wordId);
                        completedRequests++;
                        if (completedRequests === totalRequests) {
                            console.log('Final words array:', words);
                            resolve(words);
                        }
                        return;
                    }
                    
                    console.log('Looking up word with ID:', lookupId);
                    const wordRequest = vocabStore.get(lookupId);
                    
                    wordRequest.onsuccess = () => {
                        const word = wordRequest.result;
                        console.log('Retrieved word from vocabulary:', word);
                        
                        if (word && word.LEXICAL_FORM && word.DEFINITION) {
                            // Extract numeric ID for internal use
                            let numericId = lookupId;
                            if (typeof lookupId === 'string' && lookupId.startsWith('g')) {
                                numericId = parseInt(lookupId.replace('g', ''));
                            }
                            
                            words.push({
                                id: numericId,
                                originalId: wordId, // Keep original ID for reference
                                greek: word.LEXICAL_FORM,
                                portuguese: word.DEFINITION.split(',')[0].trim(),
                                transliteration: word.TRANSLITERATED_LEXICAL_FORM || '',
                                partOfSpeech: word.PART_OF_SPEECH || '',
                                phonetic: word.PHONETIC_SPELLING || '',
                                origin: word.ORIGIN || '',
                                usage: word.USAGE || ''
                            });
                            console.log('Added word:', word.LEXICAL_FORM, '→', word.DEFINITION.split(',')[0].trim());
                        } else {
                            console.warn('Incomplete word data for ID:', lookupId, word);
                        }
                        
                        completedRequests++;
                        if (completedRequests === totalRequests) {
                            console.log('Final words array length:', words.length);
                            resolve(words);
                        }
                    };
                    
                    wordRequest.onerror = (error) => {
                        console.warn(`Failed to load word with ID: ${lookupId}`, error);
                        completedRequests++;
                        if (completedRequests === totalRequests) {
                            console.log('Final words array:', words);
                            resolve(words);
                        }
                    };
                });
            };
            
            listRequest.onerror = () => {
                console.error('Failed to get word list:', listRequest.error);
                reject(listRequest.error);
            };
        });
    } catch (error) {
        console.error('Error getting words from list:', error);
        return [];
    }
}

/**
 * Create a default word list if none exists
 */
export async function createDefaultWordList() {
    try {
        console.log('Creating default word list...');
        const db = await initDB();
        const tx = db.transaction([STORE_WORD_LISTS, STORE_SYSTEM_VOCABULARY], 'readwrite');
        const listStore = tx.objectStore(STORE_WORD_LISTS);
        const vocabStore = tx.objectStore(STORE_SYSTEM_VOCABULARY);
        
        // Get first 20 words from system vocabulary
        return new Promise((resolve, reject) => {
            const vocabRequest = vocabStore.getAll();
            
            vocabRequest.onsuccess = async () => {
                const vocabulary = vocabRequest.result;
                console.log('Available vocabulary:', vocabulary.length);
                
                if (vocabulary.length === 0) {
                    console.error('No vocabulary available in database');
                    reject(new Error('No vocabulary available'));
                    return;
                }
                
                // Filter words that have both Greek and Portuguese
                const validWords = vocabulary.filter(word => 
                    word.LEXICAL_FORM && 
                    word.DEFINITION && 
                    word.DEFINITION.trim().length > 0 &&
                    word.ID // Make sure ID exists
                ).slice(0, 20);
                
                console.log('Valid words for default list:', validWords.length);
                
                if (validWords.length < 5) {
                    console.error('Not enough valid words for default list');
                    reject(new Error('Not enough valid vocabulary'));
                    return;
                }
                
                const defaultList = {
                    id: `list_default_${Date.now()}`,
                    name: 'Lista Padrão',
                    description: 'Lista padrão para praticar vocabulário básico',
                    wordIds: validWords.map(word => word.ID), // Keep original ID format (e.g., 'g10')
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    userId: window.firebaseAuth?.getCurrentUser()?.uid || null
                };
                
                console.log('Creating default list with word IDs:', defaultList.wordIds);
                
                const listRequest = listStore.put(defaultList);
                
                listRequest.onsuccess = async () => {
                    console.log('Default word list created successfully');
                    
                    // Sync to cloud if user has cloud plan
                    if (await shouldSyncToCloud()) {
                        await syncWordListToCloud(defaultList);
                    }
                    
                    resolve(defaultList);
                };
                
                listRequest.onerror = () => {
                    console.error('Failed to save default list:', listRequest.error);
                    reject(listRequest.error);
                };
            };
            
            vocabRequest.onerror = () => {
                console.error('Failed to load vocabulary:', vocabRequest.error);
                reject(vocabRequest.error);
            };
        });
    } catch (error) {
        console.error('Error creating default word list:', error);
        throw error;
    }
}

/**
 * Get word list by ID
 */
export async function getWordListById(listId) {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readonly');
        const store = tx.objectStore(STORE_WORD_LISTS);
        
        return new Promise((resolve, reject) => {
            const request = store.get(listId);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting word list by ID:', error);
        return null;
    }
}