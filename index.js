const card_container = document.getElementById('card-container')
const next = document.getElementById('next')
const previus = document.getElementById('previus')
let greek_words = []
let atual_card_id = 1

//NOTE - Load cards in window
function insert_cards(greek_words) {
    let html = ""
    function shuffleArray(inputArray) {
        inputArray.sort(() => Math.random() - 0.5);
    }
    sorted_words = shuffleArray(greek_words)
    ramdon_number = 0
    for (const word of greek_words) {
        html += `<div onclick="rotate_card(this)" id="card-${ramdon_number + 1}" class="card">
                    <img class="inferior-left-image" src="https://media-public.canva.com/mO-Oc/MAFaRVmO-Oc/1/tl.png" alt="">
                    <img class="superior-left-image" src="https://media-public.canva.com/mO-Oc/MAFaRVmO-Oc/1/tl.png" alt="">
                    <div class="front">
                        <p id="text-greek">${word.Vocabulo}</p>
                    </div>
                    <div class="back">
                        <p id="text-portuguese">${word.Traducao}</p>
                    </div>
                    <img class="inferior-right-image" src="https://media-public.canva.com/mO-Oc/MAFaRVmO-Oc/1/tl.png" alt="">
                    <img class="superior-right-image" src="https://media-public.canva.com/mO-Oc/MAFaRVmO-Oc/1/tl.png" alt="">
                </div>`
        ramdon_number += 1
        //console.log(html);
    }
    card_container.innerHTML = html
}
//Abrir Json
fetch("greek_words.json")
    .then(response => {
        return response.json();
    })
    .then(async jsondata => {
        greek_words = jsondata;
        insert_cards(greek_words);
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
    card = document.getElementById(`card-${atual_card_id}`)
    next.setAttribute("href", `#card-${atual_card_id}`)
})

previus.addEventListener('click', () => {
    if (atual_card_id != 1)
        atual_card_id += - 1
    card = document.getElementById(`card-${atual_card_id}`)
    previus.setAttribute("href", `#card-${atual_card_id}`)
})





