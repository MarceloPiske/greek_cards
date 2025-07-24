/**
 * Módulo para carregamento e gerenciamento de trilhas de estudo
 */

import { loadProgress } from '../indexedDB.js';

// Função para obter informações sobre todas as trilhas disponíveis
export async function carregarTrilhasDisponiveis() {
    const timeline = document.getElementById('trilha-timeline');
    
    try {
        // Obter a lista de trilhas
        const trilhasDisponiveis = await obterListaTrilhas();
        
        // Limpar o conteúdo de carregamento
        timeline.innerHTML = '';
        
        // Gerar HTML para cada trilha
        trilhasDisponiveis.forEach((trilha, index) => {
            gerarHTMLModulo(trilha, index, timeline);
        });
        
        // Carregar e atualizar progresso das trilhas
        carregarProgressoTrilhas(trilhasDisponiveis.map(t => t.id));
        
        // Adicionar event listeners aos módulos
        adicionarEventListeners();
    } catch (error) {
        console.error('Erro ao carregar trilhas:', error);
        timeline.innerHTML = `
            <div class="error-message">
                <span class="material-symbols-sharp">error</span>
                <p>Não foi possível carregar as trilhas de estudo.</p>
                <button onclick="window.trilhaLoader.carregarTrilhasDisponiveis()">Tentar novamente</button>
            </div>
        `;
    }
}

// Função que obtém a lista de trilhas disponíveis
export async function obterListaTrilhas() {
    try {
        // Fazer um fetch para verificar quais trilhas existem
        const response = await fetch('./trilhas/trilhas/index.json'); //FIXME - URL hardcoded
        
        if (response.ok) {
            // Se tiver um arquivo index.json com as trilhas
            return await response.json();
        } else {
            // Se não tiver, usar lista predefinida com informações mais detalhadas
            return getDefaultTrilhas();
        }
    } catch (error) {
        console.error('Erro ao buscar lista de trilhas:', error);
        // Em caso de erro, fornecer pelo menos o módulo 1 que sabemos que existe
        return [
            {
                id: 'modulo_1',
                titulo: 'Introdução ao Grego Koiné',
                descricao: 'Primeiros passos no estudo do grego bíblico.',
                icone: 'school',
                tempoEstimado: '15 min',
                numeroAtividades: 5,
                nivel: 'iniciante'
            }
        ];
    }
}

// Lista padrão de trilhas se não conseguir carregar o index.json
function getDefaultTrilhas() {
    return [
        {
            id: 'modulo_1',
            titulo: 'Introdução ao Grego Koiné',
            descricao: 'Primeiros passos no estudo do grego bíblico, incluindo vocabulário básico e leitura interlinear.',
            icone: 'school',
            tempoEstimado: '15 min',
            numeroAtividades: 5,
            nivel: 'iniciante'
        },
        {
            id: 'modulo_2',
            titulo: 'Alfabeto e Pronúncia',
            descricao: 'Aprenda a reconhecer e pronunciar as letras do alfabeto grego, a base para ler textos originais.',
            icone: 'abc',
            tempoEstimado: '20 min',
            numeroAtividades: 7,
            nivel: 'iniciante'
        },
        {
            id: 'modulo_3',
            titulo: 'Substantivos e Artigos',
            descricao: 'Estude os casos nominais e o sistema de declinações no grego koiné, fundamentais para compreensão textual.',
            icone: 'text_format',
            tempoEstimado: '25 min',
            numeroAtividades: 8,
            nivel: 'básico'
        },
        {
            id: 'modulo_4',
            titulo: 'Verbos no Presente',
            descricao: 'Compreenda a estrutura verbal do grego e aprenda a conjugação no tempo presente.',
            icone: 'history_edu',
            tempoEstimado: '30 min',
            numeroAtividades: 10,
            nivel: 'intermediário'
        },
        {
            id: 'modulo_5',
            titulo: 'Leitura de Textos Simples',
            descricao: 'Pratique a leitura de textos curtos do Novo Testamento aplicando os conhecimentos adquiridos.',
            icone: 'menu_book',
            tempoEstimado: '35 min',
            numeroAtividades: 12,
            nivel: 'avançado'
        }
    ];
}

// Gera o HTML de um módulo da trilha
function gerarHTMLModulo(trilha, index, container) {
    // Determinar se é o último item (sem conector inferior)
    const isLastItem = index === 4; // Ajuste conforme necessário
    
    const html = `
        <div class="trilha-module" data-modulo-id="${trilha.id}">
            <div class="module-badge ${index > 0 ? 'locked' : ''}" title="${trilha.nivel || 'Nível básico'}">
                <span class="material-symbols-sharp">${trilha.icone || 'school'}</span>
            </div>
            ${!isLastItem ? '<div class="module-connector"></div>' : ''}
            <div class="module-card ${index > 0 ? 'locked' : ''}">
                <a href="/leitor/leitor.html?trilha=${trilha.id}" class="module-link"></a>
                <div class="module-info">
                    <h3>${trilha.titulo}</h3>
                    <p>${trilha.descricao}</p>
                </div>
                <div class="module-details">
                    <span class="module-atividades">
                        <span class="material-symbols-sharp">assignment</span>
                        ${trilha.numeroAtividades || '5'} atividades
                    </span>
                    <span class="module-tempo">
                        <span class="material-symbols-sharp">schedule</span>
                        ${trilha.tempoEstimado || '15 min'}
                    </span>
                </div>
                <div class="module-progress">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
                <div class="module-status">
                    <span class="material-symbols-sharp">${index > 0 ? 'lock' : 'play_arrow'}</span>
                    <span class="status-text">${index > 0 ? 'Bloqueado' : 'Iniciar'}</span>
                </div>
                <button class="module-info-btn" data-modulo-id="${trilha.id}">
                    <span class="material-symbols-sharp">info</span>
                </button>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', html);
}

// Adiciona event listeners aos elementos dinâmicos
function adicionarEventListeners() {
    // Event listeners para botões de informação
    document.querySelectorAll('.module-info-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const moduloId = btn.getAttribute('data-modulo-id');
            abrirModalInfo(moduloId);
        });
    });
    
    // Event listeners para módulos (clique na área geral)
    document.querySelectorAll('.trilha-module').forEach(modulo => {
        modulo.addEventListener('click', () => {
            const moduloId = modulo.getAttribute('data-modulo-id');
            const isLocked = modulo.querySelector('.module-badge').classList.contains('locked');
            
            if (!isLocked) {
                window.location.href = `/leitor.html?trilha=${moduloId}`;
            } else {
                showToast('Este módulo ainda está bloqueado! Complete os módulos anteriores para desbloqueá-lo.');
            }
        });
    });
    
    // Configurar modal de informações
    const modal = document.getElementById('moduloInfoModal');
    const closeBtn = modal.querySelector('.close-modal');
    const iniciarBtn = document.getElementById('modulo-iniciar');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    iniciarBtn.addEventListener('click', () => {
        const moduloId = iniciarBtn.getAttribute('data-modulo-id');
        const modulo = document.querySelector(`.trilha-module[data-modulo-id="${moduloId}"]`);
        const isLocked = modulo.querySelector('.module-badge').classList.contains('locked');
        
        if (!isLocked) {
            window.location.href = `/leitor.html?trilha=${moduloId}`;
        } else {
            showToast('Este módulo ainda está bloqueado! Complete os módulos anteriores para desbloqueá-lo.');
            modal.style.display = 'none';
        }
    });
    
    document.getElementById('modulo-info').addEventListener('click', () => {
        const moduloId = iniciarBtn.getAttribute('data-modulo-id');
        // Aqui poderia abrir documentação detalhada ou um guia do módulo
        showToast('Funcionalidade de informações detalhadas em desenvolvimento!');
    });
}

// Abre o modal com informações do módulo
async function abrirModalInfo(moduloId) {
    try {
        // Obter informações do módulo (poderia ser feito com fetch)
        const trilhas = await obterListaTrilhas();
        const modulo = trilhas.find(t => t.id === moduloId);
        
        if (!modulo) throw new Error('Módulo não encontrado');
        
        // Preencher o modal com as informações
        document.getElementById('modulo-info-titulo').textContent = modulo.titulo;
        document.getElementById('modulo-info-descricao').textContent = modulo.descricao;
        document.getElementById('modulo-info-atividades').textContent = `${modulo.numeroAtividades || 5} atividades`;
        document.getElementById('modulo-info-tempo').textContent = modulo.tempoEstimado || '15 min';
        
        // Configurar botão de iniciar
        const iniciarBtn = document.getElementById('modulo-iniciar');
        iniciarBtn.setAttribute('data-modulo-id', moduloId);
        
        // Mostrar modal
        document.getElementById('moduloInfoModal').style.display = 'flex';
    } catch (error) {
        console.error('Erro ao abrir informações do módulo:', error);
        showToast('Não foi possível carregar as informações do módulo');
    }
}

// Carrega o progresso das trilhas
async function carregarProgressoTrilhas(modulosIds) {
    //console.log("Carregando progresso das trilhas:", modulosIds);
    
    for (let index = 0; index < modulosIds.length; index++) {
        const modulo = modulosIds[index];
        try {
            // Tentar carregar do IndexedDB primeiro
            let progresso = await loadProgress(modulo);
            //console.log('Tentando carregar do localStorage:', progresso);
            if (!progresso) {
                progresso = JSON.parse(localStorage.getItem(`trilha_${modulo}_progresso`));
            }
            atualizarUIModulo(modulo, progresso, index);
        } catch (error) {
            console.error('Erro ao carregar do IndexedDB:', error);
            
            // Fallback para localStorage
            const progressoSalvo = localStorage.getItem(`trilha_${modulo}_progresso`);
            
            
            if (progressoSalvo) {
                const progresso = JSON.parse(progressoSalvo);
                //console.log('Progresso carregado do localStorage:', progresso);
                
                atualizarUIModulo(modulo, progresso, index);
            }
        }
    }
}

// Atualiza a UI do módulo com base no progresso carregado
function atualizarUIModulo(modulo, progresso, index) {
    const indiceAtual = progresso.indiceAtual || 0;
    const trilhaCompletada = progresso.trilhaCompletada || [];
    //console.log("Progresso", progresso);
    
    // Buscar elementos do módulo
    const moduleCard = document.querySelector(`.trilha-module[data-modulo-id="${modulo}"] .module-card`);
    //console.log("Module Card", moduleCard);
    if (moduleCard) {
        //console.log('Atualizando UI do módulo:', modulo);
        
        const progressBar = moduleCard.querySelector('.progress-bar');
        const moduleStatus = moduleCard.querySelector('.module-status');
        
        // Verificar se é um módulo completo carregando JSON
        verificarModuloCompleto(modulo).then(numAtividades => {
            //console.log('Número de atividades no módulo:', numAtividades);
            
            if (progressBar && moduleStatus) {
                // Calcular progresso baseado no número de atividades
                const percentComplete = (trilhaCompletada.length / numAtividades) * 100;
                //console.log('Percentual completo:', percentComplete);
                
                progressBar.style.width = `${percentComplete}%`;
                
                if (percentComplete >= 100) {
                    moduleStatus.innerHTML = '<span class="material-symbols-sharp">check_circle</span> <span class="status-text">Concluído</span>';
                    moduleStatus.classList.add('completed');
                } else if (percentComplete > 0) {
                    moduleStatus.innerHTML = '<span class="material-symbols-sharp">play_arrow</span> <span class="status-text">Continuar</span>';
                }
                
                // Desbloquear próximo módulo se concluído
                if (percentComplete >= 100 && index < document.querySelectorAll('.trilha-module').length - 1) {
                    const nextModule = document.querySelectorAll('.trilha-module')[index + 1];
                    if (nextModule) {
                        nextModule.querySelector('.module-badge').classList.remove('locked');
                        nextModule.querySelector('.module-card').classList.remove('locked');
                        nextModule.querySelector('.module-status').innerHTML = 
                            '<span class="material-symbols-sharp">play_arrow</span> <span class="status-text">Iniciar</span>';
                    }
                }
            }
        });
    }
}

// Verifica quantas atividades existem no módulo
async function verificarModuloCompleto(moduloId) {
    try {
        const response = await fetch(`/trilhas/trilhas/${moduloId}.json`);
        if (response.ok) {
            const data = await response.json();
            return data.trilha ? data.trilha.length : 5;
        }
        return 5; // valor padrão
    } catch (error) {
        console.error('Erro ao verificar módulo:', error);
        return 5; // valor padrão em caso de erro
    }
}

// Toast de notificação simples
function showToast(message) {
    // Remover toast existente
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    // Criar novo toast
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remover após tempo
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}