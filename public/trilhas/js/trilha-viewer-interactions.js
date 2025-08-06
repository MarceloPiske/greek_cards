/**
 * Trilha Viewer Interactions Module
 * Handles user interactions within an activity, such as favoriting, sharing, etc.
 */
import { toggleFavoriteBlock } from './trilha-progress-sync.js?v=1.1';

/**
 * Sets up all interaction handlers for the currently displayed activity.
 */
export function setupActivityInteractions(activity, trilhaData, onFavoriteToggle) {
    // Favorite button
    const favoriteBtn = document.getElementById('favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', async () => {
            const isFavorited = await toggleFavorite(activity.id, trilhaData.id);
            onFavoriteToggle(activity.id, isFavorited); // Callback to update UI
        });
    }

    // Share button
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => shareActivity(activity, trilhaData));
    }

    // Back button in the main nav
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.onclick = () => { // Use onclick to ensure only one handler
            window.location.href = 'trilhas/trilha_conteudo.html';
        };
    }
    
    // Completion modal buttons
    const shareAchievementBtn = document.getElementById('share-achievement');
    if(shareAchievementBtn) {
        shareAchievementBtn.addEventListener('click', () => shareAchievement(trilhaData));
    }

    const backToTrilhasBtn = document.getElementById('back-to-trilhas');
    if(backToTrilhasBtn) {
        backToTrilhasBtn.addEventListener('click', () => {
            window.location.href = '/trilhas/trilha_conteudo.html';
        });
    }
}

/**
 * Toggles the favorite status of an activity.
 */
async function toggleFavorite(activityId, trilhaId) {
    try {
        // Use new sync system
        const updatedProgress = await toggleFavoriteBlock(trilhaId, activityId);
        const isFavorited = updatedProgress.favoritos.includes(activityId);
        
        const favoriteBtn = document.getElementById('favorite-btn');
        const icon = favoriteBtn.querySelector('.material-symbols-sharp');
        
        if (isFavorited) {
            favoriteBtn.classList.add('favorited');
            icon.textContent = 'favorite';
            favoriteBtn.title = 'Remover dos favoritos';
        } else {
            favoriteBtn.classList.remove('favorited');
            icon.textContent = 'favorite_border';
            favoriteBtn.title = 'Adicionar aos favoritos';
        }
        return isFavorited;
    } catch (error) {
        console.error('Error toggling favorite:', error);
        return false;
    }
}

/**
 * Shares the current activity.
 */
function shareActivity(activity, trilhaData) {
    if (navigator.share) {
        const shareData = {
            title: `${activity.titulo} - ${trilhaData.titulo}`,
            text: `Confira esta atividade: ${activity.titulo}`,
            url: window.location.href
        };
        
        navigator.share(shareData).catch((error) => {
            console.log('Share failed or was cancelled:', error);
            // Fallback to clipboard copy
            fallbackToClipboard(shareData);
        });
    } else {
        // Browser doesn't support native sharing, fallback to clipboard
        fallbackToClipboard({
            title: `${activity.titulo} - ${trilhaData.titulo}`,
            text: `Confira esta atividade: ${activity.titulo}`,
            url: window.location.href
        });
    }
}

/**
 * Fallback function to copy to clipboard when sharing fails
 */
function fallbackToClipboard(shareData) {
    const textToCopy = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showShareToast('Link copiado para a área de transferência!', 'success');
        }).catch((error) => {
            console.error('Clipboard copy failed:', error);
            showManualCopyDialog(textToCopy);
        });
    } else {
        // Final fallback for older browsers
        showManualCopyDialog(textToCopy);
    }
}

/**
 * Show manual copy dialog as final fallback
 */
function showManualCopyDialog(text) {
    const modalHtml = `
        <div class="modal share-fallback-modal" style="display: flex;">
            <div class="modal-content">
                <button class="close-modal">&times;</button>
                <h3>Compartilhar Atividade</h3>
                <p>Copie o texto abaixo para compartilhar:</p>
                <textarea readonly class="share-text-area">${text}</textarea>
                <div class="modal-actions">
                    <button class="btn primary" onclick="selectShareText()">
                        <span class="material-symbols-sharp">content_copy</span>
                        Selecionar Texto
                    </button>
                    <button class="btn secondary" onclick="closeShareModal()">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Setup modal close handlers
    const modal = document.querySelector('.share-fallback-modal');
    const closeBtn = modal.querySelector('.close-modal');
    
    closeBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    // Auto-select text
    setTimeout(() => {
        const textarea = modal.querySelector('.share-text-area');
        textarea.select();
        textarea.focus();
    }, 100);
}

/**
 * Show share-specific toast notification
 */
function showShareToast(message, type = 'info') {
    // Remove existing share toasts
    document.querySelectorAll('.share-toast').forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `share-toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="material-symbols-sharp">${type === 'success' ? 'check_circle' : 'info'}</span>
            <span>${message}</span>
        </div>
    `;
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : 'var(--accent)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        /* z-index: 10000; */
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Shares the module completion achievement.
 */
function shareAchievement(trilhaData) {
    const shareData = {
        title: 'Conquista no Koiné',
        text: `Acabei de concluir a trilha "${trilhaData.titulo}" no Koiné!`,
        url: 'https://grego-koine.web.app/trilhas/trilha_conteudo.html'
    };
    
    if (navigator.share) {
        navigator.share(shareData).catch((error) => {
            console.log('Achievement share failed or was cancelled:', error);
            // Fallback to clipboard copy
            const textToCopy = `${shareData.text} Veja em: ${shareData.url}`;
            fallbackToClipboard({
                title: shareData.title,
                text: shareData.text,
                url: shareData.url
            });
        });
    } else {
        // Browser doesn't support native sharing, fallback to clipboard
        const textToCopy = `${shareData.text} Veja em: ${shareData.url}`;
        fallbackToClipboard({
            title: shareData.title,
            text: shareData.text,
            url: shareData.url
        });
    }
}

// Global functions for modal interactions
window.selectShareText = function() {
    const textarea = document.querySelector('.share-text-area');
    if (textarea) {
        textarea.select();
        textarea.setSelectionRange(0, 99999); // For mobile devices
        
        try {
            document.execCommand('copy');
            showShareToast('Texto selecionado e copiado!', 'success');
        } catch (err) {
            showShareToast('Texto selecionado. Use Ctrl+C para copiar.', 'info');
        }
    }
};

window.closeShareModal = function() {
    const modal = document.querySelector('.share-fallback-modal');
    if (modal) modal.remove();
};