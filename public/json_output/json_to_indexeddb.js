function openKoineDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("koineAppDB", 4);
  
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
  
        if (!db.objectStoreNames.contains("systemVocabulary")) {
          db.createObjectStore("systemVocabulary", { keyPath: "ID" });
        }
        // Add other stores that might be needed for version 3
        if (!db.objectStoreNames.contains("userProgress")) {
          db.createObjectStore("userProgress", { keyPath: "wordId" });
        }
        if (!db.objectStoreNames.contains("vocabularyWords")) {
          db.createObjectStore("vocabularyWords", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("wordLists")) {
          db.createObjectStore("wordLists", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("userProgress")) {
          db.createObjectStore("userProgress", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("userFeedback")) {
          db.createObjectStore("userFeedback", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("moduleCompletion")) {
          db.createObjectStore("moduleCompletion", { keyPath: "moduloId" });
        }
      };
  
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => {
        console.error("Erro detalhado ao abrir IndexedDB:", event.target.error);
        reject("Erro ao abrir o IndexedDB: " + event.target.error);
      };
    });
  }
  
  async function importarVocabulario(jsonData) {
    const db = await openKoineDB();
    const tx = db.transaction("systemVocabulary", "readwrite");
    const store = tx.objectStore("systemVocabulary");
  
    jsonData.forEach(entry => {
      store.put({
        ID: entry.ID,
        LEXICAL_FORM: entry.LEXICAL_FORM,
        TRANSLITERATED_LEXICAL_FORM: entry.TRANSLITERATED_LEXICAL_FORM,
        PART_OF_SPEECH: entry.PART_OF_SPEECH,
        PHONETIC_SPELLING: entry.PHONETIC_SPELLING,
        DEFINITION: entry.DEFINITION,
        ORIGIN: entry.ORIGIN,
        USAGE: entry.USAGE
      });
    });
  
    tx.oncomplete = () => {
      console.log("Vocabulário Strong importado com sucesso.");
    };
  
    tx.onerror = (err) => {
      console.error("Erro ao importar vocabulário:", err);
    };
  }
  
  async function carregarEImportar() {
    try {
      const response = await fetch("./json_output/STRONGS_WORD_COMBINADO.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      await importarVocabulario(data);
    } catch (err) {
      console.error("Erro ao carregar JSON:", err);
      // Don't show alert in console, just log the error
    }
  }
  
  carregarEImportar();