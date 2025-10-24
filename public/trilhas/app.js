/**
 * Enhanced Trilhas Application
 */

<<<<<<< HEAD
import { carregarTrilhasDisponiveis } from './trilha-loader.js?v=1.1';
// Import new sync system
import { initTrilhaProgressSync, getSyncStatus } from './js/trilha-progress-sync.js?v=1.1';
=======
import { carregarTrilhasDisponiveis } from './trilha-loader.js';
// Import new sync system
import { initTrilhaProgressSync, getSyncStatus } from './js/trilha-progress-sync.js';
>>>>>>> 485a7111651673321d36bac1405974bd151865fc

// Initialize progress manager and enhanced features
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize new sync system
        await initTrilhaProgressSync();
        
        // Initialize progress manager
        if (window.progressManager) {
            await window.progressManager.initProgressDB();
        }
        
        // Initialize enhanced features
        await initializeEnhancedFeatures();
        
        // Setup back button
        const backButton = document.getElementById('back-button');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location.href = '/';
            });
        }
        
        // Load available trilhas with enhanced loading
        await carregarTrilhasDisponiveis();
        
        // Initialize search and filter functionality
        initializeSearchAndFilter();
        
        // Initialize keyboard shortcuts
        initializeKeyboardShortcuts();
        
        // Initialize analytics if premium user
        if (window.planManager?.canSyncToCloud()) {
            initializeAnalytics();
        }
        
        console.log('Enhanced trilhas app initialized successfully');
        
    } catch (error) {
        console.error('Error initializing enhanced trilhas app:', error);
        showEnhancedError('Erro ao inicializar aplicação', error.message);
    }
});

/**
 * Initialize enhanced features
 */
async function initializeEnhancedFeatures() {
    // Initialize theme system
    initializeThemeSystem();
    
    // Initialize accessibility features
    initializeAccessibilityFeatures();
    
    // Initialize performance monitoring
    initializePerformanceMonitoring();
    
    // Initialize offline capabilities
    initializeOfflineCapabilities();
    
    // Initialize premium features if available
    if (window.planManager) {
        await initializePremiumFeatures();
    }
}

/**
 * Initialize theme system with enhanced options
 */
function initializeThemeSystem() {
    // Check for system theme preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('trilha-theme');
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    document.body.setAttribute('data-theme', theme);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!savedTheme) {
            document.body.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });
    
    // Enhanced theme switcher
    const themeSwitch = document.querySelector('.theme-switch');
    if (themeSwitch) {
        themeSwitch.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('trilha-theme', newTheme);
            
            // Update theme switch icons
            updateThemeSwitchIcons(newTheme);
            
            // Show theme change notification
            showToast(`Tema alterado para ${newTheme === 'dark' ? 'escuro' : 'claro'}`, 'success');
        });
        
        // Initialize theme switch icons
        updateThemeSwitchIcons(theme);
    }
}

/**
 * Update theme switch icons
 */
function updateThemeSwitchIcons(theme) {
    const sunIcon = document.querySelector('.theme-icon.sun');
    const moonIcon = document.querySelector('.theme-icon.moon');
    
    if (sunIcon && moonIcon) {
        if (theme === 'dark') {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    }
}

/**
 * Initialize accessibility features
 */
function initializeAccessibilityFeatures() {
    // High contrast mode support
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    if (prefersHighContrast) {
        document.body.classList.add('high-contrast');
    }
    
    // Reduced motion support
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        document.body.classList.add('reduced-motion');
    }
    
    // Focus management for modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            const modal = document.querySelector('.modal[style*="flex"]');
            if (modal) {
                trapFocus(e, modal);
            }
        }
    });
    
    // Skip to content link
    addSkipToContentLink();
}

/**
 * Add skip to content link for screen readers
 */
function addSkipToContentLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-to-content';
    skipLink.textContent = 'Pular para o conteúdo principal';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: var(--accent);
        color: white;
        padding: 0.5rem 1rem;
        text-decoration: none;
        border-radius: 4px;
<<<<<<< HEAD
=======
        z-index: 10000;
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
        transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', () => {
        skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
        skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Add main content ID if not exists
    const mainContent = document.querySelector('main');
    if (mainContent && !mainContent.id) {
        mainContent.id = 'main-content';
    }
}

/**
 * Trap focus within modal
 */
function trapFocus(e, modal) {
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.shiftKey) {
        if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
        }
    } else {
        if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
        }
    }
}

/**
 * Initialize performance monitoring
 */
function initializePerformanceMonitoring() {
    // Monitor page load performance
    window.addEventListener('load', () => {
        const perfData = performance.getEntriesByType('navigation')[0];
        const loadTime = perfData.loadEventEnd - perfData.fetchStart;
        
        console.log(`Page load time: ${Math.round(loadTime)}ms`);
        
        // Send to analytics if premium user
        if (window.planManager?.canSyncToCloud()) {
            // Analytics implementation would go here
        }
    });
    
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.duration > 50) {
                    console.warn(`Long task detected: ${entry.duration}ms`);
                }
            }
        });
        
        observer.observe({ entryTypes: ['longtask'] });
    }
}

/**
 * Initialize offline capabilities
 */
function initializeOfflineCapabilities() {
    // Check if service worker is supported
    if ('serviceWorker' in navigator) {
        // Service worker registration would go here
        // For now, just monitor online/offline status
        
        window.addEventListener('online', () => {
            showToast('Conexão reestabelecida', 'success');
            // Sync any pending data
            syncPendingData();
        });
        
        window.addEventListener('offline', () => {
            showToast('Você está offline. Alguns recursos podem não estar disponíveis.', 'warning', 5000);
        });
    }
}

/**
 * Sync pending offline data
 */
async function syncPendingData() {
    if (window.progressManager && window.planManager?.canSyncToCloud()) {
        try {
            // Implementation for syncing offline progress to cloud
            console.log('Syncing offline data...');
        } catch (error) {
            console.error('Error syncing offline data:', error);
        }
    }
}

/**
 * Initialize premium features
 */
async function initializePremiumFeatures() {
    const userPlan = window.planManager.getCurrentUserPlan();
    
    // Show premium indicators
    if (userPlan === 'cloud' || userPlan === 'ai') {
        document.body.classList.add('premium-user');
        
        // Add premium badge to navigation
        addPremiumBadge(userPlan);
    }
    
    // Initialize cloud sync indicators
    if (window.planManager.canSyncToCloud()) {
        initializeCloudSyncIndicators();
    }
    
    // Initialize AI features
    if (window.planManager.hasAIAccess()) {
        initializeAIFeatures();
    }
}

/**
 * Add premium badge to navigation
 */
function addPremiumBadge(plan) {
    const navActions = document.querySelector('.nav-actions');
    if (navActions && !document.querySelector('.premium-badge')) {
        const badge = document.createElement('div');
        badge.className = 'premium-badge';
        
        const planIcons = {
            cloud: '☁️',
            ai: '🤖'
        };
        
        badge.innerHTML = `
            <span class="premium-icon">${planIcons[plan] || '⭐'}</span>
            <span class="premium-text">Premium</span>
        `;
        
        navActions.insertBefore(badge, navActions.firstChild);
    }
}

/**
 * Initialize cloud sync indicators
 */
function initializeCloudSyncIndicators() {
    // Add sync status indicator
    const syncIndicator = document.createElement('div');
    syncIndicator.id = 'sync-indicator';
    syncIndicator.className = 'sync-indicator';
    syncIndicator.innerHTML = `
        <span class="material-symbols-sharp">cloud_sync</span>
        <span class="sync-status">Sincronizado</span>
    `;
    
    const header = document.querySelector('.page-header');
    if (header) {
        header.appendChild(syncIndicator);
    }
    
    // Monitor sync status using new system
    monitorSyncStatus();
}

/**
 * Monitor cloud sync status
 */
function monitorSyncStatus() {
    const indicator = document.getElementById('sync-indicator');
    if (!indicator) return;
    
    setInterval(() => {
        // Use new sync system
        const status = getSyncStatus();
        
        if (status.canSync && status.isOnline) {
            indicator.classList.remove('syncing', 'error', 'offline');
            indicator.classList.add('synced');
            indicator.querySelector('.sync-status').textContent = 'Sincronizado';
        } else if (!status.isOnline) {
            indicator.classList.remove('synced', 'syncing');
            indicator.classList.add('offline');
            indicator.querySelector('.sync-status').textContent = 'Offline';
        } else if (status.syncInProgress) {
            indicator.classList.remove('synced', 'offline');
            indicator.classList.add('syncing');
            indicator.querySelector('.sync-status').textContent = 'Sincronizando...';
        }
    }, 5000);
}

/**
 * Initialize AI features
 */
function initializeAIFeatures() {
    // Add AI assistant button
    const aiButton = document.createElement('button');
    aiButton.className = 'ai-assistant-btn floating-btn';
    aiButton.innerHTML = `
        <span class="material-symbols-sharp">smart_toy</span>
        <span class="btn-text">IA Tutora</span>
    `;
    
    aiButton.addEventListener('click', openAIAssistant);
    
    document.body.appendChild(aiButton);
}

/**
 * Open AI assistant
 */
function openAIAssistant() {
    // Implementation for AI assistant would go here
    showToast('IA Tutora em desenvolvimento! Em breve você terá acesso a explicações personalizadas.', 'info', 5000);
}

/**
 * Initialize search and filter functionality
 */
function initializeSearchAndFilter() {
    const searchInput = document.getElementById('search-trilhas');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    if (searchInput) {
        // Enhanced search with debouncing and history
        let searchTimeout;
        let searchHistory = JSON.parse(localStorage.getItem('search-history') || '[]');
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch(e.target.value);
                
                // Save to search history
                if (e.target.value && !searchHistory.includes(e.target.value)) {
                    searchHistory.unshift(e.target.value);
                    searchHistory = searchHistory.slice(0, 5); // Keep only 5 recent searches
                    localStorage.setItem('search-history', JSON.stringify(searchHistory));
                }
            }, 300);
        });
        
        // Show search suggestions
        searchInput.addEventListener('focus', showSearchSuggestions);
        searchInput.addEventListener('blur', hideSearchSuggestions);
    }
    
    // Enhanced filter functionality
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state with animation
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.getAttribute('data-filter');
            applyFilter(filter);
            
            // Update URL to reflect current filter
            updateURLWithFilter(filter);
        });
    });
    
    // Initialize filter from URL
    initializeFilterFromURL();
}

/**
 * Show search suggestions
 */
function showSearchSuggestions() {
    const searchInput = document.getElementById('search-trilhas');
    const searchHistory = JSON.parse(localStorage.getItem('search-history') || '[]');
    
    if (searchHistory.length === 0) return;
    
    const suggestions = document.createElement('div');
    suggestions.className = 'search-suggestions';
    suggestions.innerHTML = `
        <div class="suggestions-header">Buscas recentes</div>
        ${searchHistory.map(term => `
            <div class="suggestion-item" data-term="${term}">
                <span class="material-symbols-sharp">history</span>
                <span>${term}</span>
            </div>
        `).join('')}
    `;
    
    // Position suggestions
    const rect = searchInput.getBoundingClientRect();
    suggestions.style.cssText = `
        position: absolute;
        top: ${rect.bottom + 5}px;
        left: ${rect.left}px;
        width: ${rect.width}px;
        background: var(--bg-secondary);
        border: 1px solid var(--shadow);
        border-radius: 8px;
        box-shadow: 0 8px 25px var(--shadow);
<<<<<<< HEAD
        /* z-index: 1000; */
=======
        z-index: 1000;
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
        max-height: 200px;
        overflow-y: auto;
    `;
    
    // Add click handlers
    suggestions.addEventListener('click', (e) => {
        const suggestionItem = e.target.closest('.suggestion-item');
        if (suggestionItem) {
            const term = suggestionItem.getAttribute('data-term');
            searchInput.value = term;
            performSearch(term);
            suggestions.remove();
        }
    });
    
    document.body.appendChild(suggestions);
    
    // Remove on outside click
    setTimeout(() => {
        document.addEventListener('click', function removeSuggestions(e) {
            if (!suggestions.contains(e.target) && e.target !== searchInput) {
                suggestions.remove();
                document.removeEventListener('click', removeSuggestions);
            }
        });
    }, 100);
}

/**
 * Hide search suggestions
 */
function hideSearchSuggestions() {
    setTimeout(() => {
        const suggestions = document.querySelector('.search-suggestions');
        if (suggestions) suggestions.remove();
    }, 200);
}

/**
 * Update URL with current filter
 */
function updateURLWithFilter(filter) {
    const url = new URL(window.location);
    if (filter && filter !== 'all') {
        url.searchParams.set('filter', filter);
    } else {
        url.searchParams.delete('filter');
    }
    
    window.history.replaceState({}, '', url);
}

/**
 * Initialize filter from URL
 */
function initializeFilterFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const filter = urlParams.get('filter');
    
    if (filter) {
        const filterBtn = document.querySelector(`[data-filter="${filter}"]`);
        if (filterBtn) {
            filterBtn.click();
        }
    }
}

/**
 * Initialize keyboard shortcuts
 */
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Global shortcuts that work when not typing
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            switch (e.key) {
                case '/':
                    e.preventDefault();
                    document.getElementById('search-trilhas')?.focus();
                    break;
                case '?':
                    e.preventDefault();
                    showKeyboardShortcutsModal();
                    break;
                case 'h':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        window.location.href = '/';
                    }
                    break;
            }
        }
        
        // Shortcuts that work globally
        if (e.key === 'Escape') {
            // Close any open modals
            const openModal = document.querySelector('.modal[style*="flex"]');
            if (openModal) {
                closeModal(openModal);
            } else {
                // Clear search if focused
                const searchInput = document.getElementById('search-trilhas');
                if (document.activeElement === searchInput) {
                    searchInput.value = '';
                    performSearch('');
                    searchInput.blur();
                }
            }
        }
    });
}

/**
 * Show keyboard shortcuts modal
 */
function showKeyboardShortcutsModal() {
    const modalHtml = `
        <div class="modal shortcuts-modal" style="display: flex;">
            <div class="modal-content">
                <button class="close-modal">&times;</button>
                <h2>Atalhos do Teclado</h2>
                <div class="shortcuts-sections">
                    <div class="shortcuts-section">
                        <h3>Navegação</h3>
                        <div class="shortcut-item">
                            <kbd>/</kbd>
                            <span>Focar na busca</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Esc</kbd>
                            <span>Fechar modal / Limpar busca</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Ctrl</kbd> + <kbd>H</kbd>
                            <span>Voltar ao início</span>
                        </div>
                    </div>
                    
                    <div class="shortcuts-section">
                        <h3>Módulos</h3>
                        <div class="shortcut-item">
                            <kbd>Ctrl</kbd> + <kbd>1-5</kbd>
                            <span>Abrir módulo rápido</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Enter</kbd>
                            <span>Iniciar módulo selecionado</span>
                        </div>
                    </div>
                    
                    <div class="shortcuts-section">
                        <h3>Ajuda</h3>
                        <div class="shortcut-item">
                            <kbd>?</kbd>
                            <span>Mostrar atalhos</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.querySelector('.shortcuts-modal');
    setupModalCloseHandlers(modal);
}

/**
 * Initialize analytics for premium users
 */
function initializeAnalytics() {
    // Track page views
    trackPageView();
    
    // Track user interactions
    trackUserInteractions();
    
    // Track performance metrics
    trackPerformanceMetrics();
}

/**
 * Track page view
 */
function trackPageView() {
    const pageData = {
        page: 'trilhas-index',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        referrer: document.referrer
    };
    
    console.log('Page view tracked:', pageData);
    
    // Send to analytics service if implemented
}

/**
 * Track user interactions
 */
function trackUserInteractions() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-track]');
        if (target) {
            const eventData = {
                event: 'click',
                element: target.getAttribute('data-track'),
                timestamp: new Date().toISOString()
            };
            
            console.log('Interaction tracked:', eventData);
        }
    });
}

/**
 * Track performance metrics
 */
function trackPerformanceMetrics() {
    // Track Core Web Vitals
    if ('web-vital' in window) {
        // Implementation would use web-vitals library
    }
    
    // Track custom metrics
    const metricsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            console.log('Performance metric:', entry.name, entry.value);
        }
    });
    
    metricsObserver.observe({ entryTypes: ['measure'] });
}

/**
 * Utility functions
 */

function performSearch(query) {
<<<<<<< HEAD
    // Implementation delegated to trilha-ui.js?v=1.1
=======
    // Implementation delegated to trilha-ui.js
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
    if (window.performEnhancedSearch) {
        window.performEnhancedSearch(query);
    }
}

function applyFilter(filter) {
    // Implementation would go here
    console.log('Applying filter:', filter);
}

function closeModal(modal) {
    if (window.closeModalWithAnimation) {
        window.closeModalWithAnimation(modal);
    } else {
        modal.style.display = 'none';
    }
}

function setupModalCloseHandlers(modal) {
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal(modal));
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
    });
}

function showToast(message, type = 'info', duration = 3000) {
<<<<<<< HEAD
    // Implementation delegated to trilha-ui.js?v=1.1
=======
    // Implementation delegated to trilha-ui.js
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
    if (window.trilhaUI && window.trilhaUI.showToast) {
        window.trilhaUI.showToast(message, type, duration);
    } else {
        console.log(`Toast: ${message}`);
    }
}

function showEnhancedError(title, message) {
    const errorHtml = `
        <div class="modal error-modal" style="display: flex;">
            <div class="modal-content">
                <div class="error-icon">
                    <span class="material-symbols-sharp">error</span>
                </div>
                <h2>${title}</h2>
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn primary" onclick="window.location.reload()">
                        Tentar novamente
                    </button>
                    <button class="btn secondary" onclick="closeModal(this.closest('.modal'))">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', errorHtml);
}

// Export functions for global scope
window.trilhaApp = {
    performSearch,
    applyFilter,
    closeModal,
    showToast,
    showEnhancedError
};