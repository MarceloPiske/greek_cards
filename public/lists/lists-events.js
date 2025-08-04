/**
 * Lists Manager Event Handlers
 */

export class ListsEventHandlers {
    constructor(app) {
        this.app = app;
        this.debounceTimeout = null;
    }

    setupEventListeners() {
        this.setupNavigation();
        this.setupMobileNavigation();
        this.setupMainActions();
        this.setupContextMenu();
        this.setupModals();
        this.setupTheme();
        this.setupAuth();
        this.setupFeedbackAndReporting();
    }

    setupNavigation() {
        const backButton = document.getElementById('back-button');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.location.href = '../index.html';
            });
        }
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
    }

    setupMainActions() {
        // Search
        const searchInput = document.getElementById('search-lists');
        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                this.debounce(() => {
                    this.app.searchLists(event.target.value);
                }, 300);
            });
        }

        // Main action buttons
        const newListBtn = document.getElementById('new-list-btn');
        const createFirstListBtn = document.getElementById('create-first-list');
        const syncAllBtn = document.getElementById('sync-all-btn');
        const feedbackBtn = document.getElementById('feedback-btn');
        const reportProblemBtn = document.getElementById('report-problem-btn');

        if (newListBtn) {
            newListBtn.addEventListener('click', () => this.handleNewList());
        }
        if (createFirstListBtn) {
            createFirstListBtn.addEventListener('click', () => this.handleNewList());
        }
        if (syncAllBtn) {
            syncAllBtn.addEventListener('click', () => this.app.syncAllLists());
        }
        if (feedbackBtn) {
            feedbackBtn.addEventListener('click', () => this.showFeedbackModal());
        }
        if (reportProblemBtn) {
            reportProblemBtn.addEventListener('click', () => this.showProblemModal());
        }

        // Dynamic list action buttons (using event delegation)
        document.addEventListener('click', (e) => {
            if (e.target.matches('.view-list-btn') || e.target.closest('.view-list-btn')) {
                const btn = e.target.matches('.view-list-btn') ? e.target : e.target.closest('.view-list-btn');
                const listId = btn.getAttribute('data-list-id');
                this.app.viewListWords(listId);
            }

            if (e.target.matches('.practice-list-btn') || e.target.closest('.practice-list-btn')) {
                const btn = e.target.matches('.practice-list-btn') ? e.target : e.target.closest('.practice-list-btn');
                const listId = btn.getAttribute('data-list-id');
                this.app.practiceList(listId);
            }

            if (e.target.matches('.add-words-btn') || e.target.closest('.add-words-btn')) {
                const btn = e.target.matches('.add-words-btn') ? e.target : e.target.closest('.add-words-btn');
                const listId = btn.getAttribute('data-list-id');
                this.app.addWordsToList(listId);
            }

            if (e.target.matches('.sync-single-btn') || e.target.closest('.sync-single-btn')) {
                const btn = e.target.matches('.sync-single-btn') ? e.target : e.target.closest('.sync-single-btn');
                const listId = btn.getAttribute('data-list-id');
                this.app.syncSingleList(listId);
            }

            if (e.target.matches('.list-menu-btn') || e.target.closest('.list-menu-btn')) {
                e.stopPropagation();
                const btn = e.target.matches('.list-menu-btn') ? e.target : e.target.closest('.list-menu-btn');
                const listCard = btn.closest('.list-card');
                const listId = listCard.getAttribute('data-list-id');
                const list = this.app.filteredLists.find(l => l.id === listId);
                this.showContextMenu(e, list);
            }
        });
    }

    setupContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        const editBtn = document.getElementById('edit-list');
        const duplicateBtn = document.getElementById('duplicate-list');
        const deleteBtn = document.getElementById('delete-list');

        if (editBtn) {
            editBtn.addEventListener('click', () => this.handleEditList());
        }
        if (duplicateBtn) {
            duplicateBtn.addEventListener('click', () => this.handleDuplicateList());
        }
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.handleDeleteList());
        }

        // Close context menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#context-menu') && !e.target.closest('.list-menu-btn')) {
                contextMenu.style.display = 'none';
            }
        });
    }

    setupModals() {
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.remove();
            }
        });
    }

    setupTheme() {
        const themeSwitch = document.querySelector('.theme-switch');
        if (!themeSwitch) return;
        
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

    setupAuth() {
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
    }

    setupFeedbackAndReporting() {
        // Feedback modal
        const feedbackModal = document.getElementById('feedbackModal');
        const feedbackForm = document.getElementById('feedback-form');
        const cancelFeedbackBtn = document.getElementById('cancel-feedback');

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
        const problemModal = document.getElementById('problemModal');
        const problemForm = document.getElementById('problem-form');
        const cancelProblemBtn = document.getElementById('cancel-problem');

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
    }

    showFeedbackModal() {
        if (!window.firebaseAuth?.isAuthenticated()) {
            alert('Você precisa estar logado para enviar feedback.');
            return;
        }
        document.getElementById('feedbackModal').style.display = 'flex';
    }

    showProblemModal() {
        if (!window.firebaseAuth?.isAuthenticated()) {
            alert('Você precisa estar logado para relatar problemas.');
            return;
        }
        document.getElementById('problemModal').style.display = 'flex';
    }

    async handleFeedbackSubmit() {
        try {
            const type = document.getElementById('feedback-type').value;
            const message = document.getElementById('feedback-message').value;
            const email = document.getElementById('feedback-email').value;

            if (!type || !message) {
                alert('Por favor, preencha todos os campos obrigatórios.');
                return;
            }

            const user = window.firebaseAuth.getCurrentUser();
            const feedbackData = {
                type,
                message,
                email: email || user.email,
                userId: user.uid,
                userName: user.displayName || user.email,
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: new Date().toISOString()
            };

            // Save to Firestore
            await this.saveFeedbackToFirestore(feedbackData);

            // Save locally as backup
            const { saveFeedbackDB } = await import('../vocabulary/vocabulary-db.js');
            await saveFeedbackDB(feedbackData);

            alert('Feedback enviado com sucesso! Obrigado pela sua contribuição.');
            document.getElementById('feedbackModal').style.display = 'none';
            this.resetFeedbackForm();

        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Erro ao enviar feedback. Tente novamente mais tarde.');
        }
    }

    async handleProblemSubmit() {
        try {
            const category = document.getElementById('problem-category').value;
            const description = document.getElementById('problem-description').value;
            const steps = document.getElementById('problem-steps').value;

            if (!category || !description) {
                alert('Por favor, preencha todos os campos obrigatórios.');
                return;
            }

            const user = window.firebaseAuth.getCurrentUser();
            const problemData = {
                category,
                description,
                steps,
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
            const { saveProblemReportDB } = await import('../vocabulary/vocabulary-db.js');
            await saveProblemReportDB(problemData);

            alert('Problema relatado com sucesso! Nossa equipe será notificada.');
            document.getElementById('problemModal').style.display = 'none';
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
        document.getElementById('feedback-type').value = '';
        document.getElementById('feedback-message').value = '';
        document.getElementById('feedback-email').value = '';
    }

    resetProblemForm() {
        document.getElementById('problem-category').value = '';
        document.getElementById('problem-description').value = '';
        document.getElementById('problem-steps').value = '';
    }

    handleNewList() {
        const modal = this.app.ui.showNewListModal();
        
        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = document.getElementById('cancel-new-list');
        const createBtn = document.getElementById('create-list');

        closeBtn.addEventListener('click', () => modal.remove());
        cancelBtn.addEventListener('click', () => modal.remove());
        createBtn.addEventListener('click', async () => {
            const name = document.getElementById('list-name').value;
            const description = document.getElementById('list-description').value;
            
            const success = await this.app.createList(name, description);
            if (success) {
                modal.remove();
            }
        });
    }

    handleEditList() {
        const list = this.app.getContextMenuList();
        if (!list) return;

        document.getElementById('context-menu').style.display = 'none';
        const modal = this.app.ui.showEditListModal(list);

        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = document.getElementById('cancel-edit-list');
        const saveBtn = document.getElementById('save-list');

        closeBtn.addEventListener('click', () => modal.remove());
        cancelBtn.addEventListener('click', () => modal.remove());
        saveBtn.addEventListener('click', async () => {
            const name = document.getElementById('edit-list-name').value;
            const description = document.getElementById('edit-list-description').value;
            
            const success = await this.app.updateList(list.id, name, description);
            if (success) {
                modal.remove();
            }
        });
    }

    handleDuplicateList() {
        const list = this.app.getContextMenuList();
        if (!list) return;

        document.getElementById('context-menu').style.display = 'none';
        this.app.duplicateList(list);
    }

    handleDeleteList() {
        const list = this.app.getContextMenuList();
        if (!list) return;

        document.getElementById('context-menu').style.display = 'none';
        const modal = this.app.ui.showDeleteConfirmationModal(list);

        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = document.getElementById('cancel-delete');
        const confirmBtn = document.getElementById('confirm-delete');

        closeBtn.addEventListener('click', () => modal.remove());
        cancelBtn.addEventListener('click', () => modal.remove());
        confirmBtn.addEventListener('click', async () => {
            const success = await this.app.deleteList(list.id);
            if (success) {
                modal.remove();
            }
        });
    }

    showContextMenu(event, list) {
        const contextMenu = document.getElementById('context-menu');
        this.app.setContextMenuList(list);

        contextMenu.style.display = 'block';
        contextMenu.style.left = event.pageX + 'px';
        contextMenu.style.top = event.pageY + 'px';

        // Adjust position if menu goes off screen
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = (event.pageX - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = (event.pageY - rect.height) + 'px';
        }
    }

    debounce(func, wait) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(func, wait);
    }
}