function openKoineDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("koineAppDB", 2);
  
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
  
        if (!db.objectStoreNames.contains("systemVocabulary")) {
          db.createObjectStore("systemVocabulary", { keyPath: "ID" });
        }
      };
  
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = () => reject("Erro ao abrir o IndexedDB");
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
      const response = await fetch("./json_output/STRONGS_WORD_COMBINADO.json"); // Altere o nome conforme necessário
      const data = await response.json();
      
      await importarVocabulario(data);
    } catch (err) {
      console.error("Erro ao carregar JSON:", err);
    }
  }
  
  carregarEImportar();
  