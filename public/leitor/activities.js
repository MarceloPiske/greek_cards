/**
 * Module containing activity rendering functions
 */

/**
 * Renderiza uma atividade de vocabulário
 */
export function renderVocabulario(atividade, container) {
    const html = `
        <div class="activity-card vocabulario-card" data-id="${atividade.id}">
            <p class="instrucoes">${atividade.instrucoes}</p>
            
            <div class="vocabulario-lista">
                ${atividade.conteudo.map(item => `
                    <div class="vocabulario-item" data-word="${item.grego}">
                        <div class="grego-palavra">${item.grego}</div>
                        <div class="translit-palavra">${item.translit}</div>
                        <div class="significado-palavra">${item.significado}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML += html;
    
    // Adicionar animação ao clicar nas palavras
    const palavras = container.querySelectorAll('.vocabulario-item');
    palavras.forEach(palavra => {
        palavra.addEventListener('click', () => {
            palavra.classList.add('palavra-clicked');
            setTimeout(() => palavra.classList.remove('palavra-clicked'), 500);
        });
    });
}

/**
 * Renderiza uma atividade de texto interlinear
 */
export function renderInterlinear(atividade, container) {
    const html = `
        <div class="activity-card interlinear-card" data-id="${atividade.id}">
            <p class="instrucoes">${atividade.instrucoes}</p>
            
            <div class="versiculo-referencia">${atividade.conteudo.versiculo}</div>
            
            <div class="interlinear-container">
                ${atividade.conteudo.palavras.map(palavra => `
                    <div class="interlinear-palavra">
                        <div class="grego-original">${palavra.grego}</div>
                        <div class="morfologia-tag">${palavra.morfologia}</div>
                        <div class="traducao-palavra">${palavra.traducao}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML += html;
}

/**
 * Renderiza uma atividade de quiz
 */
export function renderQuiz(atividade, container) {
    const html = `
        <div class="activity-card quiz-card" data-id="${atividade.id}">
            <p class="instrucoes">${atividade.instrucoes}</p>
            
            <div class="quiz-pergunta">${atividade.conteudo.pergunta}</div>
            
            <div class="quiz-alternativas">
                ${atividade.conteudo.alternativas.map((alternativa, index) => `
                    <div class="alternativa-item">
                        <input type="radio" name="quiz-${atividade.id}" id="alt-${index}" value="${index}">
                        <label for="alt-${index}">${alternativa}</label>
                    </div>
                `).join('')}
            </div>
            
            <button class="verificar-resposta nav-button" onclick="verificarQuiz('${atividade.id}', ${atividade.conteudo.respostaCorreta})">
                Verificar <span class="material-symbols-sharp">check</span>
            </button>
            
            <div class="quiz-resultado" id="resultado-${atividade.id}"></div>
        </div>
    `;
    
    container.innerHTML += html;
}

/**
 * Renderiza uma atividade de explicação
 */
export function renderExplicacao(atividade, container) {
    const html = `
        <div class="activity-card explicacao-card" data-id="${atividade.id}">
            <p class="instrucoes">${atividade.instrucoes}</p>
            
            <div class="explicacao-conteudo">
                ${atividade.conteudo.texto}
            </div>
        </div>
    `;
    
    container.innerHTML += html;
}

/**
 * Renderiza uma atividade de leitura
 */
export function renderLeitura(atividade, container) {
    console.log(atividade);
    
    const html = `
        <div class="activity-card leitura-card" data-id="${atividade.id}">
            <p class="instrucoes">${atividade.instrucoes}</p>
            
            <div class="leitura-titulo">${atividade.conteudo.titulo || ''}</div>
            <div class="leitura-referencia">${atividade.conteudo.referencia || ''}</div>
            
            <div class="leitura-texto">
                ${atividade.conteudo.texto || ''}
            </div>
        </div>
    `;
    
    container.innerHTML += html;
}

/**
 * Verifica a resposta de um quiz
 */
export function verificarQuiz(quizId, respostaCorreta) {
    const selectedOption = document.querySelector(`input[name="quiz-${quizId}"]:checked`);
    const resultadoDiv = document.getElementById(`resultado-${quizId}`);
    
    if (!selectedOption) {
        resultadoDiv.innerHTML = `<p class="erro">Por favor, selecione uma alternativa.</p>`;
        return;
    }
    
    const escolhaUsuario = parseInt(selectedOption.value);
    
    if (escolhaUsuario === respostaCorreta) {
        resultadoDiv.innerHTML = `
            <p class="sucesso">Correto! Muito bem!</p>
            <button class="mark-complete" onclick="marcarComoCompletada('${quizId}')">
                Continuar
            </button>
        `;
    } else {
        resultadoDiv.innerHTML = `<p class="erro">Incorreto. Tente novamente.</p>`;
    }
}