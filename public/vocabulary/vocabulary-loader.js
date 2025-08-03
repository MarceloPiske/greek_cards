/**
 * Vocabulary Database Loader
 * Initializes IndexedDB with all required stores and loads vocabulary data
 */

/**
 * Open and initialize the Koine database with all required stores
 */
function openKoineDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("koineAppDB", 4);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // System vocabulary store
            if (!db.objectStoreNames.contains("systemVocabulary")) {
                db.createObjectStore("systemVocabulary", { keyPath: "ID" });
                console.log('Created systemVocabulary store');
            }

            // Word progress store  
            if (!db.objectStoreNames.contains("wordProgress")) {
                db.createObjectStore("wordProgress", { keyPath: "wordId" });
                console.log('Created wordProgress store');
            }

            // User vocabulary words store
            if (!db.objectStoreNames.contains("vocabularyWords")) {
                db.createObjectStore("vocabularyWords", { keyPath: "id" });
                console.log('Created vocabularyWords store');
            }

            // Word lists store
            if (!db.objectStoreNames.contains("wordLists")) {
                db.createObjectStore("wordLists", { keyPath: "id" });
                console.log('Created wordLists store');
            }

            // User feedback store
            if (!db.objectStoreNames.contains("userFeedback")) {
                db.createObjectStore("userFeedback", { keyPath: "id", autoIncrement: true });
                console.log('Created userFeedback store');
            }

            // Module completion store
            if (!db.objectStoreNames.contains("moduleCompletion")) {
                db.createObjectStore("moduleCompletion", { keyPath: "moduloId" });
                console.log('Created moduleCompletion store');
            }

            console.log('Database upgrade completed - all stores initialized');
        };

        request.onsuccess = (event) => {
            console.log('Database opened successfully');
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error("Detailed error opening IndexedDB:", event.target.error);
            reject("Error opening IndexedDB: " + event.target.error);
        };
    });
}

/**
 * Import vocabulary data into the systemVocabulary store
 */
async function importarVocabulario(jsonData) {
    try {
        const db = await openKoineDB();
        const tx = db.transaction("systemVocabulary", "readwrite");
        const store = tx.objectStore("systemVocabulary");

        // Check if vocabulary already exists
        const countRequest = store.count();
        
        return new Promise((resolve, reject) => {
            countRequest.onsuccess = () => {
                const existingCount = countRequest.result;
                
                if (existingCount > 0) {
                    console.log(`Vocabulary already exists (${existingCount} entries) - skipping import`);
                    resolve();
                    return;
                }

                console.log(`Importing ${jsonData.length} vocabulary entries...`);
                
                let processed = 0;
                const total = jsonData.length;

                jsonData.forEach(entry => {
                    const request = store.put({
                        ID: entry.ID,
                        LEXICAL_FORM: entry.LEXICAL_FORM,
                        TRANSLITERATED_LEXICAL_FORM: entry.TRANSLITERATED_LEXICAL_FORM,
                        PART_OF_SPEECH: entry.PART_OF_SPEECH,
                        PHONETIC_SPELLING: entry.PHONETIC_SPELLING,
                        DEFINITION: entry.DEFINITION,
                        ORIGIN: entry.ORIGIN,
                        USAGE: entry.USAGE
                    });

                    request.onsuccess = () => {
                        processed++;
                        if (processed === total) {
                            console.log("Strong's vocabulary imported successfully.");
                            resolve();
                        }
                    };

                    request.onerror = (err) => {
                        console.error("Error importing vocabulary entry:", err);
                        processed++;
                        if (processed === total) {
                            resolve(); // Continue even if some entries failed
                        }
                    };
                });
            };

            countRequest.onerror = () => {
                console.error("Error checking existing vocabulary count");
                reject("Error checking vocabulary");
            };
        });
    } catch (error) {
        console.error("Error in importarVocabulario:", error);
        throw error;
    }
}

/**
 * Load JSON data and import vocabulary
 */
async function carregarEImportar() {
    try {
        console.log('Loading vocabulary data...');
        
        const response = await fetch("../json_output/STRONGS_WORD_COMBINADO.json");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Loaded ${data.length} vocabulary entries from JSON`);
        
        await importarVocabulario(data);
        console.log('Vocabulary loading completed');
        
    } catch (err) {
        console.error("Error loading vocabulary JSON:", err);
        // Don't throw error to prevent app from breaking
    }
}

/**
 * Initialize vocabulary system
 */
export async function initializeVocabularySystem() {
    try {
        console.log('Initializing vocabulary system...');
        
        // Ensure database is properly initialized
        await openKoineDB();
        
        // Load vocabulary data
        await carregarEImportar();
        
        console.log('Vocabulary system initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing vocabulary system:', error);
        return false;
    }
}

/**
 * Get database instance
 */
export async function getVocabularyDB() {
    return await openKoineDB();
}

// Auto-initialize when module is loaded
if (typeof window !== 'undefined') {
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeVocabularySystem);
    } else {
        // DOM already loaded, initialize immediately
        initializeVocabularySystem();
    }
    
    // Export for global access
    window.vocabularyLoader = {
        initializeVocabularySystem,
        getVocabularyDB,
        openKoineDB,
        importarVocabulario,
        carregarEImportar
    };
}