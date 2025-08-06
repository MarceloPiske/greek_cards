// Database stores
export const STORE_SYSTEM_VOCABULARY = 'systemVocabulary';
const STORE_WORD_PROGRESS = 'wordProgress';
const STORE_WORD_LISTS = 'wordLists';
const STORE_USER_FEEDBACK = 'userFeedback';
const STORE_PROBLEM_REPORTS = 'problemReports';

/**
 * Initialize the vocabulary database stores
 */
export async function initVocabularyDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("koineAppDB", 6);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Ensure system vocabulary store exists
            if (!db.objectStoreNames.contains(STORE_SYSTEM_VOCABULARY)) {
                const vocabStore = db.createObjectStore(STORE_SYSTEM_VOCABULARY, { keyPath: "ID" });
                console.log('Created systemVocabulary store');
            }
            
            // Ensure word progress store exists - now uses composite keys for user separation
            if (!db.objectStoreNames.contains(STORE_WORD_PROGRESS)) {
                const progressStore = db.createObjectStore(STORE_WORD_PROGRESS, { keyPath: "id" });
                console.log('Created wordProgress store');
            }
            
            // Ensure word lists store exists - now uses composite keys for user separation
            if (!db.objectStoreNames.contains(STORE_WORD_LISTS)) {
                const listsStore = db.createObjectStore(STORE_WORD_LISTS, { keyPath: "id" });
                console.log('Created wordLists store');
            }

            // Ensure user feedback store exists
            if (!db.objectStoreNames.contains(STORE_USER_FEEDBACK)) {
                const feedbackStore = db.createObjectStore(STORE_USER_FEEDBACK, { keyPath: "id", autoIncrement: true });
                console.log('Created userFeedback store');
            }

            // Ensure problem reports store exists
            if (!db.objectStoreNames.contains(STORE_PROBLEM_REPORTS)) {
                const problemStore = db.createObjectStore(STORE_PROBLEM_REPORTS, { keyPath: "id", autoIncrement: true });
                console.log('Created problemReports store');
            }
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            
            // Verify all required stores exist
            const requiredStores = [STORE_SYSTEM_VOCABULARY, STORE_WORD_PROGRESS, STORE_WORD_LISTS, STORE_USER_FEEDBACK, STORE_PROBLEM_REPORTS];
            const missingStores = requiredStores.filter(store => !db.objectStoreNames.contains(store));
            
            if (missingStores.length > 0) {
                console.warn('Missing object stores:', missingStores);
                // Close and delete the database, then recreate it
                db.close();
                const deleteRequest = indexedDB.deleteDatabase("koineAppDB");
                deleteRequest.onsuccess = () => {
                    console.log('Database deleted, reinitializing...');
                    // Recursive call to reinitialize
                    initVocabularyDB().then(resolve).catch(reject);
                };
                deleteRequest.onerror = () => reject(new Error('Failed to delete and recreate database'));
                return;
            }
            
            console.log('Database initialized successfully with all required stores');
            resolve(db);
        };
        
        request.onerror = (event) => {
            console.error('Failed to initialize vocabulary database:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Import Greek lexicon data into system vocabulary
 */
export async function importGreekLexicon(lexiconData) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_SYSTEM_VOCABULARY, 'readwrite');
        const store = tx.objectStore(STORE_SYSTEM_VOCABULARY);


        return new Promise((resolve, reject) => {
            let processed = 0;
            const total = lexiconData.length;


            for (const entry of lexiconData) {
                const request = store.put({
                    ID: entry.ID,
                    LEXICAL_FORM: entry.LEXICAL_FORM,
                    TRANSLITERATED_LEXICAL_FORM: entry.TRANSLITERATED_LEXICAL_FORM,
                    PART_OF_SPEECH: entry.PART_OF_SPEECH,
                    PHONETIC_SPELLING: entry.PHONETIC_SPELLING,
                    DEFINITION: entry.DEFINITION,
                    ORIGIN: entry.ORIGIN,
                    USAGE: entry.USAGE
                })


                request.onsuccess = () => {
                    processed++;
                    if (processed === total) {
                        console.log(`Successfully imported ${total} vocabulary entries`);
                        resolve();
                    }
                }


                request.onerror = () => {
                    console.error(`Error importing entry ${entry.ID}:`, request.error);
                    processed++;
                    if (processed === total) {
                        resolve(); // Continue even if some entries failed
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error importing Greek lexicon:', error);
        throw error;
    }
}

/**
 * Get system vocabulary with filtering
 */
export async function getSystemVocabulary(options = {}) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_SYSTEM_VOCABULARY, 'readonly');
        const store = tx.objectStore(STORE_SYSTEM_VOCABULARY);


        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = async () => {
                let words = request.result || []


                // Apply search filter first
                if (options.search && options.search.trim()) {
                    const searchLower = options.search.toLowerCase();
                    words = words.filter(word => 
                        word.LEXICAL_FORM?.toLowerCase().includes(searchLower) ||
                        word.TRANSLITERATED_LEXICAL_FORM?.toLowerCase().includes(searchLower) ||
                        word.DEFINITION?.toLowerCase().includes(searchLower) ||
                        word.USAGE?.toLowerCase().includes(searchLower)
                    )
                }


                // Apply category filter
              console.log(options.category)
                if (options.category && options.category.trim()) {
                    words = words.filter(word => 
          word.PART_OF_SPEECH.toLowerCase().includes(options.category) 
                    )
                }


                // Apply pagination
                if (options.offset !== undefined || options.limit !== undefined) {
                    const start = options.offset || 0;
                    const end = options.limit ? start + options.limit : words.length;
                    words = words.slice(start, end);
                }


                resolve(words);
            }
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting system vocabulary:', error);
        return [];
    }
}

/**
 * Load system vocabulary from JSON files
 */
export async function loadSystemVocabulary() {
    try {
        console.log('Checking system vocabulary...');
        
        // Check if system vocabulary already exists
        const db = await initVocabularyDB();
        
        // First, let's check if the store exists and has data
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_SYSTEM_VOCABULARY, 'readonly');
            const store = tx.objectStore(STORE_SYSTEM_VOCABULARY);
            
            const countRequest = store.count();
            countRequest.onsuccess = async () => {
                const existingCount = countRequest.result;
                console.log(`Found ${existingCount} vocabulary entries in IndexedDB`);
                
                // If we already have vocabulary, skip loading
                if (existingCount > 0) {
                    console.log(`System vocabulary already loaded (${existingCount} entries)`);
                    resolve();
                    return;
                }
                
                console.log('Loading system vocabulary from JSON...');
                
                try {
                    // Load from the combined JSON file
                    const response = await fetch('./json_output/STRONGS_WORD_COMBINADO.json');
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const lexiconData = await response.json();
                    console.log(`Loaded ${lexiconData.length} vocabulary entries from JSON`);
                    
                    // Import into IndexedDB
                    await importGreekLexicon(lexiconData);
                    
                    console.log('System vocabulary loaded successfully');
                    resolve();
                } catch (error) {
                    console.error('Error loading system vocabulary from JSON:', error);
                    // Try to wait for the json_to_indexeddb.js?v=1.1 script to populate data
                    console.log('Waiting for automatic vocabulary loading...');
                    
                    // Check again after a delay
                    setTimeout(async () => {
                        const tx2 = db.transaction(STORE_SYSTEM_VOCABULARY, 'readonly');
                        const store2 = tx2.objectStore(STORE_SYSTEM_VOCABULARY);
                        const countRequest2 = store2.count();
                        
                        countRequest2.onsuccess = () => {
                            console.log(`After waiting: Found ${countRequest2.result} vocabulary entries`);
                            resolve();
                        };
                        countRequest2.onerror = () => resolve(); // Don't fail the app
                    }, 2000);
                }
            };
            
            countRequest.onerror = () => {
                console.error('Error checking vocabulary count:', countRequest.error);
                resolve(); // Don't fail the app
            };
        });
    } catch (error) {
        console.error('Error in loadSystemVocabulary:', error);
        // Don't throw - app should still work without system vocabulary
    }
}

/**
 * Get word by ID from system vocabulary
 */
export async function getWordById(wordId) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_SYSTEM_VOCABULARY, 'readonly');
        const store = tx.objectStore(STORE_SYSTEM_VOCABULARY);


        return new Promise((resolve, reject) => {
            const request = store.get(wordId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting word by ID:', error);
        return null;
    }
}

/**
 * Save user feedback to IndexedDB
 */
export async function saveFeedbackDB(feedbackData) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_USER_FEEDBACK, 'readwrite');
        const store = tx.objectStore(STORE_USER_FEEDBACK);

        const feedback = {
            ...feedbackData,
            createdAt: new Date().toISOString(),
            synced: false
        };

        return new Promise((resolve, reject) => {
            const request = store.add(feedback);
            request.onsuccess = () => resolve(feedback);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error saving feedback to DB:', error);
        throw error;
    }
}

/**
 * Save problem report to IndexedDB
 */
export async function saveProblemReportDB(problemData) {
    try {
        const db = await initVocabularyDB();
        const tx = db.transaction(STORE_PROBLEM_REPORTS, 'readwrite');
        const store = tx.objectStore(STORE_PROBLEM_REPORTS);

        const problem = {
            ...problemData,
            createdAt: new Date().toISOString(),
            synced: false
        };

        return new Promise((resolve, reject) => {
            const request = store.add(problem);
            request.onsuccess = () => resolve(problem);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error saving problem report to DB:', error);
        throw error;
    }
}