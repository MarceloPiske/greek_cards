const flipper_container = document.getElementById('container-1')
const flipper = document.getElementById('flipper-1')
const next = document.getElementById('next')

flipper_container.addEventListener('click', () => {
    if (flipper.style.transform != "rotateY(180deg)") {
        flipper.style.transform = 'rotateY(180deg)'
    }else{
        flipper.style.transform = 'rotateY(0deg)'
    }
})
next.addEventListener('click', () => {
    if (flipper.style.transform != "rotateX(360deg)") {
        flipper.style.transform = 'rotateX(360deg)'
    }else{
        flipper.style.transform = 'rotateX(0deg)'
    }
    alterar_palavra()
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

function alterar_palavra() { fetch("greek_words.json")
    .then(response => {
        return response.json();
    })
    .then(jsondata => {
        const atual_word_id = localStorage.getItem("word_id")
        let next_word_id = parseInt(atual_word_id) + 1
        localStorage.setItem("word_id", next_word_id);
        set_greek_word(jsondata)
    })
}


localStorage.setItem("word_id", "0");