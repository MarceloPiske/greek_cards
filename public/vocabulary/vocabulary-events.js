/**
 * Vocabulary Event Handlers
 */

export class VocabularyEventHandlers {
    constructor() {
        this.setupMobileNavigation();
        this.setupAuth();
        this.setupBackButton();
    }

    setupMobileNavigation() {
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', function() {
                navMenu.classList.toggle('active');
                const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
                navToggle.setAttribute('aria-expanded', !isExpanded);
                document.body.classList.toggle('nav-open');
            });
        }
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.navbar')) {
                if (navMenu) navMenu.classList.remove('active');
                if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
                document.body.classList.remove('nav-open');
            }
        });
    }

    setupAuth() {
        const themeSwitch = document.querySelector('.theme-switch');
        if (themeSwitch) {
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

    setupBackButton() {
        const backButton = document.getElementById('back-button');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location.href = '/';
            });
        }
    }
}

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