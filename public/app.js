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
        if (modal) modal.style.display = 'none';
    }
};