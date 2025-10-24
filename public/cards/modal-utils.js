/**
 * Base modal utilities for creating and managing modals
 */

/**
 * Create a basic modal structure
 */
export function createModal(id, title, content, actions = '') {
    return `
        <div class="modal" id="${id}">
            <div class="modal-content">
                <button class="close-modal">&times;</button>
                <h2>${title}</h2>
                ${content}
                ${actions ? `<div class="modal-actions">${actions}</div>` : ''}
            </div>
        </div>
    `;
}

/**
 * Create a modal with large content area
 */
export function createLargeModal(id, title, content, actions = '') {
    return `
        <div class="modal" id="${id}">
            <div class="modal-content large">
                <button class="close-modal">&times;</button>
                <h2>${title}</h2>
                ${content}
                ${actions ? `<div class="modal-actions">${actions}</div>` : ''}
            </div>
        </div>
    `;
}

/**
 * Show modal and set up basic event listeners
 */
export function showModal(modalElement) {
    const closeBtn = modalElement.querySelector('.close-modal');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => modalElement.remove());
    }

    // Close on outside click
    modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) {
            modalElement.remove();
        }
    });

    modalElement.style.display = 'flex';
    return modalElement;
}

/**
 * Create and show a modal
 */
export function createAndShowModal(htmlContent) {
    document.body.insertAdjacentHTML('beforeend', htmlContent);
    const modal = document.body.lastElementChild;
    return showModal(modal);
}

/**
 * Simple debounce function
 */
export function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status) {
    const labels = {
        'unread': 'Não lido',
        'reading': 'Lendo',
        'familiar': 'Familiar',
        'memorized': 'Decorado'
    };
    return labels[status] || 'Desconhecido';
}

/**
 * Create form input group
 */
export function createFormGroup(labelText, inputType, inputId, placeholder = '', value = '') {
    const inputElement = inputType === 'textarea' 
        ? `<textarea id="${inputId}" placeholder="${placeholder}">${value}</textarea>`
        : inputType === 'select'
            ? `<select id="${inputId}">${placeholder}</select>`
            : `<input type="${inputType}" id="${inputId}" placeholder="${placeholder}" value="${value}">`;
    
    return `
        <div class="form-group">
            <label for="${inputId}">${labelText}</label>
            ${inputElement}
        </div>
    `;
}

/**
 * Create action buttons
 */
export function createActionButtons(buttons) {
    return buttons.map(({ id, text, className = 'btn' }) => 
        `<button id="${id}" class="${className}">${text}</button>`
    ).join('');
}