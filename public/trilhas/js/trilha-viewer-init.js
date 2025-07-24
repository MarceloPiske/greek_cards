/**
 * Initialize trilha viewer
 */

import { initViewer } from './trilha-viewer.js';
import { setupNavigation, setupMobileNavigation, initThemeSwitcher } from './trilha-navigation.js';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await initViewer();
    setupNavigation();
    setupMobileNavigation();
    initThemeSwitcher();
});
