/**
 * Initialize trilha viewer
 */

<<<<<<< HEAD
import { initViewer, navigateNext, navigatePrevious } from './trilha-viewer.js?v=1.1';
import { setupNavigation, setupMobileNavigation, initThemeSwitcher } from './trilha-navigation.js?v=1.1';
=======
import { initViewer, navigateNext, navigatePrevious } from './trilha-viewer.js';
import { setupNavigation, setupMobileNavigation, initThemeSwitcher } from './trilha-navigation.js';
>>>>>>> 485a7111651673321d36bac1405974bd151865fc

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await initViewer();
    // Pass the navigation functions to the navigation setup
    setupNavigation(navigatePrevious, navigateNext);
    setupMobileNavigation();
    initThemeSwitcher();
});