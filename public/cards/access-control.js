/**
 * Access Control Utilities for Feature Restrictions
 */

import { 
    hasFeatureAccess, 
    getPlanLimit, 
    hasReachedLimit, 
    showUpgradeModal, 
    getCurrentUserPlan, 
    canSyncToCloud,
    hasAIAccess,
    hasMultiDeviceAccess,
    canGenerateReports,
    needsUpgradeFor,
    PLANS
} from '../plan-manager.js';

// Import unified list functions from sync system
import { getAllWordLists } from './lists/lists-sync.js';

/**
 * Check if user can create a new word list - Updated to allow offline creation for free users
 */
export async function canCreateWordList() {
    try {
        const lists = await getAllWordLists();
        const currentCount = lists.length;
        
        // Free users can create unlimited lists offline
        // Premium users get cloud sync
        return true; // Always allow creation, sync capability depends on plan
    } catch (error) {
        console.error('Error checking word list limit:', error);
        return false;
    }
}

/**
 * Check if user can add words to vocabulary
 */
export async function canAddWords(wordsToAdd = 1) {
    // For now, we don't limit individual words, just lists
    // But this could be extended in the future
    return true;
}

/**
 * Check if user can access advanced features
 */
export function canAccessAdvancedFeatures() {
    return hasFeatureAccess('advancedAnalytics');
}

/**
 * Check if user can export content
 */
export function canExportContent() {
    return hasFeatureAccess('pdfExport');
}

/**
 * Guard function for word list creation - Updated for offline support
 */
export async function guardWordListCreation() {
    // Always allow creation for offline storage
    // Premium users get additional cloud sync
    return true;
}

/**
 * Guard function for cloud sync features
 */
export function guardCloudSync() {
    if (!canSyncToCloud()) {
        showUpgradeModal('cloudSync', PLANS.CLOUD);
        return false;
    }
    
    return true;
}

/**
 * Guard function for AI features
 */
export function guardAIFeatures() {
    if (!hasAIAccess()) {
        showUpgradeModal('aiAccess', PLANS.AI);
        return false;
    }
    
    return true;
}

/**
 * Guard function for multi-device features
 */
export function guardMultiDevice() {
    if (!hasMultiDeviceAccess()) {
        showUpgradeModal('multiDevice', PLANS.CLOUD);
        return false;
    }
    
    return true;
}

/**
 * Guard function for progress reports
 */
export function guardProgressReports() {
    if (!canGenerateReports()) {
        showUpgradeModal('reports', PLANS.CLOUD);
        return false;
    }
    
    return true;
}

/**
 * Show plan status with new plan structure
 */
export function showPlanStatus() {
    const plan = getCurrentUserPlan();
    const { getPlanCapabilities } = require('./plan-manager.js');
    const capabilities = getPlanCapabilities();
    
    console.log(`Current Plan: ${capabilities.displayName}`);
    console.log('Storage Type:', capabilities.storageType);
    console.log('Features:', {
        cloudSync: capabilities.canSync,
        aiAccess: capabilities.canUseAI,
        multiDevice: capabilities.multiDevice,
        reports: capabilities.progressReports
    });
    
    return capabilities;
}

/**
 * Add plan badge to UI elements with new plan styling
 */
export function addPlanBadge(element, feature, requiredPlan = PLANS.CLOUD) {
    if (needsUpgradeFor(feature)) {
        const badge = document.createElement('span');
        badge.className = 'premium-badge';
        
        if (requiredPlan === PLANS.AI) {
            badge.textContent = '🤖 IA';
            badge.title = 'Funcionalidade de IA - upgrade para Plano Inteligente';
        } else if (requiredPlan === PLANS.CLOUD) {
            badge.textContent = '☁️ NUVEM';
            badge.title = 'Funcionalidade em nuvem - upgrade para Plano Nuvem';
        }
        
        element.appendChild(badge);
        element.classList.add('premium-feature');
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.accessControl = {
        canCreateWordList,
        canAddWords,
        canAccessAdvancedFeatures,
        canExportContent,
        guardWordListCreation,
        guardCloudSync,
        guardAIFeatures,
        guardMultiDevice,
        guardProgressReports,
        showPlanStatus,
        addPlanBadge
    };
}