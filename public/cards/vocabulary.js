/**
 * Vocabulary cards management system
 * Allows users to create personalized word lists, track progress,
 * and filter words by grammatical categories
 */

import { initDB } from '../indexedDB.js';
import { showToast } from '../src/js/utils/toast.js';

// Database stores
const STORE_VOCABULARY = 'vocabularyWords';
const STORE_WORD_LISTS = 'wordLists';
const STORE_SYSTEM_VOCABULARY = 'systemVocabulary';
const STORE_USER_PROGRESS = 'wordProgress';

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

// Initialize the vocabulary database stores
export async function initVocabularyDB() {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();

            // Create necessary stores if they don't exist
            if (!db.objectStoreNames.contains(STORE_VOCABULARY)) {
                db.createObjectStore(STORE_VOCABULARY, { keyPath: 'id' });
            }

            if (!db.objectStoreNames.contains(STORE_WORD_LISTS)) {
                db.createObjectStore(STORE_WORD_LISTS, { keyPath: 'id' });
            }

            if (!db.objectStoreNames.contains(STORE_SYSTEM_VOCABULARY)) {
                db.createObjectStore(STORE_SYSTEM_VOCABULARY, { keyPath: 'ID' });
            }

            if (!db.objectStoreNames.contains(STORE_USER_PROGRESS)) {
                db.createObjectStore(STORE_USER_PROGRESS, { keyPath: 'wordId' });
            }

            resolve(db);
        } catch (error) {
            console.error('Failed to initialize vocabulary database:', error);
            reject(error);
        }
    });
}

/**
 * Add a new vocabulary word to the database
 */
export async function addVocabularyWord(word) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_VOCABULARY, 'readwrite');
        const store = tx.objectStore(STORE_VOCABULARY);

        // Generate a unique ID if not provided
        if (!word.id) {
            word.id = 'word_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        }

        // Add created date
        word.createdAt = new Date().toISOString();

        await store.put(word);
        
        // Initialize word progress
        await updateWordProgress(word.ID, {
            status: WordStatus.UNREAD,
            lastReviewed: null,
            reviewCount: 0
        });

        return word;
    } catch (error) {
        console.error('Error adding vocabulary word:', error);
        throw error;
    }
}

/**
 * Create a new word list
 */
export async function createWordList(list) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readwrite');
        const store = tx.objectStore(STORE_WORD_LISTS);

        // Generate a unique ID if not provided
        if (!list.id) {
            list.id = 'list_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        }

        // Set initial properties
        list.createdAt = new Date().toISOString();
        list.wordIds = list.wordIds || [];

        await store.put(list);
        return list;
    } catch (error) {
        console.error('Error creating word list:', error);
        throw error;
    }
}

/**
 * Add words to a word list
 */
export async function addWordsToList(listId, wordIds) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readwrite');
        const store = tx.objectStore(STORE_WORD_LISTS);

        // Get the current list
        // Promisify the request
        const list = await new Promise((resolve, reject) => {
            const request = store.get(listId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        if (!list) {
            throw new Error('List not found');
        }

        // Add words that aren't already in the list
        const uniqueWords = [...new Set([...list.wordIds, ...wordIds])];
        list.wordIds = uniqueWords;
        list.updatedAt = new Date().toISOString();

        await store.put(list);
        return list;
    } catch (error) {
        console.error('Error adding words to list:', error);
        throw error;
    }
}

/**
 * Remove words from a word list
 */
export async function removeWordsFromList(listId, wordIds) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readwrite');
        const store = tx.objectStore(STORE_WORD_LISTS);

        // Get the current list
        const list = await new Promise((resolve, reject) => {
            const request = store.get(listId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        if (!list) {
            throw new Error('List not found');
        }
        
        // Remove specified words
        list.wordIds = list.wordIds.filter(id => !wordIds.includes(id));
        list.updatedAt = new Date().toISOString();

        await store.put(list);
        return list;
    } catch (error) {
        console.error('Error removing words from list:', error);
        throw error;
    }
}

/**
 * Get all word lists
 */
export async function getAllWordLists() {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_WORD_LISTS, 'readonly');
        const store = tx.objectStore(STORE_WORD_LISTS);

        return new Promise((resolve, reject) => {
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error getting word lists:', error);
        throw error;
    }
}

/**
 * Get a specific word list with its words
 */
export async function getWordListWithWords(listId) {
    try {
        let db = await initVocabularyDB();
        let tx = db.transaction(STORE_WORD_LISTS, 'readonly');
        let store = tx.objectStore(STORE_WORD_LISTS);

        // Get the list
        // Promisify the request
        const list = await new Promise((resolve, reject) => {
            const request = store.get(listId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (!list) {
            throw new Error('List not found');
        }
        // Get all words in the list
        

        const words = [];
        for (const wordId of list.wordIds) {
            let dbw = await initVocabularyDB();
            let txw = dbw.transaction(STORE_SYSTEM_VOCABULARY, 'readonly');
            let storew = txw.objectStore(STORE_SYSTEM_VOCABULARY);
        
            const word = await new Promise((resolve, reject) => {
                const request = storew.get(wordId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            if (word) {
                // Get the word progress
                const progress = await getWordProgress(wordId);
                words.push({
                    ...word,
                    progress
                });
            }
        }

        return {
            ...list,
            words
        };
    } catch (error) {
        console.error('Error getting word list with words:', error);
        throw error;
    }
}

/**
 * Update word progress
 */
export async function updateWordProgress(wordId, progress) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_USER_PROGRESS, 'readwrite');
        const store = tx.objectStore(STORE_USER_PROGRESS);

        // Get current progress if it exists
        
        const currentProgress = await store.get(wordId) || {
            wordId,
            status: WordStatus.UNREAD,
            reviewCount: 0,
            createdAt: new Date().toISOString()
        };
        
        // Update with new values
        const updatedProgress = {
            ...currentProgress,
            ...progress,
            updatedAt: new Date().toISOString()
        };

        // Increment review count if status changed
        if (progress.status && progress.status !== currentProgress.status) {
            
            updatedProgress.reviewCount = (currentProgress.reviewCount || 0) + 1;
            updatedProgress.lastReviewed = new Date().toISOString();
        }
        if (!progress.wordId)
            updatedProgress.wordId = wordId;
        
        await store.put(updatedProgress);
        return updatedProgress;
    } catch (error) {
        console.error('Error updating word progress:', error);
        throw error;
    }
}

/**
 * Get word progress
 */
function getFromStore(store, key) {
    return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getWordProgress(wordId) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_USER_PROGRESS, 'readonly');
        const store = tx.objectStore(STORE_USER_PROGRESS);

        const result = await getFromStore(store, wordId);

        const progress = result || {
            wordId,
            status: WordStatus.UNREAD,
            reviewCount: 0
        };

        return progress;
    } catch (error) {
        console.error('Error getting word progress:', error);
        throw error;
    }
}

/**
 * Add system vocabulary from a module
 */
export async function addSystemVocabulary(moduleId, words) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_SYSTEM_VOCABULARY, 'readwrite');
        const store = tx.objectStore(STORE_SYSTEM_VOCABULARY);

        // Store module vocabulary
        const moduleVocab = {
            id: `module_${moduleId}`,
            moduleId,
            words,
            createdAt: new Date().toISOString()
        };

        await store.put(moduleVocab);

        // Also add each word to the main vocabulary if not exists
        for (const word of words) {
            try {
                await addVocabularyWord({
                    ...word,
                    id: `system_${moduleId}_${word.LEXICAL_FORM}`,
                    source: 'system',
                    moduleId
                });
            } catch (error) {
                console.warn(`Word ${word.LEXICAL_FORM} already exists or could not be added`);
            }
        }

        return moduleVocab;
    } catch (error) {
        console.error('Error adding system vocabulary:', error);
        throw error;
    }
}

/**
 * Get system vocabulary for a module
 */
export async function getModulesVocabulary(moduleId) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_SYSTEM_VOCABULARY, 'readonly');
        const store = tx.objectStore(STORE_SYSTEM_VOCABULARY);

        const moduleVocab = await store.get(`module_${moduleId}`);
        return moduleVocab;
    } catch (error) {
        console.error('Error getting system vocabulary:', error);
        throw error;
    }
}

/**
 * Get all vocabulary words with optional filters
 */
export async function getSystemVocabulary(filters = {}) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_SYSTEM_VOCABULARY, 'readonly');
        const store = tx.objectStore(STORE_SYSTEM_VOCABULARY);

        const {
            category,
            search,
            source,
            moduleId,
            sortByStatus,
            offset = 0,
            limit = 100
        } = filters;

        const results = [];
        let skipped = 0;
        let collected = 0;

        const lowerSearch = search?.toLowerCase();
        const lowerCategory = category?.toLowerCase();

        return new Promise((resolve, reject) => {
            const cursorRequest = store.openCursor();

            cursorRequest.onsuccess = async (event) => {
                const cursor = event.target.result;

                if (!cursor) {
                    // Fim dos dados, continuar com progresso e ordenação
                    const wordsWithProgress = await Promise.all(
                        results.map(async (word) => ({
                            ...word,
                            progress: await getWordProgress(word.ID),
                        }))
                    );

                    if (sortByStatus) {
                        const statusOrder = {
                            [WordStatus.UNREAD]: 0,
                            [WordStatus.READING]: 1,
                            [WordStatus.FAMILIAR]: 2,
                            [WordStatus.MEMORIZED]: 3
                        };

                        wordsWithProgress.sort((a, b) => {
                            return statusOrder[a.progress.status] - statusOrder[b.progress.status];
                        });
                    }

                    return resolve(wordsWithProgress);
                }

                const word = cursor.value;

                // Aplicar filtros diretamente
                if (
                    (!category || word.PART_OF_SPEECH?.toLowerCase().includes(lowerCategory)) &&
                    (!search || (
                        word.LEXICAL_FORM?.toLowerCase().includes(lowerSearch) ||
                        word.TRANSLITERATED_LEXICAL_FORM?.toLowerCase().includes(lowerSearch) ||
                        word.DEFINITION?.toLowerCase().includes(lowerSearch)
                    )) &&
                    (!source || word.source === source) &&
                    (!moduleId || word.moduleId === moduleId)
                ) {
                    if (skipped < offset) {
                        skipped++;
                    } else if (collected < limit) {
                        results.push(word);
                        collected++;
                    } else {
                        // Já atingiu o limite, para a iteração e processa
                        const wordsWithProgress = await Promise.all(
                            results.map(async (word) => ({
                                ...word,
                                progress: await getWordProgress(word.ID),
                            }))
                        );

                        if (sortByStatus) {
                            const statusOrder = {
                                [WordStatus.UNREAD]: 0,
                                [WordStatus.READING]: 1,
                                [WordStatus.FAMILIAR]: 2,
                                [WordStatus.MEMORIZED]: 3
                            };

                            wordsWithProgress.sort((a, b) => {
                                return statusOrder[a.progress.status] - statusOrder[b.progress.status];
                            });
                        }

                        return resolve(wordsWithProgress);
                    }
                }

                cursor.continue();
            };

            cursorRequest.onerror = (event) => {
                reject(event.target.error);
            };
        });

    } catch (error) {
        console.error('Error getting vocabulary words:', error);
        throw error;
    }
}



/**
 * Import vocabulary from Greek lexicon data
 * @param {Array} lexiconData - Array of lexicon entries
 * @returns {Promise<Array>} - Imported word IDs
 */
export async function importGreekLexicon(lexiconData) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_VOCABULARY, 'readwrite');
        const store = tx.objectStore(STORE_VOCABULARY);

        const importedIds = [];

        for (const entry of lexiconData) {
            // Create word object from lexicon data
            const word = {
                id: `lexicon_${entry.ID}`,
                grego: entry.LEXICAL_FORM,
                translit: entry.TRANSLITERATED_LEXICAL_FORM,
                significado: entry.USAGE || entry.DEFINITION,
                categoria: mapPartOfSpeechToCategory(entry.PART_OF_SPEECH),
                fonetica: entry.PHONETIC_SPELLING,
                origem: entry.ORIGIN,
                definicaoCompleta: entry.DEFINITION,
                uso: entry.USAGE,
                source: 'lexicon',
                createdAt: new Date().toISOString()
            };

            // Add to database
            await store.put(word);
            importedIds.push(word.id);

            // Initialize word progress
            await updateWordProgress(word.id, {
                status: WordStatus.UNREAD,
                lastReviewed: null,
                reviewCount: 0
            });
        }

        return importedIds;
    } catch (error) {
        console.error('Error importing Greek lexicon:', error);
        throw error;
    }
}

/**
 * Map part of speech to our category system
 */
function mapPartOfSpeechToCategory(partOfSpeech) {
    if (!partOfSpeech || partOfSpeech === '-') return WordCategories.OTHER;

    if (partOfSpeech.includes('Substantivo')) return WordCategories.NOUN;
    if (partOfSpeech.includes('Verbo')) return WordCategories.VERB;
    if (partOfSpeech.includes('Adjetivo')) return WordCategories.ADJECTIVE;
    if (partOfSpeech.includes('Advérbio')) return WordCategories.ADVERB;
    if (partOfSpeech.includes('Pronome')) return WordCategories.PRONOUN;
    if (partOfSpeech.includes('Preposição')) return WordCategories.PREPOSITION;
    if (partOfSpeech.includes('Conjunção')) return WordCategories.CONJUNCTION;
    if (partOfSpeech.includes('Artigo')) return WordCategories.ARTICLE;
    if (partOfSpeech.includes('Partícula')) return WordCategories.PARTICLE;

    return WordCategories.OTHER;
}

// Export to global scope for non-module scripts
if (typeof window !== 'undefined') {
    window.vocabularyManager = {
        WordStatus,
        WordCategories,
        addVocabularyWord,
        createWordList,
        addWordsToList,
        removeWordsFromList,
        getAllWordLists,
        getWordListWithWords,
        updateWordProgress,
        getSystemVocabulary,
        addSystemVocabulary,
        //getSystemVocabulary,
        importGreekLexicon
    };
}