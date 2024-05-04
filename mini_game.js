
//Criando elementos do game
const col_esquerda = document.getElementById("col-esquerda")
const col_direita = document.getElementById("col-direita")
const content_colunms = document.querySelector(".content-colunms")
let dados_do_banco = false

window.onload = async () => {
    dados_do_banco = await verificarDado({ flag: "all" });
    if (localStorage.getItem("correct_list")) {
        drawn_words(dados_do_banco, JSON.parse(localStorage.getItem("correct_list")))
    } else {
        drawn_words(dados_do_banco, [])
    }
}

function drawn_words(dados_do_banco, to_remove) {
    //console.log(dados_do_banco);
    col_esquerda.innerHTML = ""
    col_direita.innerHTML = ""
    let filter = dados_do_banco.filter(f => !to_remove.includes(f.id))
    //console.log(filter);
    filter = filter.slice(0, 5)
    //console.log(filter);
    localStorage.setItem("atual-words-in-window", filter.length)

    if (filter.length == 0) {
        content_colunms.innerHTML = '<img src="./img/parabens.png" alt="">'
    } else {
        function shuffleArray(inputArray) {
            inputArray.sort(() => Math.random() - 0.5);
        }

        shuffleArray(filter)
        filter.forEach(f => {
            let div_e = document.createElement("div")
            div_e.id = f.id + "E"
            div_e.addEventListener("click", function () { active_option(this) })
            let span_e = document.createElement("span")
            span_e.innerText = f.Vocabulo
            div_e.appendChild(span_e)
            col_esquerda.appendChild(div_e)
        })

        shuffleArray(filter)
        filter.forEach(f => {
            let div_d = document.createElement("div")
            div_d.id = f.id + "D"
            div_d.addEventListener("click", function () { active_option(this) })

            let span_d = document.createElement("span")
            span_d.innerText = f.Traducao
            div_d.appendChild(span_d)
            col_direita.appendChild(div_d)
        })
    }
}

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
    }
    drawn_words(dados_do_banco, [])
    localStorage.removeItem("correct_list")
}

function reset_game() {
    drawn_words(dados_do_banco, [])
    localStorage.removeItem("correct_list")
}

function preset_wrong() {
    document.querySelectorAll(".wrong").forEach(e => {
        e.classList.toggle("wrong")

    })
}

let total_correct = 0

function is_correct(element) {
    document.querySelectorAll(".selected").forEach(e => {
        e.classList.toggle("correct")
    })

    if (!localStorage.getItem("correct_list")) {
        localStorage.setItem("correct_list", JSON.stringify([parseInt(element.id)]))
    } else {
        //localStorage.removeItem("correct_list")
        //console.log(localStorage.getItem("correct_list"));
        let list = JSON.parse(localStorage.getItem("correct_list"))
        //console.log(list);
        list.push(parseInt(element.id))
        localStorage.setItem("correct_list", JSON.stringify(list))
    }
    total_correct += 1
    if (total_correct == localStorage.getItem("atual-words-in-window")) {
        setTimeout(() => {
            drawn_words(dados_do_banco, JSON.parse(localStorage.getItem("correct_list")))
            total_correct = 0
        }, 1000)

    }
}

function active_option(element) {
    if (!element.classList.contains("correct")) {
        //console.log(element.id);
        let atual_selected_option = localStorage.getItem("selected-option")

        if (!atual_selected_option || atual_selected_option.includes(element.id)) {
            //console.log("entrei", atual_selected_option);
            localStorage.setItem('selected-option', element.id)
            element.classList.toggle("selected")
        } else {

            element.classList.toggle("selected")
            if (atual_selected_option.includes(parseInt(element.id))) {
                is_correct(element)
            } else {
                console.log("Errado")
                document.querySelectorAll(".selected").forEach(e => {
                    e.classList.toggle("wrong")
                })
                setTimeout(preset_wrong, 700)
            }
            localStorage.removeItem("selected-option")
            document.querySelectorAll(".selected").forEach(e => {
                e.classList.toggle("selected")
            })
        }
    }
}