/**
 * Main application file for vocabulary cards
 */

import { 
    initVocabularyDB, 
    addSystemVocabulary,
    WordCategories
} from './vocabulary.js';
import { initVocabularyUI } from './ui.js';
import { showToast } from '../src/js/utils/toast.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize the database
        await initVocabularyDB();
        
        // Initialize the UI
        await initVocabularyUI();
        
        // Set up back button
        const backButton = document.getElementById('back-button');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location.href = '/';
            });
        }
        
        // Set up module selection
        setupModuleSelection();
        
        // Set up import lexicon button
        /* const importLexiconBtn = document.getElementById('import-lexicon-btn');
        if (importLexiconBtn) {
            importLexiconBtn.addEventListener('click', () => {
                import('./ui.js').then(module => {
                    module.showImportLexiconModal();
                });
            });
        } */
        
        // Add sample vocabulary for demonstration if needed
        //await checkAndAddSampleVocabulary();
    } catch (error) {
        console.error('Error initializing application:', error);
        showToast('Erro ao inicializar a aplicação');
    }
});

/**
 * Set up module selection for system vocabulary
 */
function setupModuleSelection() {
    const moduleSelect = document.getElementById('module-select');
    if (!moduleSelect) return;
    
    moduleSelect.addEventListener('change', async () => {
        const moduleId = moduleSelect.value;
        if (!moduleId) {
            document.getElementById('system-vocabulary-container').innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-sharp">school</span>
                    <h3>Selecione um módulo</h3>
                    <p>Escolha um módulo para ver o vocabulário do sistema</p>
                </div>
            `;
            return;
        }
        
        try {
            // Show loading state
            document.getElementById('system-vocabulary-container').innerHTML = `
                <div class="loading-state">
                    <span class="material-symbols-sharp loading-icon">sync</span>
                    <p>Carregando vocabulário do módulo...</p>
                </div>
            `;
            
            // Load module vocabulary
            const response = await fetch(`/trilhas/${moduleId}.json`); //FIXME - COrrigir antes de subir para produção
            if (!response.ok) {
                throw new Error('Não foi possível carregar o módulo');
            }
            
            const moduleData = await response.json();
            
            // Extract vocabulary from module activities
            const vocabularyActivities = moduleData.trilha.filter(
                activity => activity.tipo === 'vocabulário'
            );
            
            if (vocabularyActivities.length === 0) {
                document.getElementById('system-vocabulary-container').innerHTML = `
                    <div class="empty-state">
                        <span class="material-symbols-sharp">menu_book</span>
                        <h3>Nenhum vocabulário encontrado</h3>
                        <p>Este módulo não contém atividades de vocabulário</p>
                    </div>
                `;
                return;
            }
            
            // Combine vocabulary from all activities
            let vocabularyWords = [];
            vocabularyActivities.forEach(activity => {
                vocabularyWords = vocabularyWords.concat(activity.conteúdo);
            });
            
            // Add categories if not present
            vocabularyWords = vocabularyWords.map(word => ({
                ...word,
                categoria: word.PART_OF_SPEECH || WordCategories.OTHER
            }));
            
            // Store in system vocabulary
            await addSystemVocabulary(moduleId, vocabularyWords);

        } catch (error) {
            console.error('Error loading module vocabulary:', error);
            document.getElementById('system-vocabulary-container').innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-sharp">error</span>
                    <h3>Erro ao carregar vocabulário</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    });
}

/**
 * Check if we need to add sample vocabulary for demonstration
 */
// Theme switcher functionality
document.addEventListener('DOMContentLoaded', () => {
    initThemeSwitcher();
    initLoginModal();
});

function initThemeSwitcher() {
    const themeSwitch = document.querySelector('.theme-switch');
    const sunIcon = themeSwitch.querySelector('.sun');
    const moonIcon = themeSwitch.querySelector('.moon');
    let isDark = false;

    themeSwitch.addEventListener('click', () => {
        isDark = !isDark;
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        sunIcon.style.display = isDark ? 'block' : 'none';
        moonIcon.style.display = isDark ? 'none' : 'block';
    });
}

function initLoginModal() {
    const loginBtn = document.querySelector('.login-button');
    const modal = document.getElementById('loginModal');
    const closeBtn = document.querySelector('.close-modal');

    if (loginBtn && modal && closeBtn) {
        loginBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

// Login function
window.loginWith = function(provider) {
    console.log(`Logging in with ${provider}`);
    // Implement actual authentication logic here
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'none';
};
