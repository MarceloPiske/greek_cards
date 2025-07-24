/**
 * Firebase Authentication Module
 */

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAjlnSH9GrSgGNa7w6qlhxbXV-c8kV6n3M",
  authDomain: "grego-koine.firebaseapp.com",
  projectId: "grego-koine",
  storageBucket: "grego-koine.firebasestorage.app",
  messagingSenderId: "509216749797",
  appId: "1:509216749797:web:78bfcace1b04617140fc0c",
  measurementId: "G-2L7VC4KHRB"
};

// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    OAuthProvider,
    signOut,
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Authentication providers
const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');
const appleProvider = new OAuthProvider('apple.com');

// Current user state
let currentUser = null;

/**
 * Initialize authentication state listener
 */
export function initAuth() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            currentUser = user;
            updateUIForUser(user);
            
            if (user) {
                try {
                    // Initialize user document with plan management
                    const { initializeUserDocument } = await import('./plan-manager.js');
                    await initializeUserDocument(user);
                    
                    // Load user data from Firebase when user logs in
                    const { loadUserDataFromFirebase } = await import('./cards/vocabulary-db.js');
                    await loadUserDataFromFirebase();
                } catch (error) {
                    console.warn('Failed to initialize user or load data from Firebase:', error);
                }
            } else {
                // Reset plan data when user logs out
                try {
                    const { resetUserData } = await import('./plan-manager.js');
                    resetUserData();
                } catch (error) {
                    console.warn('Could not reset user data:', error);
                }
            }
            
            resolve(user);
        });
    });
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        console.log('Google sign-in successful:', user);
        return user;
    } catch (error) {
        console.error('Google sign-in error:', error);
        throw new Error('Erro ao fazer login com Google: ' + error.message);
    }
}

/**
 * Sign in with Microsoft
 */
export async function signInWithMicrosoft() {
    try {
        const result = await signInWithPopup(auth, microsoftProvider);
        const user = result.user;
        console.log('Microsoft sign-in successful:', user);
        return user;
    } catch (error) {
        console.error('Microsoft sign-in error:', error);
        throw new Error('Erro ao fazer login com Microsoft: ' + error.message);
    }
}

/**
 * Sign in with Apple
 */
export async function signInWithApple() {
    try {
        const result = await signInWithPopup(auth, appleProvider);
        const user = result.user;
        console.log('Apple sign-in successful:', user);
        return user;
    } catch (error) {
        console.error('Apple sign-in error:', error);
        throw new Error('Erro ao fazer login com Apple: ' + error.message);
    }
}

/**
 * Sign out current user
 */
export async function signOutUser() {
    try {
        await signOut(auth);
        console.log('User signed out successfully');
    } catch (error) {
        console.error('Sign-out error:', error);
        throw new Error('Erro ao fazer logout: ' + error.message);
    }
}

/**
 * Get current user
 */
export function getCurrentUser() {
    return currentUser;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
    return currentUser !== null;
}

/**
 * Update UI based on authentication state
 */
function updateUIForUser(user) {
    const loginButton = document.getElementById('login-button');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userMenuBtn = document.getElementById('user-menu-btn');
    
    if (!loginButton && !userProfile) return;
    
    if (user) {
        // User is signed in - show profile
        if (loginButton) loginButton.style.display = 'none';
        if (userProfile) userProfile.style.display = 'flex';
        
        // Initialize cards sync system for premium users
        initializeCardsSyncForUser();
        
        // Set user avatar
        if (userAvatar) {
            userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=4a90e2&color=fff&size=128`;
            userAvatar.alt = `Avatar de ${user.displayName || user.email}`;
        }
        
        // Set user name
        if (userName) {
            userName.textContent = user.displayName || user.email.split('@')[0];
        }
        
        // Add click handler for user menu
        if (userMenuBtn) {
            userMenuBtn.onclick = () => showUserMenu(user);
        }
        
        // Also add click to the whole profile area
        if (userProfile) {
            userProfile.onclick = () => showUserMenu(user);
        }
    } else {
        // User is signed out - show login button
        if (loginButton) {
            loginButton.style.display = 'flex';
            loginButton.onclick = () => showLoginModal();
        }
        if (userProfile) userProfile.style.display = 'none';
    }
}

/**
 * Initialize cards synchronization for authenticated user
 */
async function initializeCardsSyncForUser() {
    try {
        const { initCardsSyncSystem } = await import('./cards/cards-sync.js');
        await initCardsSyncSystem();
    } catch (error) {
        console.warn('Could not initialize cards sync system:', error);
    }
}

/**
 * Show user menu when authenticated
 */
function showUserMenu(user) {
    const menuHtml = `
        <div class="modal" id="userMenuModal">
            <div class="modal-content">
                <button class="close-modal">&times;</button>
                <h2>Conta do Usuário</h2>
                <div class="user-info">
                    <img src="${user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=4a90e2&color=fff&size=128`}" 
                         alt="Avatar" class="user-avatar">
                    <div class="user-details">
                        <h3>${user.displayName || 'Usuário'}</h3>
                        <p>${user.email}</p>
                    </div>
                </div>
                <div class="plan-info" id="plan-info">
                    <!-- Plan info will be inserted here -->
                </div>
                <div class="modal-actions">
                    <button id="manage-account-btn" class="btn">Gerenciar Conta</button>
                    <button id="sign-out-btn" class="btn danger">Sair da Conta</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', menuHtml);
    const modal = document.getElementById('userMenuModal');
    const closeBtn = modal.querySelector('.close-modal');
    const signOutBtn = document.getElementById('sign-out-btn');
    const manageAccountBtn = document.getElementById('manage-account-btn');
    
    // Load and display plan information
    loadPlanInfo();
    
    closeBtn.addEventListener('click', () => modal.remove());
    signOutBtn.addEventListener('click', async () => {
        try {
            await signOutUser();
            modal.remove();
        } catch (error) {
            alert(error.message);
        }
    });
    
    manageAccountBtn.addEventListener('click', () => {
        // Future: Open account management modal
        alert('Funcionalidade em desenvolvimento');
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    modal.style.display = 'flex';
}

/**
 * Load and display plan information in user menu
 */
async function loadPlanInfo() {
    try {
        const { getCurrentUserPlan, getPlanCapabilities } = await import('./plan-manager.js');
        const currentPlan = getCurrentUserPlan();
        const capabilities = getPlanCapabilities(currentPlan);
        
        const planInfoContainer = document.getElementById('plan-info');
        if (planInfoContainer) {
            let planIcon = '🔹';
            let planDescription = 'Dados locais apenas';
            
            if (currentPlan === 'ai') {
                planIcon = '🤖';
                planDescription = 'IA + Sincronização ativa';
            } else if (currentPlan === 'cloud') {
                planIcon = '☁️';
                planDescription = 'Sincronização na nuvem ativa';
            }
            
            planInfoContainer.innerHTML = `
                <div class="plan-status ${currentPlan}">
                    <span class="material-symbols-sharp">${planIcon === '🔹' ? 'person' : planIcon === '☁️' ? 'cloud' : 'smart_toy'}</span>
                    <div class="plan-details">
                        <strong>${capabilities.displayName}</strong>
                        <small>${planDescription}</small>
                    </div>
                    ${currentPlan === 'free' ? `
                    <button id="upgrade-plan-btn" class="btn primary" style="margin-left: auto; padding: 0.4rem 0.8rem; font-size: 0.8rem;">
                        Upgrade
                    </button>` : ''}
                </div>
            `;
            
            const upgradeBtn = document.getElementById('upgrade-plan-btn');
            if (upgradeBtn) {
                upgradeBtn.addEventListener('click', () => {
                    window.open('https://grego-koine.web.app/premium', '_blank');
                });
            }
        }
    } catch (error) {
        console.warn('Could not load plan information:', error);
    }
}

/**
 * Show login modal
 */
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Handle provider login
 */
export async function loginWith(provider) {
    try {
        let user;
        
        switch (provider) {
            case 'google':
                user = await signInWithGoogle();
                break;
            case 'microsoft':
                user = await signInWithMicrosoft();
                break;
            case 'apple':
                user = await signInWithApple();
                break;
            default:
                throw new Error('Provedor não suportado');
        }
        
        // Close login modal
        const modal = document.getElementById('loginModal');
        if (modal) modal.style.display = 'none';
        
        // Show success message
        alert(`Bem-vindo, ${user.displayName || user.email}!`);
        
        return user;
    } catch (error) {
        console.error('Login error:', error);
        alert(error.message);
        throw error;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.firebaseAuth = {
        initAuth,
        signInWithGoogle,
        signInWithMicrosoft,
        signInWithApple,
        signOutUser,
        getCurrentUser,
        isAuthenticated,
        loginWith,
        db
    };
}