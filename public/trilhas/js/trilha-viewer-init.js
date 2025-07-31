/**
 * Initialize trilha viewer
 */

import { initViewer, navigateNext, navigatePrevious } from './trilha-viewer.js';
import { setupNavigation, setupMobileNavigation, initThemeSwitcher } from './trilha-navigation.js';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await initViewer();
    // Pass the navigation functions to the navigation setup
    setupNavigation(navigatePrevious, navigateNext);
    setupMobileNavigation();
    initThemeSwitcher();
});