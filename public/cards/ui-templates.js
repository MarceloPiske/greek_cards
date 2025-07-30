/**
 * HTML Template Generation
 */

import { WordStatus, WordCategories } from './vocabulary.js';

/**
 * Get human-readable status label
 */
function getStatusLabel(status) {
    const labels = {
        'unread': 'Não lido',
        'reading': 'Lendo',
        'familiar': 'Familiar',
        'memorized': 'Decorado'
    };
    return labels[status] || 'Desconhecido';
}

/**
 * Create empty state template
 */
export function createEmptyState(icon, title, description, buttonId = null, buttonText = null) {
    return `
        <div class="empty-state">
            <span class="material-symbols-sharp">${icon}</span>
            <h3>${title}</h3>
            <p>${description}</p>
            ${buttonId ? `<button id="${buttonId}" class="btn primary">${buttonText}</button>` : ''}
        </div>
    `;
}

/**
 * Create loading state template
 */
export function createLoadingState(message = 'Carregando...') {
    return `
        <div class="loading-state">
            <span class="material-symbols-sharp loading-icon">sync</span>
            <p>${message}</p>
        </div>
    `;
}

/**
 * Create word list item template
 */
export function createWordListItem(list) {
    const wordCount = list.wordIds ? list.wordIds.length : 0;
    const isOffline = localStorage.getItem('userPlan') === 'free' && !list.syncedAt;

    return `
        <div class="word-list-item" data-list-id="${list.id}">
            ${isOffline ? `
            <div class="offline-indicator">
                <span class="material-symbols-sharp">wifi_off</span>
                <span class="offline-text">Offline - Upgrade para sincronizar na nuvem</span>
            </div>` : ''}
            <div class="list-info">
                <h3>${list.name}</h3>
                <p>${wordCount} palavras</p>
                ${list.description ? `<p class="list-description">${list.description}</p>` : ''}
            </div>
            <div class="list-actions">
                <button class="btn icon edit-list" data-list-id="${list.id}" title="Editar lista">
                    <span class="material-symbols-sharp">edit</span>
                </button>
                <button class="btn icon delete-list" data-list-id="${list.id}" title="Excluir lista">
                    <span class="material-symbols-sharp">delete</span>
                </button>
            </div>
        </div>
    `;
}

/**
 * Create vocabulary word item template
 */
export function createVocabWordItem(word, showCheckbox = false) {
    return `
        <div class="vocab-word-item ${word.progress.status}" data-word-id="${word.ID}">
            ${showCheckbox ? `
            <div class="word-checkbox">
                <input type="checkbox" id="check-${word.ID}" class="word-selector" 
                    data-word-id="${word.ID}">
                <label for="check-${word.ID}"></label>
            </div>` : ''}
            <div class="word-info">
                <div class="greek-word">${word.LEXICAL_FORM}</div>
                <div class="word-details">
                    <span class="transliteration">${word.TRANSLITERATED_LEXICAL_FORM || ''}</span>
                    <span class="meaning">${word.DEFINITION || word.USAGE || ''}</span>
                </div>
                <div class="word-meta">
                    <span class="category-badge">${word.PART_OF_SPEECH || 'não categorizado'}</span>
                    <span class="status-badge ${word.progress.status}">${getStatusLabel(word.progress.status)}</span>
                    ${(word.PHONETIC_SPELLING || word.ORIGIN) ? `
                    <button class="info-btn" data-word-id="${word.ID}" title="Ver detalhes">
                        <span class="material-symbols-sharp">info</span>
                    </button>` : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * Create vocabulary card template
 */
export function createVocabCard(word) {
    return `
        <div class="vocab-card ${word.progress.status}" data-word-id="${word.ID}">
            <div class="card-front">
                <div class="greek-word">${word.LEXICAL_FORM}</div>
                <div class="transliteration">${word.TRANSLITERATED_LEXICAL_FORM || ''}</div>
                ${(word.PHONETIC_SPELLING || word.ORIGIN) ? `
                <button class="info-btn card-info-btn" data-word-id="${word.ID}" data-event="info" title="Ver detalhes">
                    <span class="material-symbols-sharp">info</span>
                </button>` : ''}
                <div class="card-footer">
                    <span class="category-badge">${word.PART_OF_SPEECH || 'não categorizado'}</span>
                    <span class="flip-hint">Clique para virar</span>
                </div>
            </div>
            <div class="card-back">
                <div class="meaning">${word.DEFINITION || word.USAGE || ''}</div>
                <div class="card-actions">
                    ${createStatusButtons(word)}
                </div>
            </div>
        </div>
    `;
}

/**
 * Create status buttons template
 */
export function createStatusButtons(word) {
    return Object.entries(WordStatus).map(([key, status]) => {
        const labels = {
            'UNREAD': { icon: 'visibility_off', text: 'Não lido' },
            'READING': { icon: 'visibility', text: 'Lendo' },
            'FAMILIAR': { icon: 'bookmark', text: 'Familiar' },
            'MEMORIZED': { icon: 'check_circle', text: 'Decorado' }
        };
        
        const label = labels[key];
        const isActive = word.progress.status === status;
        
        return `
            <button class="status-btn ${status} ${isActive ? 'active' : ''}" 
                data-word-id="${word.ID}" data-status="${status}" data-event="status"
                title="${label.text}">
                <span class="material-symbols-sharp">${label.icon}</span>
                <span>${label.text}</span>
            </button>
        `;
    }).join('');
}

/**
 * Create pagination template
 */
export function createPagination(currentPage, totalPages) {
    if (totalPages <= 1) return '';
    
    const buttons = [];
    
    // Previous button
    buttons.push(`
        <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
            data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
            <span class="material-symbols-sharp">chevron_left</span>
        </button>
    `);
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        buttons.push(`<button class="pagination-btn" data-page="1">1</button>`);
        if (startPage > 2) {
            buttons.push(`<span class="pagination-ellipsis">...</span>`);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        buttons.push(`
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                data-page="${i}">${i}</button>
        `);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            buttons.push(`<span class="pagination-ellipsis">...</span>`);
        }
        buttons.push(`<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`);
    }
    
    // Next button
    buttons.push(`
        <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
            data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
            <span class="material-symbols-sharp">chevron_right</span>
        </button>
    `);
    
    return `<div class="pagination-controls">${buttons.join('')}</div>`;
}

/**
 * Create list header template
 */
export function createListHeader(list, filteredCount) {
    const totalCount = list.words ? list.words.length : 0;
    return `
        <div class="list-header">
            <h2>${list.name}</h2>
            ${list.description ? `<p class="list-description">${list.description}</p>` : ''}
            <div class="list-stats">
                <span>${totalCount} palavras no total</span>
                ${filteredCount !== totalCount ? `<span>${filteredCount} palavras mostradas</span>` : ''}
            </div>
        </div>
    `;
}

/**
 * Create list actions bar template
 */
export function createListActionsBar(viewMode) {
    return `
        <div class="list-actions-bar">
            <div class="list-actions-left">
                <button id="add-to-list-btn" class="btn" title="Adicionar palavras à lista">
                    <span class="material-symbols-sharp">add</span> Adicionar palavras
                </button>
                <button id="remove-from-list-btn" class="btn" title="Remover palavras selecionadas" disabled>
                    <span class="material-symbols-sharp">remove</span> Remover selecionadas
                </button>
            </div>
            <div class="list-actions-right">
                <button id="practice-list-btn" class="btn primary" title="Iniciar prática com esta lista">
                    <span class="material-symbols-sharp">school</span> Praticar
                </button>
                <div class="view-toggle">
                    <button class="btn icon ${viewMode === 'list' ? 'active' : ''}" data-view="list" title="Visualização em lista">
                        <span class="material-symbols-sharp">view_list</span>
                    </button>
                    <button class="btn icon ${viewMode === 'cards' ? 'active' : ''}" data-view="cards" title="Visualização em cartões">
                        <span class="material-symbols-sharp">view_module</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Export the utility function
export { getStatusLabel };