/**
 * Database initialization and core database operations for vocabulary system
 */

import { initDB } from '../indexedDB.js';
import { saveDataWithSync, loadDataWithSync } from './cards-sync.js';

// Database stores
export const STORE_VOCABULARY = 'vocabularyWords';
export const STORE_WORD_LISTS = 'wordLists';
export const STORE_SYSTEM_VOCABULARY = 'systemVocabulary';
export const STORE_USER_PROGRESS = 'wordProgress';

// Vocabulary word status options
export const WordStatus = {
    UNREAD: 'unread',
    READING: 'reading',
    FAMILIAR: 'familiar',
    MEMORIZED: 'memorized'
};

// Word grammatical categories
export const WordCategories = {
    NOUN: 'substantivo',
    VERB: 'verbo',
    ADJECTIVE: 'adjetivo',
    ADVERB: 'advérbio',
    PRONOUN: 'pronome',
    PREPOSITION: 'preposição',
    CONJUNCTION: 'conjunção',
    ARTICLE: 'artigo',
    PARTICLE: 'partícula',
    OTHER: 'outro'
};

/**
 * Check if user should sync to Firebase based on their plan
 */
async function shouldSyncToFirebase() {
    if (typeof window === 'undefined' || !window.firebaseAuth || !window.firebaseAuth.isAuthenticated()) {
        return false;
    }
    
    try {
        // Import plan manager to check if user can sync to cloud
        const { canSyncToCloud } = await import('./plan-manager.js');
        return canSyncToCloud();
    } catch (error) {
        console.warn('Could not check plan permissions:', error);
        return false;
    }
}

// Initialize the vocabulary database stores
export async function initVocabularyDB() {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            resolve(db);
        } catch (error) {
            console.error('Failed to initialize vocabulary database:', error);
            reject(error);
        }
    });
}

/**
 * Sync word progress to Firebase if user is premium
 */
export async function syncWordProgressToFirebase(wordId, progress) {
    try {
        await saveDataWithSync('wordProgress', progress, wordId);
    } catch (error) {
        console.warn(`Failed to sync word progress:`, error);
    }
}

/**
 * Sync word list to Firebase if user is premium
 */
export async function syncWordListToFirebase(listData) {
    try {
        await saveDataWithSync('wordLists', listData, listData.id);
    } catch (error) {
        console.warn(`Failed to sync word list:`, error);
    }
}

/**
 * Load user data from Firebase for premium users
 */
export async function loadUserDataFromFirebase() {
    try {
        const { loadAllUserDataFromCloud } = await import('./cards-sync.js');
        await loadAllUserDataFromCloud();
        console.log('User data loaded from Firebase successfully');
    } catch (error) {
        console.error('Error loading data from Firebase:', error);
    }
}

/**
 * Generic database operation helpers
 */
export function getFromStore(store, key) {
    return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function putInStore(store, data) {
    return new Promise((resolve, reject) => {
        const request = store.put(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function getAllFromStore(store) {
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Legacy sync function for backward compatibility
export async function syncToFirebase(collectionName, data, docId = null) {
    if (collectionName === 'wordProgress') {
        await syncWordProgressToFirebase(docId || data.wordId, data);
    } else if (collectionName === 'wordLists') {
        await syncWordListToFirebase(data);
    }
}