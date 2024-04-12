const card_container = document.getElementById('card-container')
const next = document.getElementById('next')
const previus = document.getElementById('previus')
let atual_card_id = 1

//IndexDB
//db.deleteObjectStore('books')

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
            objectStore.createIndex("Artigo_Definido", "Artigo_Definido", { unique: false });
            objectStore.createIndex("Classificacao", "Classificacao", { unique: false });
            objectStore.createIndex("Casos", "Casos", { unique: false });
            objectStore.createIndex("Decorado", "Decorado", { unique: false });
            objectStore.createIndex("Aoristo_Segundo", "Aoristo_Segundo", { unique: false });
        };
    });
}

// Função para inserir dados
async function inserirDados(jsondata) {
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
                let request = store.add(word);
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

// Função para atualizar dados
async function atualizarDados(id, decorado) {
    const db = await abrirBancoDeDados();

    const transaction = db.transaction(["words"], "readwrite");
    const store = transaction.objectStore("words");

    const request = store.get(id);

    request.onsuccess = function (event) {
        const card = event.target.result;
        if (card) {
            card.Decorado = decorado;
            const updateRequest = store.put(card);
            updateRequest.onsuccess = function (event) {
                console.log("Dados atualizados com sucesso!");
            };
            updateRequest.onerror = function (event) {
                console.error("Erro ao atualizar dados:", event.target.error);
            };
        } else {
            console.log("Dado não encontrado.");
        }
    };

    request.onerror = function (event) {
        console.error("Erro ao buscar dado para atualização:", event.target.error);
    };
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

if (window.innerWidth < window.innerHeight) {
    alert("Por favor, gire o dispositivo para a orientação horizontal para uma melhor experiência.");
}

//NOTE - Load cards in window
function insert_cards(greek_words) {
    //console.log(greek_words);
    let html = ""
    function shuffleArray(inputArray) {
        inputArray.sort(() => Math.random() - 0.5);
    }
    sorted_words = shuffleArray(greek_words)
    ramdon_number = 0

    for (const word of greek_words) {
        html += `<div data-id="${word.id}" data-json='${JSON.stringify(word)}' onclick="rotate_card(this)" id="card-${ramdon_number + 1}" class="card">
                    <img class="inferior-left-image" src="https://media-public.canva.com/mO-Oc/MAFaRVmO-Oc/1/tl.png" alt="">
                    <img class="superior-left-image" src="https://media-public.canva.com/mO-Oc/MAFaRVmO-Oc/1/tl.png" alt="">
                    <div class="front">
                        <p id="text-greek">${word.Vocabulo}</p>
                    `
        if (word.Aoristo_Segundo) {
            html += `<p class="aor_seg">${word.Aoristo_Segundo}</p>`
        }
        html += `</div>
                    <div class="back">
                        <p id="text-portuguese">${word.Traducao}</p>
                    </div>
                    <img class="inferior-right-image" src="https://media-public.canva.com/mO-Oc/MAFaRVmO-Oc/1/tl.png" alt="">
                    <img class="superior-right-image" src="https://media-public.canva.com/mO-Oc/MAFaRVmO-Oc/1/tl.png" alt="">
                </div>`
        ramdon_number += 1
    }
    card_container.innerHTML = html

    //Verifica se aquele card está decorado
    verificar_decorado(atual_card_id)
}
//Abrir Json
async function filter_json(classification) {
    switch (classification) {
        case "Todos":
            dados_do_banco = await verificarDado({ flag: "all" });
            break;
        case "Não Decorados":
            dados_do_banco = await verificarDado({ flag: "data", campo: "Decorado", valor: false, not_key: true });
            //console.log("dado", dados_do_banco);
            break;
        case "Decorados":
            dados_do_banco = await verificarDado({ flag: "data", campo: "Decorado", valor: true, not_key: false });
            break;
        default:
            dados_do_banco = await verificarDado({ flag: "data", campo: "Classificacao", valor: classification, not_key: false });
            //insert_cards(classification, dados_do_banco);
            break;
    }
    insert_cards(dados_do_banco);
    //ANCHOR - lembrar de transformar em função
    location.href = `#card-1`
    atual_card_id = 1
    //Até aqui
}
fetch("greek_words.json")
    .then(response => {
        return response.json();
    })
    .then(jsondata => {
        inserirDados(jsondata);
        insert_cards(jsondata);
    })


function rotate_card(card) {
    /* se quiser uma animação na vertical,
    troque por rotateY(180deg)
    */
    if (card.style.transform != "rotateX(180deg)") {
        card.style.transform = 'rotateX(180deg)'
    } else {
        card.style.transform = 'rotateX(0deg)'
    }
}

next.addEventListener('click', () => {
    atual_card_id += 1
    next.setAttribute("href", `#card-${atual_card_id}`)
    verificar_decorado(atual_card_id)
});

previus.addEventListener('click', () => {
    if (atual_card_id != 1)
        atual_card_id += - 1
    previus.setAttribute("href", `#card-${atual_card_id}`)
    verificar_decorado(atual_card_id)
})

document.addEventListener("keydown", (e) => {
    if (e.code == "ArrowRight" || e.code == "KeyD") {
        next.click()
    }
    if (e.code == "ArrowLeft" || e.code == "KeyA") {
        previus.click()
    }
    if (e.code == "Space") {
        document.getElementById(`card-${atual_card_id}`).click()
    }
})

function info_card() {
    card_data = JSON.parse(document.getElementById(`card-${atual_card_id}`).dataset.json)
    delete card_data["id"]
    delete card_data["Traducao"]
    delete card_data["Vocabulo"]
    text = ""
    for (const k in card_data) {
        if (k == "Casos") {
            text += `<div>Nominativo: ${JSON.stringify(card_data[k].Nominativo)}</div>
            <div>Genitivo: ${JSON.stringify(card_data[k].Genitivo)}</div>
            <div>Dativo: ${JSON.stringify(card_data[k].Dativo)}</div>
            <div>Acusativo: ${JSON.stringify(card_data[k].Acusativo)}</div>`
        } else {
            text += `<div>${k}: ${JSON.stringify(card_data[k])}</div>`
        }
    }

    document.querySelector('.info-modal').innerHTML = text
}

//Marcar como Decorada

async function foi_decorado() {
    word_id = parseInt(document.getElementById(`card-${atual_card_id}`).dataset.id)
    //console.log(word_id);
    dadoDB = await verificarDado({ flag: "id", id: word_id });
    //console.log(dadoDB);
    if (dadoDB.Decorado == true) {
        atualizarDados(word_id, false)
    } else {
        atualizarDados(word_id, true)
    }
    verificar_decorado(atual_card_id)
}

async function verificar_decorado(atual_card_id) {
    word_id = parseInt(document.getElementById(`card-${atual_card_id}`).dataset.id)
    //console.log(word_id);
    dadoDB = await verificarDado({ flag: "id", id: word_id });
    //console.log(dadoDB.Decorado);
    if (dadoDB.Decorado == true) {
        document.querySelector(".decorado").style.color = "green"
    } else {
        document.querySelector(".decorado").style.color = "red"
    }
}



