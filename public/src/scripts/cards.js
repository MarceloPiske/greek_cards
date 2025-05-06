const card_container = document.getElementById('card-container')
const next = document.getElementById('next')
const previus = document.getElementById('previus')
let atual_card_id = 1

//IndexDB
//db.deleteObjectStore('books')

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



if (window.innerWidth < window.innerHeight) {
    //document.querySelector("body").style.transform = 'rotate(90deg)'
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
        html += `<div data-id="${word.id}" onclick="rotate_card(this)" id="card-${ramdon_number + 1}" class="card">
                    <img class="inferior-left-image" src="../../img/tl.png" alt="">
                    <img class="superior-left-image" src="../../img/tl.png" alt="">
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
                    <img class="inferior-right-image" src="../../img/tl.png" alt="">
                    <img class="superior-right-image" src="../../img/tl.png" alt="">
                </div>`
        ramdon_number += 1
    }
    card_container.innerHTML = html

    //Verifica se aquele card está decorado
    verificar_decorado(atual_card_id)
}

window.onload = async () => {
    dados_do_banco = await verificarDado({ flag: "all" });
insert_cards(dados_do_banco);
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
        esconde_intruções()
    }
    if (e.code == "ArrowLeft" || e.code == "KeyA") {
        previus.click()
        esconde_intruções()
    }
    if (e.code == "Space") {
        document.getElementById(`card-${atual_card_id}`).click()
        esconde_intruções()
    }
})

async function info_card() {
    word_id = parseInt(document.getElementById(`card-${atual_card_id}`).dataset.id)
    card_data = await verificarDado({ flag: "id", id: word_id });
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



//Touch controle
const container = document.getElementById("container")
let startPositionX = 0;

container.addEventListener("touchstart", (event) => {
    startPositionX = event.changedTouches[0].clientX;
})
container.addEventListener("touchend", (event) => {
    currentPositionX = event.changedTouches[0].clientX;

    // Calcula a distância percorrida pelo dedo
    const deltaX = currentPositionX - startPositionX;
    if (deltaX < -70) {
        next.click()
    } else {
        if (deltaX > 70) {
            previus.click()
        }

    }
})


//Instruções
function esconde_intruções() {
    document.querySelector("footer").style.display = "none"
}
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

if (isMobile()) {
    esconde_intruções()
}