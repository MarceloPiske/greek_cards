/**
 * Módulo para carregamento e gerenciamento de trilhas de estudo
 */

/* import { loadProgress } from '../indexedDB.js'; */
import { 
    gerarHTMLModulo 
} from './trilha-ui-components.js';

import { setupModuleInteractions,
         adicionarEventListeners,
       carregarProgressoTrilhas
       } from './trilha-ui-interactions.js';

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
            // Configurar interações para cada módulo
            setupModuleInteractions(trilha.id, index);
        });
        
        // Carregar e atualizar progresso das trilhas
        await carregarProgressoTrilhas(trilhasDisponiveis.map(t => t.id));
        
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
        const response = await fetch('trilhas/trilhas/index.json');
        
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
                tempoEstimado: '35 min',
                numeroAtividades: 4,
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
            titulo: 'Contexto Histórico do Grego Koiné',
            descricao: 'Primeiros passos no estudo do grego bíblico, incluindo vocabulário básico e leitura interlinear.',
            icone: 'school',
            tempoEstimado: '35 min',
            numeroAtividades: 4,
            nivel: 'iniciante'
        },
        {
            id: 'modulo_2',
            titulo: 'Alfabeto e Pronúncia',
            descricao: 'Aprenda a reconhecer e pronunciar as letras do alfabeto grego, a base para ler textos originais.',
            icone: 'abc',
            tempoEstimado: '35 min',
            numeroAtividades: 2,
            nivel: 'iniciante'
        }
    ];
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
export async function verificarModuloCompleto(moduloId) {
    try {
        const response = await fetch(`trilhas/trilhas/${moduloId}.json`);
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
    toast.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--accent);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        ">${message}</div>
    `;
    
    document.body.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => {
        toast.firstElementChild.style.transform = 'translateX(0)';
    }, 10);
    
    // Remover após tempo
    setTimeout(() => {
        toast.firstElementChild.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}