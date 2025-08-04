/**
 * Vocabulary Event Handlers
 */

export class VocabularyEventHandlers {
    constructor() {
        this.setupMobileNavigation();
        this.setupAuth();
        this.setupBackButton();
        this.setupFeedbackAndReporting();
    }

    setupMobileNavigation() {
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', function() {
                navMenu.classList.toggle('active');
                const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
                navToggle.setAttribute('aria-expanded', !isExpanded);
                document.body.classList.toggle('nav-open');
            });
        }
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.navbar')) {
                if (navMenu) navMenu.classList.remove('active');
                if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
                document.body.classList.remove('nav-open');
            }
        });
    }

    setupAuth() {
        const themeSwitch = document.querySelector('.theme-switch');
        if (themeSwitch) {
            const sunIcon = themeSwitch.querySelector('.sun');
            const moonIcon = themeSwitch.querySelector('.moon');
            let isDark = false;

            themeSwitch.addEventListener('click', () => {
                isDark = !isDark;
                document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
                if (sunIcon) sunIcon.style.display = isDark ? 'block' : 'none';
                if (moonIcon) moonIcon.style.display = isDark ? 'none' : 'block';
            });
        }

        const loginBtn = document.querySelector('.login-button');
        const modal = document.getElementById('loginModal');
        const closeBtn = document.querySelector('.close-modal');

        if (loginBtn && modal && closeBtn) {
            loginBtn.addEventListener('click', () => {
                modal.style.display = 'flex';
            });

            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });

            window.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    }

    setupBackButton() {
        const backButton = document.getElementById('back-button');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location.href = '/';
            });
        }
    }

    setupFeedbackAndReporting() {
        // Feedback button
        const feedbackBtn = document.getElementById('vocab-feedback-btn');
        if (feedbackBtn) {
            feedbackBtn.addEventListener('click', () => this.showFeedbackModal());
        }

        // Problem report button
        const reportProblemBtn = document.getElementById('vocab-report-problem-btn');
        if (reportProblemBtn) {
            reportProblemBtn.addEventListener('click', () => this.showProblemModal());
        }

        // Feedback modal
        const feedbackModal = document.getElementById('vocabFeedbackModal');
        const feedbackForm = document.getElementById('vocab-feedback-form');
        const cancelFeedbackBtn = document.getElementById('cancel-vocab-feedback');

        if (feedbackForm) {
            feedbackForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleFeedbackSubmit();
            });
        }

        if (cancelFeedbackBtn) {
            cancelFeedbackBtn.addEventListener('click', () => {
                feedbackModal.style.display = 'none';
                this.resetFeedbackForm();
            });
        }

        // Problem report modal
        const problemModal = document.getElementById('vocabProblemModal');
        const problemForm = document.getElementById('vocab-problem-form');
        const cancelProblemBtn = document.getElementById('cancel-vocab-problem');

        if (problemForm) {
            problemForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleProblemSubmit();
            });
        }

        if (cancelProblemBtn) {
            cancelProblemBtn.addEventListener('click', () => {
                problemModal.style.display = 'none';
                this.resetProblemForm();
            });
        }

        // Close modals when clicking outside
        [feedbackModal, problemModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.style.display = 'none';
                    }
                });

                const closeBtn = modal.querySelector('.close-modal');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        modal.style.display = 'none';
                    });
                }
            }
        });
    }

    showFeedbackModal() {
        if (!window.firebaseAuth?.isAuthenticated()) {
            alert('Você precisa estar logado para enviar feedback.');
            return;
        }
        document.getElementById('vocabFeedbackModal').style.display = 'flex';
    }

    showProblemModal() {
        if (!window.firebaseAuth?.isAuthenticated()) {
            alert('Você precisa estar logado para relatar problemas.');
            return;
        }
        document.getElementById('vocabProblemModal').style.display = 'flex';
    }

    async handleFeedbackSubmit() {
        try {
            const type = document.getElementById('vocab-feedback-type').value;
            const message = document.getElementById('vocab-feedback-message').value;

            if (!type || !message) {
                alert('Por favor, preencha todos os campos obrigatórios.');
                return;
            }

            const user = window.firebaseAuth.getCurrentUser();
            const feedbackData = {
                type,
                message,
                section: 'vocabulary',
                userId: user.uid,
                userName: user.displayName || user.email,
                userEmail: user.email,
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: new Date().toISOString()
            };

            // Save to Firestore
            await this.saveFeedbackToFirestore(feedbackData);

            // Save locally as backup
            const { saveFeedbackDB } = await import('./vocabulary-db.js');
            await saveFeedbackDB(feedbackData);

            alert('Feedback enviado com sucesso! Obrigado pela sua contribuição.');
            document.getElementById('vocabFeedbackModal').style.display = 'none';
            this.resetFeedbackForm();

        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Erro ao enviar feedback. Tente novamente mais tarde.');
        }
    }

    async handleProblemSubmit() {
        try {
            const category = document.getElementById('vocab-problem-category').value;
            const description = document.getElementById('vocab-problem-description').value;

            if (!category || !description) {
                alert('Por favor, preencha todos os campos obrigatórios.');
                return;
            }

            const user = window.firebaseAuth.getCurrentUser();
            const problemData = {
                category,
                description,
                section: 'vocabulary',
                userId: user.uid,
                userName: user.displayName || user.email,
                userEmail: user.email,
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: new Date().toISOString()
            };

            // Save to Firestore
            await this.saveProblemToFirestore(problemData);

            // Save locally as backup
            const { saveProblemReportDB } = await import('./vocabulary-db.js');
            await saveProblemReportDB(problemData);

            alert('Problema relatado com sucesso! Nossa equipe será notificada.');
            document.getElementById('vocabProblemModal').style.display = 'none';
            this.resetProblemForm();

        } catch (error) {
            console.error('Error submitting problem report:', error);
            alert('Erro ao relatar problema. Tente novamente mais tarde.');
        }
    }

    async saveFeedbackToFirestore(feedbackData) {
        try {
            const { doc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const db = window.firebaseAuth.db;
            
            const feedbackRef = doc(collection(db, 'feedback'), Date.now().toString());
            await setDoc(feedbackRef, feedbackData);
            
            console.log('Feedback saved to Firestore');
        } catch (error) {
            console.error('Error saving feedback to Firestore:', error);
            throw error;
        }
    }

    async saveProblemToFirestore(problemData) {
        try {
            const { doc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const db = window.firebaseAuth.db;
            
            const problemRef = doc(collection(db, 'problems'), Date.now().toString());
            await setDoc(problemRef, problemData);
            
            console.log('Problem report saved to Firestore');
        } catch (error) {
            console.error('Error saving problem report to Firestore:', error);
            throw error;
        }
    }

    resetFeedbackForm() {
        document.getElementById('vocab-feedback-type').value = '';
        document.getElementById('vocab-feedback-message').value = '';
    }

    resetProblemForm() {
        document.getElementById('vocab-problem-category').value = '';
        document.getElementById('vocab-problem-description').value = '';
    }
}

// Login function
window.loginWith = async function(provider) {
    if (typeof window.firebaseAuth !== 'undefined') {
        try {
            await window.firebaseAuth.loginWith(provider);
        } catch (error) {
            console.error(`Error logging in with ${provider}:`, error);
        }
    } else {
        console.log(`Logging in with ${provider} - Firebase not available`);
        const modal = document.getElementById('loginModal');
        if (modal) modal.style.display = 'none';
    }
};