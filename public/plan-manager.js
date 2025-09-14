/**
 * Plan Management and Access Control Module
 */

import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Available plans - Updated to new 3-tier structure
export const PLANS = {
    FREE: 'free',
    CLOUD: 'cloud', 
    AI: 'ai'
};

// Plan features configuration - Updated for new structure
export const PLAN_FEATURES = {
    [PLANS.FREE]: {
        name: 'Plano Gratuito',
        displayName: '🔹 Gratuito',
        cloudSync: false,
        aiAccess: false,
        multiDevice: false,
        progressReports: false,
        pdfExport: false,
        advancedAnalytics: false,
        storage: 'local', // IndexedDB only
        maxModules: 999, // No module limit for free users
        maxLists: 5, // 5 lists for free users
        description: 'Acesso aos módulos básicos com armazenamento local'
    },
    [PLANS.CLOUD]: {
        name: 'Plano Nuvem',
        displayName: '☁️ Nuvem',
        cloudSync: true,
        aiAccess: false,
        multiDevice: true,
        progressReports: true,
        pdfExport: false,
        advancedAnalytics: true,
        storage: 'cloud', // Firestore sync
        maxModules: 999,
        maxLists: 10, // 10 lists for cloud users
        description: 'Progresso sincronizado na nuvem, acesso em múltiplos dispositivos'
    },
    [PLANS.AI]: {
        name: 'Plano Inteligente',
        displayName: '🤖 Inteligente', 
        cloudSync: true,
        aiAccess: true,
        multiDevice: true,
        progressReports: true,
        pdfExport: true,
        advancedAnalytics: true,
        storage: 'cloud', // Firestore + AI Backend
        maxModules: 999,
        maxLists: 10, // 10 lists for ai users
        description: 'Tudo do plano Nuvem + IA tutora, explicações personalizadas'
    }
};

let currentUser = null;
let userPlan = null;

/**
 * Initialize user document in Firestore with new plan structure
 */
export async function initializeUserDocument(user) {
    try {
        if (!user || typeof window === 'undefined' || !window.firebaseAuth?.db) {
            return null;
        }

        const db = window.firebaseAuth.db;
        const userRef = doc(db, 'users', user.uid);
        
        // Check if user document already exists
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            // Create new user document with free plan
            const userData = {
                uid: user.uid,
                nome: user.displayName || user.email.split('@')[0],
                email: user.email,
                plano: PLANS.FREE, // Start with free plan
                criadoEm: serverTimestamp(),
                ultimoAcesso: serverTimestamp(),
                settings: {
                    language: 'pt',
                    notifications: true,
                    theme: 'light'
                },
                activity: {
                    streak: 0,
                    lessonsCompleted: 0,
                    wordsLearned: 0,
                    totalStudyTime: 0
                }
            };

            await setDoc(userRef, userData);
            currentUser = { uid: user.uid, ...userData };
            userPlan = PLANS.FREE;
            
            console.log('User document created with free plan');
        } else {
            // Update last access
            await updateDoc(userRef, {
                ultimoAcesso: serverTimestamp()
            });
            
            const data = userDoc.data();
            currentUser = { uid: user.uid, ...data };
            userPlan = data.plan || PLANS.FREE;
            
            console.log(`User loaded with plan: ${userPlan}`);
        }
        
        return currentUser;
    } catch (error) {
        console.error('Error initializing user document:', error);
        // Fallback to free plan if there's an error
        userPlan = PLANS.FREE;
        return null;
    }
}

/**
 * Get current user plan
 */
export function getCurrentUserPlan() {
    return userPlan || PLANS.FREE;
}

/**
 * Get current user data
 */
export function getCurrentUserData() {
    return currentUser;
}

/**
 * Check if user has access to a feature
 */
export function hasFeatureAccess(feature) {
    const plan = getCurrentUserPlan();
    const planFeatures = PLAN_FEATURES[plan];
    
    if (!planFeatures) {
        return false;
    }
    
    return planFeatures[feature] === true;
}

/**
 * Check if user can sync to cloud (cloud or ai plans)
 */
export function canSyncToCloud() {
    const plan = getCurrentUserPlan();
    return plan === PLANS.CLOUD || plan === PLANS.AI;
}

/**
 * Check if user has AI access (ai plan only)
 */
export function hasAIAccess() {
    return getCurrentUserPlan() === PLANS.AI;
}

/**
 * Check if user can use multi-device features
 */
export function hasMultiDeviceAccess() {
    const plan = getCurrentUserPlan();
    return plan === PLANS.CLOUD || plan === PLANS.AI;
}

/**
 * Check if user can generate progress reports
 */
export function canGenerateReports() {
    const plan = getCurrentUserPlan();
    return plan === PLANS.CLOUD || plan === PLANS.AI;
}

/**
 * Check if user can export PDFs
 */
export function canExportPDF() {
    return hasFeatureAccess('pdfExport');
}

/**
 * Get plan limits for a feature
 */
export function getPlanLimit(limitType) {
    const plan = getCurrentUserPlan();
    const planFeatures = PLAN_FEATURES[plan];
    
    if (!planFeatures) {
        return 0;
    }
    
    return planFeatures[limitType] || 0;
}

/**
 * Check if user has reached a limit
 */
export async function hasReachedLimit(limitType, currentCount) {
    const limit = getPlanLimit(limitType);
    
    if (limit === 999 || limit === 9999) {
        // Unlimited for practical purposes
        return false;
    }
    
    return currentCount >= limit;
}

/**
 * Update user plan (admin function or subscription webhook)
 */
export async function updateUserPlan(userId, newPlan, expiresAt = null) {
    try {
        if (!window.firebaseAuth?.db) {
            throw new Error('Firebase not initialized');
        }

        const db = window.firebaseAuth.db;
        const userRef = doc(db, 'users', userId);
        
        const updateData = {
            plano: newPlan,
            expiresAt: expiresAt,
            updatedAt: serverTimestamp()
        };

        await updateDoc(userRef, updateData);
        
        // Update local data if it's current user
        if (currentUser && currentUser.uid === userId) {
            userPlan = newPlan;
            currentUser.plan = newPlan;
            currentUser.expiresAt = expiresAt;
        }
        
        console.log(`User plan updated to: ${newPlan}`);
        return true;
    } catch (error) {
        console.error('Error updating user plan:', error);
        return false;
    }
}

/**
 * Check if user plan is expired
 */
export function isPlanExpired() {
    if (!currentUser || !currentUser.expiresAt) {
        return false;
    }
    
    const now = new Date();
    const expiryDate = currentUser.expiresAt.toDate ? currentUser.expiresAt.toDate() : new Date(currentUser.expiresAt);
    
    return now > expiryDate;
}

/**
 * Get plan display information
 */
export function getPlanInfo(planId = null) {
    const plan = planId || getCurrentUserPlan();
    return PLAN_FEATURES[plan] || PLAN_FEATURES[PLANS.FREE];
}

/**
 * Show upgrade modal for premium features - Updated for new plans
 */
export function showUpgradeModal(feature, requiredPlan = PLANS.CLOUD) {
    // Use new plan selection modal instead of old upgrade modal
    if (typeof window !== 'undefined' && window.mercadoPago) {
        window.mercadoPago.showPlanSelectionModal();
        return;
    }
    
    // Fallback to old modal if mercado pago not available
    const currentPlan = getCurrentUserPlan();
    const targetPlan = PLAN_FEATURES[requiredPlan];
    const currentPlanInfo = PLAN_FEATURES[currentPlan];
    
    let featureDescription = '';
    let upgradeMessage = '';
    
    if (requiredPlan === PLANS.CLOUD) {
        featureDescription = 'Esta funcionalidade requer sincronização na nuvem';
        upgradeMessage = `
            <h3>Upgrade para ${targetPlan.displayName}:</h3>
            <ul>
                <li>✅ Progresso sincronizado na nuvem</li>
                <li>✅ Acesso em múltiplos dispositivos</li>
                <li>✅ Relatórios de progresso</li>
                <li>✅ Análises avançadas</li>
            </ul>
        `;
    } else if (requiredPlan === PLANS.AI) {
        featureDescription = 'Esta funcionalidade requer acesso à IA tutora';
        upgradeMessage = `
            <h3>Upgrade para ${targetPlan.displayName}:</h3>
            <ul>
                <li>✅ Tudo do plano Nuvem</li>
                <li>🤖 IA tutora personalizada</li>
                <li>✅ Explicações detalhadas</li>
                <li>✅ Sugestões personalizadas</li>
                <li>✅ Exportação em PDF</li>
            </ul>
        `;
    }
    
    const modalHtml = `
        <div class="modal" id="upgrade-modal" aria-hidden="true">
            <div class="modal-content">
                <button class="close-modal" aria-label="Fechar modal">&times;</button>
                <h2>🚀 Upgrade Necessário</h2>
                <div class="upgrade-content">
                    <p>${featureDescription}</p>
                    <div class="current-plan-info">
                        <h4>Seu plano atual: ${currentPlanInfo.displayName}</h4>
                        <p>${currentPlanInfo.description}</p>
                    </div>
                    <div class="feature-list">
                        ${upgradeMessage}
                    </div>
                </div>
                <div class="modal-actions">
                    <button id="cancel-upgrade" class="btn">Talvez mais tarde</button>
                    <button id="confirm-upgrade" class="btn primary">Ver Planos</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('upgrade-modal');
    
    const closeBtn = modal.querySelector('.close-modal');
    const cancelBtn = modal.querySelector('#cancel-upgrade');
    const upgradeBtn = modal.querySelector('#confirm-upgrade');
    
    closeBtn.addEventListener('click', () => {
        window.hideModal(modal);
        setTimeout(() => modal.remove(), 400);
    });
    
    cancelBtn.addEventListener('click', () => {
        window.hideModal(modal);
        setTimeout(() => modal.remove(), 400);
    });
    
    upgradeBtn.addEventListener('click', () => {
        window.hideModal(modal);
        setTimeout(() => {
            modal.remove();
            if (window.mercadoPago) {
                window.mercadoPago.showPlanSelectionModal();
            } else {
                // Fallback: show plan selection modal directly or alert
                alert('Sistema de pagamento indisponível. Tente novamente mais tarde.');
            }
        }, 400);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            window.hideModal(modal);
            setTimeout(() => modal.remove(), 400);
        }
    });
    
    // Keyboard support
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.hideModal(modal);
            setTimeout(() => modal.remove(), 400);
        }
    });
    
    window.showModal(modal);
}

/**
 * Get user plan capabilities for UI display
 */
export function getPlanCapabilities(planId = null) {
    const plan = planId || getCurrentUserPlan();
    const features = PLAN_FEATURES[plan];
    
    if (!features) return PLAN_FEATURES[PLANS.FREE];
    
    return {
        ...features,
        canUseAI: plan === PLANS.AI,
        canSync: plan === PLANS.CLOUD || plan === PLANS.AI,
        canExport: plan === PLANS.AI,
        storageType: features.storage,
        planLevel: plan
    };
}

/**
 * Check if user needs upgrade for a specific feature
 */
export function needsUpgradeFor(feature) {
    const currentPlan = getCurrentUserPlan();
    
    switch (feature) {
        case 'ai':
            return currentPlan !== PLANS.AI;
        case 'cloudSync':
            return currentPlan === PLANS.FREE;
        case 'multiDevice':
            return currentPlan === PLANS.FREE;
        case 'reports':
            return currentPlan === PLANS.FREE;
        case 'pdfExport':
            return currentPlan !== PLANS.AI;
        default:
            return false;
    }
}

/**
 * Update user activity metrics
 */
export async function updateUserActivity(activityType, increment = 1) {
    try {
        if (!canSyncToCloud() || !currentUser) {
            return;
        }

        const db = window.firebaseAuth.db;
        const userRef = doc(db, 'users', currentUser.uid);
        
        const updateData = {};
        updateData[`activity.${activityType}`] = (currentUser.activity[activityType] || 0) + increment;
        
        await updateDoc(userRef, updateData);
        
        // Update local data
        currentUser.activity[activityType] = updateData[`activity.${activityType}`];
        
        console.log(`Updated user activity: ${activityType} += ${increment}`);
    } catch (error) {
        console.error('Error updating user activity:', error);
    }
}

/**
 * Reset user data (for plan downgrades)
 */
export function resetUserData() {
    currentUser = null;
    userPlan = null;
}

/**
 * Get maximum number of lists allowed for current user plan
 */
export function getMaxListsAllowed() {
    const plan = getCurrentUserPlan();
    return PLAN_FEATURES[plan]?.maxLists || 5;
}

// Export for global access
if (typeof window !== 'undefined') {
    window.planManager = {
        PLANS,
        PLAN_FEATURES,
        initializeUserDocument,
        getCurrentUserPlan,
        getCurrentUserData,
        hasFeatureAccess,
        canSyncToCloud,
        hasAIAccess,
        canExportPDF,
        getPlanLimit,
        hasReachedLimit,
        updateUserPlan,
        isPlanExpired,
        getPlanInfo,
        showUpgradeModal,
        updateUserActivity,
        resetUserData,
        getMaxListsAllowed
    };
}