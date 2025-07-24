/**
 * Main application file for vocabulary cards
 */

import { 
    initVocabularyDB, 
    loadUserDataFromFirebase,
    importGreekLexicon
} from './vocabulary.js';
import { initVocabularyUI } from './ui.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize Firebase Authentication
        if (typeof window.firebaseAuth !== 'undefined') {
            await window.firebaseAuth.initAuth();
        }
        
        // Initialize the database
        await initVocabularyDB();
        
        // Load system vocabulary from JSON if not already loaded
        await loadSystemVocabulary();
        
        // Load user data from Firebase if premium user
        if (window.firebaseAuth && window.firebaseAuth.isAuthenticated()) {
            try {
                await loadUserDataFromFirebase();
            } catch (error) {
                console.warn('Could not load user data from Firebase:', error);
            }
        }
        
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
        
    } catch (error) {
        console.error('Error initializing application:', error);
        alert('Erro ao inicializar a aplicação');
    }
});

/**
 * Load system vocabulary from JSON files
 */
async function loadSystemVocabulary() {
    try {
        // Check if system vocabulary already exists
        const db = await initVocabularyDB();
        const tx = db.transaction('systemVocabulary', 'readonly');
        const store = tx.objectStore('systemVocabulary');
        
        // Count existing entries
        const countRequest = store.count();
        const existingCount = await new Promise((resolve, reject) => {
            countRequest.onsuccess = () => resolve(countRequest.result);
            countRequest.onerror = () => reject(countRequest.error);
        });
        
        // If we already have vocabulary, skip loading
        if (existingCount > 0) {
            console.log(`System vocabulary already loaded (${existingCount} entries)`);
            return;
        }
        
        console.log('Loading system vocabulary from JSON...');
        
        // Load from the combined JSON file
        const response = await fetch('/json_output/STRONGS_WORD_COMBINADO.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const lexiconData = await response.json();
        console.log(`Loaded ${lexiconData.length} vocabulary entries from JSON`);
        
        // Import into IndexedDB
        await importGreekLexicon(lexiconData);
        
        console.log('System vocabulary loaded successfully');
    } catch (error) {
        console.error('Error loading system vocabulary:', error);
        // Don't throw - app should still work without system vocabulary
    }
}

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
            
            // For now, show a message that module-specific vocabulary is coming soon
            document.getElementById('system-vocabulary-container').innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-sharp">construction</span>
                    <h3>Em desenvolvimento</h3>
                    <p>O vocabulário por módulos estará disponível em breve. Por enquanto, use a aba "Vocabulário do Sistema" para ver todas as palavras.</p>
                </div>
            `;

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

// Theme switcher functionality
function initThemeSwitcher() {
    const themeSwitch = document.querySelector('.theme-switch');
    if (!themeSwitch) return;
    
    const sunIcon = themeSwitch.querySelector('.sun');
    const moonIcon = themeSwitch.querySelector('.moon');
    let isDark = false;

    themeSwitch.addEventListener('click', () => {
        isDark = !isDark;
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        if (sunIcon) sunIcon.style.display = isDark ? 'block' : 'none';
        if (moonIcon) moonIcon.style.display = isDark ? 'none' : 'block';
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

// Initialize theme and login when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initThemeSwitcher();
    initLoginModal();
});

// Login function
window.loginWith = async function(provider) {
    if (typeof window.firebaseAuth !== 'undefined') {
        try {
            await window.firebaseAuth.loginWith(provider);
        } catch (error) {
            console.error(`Error logging in with ${provider}:`, error);
        }
    } else {
        console.log(`Logging in with ${provider} - Firebase not available`);
        const modal = document.getElementById('loginModal');
        if (modal) modal.style.display = 'none';
    }
};