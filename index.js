const flipper_container = document.getElementById('container-1')
const flipper = document.getElementById('flipper-1')
const next = document.getElementById('next')
const previus = document.getElementById('previus')

flipper_container.addEventListener('click', () => {
    if (flipper.style.transform != "rotateY(180deg)") {
        flipper.style.transform = 'rotateY(180deg)'
    }else{
        flipper.style.transform = 'rotateY(0deg)'
    }
})

function greek_card_animation() {
    if (flipper.style.transform != "rotateX(360deg)") {
        flipper.style.transform = 'rotateX(360deg)'
    }else{
        flipper.style.transform = 'rotateX(0deg)'
    }
}

next.addEventListener('click', () => {
    greek_card_animation()
    alterar_palavra(true)
})

previus.addEventListener('click', () => {
    greek_card_animation()
    alterar_palavra(false)
})

p_greek = document.getElementById("text-greek")
p_portuguese = document.getElementById("text-portuguese")

function set_greek_word(jsondata) {
    const atual_word_id = localStorage.getItem("word_id")
    
    jsondata = jsondata.palavras[atual_word_id]
    let text_greek = `${jsondata.grego_nominativo} (${jsondata.grego_genitivo}), ${jsondata.grego_artigo}`
    let text_portuguese = jsondata.portugues
    p_greek.innerText = text_greek
    p_portuguese.innerText = text_portuguese
}

function set_local_word_id(next) {
    const atual_word_id = localStorage.getItem("word_id")
    let next_word_id = parseInt(atual_word_id)
    
    if (next == false)
        next_word_id = parseInt(atual_word_id) - 1
    else
        next_word_id = parseInt(atual_word_id) + 1
    
    localStorage.setItem("word_id", next_word_id);
}

function alterar_palavra(next) { 
    fetch("greek_words.json")
    .then(response => {
        return response.json();
    })
    .then(jsondata => {
        set_local_word_id(next)
        set_greek_word(jsondata)
    })
}

localStorage.setItem("word_id", "0");
alterar_palavra(null)