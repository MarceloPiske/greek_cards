/**
 * Módulo para UI de trilhas de estudo 
 */

import { loadProgress } from 'indexedDB.js';
import { showToast } from 'src/js/utils/toast.js';

// Gera o HTML de um módulo da trilha
export function gerarHTMLModulo(trilha, index, container) {
    // Determinar se é o último item (sem conector inferior)
    const isLastItem = index === 4; // Ajuste conforme necessário
    
    const html = `
        <div class="trilha-module" data-modulo-id="${trilha.id}">
            <div class="module-badge ${index > 0 ? 'locked' : ''}" title="${trilha.nivel || 'Nível básico'}">
                <span class="material-symbols-sharp">${trilha.icone || 'school'}</span>
            </div>
            ${!isLastItem ? '<div class="module-connector"></div>' : ''}
            <div data-modulo-id="${trilha.id}" class="module-card ${index > 0 ? 'locked' : ''}">
                <a href="/leitor.html?trilha=${trilha.id}" class="module-link"></a>
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
export function adicionarEventListeners() {
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
export async function abrirModalInfo(moduloId) {
    try {
        // Importar dinamicamente para evitar dependência circular
        const { obterListaTrilhas } = await import('/src/js/trilhas/trilha-loader.js');
        
        // Obter informações do módulo
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

// Carrega e atualiza o progresso das trilhas
export async function carregarProgressoTrilhas(modulosIds) {
    console.log("Carregando progresso dos módulos:", modulosIds);
    
    for (let index = 0; index < modulosIds.length; index++) {
        const modulo = modulosIds[index];
        try {
            // Tentar carregar do IndexedDB primeiro
            const progresso = await loadProgress(modulo);
            atualizarUIModulo(modulo, progresso, index);
        } catch (error) {
            console.error('Erro ao carregar do IndexedDB:', error);
            
            // Fallback para localStorage
            const progressoSalvo = localStorage.getItem(`trilha_${modulo}_progresso`);
            if (progressoSalvo) {
                const progresso = JSON.parse(progressoSalvo);
                atualizarUIModulo(modulo, progresso, index);
            }
        }
    }
}

// Atualiza a UI do módulo com base no progresso
export function atualizarUIModulo(modulo, progresso, index) {
    console.log("Progresso", progresso);
    
    const indiceAtual = progresso.indiceAtual || 0;
    const trilhaCompletada = progresso.trilhaCompletada || [];
    
    // Buscar elementos do módulo
    const moduleCard = document.querySelector(`.trilha-module[data-modulo-id="${modulo}"] .module-card`);
    console.log("Module Card", moduleCard);
    
    if (moduleCard) {
        const progressBar = moduleCard.querySelector('.progress-bar');
        const moduleStatus = moduleCard.querySelector('.module-status');
        
        // Verificar se é um módulo completo carregando JSON
        verificarModuloCompleto(modulo).then(numAtividades => {
            if (progressBar && moduleStatus) {
                // Calcular progresso baseado no número de atividades
                const percentComplete = (trilhaCompletada.length / numAtividades) * 100;
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
        const response = await fetch(`trilhas/${moduloId}.json`);
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
