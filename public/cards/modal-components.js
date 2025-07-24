/**
 * Reusable modal components
 */

import { createFormGroup, createActionButtons } from './modal-utils.js';
import { WordCategories } from './vocabulary.js';
import { getStatusLabel } from './modal-utils.js'

/**
 * Create word list form
 */
export function createWordListForm(nameValue = '', descriptionValue = '') {
    return `
        ${createFormGroup('Nome da Lista', 'text', 'list-name', 'Ex: Vocabulário básico', nameValue)}
        ${createFormGroup('Descrição (opcional)', 'textarea', 'list-description', 'Descreva o propósito desta lista', descriptionValue)}
    `;
}

/**
 * Create word form for adding new words
 */
export function createWordForm(currentListId = null) {
    const categoryOptions = Object.entries(WordCategories)
        .map(([key, value]) => `<option value="${value}">${value}</option>`)
        .join('');

    return `
        ${createFormGroup('Palavra em Grego', 'text', 'word-greek', 'Ex: λόγος')}
        ${createFormGroup('Transliteração', 'text', 'word-translit', 'Ex: logos')}
        ${createFormGroup('Significado', 'text', 'word-meaning', 'Ex: palavra, verbo')}
        <div class="form-group">
            <label for="word-category">Categoria</label>
            <select id="word-category">
                <option value="">Selecione uma categoria</option>
                ${categoryOptions}
            </select>
        </div>
        ${currentListId ? `
        <div class="form-group">
            <label>
                <input type="checkbox" id="add-to-current-list" checked>
                Adicionar à lista atual
            </label>
        </div>` : ''}
    `;
}

/**
 * Create filter buttons
 */
export function createFilterButtons(activeFilter = 'all') {
    const filters = [
        { key: 'all', label: 'Todos' },
        ...Object.values(WordCategories).map(category => ({ key: category, label: category }))
    ];

    return filters.map(({ key, label }) => 
        `<button class="filter-btn ${activeFilter === key ? 'active' : ''}" data-filter="${key}">${label}</button>`
    ).join('');
}

/**
 * Create word item for selection
 */
export function createWordSelectionItem(word) {
    return `
        <div class="vocab-word-item ${word.progress.status}" data-word-id="${word.ID}" data-category="${word.PART_OF_SPEECH}">
            <div class="word-checkbox">
                <input type="checkbox" id="modal-check-${word.ID}" class="word-selector" data-word-id="${word.ID}">
                <label for="modal-check-${word.ID}"></label>
            </div>
            <div class="word-info">
                <div class="greek-word">${word.LEXICAL_FORM}</div>
                <div class="word-details">
                    <span class="transliteration">${word.TRANSLITERATED_LEXICAL_FORM}</span>
                    <span class="meaning">${word.USAGE}</span>
                </div>
                <div class="word-meta">
                    <span class="category-badge">${word.PART_OF_SPEECH || 'não categorizado'}</span>
                    <span class="status-badge ${word.progress.status}">${getStatusLabel(word.progress.status)}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Create pagination controls
 */
export function createPaginationControls(currentPage, totalPages) {
    return `
        <div class="pagination-controls">
            <button class="pagination-btn" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
            <span>Página ${currentPage} de ${totalPages}</span>
            <button class="pagination-btn" id="next-page" ${currentPage === totalPages ? 'disabled' : ''}>Próxima</button>
        </div>
    `;
}

/**
 * Create confirmation dialog content
 */
export function createConfirmationContent(message, noteText = null) {
    return `
        <p>${message}</p>
        ${noteText ? `<p class="note">${noteText}</p>` : ''}
    `;
}

/**
 * Create word detail content
 */
export function createWordDetailContent(word) {
    const details = [
        { label: 'Transliteração', value: word.TRANSLITERATED_LEXICAL_FORM },
        { label: 'Classe gramatical', value: word.PART_OF_SPEECH },
        { label: 'Pronúncia', value: word.PHONETIC_SPELLING },
        { label: 'Uso', value: word.USAGE },
        { label: 'Definição', value: word.definicaoCompleta || word.DEFINITION },
        ...(word.ORIGIN ? [{ label: 'Origem', value: word.ORIGIN }] : [])
    ];

    const detailRows = details.map(({ label, value }) => `
        <div class="detail-row">
            <div class="detail-label">${label}:</div>
            <div class="detail-value">${value || '-'}</div>
        </div>
    `).join('');

    return `
        <div class="word-detail-section">
            ${detailRows}
        </div>
        <div class="word-detail-footer">
            <div class="status-label">Status: <span class="${word.progress?.status || 'unread'}">${getStatusLabel(word.progress?.status || 'unread')}</span></div>
        </div>
    `;
}