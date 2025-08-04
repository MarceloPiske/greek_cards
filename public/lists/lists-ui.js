/**
 * Lists Manager UI Components
 */

import { getCurrentUserPlan, getMaxListsAllowed } from '../../plan-manager.js';

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

        // Show word count warning if below minimum
        const wordCountWarning = wordCount < 5 ? 
            `<div class="word-count-warning">
                <span class="material-symbols-sharp">warning</span>
                <span>Mínimo 5 palavras necessárias</span>
            </div>` : '';

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

                ${wordCountWarning}

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
                    <button class="btn secondary view-list-btn" data-list-id="${list.id}">
                        <span class="material-symbols-sharp">visibility</span>
                        Visualizar
                    </button>
                    <button class="btn practice practice-list-btn" data-list-id="${list.id}" ${wordCount < 5 ? 'disabled title="Mínimo 5 palavras necessárias"' : ''}>
                        <span class="material-symbols-sharp">school</span>
                        Praticar
                    </button>
                </div>
            </div>
        `;
    }

    showViewWordsModal(list) {
        const modalHtml = `
            <div class="modal view-words-modal" id="view-words-modal">
                <div class="modal-content">
                    <button class="close-modal">&times;</button>
                    <div class="view-words-header">
                        <h2>${this.escapeHtml(list.name)}</h2>
                        ${list.description ? `<p class="view-words-description">${this.escapeHtml(list.description)}</p>` : ''}
                        <div class="view-words-stats">
                            <div class="stat">
                                <span class="material-symbols-sharp">style</span>
                                <span>${list.words ? list.words.length : 0} palavras</span>
                            </div>
                            <div class="stat">
                                <span class="material-symbols-sharp">schedule</span>
                                <span>Criada em ${this.formatDate(list.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="view-words-content" id="view-words-content">
                        ${this.createWordsListContent(list.words || [])}
                    </div>
                    <div class="view-words-actions">
                        <div class="selection-actions">
                            <button id="select-all-words" class="btn secondary">Selecionar Todas</button>
                            <button id="deselect-all-words" class="btn secondary">Desmarcar Todas</button>
                        </div>
                        <div class="modal-actions-right">
                            <button id="remove-selected-words" class="btn danger" disabled>Remover Selecionadas</button>
                            <button id="add-more-words" class="btn primary">Adicionar Palavras</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('view-words-modal');
        modal.style.display = 'flex';

        return modal;
    }

    createWordsListContent(words) {
        if (!words || words.length === 0) {
            return `
                <div class="view-words-empty">
                    <span class="material-symbols-sharp">style</span>
                    <h3>Lista Vazia</h3>
                    <p>Esta lista não contém palavras ainda. Clique em "Adicionar Palavras" para começar.</p>
                </div>
            `;
        }

        return `
            <div class="view-words-list">
                ${words.map(word => `
                    <div class="view-word-item" data-word-id="${word.ID}">
                        <div class="word-checkbox-container">
                            <input type="checkbox" id="word-${word.ID}" class="word-remove-checkbox">
                            <label for="word-${word.ID}"></label>
                        </div>
                        <div class="view-word-info">
                            <div class="view-word-greek">${word.LEXICAL_FORM}</div>
                            <div class="view-word-transliteration">${word.TRANSLITERATED_LEXICAL_FORM || ''}</div>
                            <div class="view-word-meaning">${word.USAGE || word.DEFINITION || ''}</div>
                        </div>
                        <div class="view-word-category">${word.PART_OF_SPEECH || 'não categorizado'}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    showNewListModal() {
        const maxLists = getMaxListsAllowed();
        const planName = getCurrentUserPlan() === 'free' ? 'gratuito' : 'atual';
        
        const modalHtml = `
            <div class="modal" id="new-list-modal">
                <div class="modal-content">
                    <button class="close-modal">&times;</button>
                    <h2>Nova Lista de Palavras</h2>
                    
                    <div class="plan-info-box">
                        <span class="material-symbols-sharp">info</span>
                        <div>
                            <strong>Plano ${planName}:</strong> Máximo ${maxLists} listas<br>
                            <small>Mínimo 5 palavras por lista</small>
                        </div>
                    </div>
                    
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