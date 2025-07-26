/**
 * Lists Manager UI Components
 */

import { getCurrentUserPlan } from '../../plan-manager.js';

export class ListsUI {
    constructor() {
        this.container = document.getElementById('lists-container');
        this.emptyState = document.getElementById('empty-lists');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.loadingMessage = document.getElementById('loading-message');
    }

    renderLists(lists) {
        if (lists.length === 0) {
            this.container.style.display = 'none';
            this.emptyState.style.display = 'block';
            return;
        }

        this.container.style.display = 'grid';
        this.emptyState.style.display = 'none';

        this.container.innerHTML = lists.map(list => this.createListCard(list)).join('');
    }

    createListCard(list) {
        const wordCount = list.wordIds ? list.wordIds.length : 0;
        const canSync = getCurrentUserPlan() !== 'free';
        
        // Determine sync status
        let syncStatus = 'local';
        let syncStatusText = 'Armazenamento local';
        
        if (canSync) {
            if (list.syncedAt) {
                const lastSync = new Date(list.syncedAt);
                const lastUpdate = new Date(list.updatedAt || list.createdAt);
                
                // Consider synced if sync time is equal or after update time
                if (lastSync >= lastUpdate) {
                    syncStatus = 'synced';
                    syncStatusText = `Sincronizada às ${this.formatTime(list.syncedAt)}`;
                } else {
                    syncStatus = 'offline';
                    syncStatusText = 'Aguardando sincronização';
                }
            } else {
                syncStatus = 'offline';
                syncStatusText = 'Não sincronizada';
            }
        }

        return `
            <div class="list-card ${syncStatus}" data-list-id="${list.id}">
                <div class="sync-status ${syncStatus}"></div>
                
                <div class="list-card-header">
                    <div class="list-info">
                        <h3 class="list-title">${this.escapeHtml(list.name)}</h3>
                        ${list.description ? `<p class="list-description">${this.escapeHtml(list.description)}</p>` : ''}
                    </div>
                    <button class="list-menu-btn" title="Opções da lista">
                        <span class="material-symbols-sharp">more_vert</span>
                    </button>
                </div>

                <div class="list-stats">
                    <div class="list-stat">
                        <span class="material-symbols-sharp">style</span>
                        <span>${wordCount} palavras</span>
                    </div>
                    <div class="list-stat">
                        <span class="material-symbols-sharp">schedule</span>
                        <span>${this.formatDate(list.createdAt)}</span>
                    </div>
                </div>

                <div class="sync-info">
                    <small class="sync-text">${syncStatusText}</small>
                </div>

                <div class="list-actions">
                    <button class="btn open-list-btn" data-list-id="${list.id}">
                        <span class="material-symbols-sharp">open_in_new</span>
                        Visualizar
                    </button>
                    <button class="btn add-words-btn" data-list-id="${list.id}">
                        <span class="material-symbols-sharp">add</span>
                        Adicionar Palavras
                    </button>
                </div>
            </div>
        `;
    }

    showNewListModal() {
        const modalHtml = `
            <div class="modal" id="new-list-modal">
                <div class="modal-content">
                    <button class="close-modal">&times;</button>
                    <h2>Nova Lista de Palavras</h2>
                    
                    <div class="form-group">
                        <label for="list-name">Nome da Lista</label>
                        <input type="text" id="list-name" placeholder="Ex: Vocabulário básico" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="list-description">Descrição (opcional)</label>
                        <textarea id="list-description" placeholder="Descreva o propósito desta lista"></textarea>
                    </div>
                    
                    <div class="modal-actions">
                        <button id="cancel-new-list" class="btn">Cancelar</button>
                        <button id="create-list" class="btn primary">Criar Lista</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('new-list-modal');
        modal.style.display = 'flex';
        document.getElementById('list-name').focus();

        return modal;
    }

    showEditListModal(list) {
        const modalHtml = `
            <div class="modal" id="edit-list-modal">
                <div class="modal-content">
                    <button class="close-modal">&times;</button>
                    <h2>Editar Lista de Palavras</h2>
                    
                    <div class="form-group">
                        <label for="edit-list-name">Nome da Lista</label>
                        <input type="text" id="edit-list-name" value="${this.escapeHtml(list.name)}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-list-description">Descrição (opcional)</label>
                        <textarea id="edit-list-description">${this.escapeHtml(list.description || '')}</textarea>
                    </div>
                    
                    <div class="modal-actions">
                        <button id="cancel-edit-list" class="btn">Cancelar</button>
                        <button id="save-list" class="btn primary">Salvar Alterações</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('edit-list-modal');
        modal.style.display = 'flex';
        document.getElementById('edit-list-name').focus();

        return modal;
    }

    showDeleteConfirmationModal(list) {
        const modalHtml = `
            <div class="modal" id="delete-list-modal">
                <div class="modal-content">
                    <button class="close-modal">&times;</button>
                    <h2>Excluir Lista</h2>
                    
                    <p>Tem certeza que deseja excluir a lista "<strong>${this.escapeHtml(list.name)}</strong>"?</p>
                    <p class="note">As palavras não serão excluídas do vocabulário, apenas a lista será removida.</p>
                    
                    <div class="modal-actions">
                        <button id="cancel-delete" class="btn">Cancelar</button>
                        <button id="confirm-delete" class="btn danger">Excluir</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('delete-list-modal');
        modal.style.display = 'flex';

        return modal;
    }

    showLoading(message = 'Carregando...') {
        if (this.loadingOverlay && this.loadingMessage) {
            this.loadingMessage.textContent = message;
            this.loadingOverlay.style.display = 'flex';
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }
    }

    showSuccess(message) {
        // Simple alert for now - could be enhanced with toast notifications
        alert(message);
    }

    showError(message) {
        alert(message);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return 'Data inválida';
        }
    }

    formatTime(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Horário inválido';
        }
    }
}