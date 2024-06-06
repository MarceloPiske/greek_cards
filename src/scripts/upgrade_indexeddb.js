function abrirBancoDeDados() {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open("greek_words", 1);

        request.onerror = function (event) {
            reject("Erro ao abrir o banco de dados: " + event.target.error);
        };

        request.onsuccess = function (event) {
            const db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = function (event) {
            const db = event.target.result;

            const objectStore = db.createObjectStore("words", { keyPath: "id" });
            objectStore.createIndex("id", "id", { unique: true });
            objectStore.createIndex("Vocabulo", "Vocabulo", { unique: false });
            //objectStore.createIndex("Artigo_Definido", "Artigo_Definido", { unique: false });
            //objectStore.createIndex("Classificacao", "Classificacao", { unique: false });
            //objectStore.createIndex("Casos", "Casos", { unique: false });
            //objectStore.createIndex("Decorado", "Decorado", { unique: false });
            objectStore.createIndex("Aoristo_Segundo", "Aoristo_Segundo", { unique: false });
        };
    });
}
async function verificarDado(filtro) {
    return new Promise((resolve, reject) => {
        abrirBancoDeDados().then(db => {
            const transaction = db.transaction(["words"], "readwrite");
            const store = transaction.objectStore("words");

            let request = null
            switch (filtro.flag) {
                case "id":
                    request = store.get(filtro.id);
                    break;
                case "all":
                    request = store.openCursor();
                    break;
                case "data":
                    request = store.openCursor();
                    break;
                default:
                    console.log("não vem ao caso");
                    break;
            }

            let data_return = []
            request.onsuccess = function (event) {
                const request_result = event.target.result;

                switch (filtro.flag) {
                    case "data":
                        if (request_result) {
                            switch (filtro.not_key) {
                                case false:
                                    //NOTE - Corrigir essas verificações, pois estão ruins
                                    if (`${request_result.value[filtro.campo]}`.includes(filtro.valor) && request_result.value[filtro.campo] != undefined) {
                                        data_return.push(request_result.value)
                                    }
                                    break;
                                case true:
                                    if (`${request_result.value[filtro.campo]}`.includes(filtro.valor) || request_result.value[filtro.campo] == undefined) {
                                        data_return.push(request_result.value)
                                    }
                                    break;
                                default:
                                    break;
                            }
                            request_result.continue();
                        } else {
                            resolve(data_return);
                        }
                        break;
                    case "all":
                        if (request_result) {
                            data_return.push(request_result.value)
                            request_result.continue();
                        } else {
                            resolve(data_return);
                        }
                        break;
                    default:
                        if (request_result) {
                            //console.log("Dado encontrado:", request_result);
                            resolve(request_result);
                        } else {
                            console.log("Dado não encontrado.");
                        }
                        break;
                }
            };

            request.onerror = function (event) {
                console.error("Erro ao verificar dado:", event.target.error);
            };
        })
    })
}
// Função para inserir dados
async function atualizar_database(jsondata) {
    const db = await abrirBancoDeDados();

    const transaction = db.transaction(["words"], "readwrite");
    const store = transaction.objectStore("words");

    for (let word of jsondata) {
        const request = store.get(word.id);
        request.onsuccess = function (event) {
            const pessoa = event.target.result;
            if (pessoa) {
                //console.log("Dado encontrado:", pessoa);
            } else {
                console.log("Dado não encontrado.");
                let request = store.put(word);
                request.onsuccess = function (event) {
                    console.log("Dados inseridos com sucesso!");
                };

                request.onerror = function (event) {
                    console.error(word, "Erro ao inserir dados:", event.target.error);
                };
            }
        };
    }
}
let json_version = parseFloat(localStorage.getItem("json_version"))
let location_url = new URL(window.location.href).origin

location_url.includes("marcelo") ?  location_url+"/greek_cards" : location_url
console.log(location_url.includes("marcelo"), location_url);
fetch(location_url+"/greek_words.json")
    .then(response => {
        return response.json();
    })
    .then(json => {
        if (json.version != json_version) {
            atualizar_database(json.data);
            localStorage.setItem("json_version", json.version)
        }
    })
