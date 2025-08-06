/**
 * UI Interactions Module for Trilhas de Estudo 
 * Handles user interactions, event handlers, search, filters, and progress updates
 */

// Import components
import { 
    showToast, 
    initializeModuleFeatures,
    generateProgressPreview,
    generateActivityPreviewList,
    showLoadingModal,
    hideLoadingModal,
    closeModalWithAnimation,
    showResetConfirmationDialog,
    showModulePreview,
    hideModulePreview,
    verificarModuloCompleto
} from './trilha-ui-components.js?v=1.1';

// Import new sync system
import { loadTrilhaProgress, getCompletionPercentage } from './js/trilha-progress-sync.js?v=1.1';

// Setup enhanced module interactions
export function setupModuleInteractions(moduleId, index) {
    const moduleElement = document.querySelector(`[data-modulo-id="${moduleId}"]`);
    if (!moduleElement) {
        console.warn(`Module element not found for ID: ${moduleId}`);
        return;
    }
    
    // Main module click handler
    const moduleCard = moduleElement.querySelector('.module-card');
    if (moduleCard) {
        moduleCard.addEventListener('click', (e) => {
            // Don't trigger if clicking on buttons
            if (e.target.closest('button')) return;
            
            const isLocked = moduleCard.classList.contains('locked');
            
            if (!isLocked) {
                // Add loading state
                moduleCard.classList.add('loading');
                
                // Navigate with smooth transition
                setTimeout(() => {
                    window.location.href = `./trilha_viewer.html?trilha=${moduleId}`;
                }, 300);
            } else {
                showUnlockRequirement(index);
            }
        });
    }
    
    // Bookmark button
    const bookmarkBtn = moduleElement.querySelector('.module-bookmark-btn');
    if (bookmarkBtn) {
        bookmarkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleModuleBookmark(moduleId);
        });
    }
    
    // Info button
    const infoBtn = moduleElement.querySelector('.module-info-btn');
    if (infoBtn) {
        infoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            abrirModalInfoEnhanced(moduleId);
        });
    }
    
    // Enhanced hover effects
    if (moduleCard && !moduleCard.classList.contains('locked')) {
        moduleCard.addEventListener('mouseenter', () => {
            moduleCard.classList.add('hover-preview');
            showModulePreview(moduleId);
        });
        
        moduleCard.addEventListener('mouseleave', () => {
            moduleCard.classList.remove('hover-preview');
            hideModulePreview();
        });
    }
}

// Show unlock requirement message
function showUnlockRequirement(index) {
    const previousModule = index > 0 ? `módulo ${index}` : 'módulos anteriores';
    showToast(
        `Este módulo está bloqueado! Complete o ${previousModule} para desbloqueá-lo.`,
        'warning',
        4000
    );
}

// Toggle module bookmark
function toggleModuleBookmark(moduleId) {
    const bookmarkBtn = document.querySelector(`[data-modulo-id="${moduleId}"] .module-bookmark-btn`);
    const icon = bookmarkBtn.querySelector('.material-symbols-sharp');
    
    const isBookmarked = icon.textContent === 'bookmark';
    
    if (isBookmarked) {
        icon.textContent = 'bookmark_border';
        bookmarkBtn.title = 'Marcar como favorito';
        showToast('Removido dos favoritos', 'info');
    } else {
        icon.textContent = 'bookmark';
        bookmarkBtn.title = 'Remover dos favoritos';
        showToast('Adicionado aos favoritos', 'success');
    }
    
    // Save bookmark state
    saveModuleBookmark(moduleId, !isBookmarked);
}

// Save module bookmark state
function saveModuleBookmark(moduleId, isBookmarked) {
    try {
        const bookmarks = JSON.parse(localStorage.getItem('module-bookmarks') || '[]');
        
        if (isBookmarked && !bookmarks.includes(moduleId)) {
            bookmarks.push(moduleId);
        } else if (!isBookmarked) {
            const index = bookmarks.indexOf(moduleId);
            if (index > -1) bookmarks.splice(index, 1);
        }
        
        localStorage.setItem('module-bookmarks', JSON.stringify(bookmarks));
    } catch (error) {
        console.warn('Could not save bookmark:', error);
    }
}

// Load module bookmark states
function loadModuleBookmarks() {
    try {
        const bookmarks = JSON.parse(localStorage.getItem('module-bookmarks') || '[]');
        
        bookmarks.forEach(moduleId => {
            const bookmarkBtn = document.querySelector(`[data-modulo-id="${moduleId}"] .module-bookmark-btn`);
            if (bookmarkBtn) {
                const icon = bookmarkBtn.querySelector('.material-symbols-sharp');
                icon.textContent = 'bookmark';
                bookmarkBtn.title = 'Remover dos favoritos';
            }
        });
    } catch (error) {
        console.warn('Could not load bookmarks:', error);
    }
}

// Enhanced event listeners setup
export function adicionarEventListeners() {
    // Enhanced info button handlers
    document.querySelectorAll('.module-info-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const moduloId = btn.getAttribute('data-modulo-id');
            abrirModalInfoEnhanced(moduloId);
        });
    });
    
    // Enhanced search functionality
    const searchInput = document.getElementById('search-trilhas');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performEnhancedSearch(e.target.value);
            }, 300);
        });
        
        // Clear search on escape
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.target.value = '';
                performEnhancedSearch('');
            }
        });
    }
    
    // Enhanced filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.getAttribute('data-filter');
            applyEnhancedFilter(filter);
        });
    });
    
    // Enhanced modal setup
    setupEnhancedModal();
    
    // Load bookmarks
    loadModuleBookmarks();
    
    // Setup keyboard shortcuts
    setupGlobalKeyboardShortcuts();
}

// Enhanced search functionality
function performEnhancedSearch(query) {
    const modules = document.querySelectorAll('.trilha-module');
    const lowercaseQuery = query.toLowerCase();
    
    let visibleCount = 0;
    
    modules.forEach(module => {
        const title = module.querySelector('.module-title').textContent.toLowerCase();
        const description = module.querySelector('.module-description').textContent.toLowerCase();
        const nivel = module.getAttribute('data-nivel').toLowerCase();
        
        const matches = title.includes(lowercaseQuery) || 
                       description.includes(lowercaseQuery) || 
                       nivel.includes(lowercaseQuery);
        
        if (matches || query === '') {
            module.style.display = 'block';
            module.classList.remove('search-hidden');
            visibleCount++;
            
            if (query !== '') {
                // Highlight matching text
                highlightSearchText(module, query);
            } else {
                removeSearchHighlights(module);
            }
        } else {
            module.style.display = 'none';
            module.classList.add('search-hidden');
        }
    });
    
    // Show no results message
    updateSearchResultsMessage(visibleCount, query);
}

// Highlight search text
function highlightSearchText(module, query) {
    const title = module.querySelector('.module-title');
    const description = module.querySelector('.module-description');
    
    [title, description].forEach(element => {
        const text = element.textContent;
        const regex = new RegExp(`(${query})`, 'gi');
        const highlightedText = text.replace(regex, '<mark>$1</mark>');
        element.innerHTML = highlightedText;
    });
}

// Remove search highlights
function removeSearchHighlights(module) {
    const title = module.querySelector('.module-title');
    const description = module.querySelector('.module-description');
    
    [title, description].forEach(element => {
        element.innerHTML = element.textContent;
    });
}

// Update search results message
function updateSearchResultsMessage(count, query) {
    let messageContainer = document.querySelector('.search-results-message');
    
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.className = 'search-results-message';
        const trilhaContainer = document.getElementById('trilhas-container');
        trilhaContainer.insertBefore(messageContainer, trilhaContainer.firstChild);
    }
    
    if (query && count === 0) {
        messageContainer.innerHTML = `
            <div class="no-results">
                <span class="material-symbols-sharp">search_off</span>
                <h3>Nenhum resultado encontrado</h3>
                <p>Não encontramos módulos para "${query}". Tente outros termos.</p>
                <button class="btn secondary" onclick="document.getElementById('search-trilhas').value=''; performEnhancedSearch('')">
                    Limpar busca
                </button>
            </div>
        `;
        messageContainer.style.display = 'block';
    } else if (query && count > 0) {
        messageContainer.innerHTML = `
            <div class="search-summary">
                <span class="material-symbols-sharp">search</span>
                <span>Encontrados ${count} módulo${count !== 1 ? 's' : ''} para "${query}"</span>
            </div>
        `;
        messageContainer.style.display = 'block';
    } else {
        messageContainer.style.display = 'none';
    }
}

// Enhanced filter functionality
function applyEnhancedFilter(filter) {
    const modules = document.querySelectorAll('.trilha-module');
    
    modules.forEach(module => {
        const nivel = module.getAttribute('data-nivel');
        const progressBar = module.querySelector('.progress-bar');
        const progressWidth = progressBar ? parseFloat(progressBar.style.width) || 0 : 0;
        const isCompleted = progressWidth >= 100;
        
        let shouldShow = false;
        
        switch (filter) {
            case 'all':
                shouldShow = true;
                break;
            case 'iniciante':
            case 'intermediario':
            case 'avancado':
                shouldShow = nivel === filter;
                break;
            case 'completed':
                shouldShow = isCompleted;
                break;
            case 'in-progress':
                shouldShow = progressWidth > 0 && progressWidth < 100;
                break;
            case 'not-started':
                shouldShow = progressWidth === 0;
                break;
        }
        
        if (shouldShow && !module.classList.contains('search-hidden')) {
            module.style.display = 'block';
            module.classList.add('filter-visible');
        } else {
            module.style.display = 'none';
            module.classList.remove('filter-visible');
        }
    });
    
    // Update filter results count
    updateFilterResultsCount(filter);
}

// Update filter results count
function updateFilterResultsCount(filter) {
    const visibleModules = document.querySelectorAll('.trilha-module.filter-visible').length;
    const filterBtn = document.querySelector(`[data-filter="${filter}"]`);
    
    if (filterBtn) {
        const existingCount = filterBtn.querySelector('.filter-count');
        if (existingCount) existingCount.remove();
        
        if (filter !== 'all') {
            const countSpan = document.createElement('span');
            countSpan.className = 'filter-count';
            countSpan.textContent = visibleModules;
            filterBtn.appendChild(countSpan);
        }
    }
}

// Enhanced modal info
export async function abrirModalInfoEnhanced(moduloId) {
    try {
        showLoadingModal();
        
        // Load module data
        const response = await fetch(`./trilhas/${moduloId}.json`);
        if (!response.ok) throw new Error('Módulo não encontrado');
        
        const data = await response.json();
        const modulo = data.modulo;
        const trilha = data.trilha;
        
        // Load progress data
        const progressData = window.progressManager ? 
            await window.progressManager.loadProgress(moduloId) : null;
        
        hideLoadingModal();
        
        if (!modulo) throw new Error('Estrutura de módulo inválida');
        
        // Enhanced modal content
        const modalHtml = `
            <div class="modal enhanced-modal" id="moduloInfoModal" style="display: flex;" opacity: 100; aria-hidden="false">
                <div class="modal-content modulo-info-content">
                    <button class="close-modal" aria-label="Fechar modal">&times;</button>
                    
                    <div class="modal-header">
                        <div class="module-icon-container">
                            <span class="material-symbols-sharp" id="modal-module-icon">${modulo.icone || 'school'}</span>
                        </div>
                        <h2 id="modulo-info-titulo">${modulo.titulo}</h2>
                        <div class="module-badges">
                            <span class="level-badge ${modulo.nivel}">${modulo.nivel || 'iniciante'}</span>
                            <span class="time-badge">
                                <span class="material-symbols-sharp">schedule</span>
                                ${modulo.tempo || '15 min'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="modal-body">
                        <div class="modulo-descricao enhanced-description" id="modulo-info-descricao">
                            ${modulo.descricao}
                        </div>
                        
                        <div class="modulo-stats enhanced-stats">
                            <div class="stat-item">
                                <span class="material-symbols-sharp">assignment</span>
                                <div class="stat-content">
                                    <span id="modulo-info-atividades">${trilha?.length || 5} atividades</span>
                                    <small>Conteúdos disponíveis</small>
                                </div>
                            </div>
                            <div class="stat-item">
                                <span class="material-symbols-sharp">schedule</span>
                                <div class="stat-content">
                                    <span id="modulo-info-tempo">${modulo.tempo || '15 min'}</span>
                                    <small>Tempo estimado</small>
                                </div>
                            </div>
                            <div class="stat-item">
                                <span class="material-symbols-sharp">trending_up</span>
                                <div class="stat-content">
                                    <span id="modulo-info-nivel">${modulo.nivel || 'Iniciante'}</span>
                                    <small>Nível de dificuldade</small>
                                </div>
                            </div>
                        </div>

                        ${progressData ? generateProgressPreview(progressData, trilha) : ''}
                        
                        <div class="content-preview">
                            <h4>Conteúdo do módulo</h4>
                            <div class="activity-preview-list">
                                ${trilha ? generateActivityPreviewList(trilha, progressData) : ''}
                            </div>
                        </div>
                        
                        <div class="module-features-list">
                            <h4>Recursos disponíveis</h4>
                            <div class="features-grid">
                                <div class="feature-item">
                                    <span class="material-symbols-sharp">menu_book</span>
                                    <span>Conteúdo interativo</span>
                                </div>
                                <div class="feature-item">
                                    <span class="material-symbols-sharp">quiz</span>
                                    <span>Exercícios práticos</span>
                                </div>
                                <div class="feature-item ${window.planManager?.canSyncToCloud() ? 'available' : 'premium-only'}">
                                    <span class="material-symbols-sharp">cloud_sync</span>
                                    <span>Progresso na nuvem</span>
                                    ${!window.planManager?.canSyncToCloud() ? '<span class="premium-badge">Premium</span>' : ''}
                                </div>
                                <div class="feature-item ${window.planManager?.hasAIAccess() ? 'available' : 'premium-only'}">
                                    <span class="material-symbols-sharp">smart_toy</span>
                                    <span>IA tutora</span>
                                    ${!window.planManager?.hasAIAccess() ? '<span class="premium-badge">Premium</span>' : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <div class="modulo-acoes">
                            <button id="modulo-iniciar" class="modulo-acao-btn primary enhanced-btn" data-modulo-id="${moduloId}">
                                <span class="material-symbols-sharp">play_arrow</span> 
                                <span class="btn-text">${progressData?.blocosConcluidos?.length > 0 ? 'Continuar' : 'Iniciar'} módulo</span>
                            </button>
                            ${progressData?.blocosConcluidos?.length > 0 ? `
                            <button id="modulo-reset" class="modulo-acao-btn secondary">
                                <span class="material-symbols-sharp">refresh</span> 
                                Reiniciar progresso
                            </button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal and add new one
        const existingModal = document.getElementById('moduloInfoModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Setup enhanced modal interactions
        setupEnhancedModalInteractions(moduloId);
        
        // Show modal with proper animation
        const modal = document.getElementById('moduloInfoModal');
        modal.setAttribute('aria-hidden', 'false');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Focus management
        setTimeout(() => {
            modal.classList.add('show');
            const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }, 50);
        
    } catch (error) {
        hideLoadingModal();
        console.error('Erro ao abrir informações do módulo:', error);
        showToast('Não foi possível carregar as informações do módulo', 'error');
    }
}

// Enhanced modal setup
function setupEnhancedModal() {
    // Close modal handlers
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-modal')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                closeModalWithAnimationEnhanced(modal);
            }
        }
        
        if (e.target.classList.contains('modal')) {
            closeModalWithAnimationEnhanced(e.target);
        }
    });
    
    // Escape key handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[style*="flex"], .modal.show');
            if (openModal) {
                closeModalWithAnimationEnhanced(openModal);
            }
        }
    });
}

// Enhanced modal close with proper cleanup
function closeModalWithAnimationEnhanced(modal) {
    if (!modal) return;
    
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    
    setTimeout(() => {
        modal.style.display = 'none';
        if (modal.parentNode) {
            modal.remove();
        }
        // Restore body scroll
        document.body.style.overflow = '';
    }, 400);
}

// Enhanced modal interactions setup
function setupEnhancedModalInteractions(moduloId) {
    const modal = document.getElementById('moduloInfoModal');
    const iniciarBtn = document.getElementById('modulo-iniciar');
    const resetBtn = document.getElementById('modulo-reset');
    const closeBtn = modal.querySelector('.close-modal');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeModalWithAnimationEnhanced(modal);
        });
    }
    
    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModalWithAnimationEnhanced(modal);
        }
    });
    
    if (iniciarBtn) {
        iniciarBtn.addEventListener('click', () => {
            // Check if module is locked
            const moduleCard = document.querySelector(`[data-modulo-id="${moduloId}"] .module-card`);
            const isLocked = moduleCard?.classList.contains('locked');
            
            if (!isLocked) {
                closeModalWithAnimationEnhanced(modal);
                
                // Add loading state
                if (moduleCard) {
                    moduleCard.classList.add('loading');
                }
                
                setTimeout(() => {
                    window.location.href = `./trilha_viewer.html?trilha=${moduloId}`;
                }, 300);
            } else {
                showToast('Este módulo ainda está bloqueado!', 'warning');
                closeModalWithAnimationEnhanced(modal);
            }
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            showResetConfirmationDialogEnhanced(moduloId);
        });
    }
}

// Enhanced reset confirmation dialog
function showResetConfirmationDialogEnhanced(moduloId) {
    const confirmHtml = `
        <div class="modal confirmation-modal" style="display: flex; z-index: 10001;" aria-hidden="false">
            <div class="modal-content">
                <button class="close-modal" aria-label="Fechar modal">&times;</button>
                <h3>Reiniciar progresso</h3>
                <p>Tem certeza de que deseja reiniciar todo o progresso deste módulo? Esta ação não pode ser desfeita.</p>
                <div class="modal-actions">
                    <button class="btn secondary" onclick="closeModalWithAnimationEnhanced(this.closest('.modal'))">
                        Cancelar
                    </button>
                    <button class="btn danger" onclick="confirmResetProgress('${moduloId}')">
                        Sim, reiniciar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', confirmHtml);
    
    const confirmModal = document.querySelector('.confirmation-modal');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        confirmModal.classList.add('show');
    }, 50);
}

// Global keyboard shortcuts
function setupGlobalKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch (e.key) {
            case '/':
                e.preventDefault();
                document.getElementById('search-trilhas')?.focus();
                break;
            case 'Escape':
                // Clear search if focused
                const searchInput = document.getElementById('search-trilhas');
                if (document.activeElement === searchInput) {
                    searchInput.value = '';
                    performEnhancedSearch('');
                }
                break;
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
                // Quick module access
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const moduleIndex = parseInt(e.key) - 1;
                    const modules = document.querySelectorAll('.trilha-module');
                    if (modules[moduleIndex]) {
                        modules[moduleIndex].querySelector('.module-card').click();
                    }
                }
                break;
        }
    });
}

// Enhanced progress loading and updating
export async function carregarProgressoTrilhas(modulosIds) {
    console.log("Carregando progresso dos módulos:", modulosIds);
    
    // Load overall statistics
    await updateOverallStatistics(modulosIds);
    
    for (let index = 0; index < modulosIds.length; index++) {
        const modulo = modulosIds[index];
        try {
            // Use new sync system
            const progresso = await loadTrilhaProgress(modulo);
            
            // Update UI with enhanced visuals
            await atualizarUIModuloEnhanced(modulo, progresso, index);
            
        } catch (error) {
            console.error('Erro ao carregar progresso:', error);
            
            // Ultimate fallback to localStorage
            const progressoSalvo = localStorage.getItem(`trilha_${modulo}_progresso`);
            if (progressoSalvo) {
                const progresso = JSON.parse(progressoSalvo);
                await atualizarUIModuloEnhanced(modulo, progresso, index);
            }
        }
    }
}

// Update overall statistics
async function updateOverallStatistics(modulosIds) {
    let totalProgress = 0;
    let totalTime = 0;
    let completedModules = 0;
    
    for (const moduloId of modulosIds) {
        try {
            // Use new sync system
            const progresso = await loadTrilhaProgress(moduloId);
            
            if (progresso) {
                const moduleData = await verificarModuloCompleto(moduloId);
                // Use new sync system
                const completionPercent = getCompletionPercentage(progresso, moduleData);
                
                totalProgress += completionPercent;
                totalTime += progresso.tempoTotal || 0;
                
                if (completionPercent >= 100) {
                    completedModules++;
                }
            }
        } catch (error) {
            console.warn(`Could not load progress for ${moduloId}:`, error);
        }
    }
    
    // Update statistics in header
    const avgProgress = Math.round(totalProgress / modulosIds.length);
    
    const totalProgressEl = document.getElementById('total-progress');
    const totalTimeEl = document.getElementById('total-time');
    const completedModulesEl = document.getElementById('completed-modules');
    
    if (totalProgressEl) {
        animateValue(totalProgressEl, 0, avgProgress, 1000, (value) => `${value}%`);
    }
    
    if (totalTimeEl) {
        animateValue(totalTimeEl, 0, totalTime, 1000, (value) => `${value} min`);
    }
    
    if (completedModulesEl) {
        animateValue(completedModulesEl, 0, completedModules, 1000);
    }
}

// Animate number values
function animateValue(element, start, end, duration, formatter = (v) => v) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = formatter(Math.round(current));
    }, 16);
}

// Enhanced UI module update
export async function atualizarUIModuloEnhanced(modulo, progresso, index) {
    const moduleElement = document.querySelector(`.trilha-module[data-modulo-id="${modulo}"]`);
    if (!moduleElement) return;
    
    const moduleCard = moduleElement.querySelector('.module-card');
    const progressBar = moduleElement.querySelector('.progress-bar');
    const moduleStatus = moduleElement.querySelector('.module-status');
    const progressPercentage = moduleElement.querySelector('.progress-percentage');
    const completedActivities = moduleElement.querySelector('.completed-activities');
    const timeSpent = moduleElement.querySelector('.time-spent');
    
    try {
        const numAtividades = await verificarModuloCompleto(modulo);
        const completedCount = progresso.blocosConcluidos?.length || 0;
        const percentComplete = Math.round((completedCount / numAtividades) * 100);
        const totalTime = progresso.tempoTotal || 0;
        
        // Update progress bar with animation
        if (progressBar) {
            // Animate progress bar
            const currentWidth = parseFloat(progressBar.style.width) || 0;
            animateProgressBar(progressBar, currentWidth, percentComplete);
            
            // Update progress steps
            updateProgressSteps(modulo, numAtividades, completedCount);
        }
        
        // Update progress percentage
        if (progressPercentage) {
            animateValue(progressPercentage, 0, percentComplete, 800, (v) => `${v}%`);
        }
        
        // Update completed activities count
        if (completedActivities) {
            completedActivities.textContent = `${completedCount} de ${numAtividades} concluídas`;
        }
        
        // Update time spent
        if (timeSpent) {
            timeSpent.textContent = `${totalTime} min estudados`;
        }
        
        // Update module status
        if (moduleStatus) {
            const statusIcon = moduleStatus.querySelector('.material-symbols-sharp');
            const statusText = moduleStatus.querySelector('.status-text');
            
            if (percentComplete >= 100) {
                statusIcon.textContent = 'check_circle';
                statusText.textContent = 'Concluído';
                moduleStatus.classList.add('completed');
                
                // Add completed animation without celebration notification
                moduleCard.classList.add('completed');
                
            } else if (percentComplete > 0) {
                statusIcon.textContent = 'play_arrow';
                statusText.textContent = 'Continuar';
                moduleStatus.classList.add('in-progress');
            }
        }
        
        // Unlock next module if current is completed (without notification)
        if (percentComplete >= 100 && index < document.querySelectorAll('.trilha-module').length - 1) {
            const nextModule = document.querySelectorAll('.trilha-module')[index + 1];
            if (nextModule) {
                unlockModuleWithoutNotification(nextModule);
            }
        }
        
        // Update premium features visibility
        updatePremiumFeaturesVisibility(moduleElement);
        
    } catch (error) {
        console.error('Error updating module UI:', error);
    }
}

// Animate progress bar
function animateProgressBar(progressBar, fromWidth, toWidth) {
    const duration = 1000;
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentWidth = fromWidth + (toWidth - fromWidth) * easeOut;
        
        progressBar.style.width = `${currentWidth}%`;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    requestAnimationFrame(animate);
}

// Update progress steps visualization
function updateProgressSteps(moduleId, totalSteps, completedSteps) {
    const stepsContainer = document.getElementById(`progress-steps-${moduleId}`);
    if (!stepsContainer) return;
    
    stepsContainer.innerHTML = '';
    
    for (let i = 0; i < totalSteps; i++) {
        const step = document.createElement('div');
        step.className = 'progress-step';
        
        if (i < completedSteps) {
            step.classList.add('completed');
        } else if (i === completedSteps) {
            step.classList.add('current');
        }
        
        stepsContainer.appendChild(step);
    }
}

// Unlock module without animation or notification
function unlockModuleWithoutNotification(moduleElement) {
    const moduleBadge = moduleElement.querySelector('.module-badge');
    const moduleCard = moduleElement.querySelector('.module-card');
    const moduleStatus = moduleElement.querySelector('.module-status');
    
    // Remove locked state
    moduleBadge.classList.remove('locked');
    moduleCard.classList.remove('locked');
    
    // Update status without animation
    const statusIcon = moduleStatus.querySelector('.material-symbols-sharp');
    const statusText = moduleStatus.querySelector('.status-text');
    
    statusIcon.textContent = 'play_arrow';
    statusText.textContent = 'Iniciar';
    moduleStatus.classList.remove('locked');
}

// Update premium features visibility
function updatePremiumFeaturesVisibility(moduleElement) {
    const featuresContainer = moduleElement.querySelector('.module-features');
    if (!featuresContainer) return;
    
    const cloudFeature = featuresContainer.querySelector('[data-premium="cloud"]');
    const aiFeature = featuresContainer.querySelector('[data-premium="ai"]');
    
    if (window.planManager) {
        const canSync = window.planManager.canSyncToCloud();
        const hasAI = window.planManager.hasAIAccess();
        
        if (canSync && cloudFeature) {
            cloudFeature.classList.add('available');
            cloudFeature.title = 'Progresso sincronizado na nuvem';
        }
        
        if (hasAI && aiFeature) {
            aiFeature.classList.add('available');
            aiFeature.title = 'IA tutora disponível';
        }
        
        // Show features if any premium features are available
        if (canSync || hasAI) {
            featuresContainer.style.display = 'flex';
        }
    }
}

// Confirm reset progress
window.confirmResetProgress = async function(moduloId) {
    try {
        // Reset progress logic here
        if (window.progressManager) {
            // This would need to be implemented in progress-manager
            await window.progressManager.resetProgress(moduloId);
        }
        
        // Remove confirmation modal
        document.querySelector('.confirmation-modal').remove();
        
        // Close info modal
        const infoModal = document.getElementById('moduloInfoModal');
        if (infoModal) closeModalWithAnimationEnhanced(infoModal);
        
        // Refresh the page to show updated progress
        window.location.reload();
        
        showToast('Progresso reiniciado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Error resetting progress:', error);
        showToast('Erro ao reiniciar progresso', 'error');
    }
};

// Make functions available globally
if (typeof window !== 'undefined') {
    window.performEnhancedSearch = performEnhancedSearch;
    window.closeModalWithAnimation = closeModalWithAnimationEnhanced;
    window.closeModalWithAnimationEnhanced = closeModalWithAnimationEnhanced;
}