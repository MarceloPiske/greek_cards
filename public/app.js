// Theme switcher functionality
document.addEventListener('DOMContentLoaded', async () => {
    initThemeSwitcher();
    initLoginModal();
    
    // Initialize Firebase Authentication
    if (typeof window.firebaseAuth !== 'undefined') {
        try {
            await window.firebaseAuth.initAuth();
        } catch (error) {
            console.error('Failed to initialize Firebase Auth:', error);
        }
    }
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
            showModal(modal);
        });

        closeBtn.addEventListener('click', () => {
            hideModal(modal);
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal);
            }
        });
    }
}

// Enhanced modal functions
function showModal(modal) {
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Focus management
    const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
        firstFocusable.focus();
    }
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function hideModal(modal) {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 400);
    
    // Restore body scroll
    document.body.style.overflow = '';
}

// Login function - updated to use Firebase
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
        if (modal) hideModal(modal);
    }
};

// Export modal functions for global use
window.showModal = showModal;
window.hideModal = hideModal;