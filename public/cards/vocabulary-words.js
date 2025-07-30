/**
 * Word management and progress tracking functionality
 */

import { 
    initVocabularyDB, 
    syncWordProgressToFirebase,
    getFromStore, 
    putInStore, 
    getAllFromStore,
    WordStatus, 
    WordCategories,
    STORE_VOCABULARY, 
    STORE_SYSTEM_VOCABULARY, 
    STORE_USER_PROGRESS 
} from './vocabulary-db.js';

import { saveDataWithSync, loadDataWithSync } from './cards-sync.js';

/**
 * Add a new vocabulary word to the database
 */
export async function addVocabularyWord(word) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_VOCABULARY, 'readwrite');
        const store = STORE_VOCABULARY;

        // Generate a unique ID if not provided
        if (!word.id) {
            word.id = 'word_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        }

        // Add created date
        word.createdAt = new Date().toISOString();

        await putInStore(db, store, word);
        
        // Initialize word progress
        await updateWordProgress(word.id, {
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
 * Update word progress with Firebase sync for premium users
 */
export async function updateWordProgress(wordId, progress) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_USER_PROGRESS, 'readwrite');
        const store = STORE_USER_PROGRESS;

        // Get current progress if it exists
        const currentProgress = await getFromStore(db, store, wordId) || {
            wordId,
            status: WordStatus.UNREAD,
            reviewCount: 0,
            createdAt: new Date().toISOString()
        };
        
        // Update with new values
        const updatedProgress = {
            ...currentProgress,
            ...progress,
            wordId,
            updatedAt: new Date().toISOString()
        };

        // Increment review count if status changed
        if (progress.status && progress.status !== currentProgress.status) {
            updatedProgress.reviewCount = (currentProgress.reviewCount || 0) + 1;
            updatedProgress.lastReviewed = new Date().toISOString();
        }
        
        // Save locally first, then sync with cloud if premium
        await putInStore(db, store, updatedProgress);
        
        // Use sync system for cloud backup
        await saveDataWithSync('wordProgress', updatedProgress, wordId);
        
        return updatedProgress;
    } catch (error) {
        console.error('Error updating word progress:', error);
        throw error;
    }
}

/**
 * Get word progress with sync
 */
export async function getWordProgress(wordId) {
    try {
        // Try to load with sync first (handles cloud/local coordination)
        let progress = await loadDataWithSync('wordProgress', wordId);
        
        if (!progress) {
            // Fallback to direct IndexedDB access
            const db = await initVocabularyDB();
            const tx = db.transaction(STORE_USER_PROGRESS, 'readonly');
            const store = STORE_USER_PROGRESS;
            progress = await getFromStore(db, store, wordId);
        }
        
        return progress || {
            wordId,
            status: WordStatus.UNREAD,
            reviewCount: 0
        };
    } catch (error) {
        console.error('Error getting word progress:', error);
        return {
            wordId,
            status: WordStatus.UNREAD,
            reviewCount: 0
        };
    }
}

/**
 * Add system vocabulary from a module
 */
export async function addSystemVocabulary(moduleId, words) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_SYSTEM_VOCABULARY, 'readwrite');
        const store = STORE_SYSTEM_VOCABULARY;

        // Add each word to the system vocabulary
        for (const word of words) {
            const systemWord = {
                ...word,
                moduleId,
                source: 'system',
                createdAt: new Date().toISOString()
            };
            
            try {
                await putInStore(db, store, systemWord);
            } catch (error) {
                console.warn(`Word ${word.LEXICAL_FORM} could not be added:`, error);
            }
        }

        console.log(`Added ${words.length} words from module ${moduleId}`);
        return words;
    } catch (error) {
        console.error('Error adding system vocabulary:', error);
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
        const store = STORE_SYSTEM_VOCABULARY;

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
            const cursorRequest = tx.objectStore(store).openCursor();

            cursorRequest.onsuccess = async (event) => {
                const cursor = event.target.result;

                if (!cursor) {
                    // End of data, add progress and sort
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

                // Apply filters
                if (
                    (!category || word.PART_OF_SPEECH?.toLowerCase().includes(lowerCategory)) &&
                    (!search || (
                        word.LEXICAL_FORM?.toLowerCase().includes(lowerSearch) ||
                        word.TRANSLITERATED_LEXICAL_FORM?.toLowerCase().includes(lowerSearch) ||
                        word.DEFINITION?.toLowerCase().includes(lowerSearch) ||
                        word.USAGE?.toLowerCase().includes(lowerSearch)
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
                        // Reached limit, process and return
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
 */
export async function importGreekLexicon(lexiconData) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_SYSTEM_VOCABULARY, 'readwrite');
        const store = STORE_SYSTEM_VOCABULARY;

        const importedIds = [];

        for (const entry of lexiconData) {
            // Create word object from lexicon data
            const word = {
                ID: entry.ID,
                LEXICAL_FORM: entry.LEXICAL_FORM,
                TRANSLITERATED_LEXICAL_FORM: entry.TRANSLITERATED_LEXICAL_FORM,
                DEFINITION: entry.DEFINITION,
                PART_OF_SPEECH: entry.PART_OF_SPEECH,
                PHONETIC_SPELLING: entry.PHONETIC_SPELLING,
                ORIGIN: entry.ORIGIN,
                USAGE: entry.USAGE,
                source: 'lexicon',
                createdAt: new Date().toISOString()
            };

            // Add to database
            await putInStore(db, store, word);
            importedIds.push(word.ID);
        }

        console.log(`Imported ${importedIds.length} words from lexicon`);
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