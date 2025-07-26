/**
 * Main modal export module - re-exports functionality from sub-modules
 */

// Re-export word detail modal
export { 
    showWordDetailModal
} from './modal-creation.js';

// Re-export practice session functions
export { 
    startPracticeSession
} from './modal-practice.js';

// Re-export utilities
export { 
    debounce,
    getStatusLabel
} from './modal-utils.js';