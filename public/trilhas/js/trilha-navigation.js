/**
 * Navigation setup for trilha viewer
 */

import { navigatePrevious, navigateNext } from './trilha-viewer.js';

/**
 * Setup navigation buttons
 * @param {Function} onPrev - Function to call on previous button click.
 * @param {Function} onNext - Function to call on next button click.
 */
export function setupNavigation(onPrev, onNext) {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', onPrev);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', onNext);
    }

    // Setup keyboard navigation, passing the same handlers
    setupKeyboardNavigation(onPrev, onNext);
}

/**
 * Setup keyboard navigation
 * @param {Function} onPrev - Function to call on ArrowLeft.
 * @param {Function} onNext - Function to call on ArrowRight.
 */
function setupKeyboardNavigation(onPrev, onNext) {
    document.addEventListener('keydown', (e) => {
        // Avoid triggering navigation when typing in form elements
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                onPrev();
                break;
            case 'ArrowRight':
                e.preventDefault();
                onNext();
                break;
            case 'Escape':
                window.location.href = 'trilhas/trilha_conteudo.html';
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