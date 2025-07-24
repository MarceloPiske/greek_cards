/**
 * Navigation setup for trilha viewer
 */

import { navigatePrevious, navigateNext } from './trilha-viewer.js';

/**
 * Setup navigation buttons
 */
export function setupNavigation() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', navigatePrevious);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', navigateNext);
    }

    // Setup keyboard navigation
    setupKeyboardNavigation();
}

/**
 * Setup keyboard navigation
 */
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                navigatePrevious();
                break;
            case 'ArrowRight':
                e.preventDefault();
                navigateNext();
                break;
            case 'Escape':
                window.location.href = 'trilha_conteudo.html';
                break;
        }
    });
}

/**
 * Setup mobile navigation
 */
export function setupMobileNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', !isExpanded);
            document.body.classList.toggle('nav-open');
        });
        
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.navbar')) {
                navMenu.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
                document.body.classList.remove('nav-open');
            }
        });
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                navMenu.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
                document.body.classList.remove('nav-open');
            }
        });
    }
}

/**
 * Initialize theme switcher
 */
export function initThemeSwitcher() {
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