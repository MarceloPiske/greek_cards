/**
 * Mercado Pago Integration Module
 */

// Product configuration
export const PRODUCTS = {
    cloud: {
        title: "Assinatura Cloud",
        price: 4.99,
        features: [
            "Sincronização na nuvem",
            "Acesso em múltiplos dispositivos", 
            "Relatórios de progresso",
            "Análises avançadas"
        ],
        planId: 'cloud'
    },
    hero: {
        title: "Apoio Hall dos Heróis",
        price: 9.90,
        features: [
            "Tudo do plano Cloud",
            "IA tutora personalizada",
            "Explicações detalhadas",
            "Sugestões personalizadas",
            "Exportação em PDF",
            "Suporte prioritário"
        ],
        planId: 'hero'
    }
};

// API Configuration
const API_BASE_URL = 'https://api-jnggpsogma-uc.a.run.app';

/**
 * Create subscription with Mercado Pago
 */
export async function createSubscription(productKey, userEmail) {
    try {
        const product = PRODUCTS[productKey];
        if (!product) {
            throw new Error('Produto não encontrado');
        }

        const user = window.firebaseAuth?.getCurrentUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        const requestBody = {
            productId: productKey,
            userEmail: userEmail || user.email,
            userId: user.uid,
            planId: product.planId,
            price: product.price,
            title: product.title
        };

        const response = await fetch(`${API_BASE_URL}/criar-assinatura`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro ao criar assinatura: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('Subscription created successfully:', data);
        
        return data;
    } catch (error) {
        console.error('Error creating subscription:', error);
        throw error;
    }
}

/**
 * Handle payment success callback
 */
export async function handlePaymentSuccess(paymentData) {
    try {
        // Update user plan in Firebase
        const { updateUserPlan } = await import('./plan-manager.js?v=1.1');
        const user = window.firebaseAuth?.getCurrentUser();
        
        if (user && paymentData.planId) {
            await updateUserPlan(user.uid, paymentData.planId);
            
            // Show success message
            showPaymentSuccessModal(paymentData);
            
            // Reload page to update UI
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
        
        return true;
    } catch (error) {
        console.error('Error handling payment success:', error);
        return false;
    }
}

/**
 * Show payment success modal
 */
function showPaymentSuccessModal(paymentData) {
    const modalHtml = `
        <div class="modal" id="payment-success-modal" aria-hidden="true">
            <div class="modal-content">
                <div class="success-content">
                    <span class="material-symbols-sharp success-icon">check_circle</span>
                    <h2>Pagamento Confirmado!</h2>
                    <p>Sua assinatura foi ativada com sucesso.</p>
                    <div class="plan-activated">
                        <strong>Plano ativado:</strong> ${paymentData.title || 'Premium'}
                    </div>
                </div>
                <div class="modal-actions">
                    <button id="continue-btn" class="btn primary">Continuar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('payment-success-modal');
    const continueBtn = document.getElementById('continue-btn');
    
    continueBtn.addEventListener('click', () => {
        window.hideModal(modal);
        setTimeout(() => {
            modal.remove();
            window.location.reload();
        }, 400);
    });
    
    window.showModal(modal);
}

/**
 * Show plan selection modal
 */
export function showPlanSelectionModal() {
    const user = window.firebaseAuth?.getCurrentUser();
    if (!user) {
        alert('Faça login para continuar');
        return;
    }

    const modalHtml = `
        <div class="modal" id="plan-selection-modal" aria-hidden="true">
            <div class="modal-content plan-modal">
                <button class="close-modal" aria-label="Fechar modal">&times;</button>
                <h2>🚀 Escolha seu Plano</h2>
                <div class="plans-container">
                    ${Object.entries(PRODUCTS).map(([key, product]) => `
                        <div class="plan-card ${key}" data-plan="${key}">
                            <div class="plan-header">
                                <h3>${product.title}</h3>
                                <div class="plan-price">
                                    <span class="currency">R$</span>
                                    <span class="amount">${product.price.toFixed(2).replace('.', ',')}</span>
                                    <span class="period">/mês</span>
                                </div>
                            </div>
                            <div class="plan-features">
                                ${product.features.map(feature => `
                                    <div class="feature">
                                        <span class="material-symbols-sharp">check</span>
                                        <span>${feature}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <button class="select-plan-btn" data-plan="${key}">
                                Escolher ${key === 'hero' ? 'e Apoiar' : 'Plano'}
                            </button>
                        </div>
                    `).join('')}
                </div>
                <div class="modal-actions">
                    <button id="cancel-plan-btn" class="btn">Talvez mais tarde</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('plan-selection-modal');
    
    // Event listeners
    const closeBtn = modal.querySelector('.close-modal');
    const cancelBtn = document.getElementById('cancel-plan-btn');
    const selectBtns = modal.querySelectorAll('.select-plan-btn');
    
    closeBtn.addEventListener('click', () => {
        window.hideModal(modal);
        setTimeout(() => modal.remove(), 400);
    });
    
    cancelBtn.addEventListener('click', () => {
        window.hideModal(modal);
        setTimeout(() => modal.remove(), 400);
    });
    
    selectBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const planKey = btn.dataset.plan;
            await handlePlanSelection(planKey, modal);
        });
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
 * Handle plan selection
 */
async function handlePlanSelection(planKey, modal) {
    try {
        const btn = modal.querySelector(`[data-plan="${planKey}"]`);
        const originalText = btn.textContent;
        
        btn.textContent = 'Processando...';
        btn.disabled = true;
        
        const user = window.firebaseAuth.getCurrentUser();
        const subscriptionData = await createSubscription(planKey, user.email);
        
        if (subscriptionData.init_point) {
            // Redirect to Mercado Pago checkout
            window.open(subscriptionData.init_point, '_blank');
            window.hideModal(modal);
            setTimeout(() => modal.remove(), 400);
            
            // Show waiting modal
            showPaymentWaitingModal();
        } else {
            throw new Error('Link de pagamento não recebido');
        }
        
    } catch (error) {
        console.error('Error selecting plan:', error);
        alert(`Erro ao processar pagamento: ${error.message}`);
        
        // Reset button
        const btn = modal.querySelector(`[data-plan="${planKey}"]`);
        btn.textContent = btn.textContent.replace('Processando...', 'Escolher Plano');
        btn.disabled = false;
    }
}

/**
 * Show payment waiting modal
 */
function showPaymentWaitingModal() {
    const modalHtml = `
        <div class="modal" id="payment-waiting-modal" aria-hidden="true">
            <div class="modal-content">
                <div class="waiting-content">
                    <div class="loading-spinner"></div>
                    <h2>Aguardando Pagamento</h2>
                    <p>Complete o pagamento na nova aba aberta.</p>
                    <p>Após a confirmação, seu plano será ativado automaticamente.</p>
                </div>
                <div class="modal-actions">
                    <button id="close-waiting-btn" class="btn">Fechar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('payment-waiting-modal');
    const closeBtn = document.getElementById('close-waiting-btn');
    
    closeBtn.addEventListener('click', () => {
        window.hideModal(modal);
        setTimeout(() => modal.remove(), 400);
    });
    
    window.showModal(modal);
}

// Export for global access
if (typeof window !== 'undefined') {
    window.mercadoPago = {
        PRODUCTS,
        createSubscription,
        handlePaymentSuccess,
        showPlanSelectionModal
    };
}