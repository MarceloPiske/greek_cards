/**
 * Lists Manager Application Logic
 */

import { 
    createWordList, 
    getAllWordLists, 
    updateWordList, 
    deleteWordList,
    forceFullSync,
    removeWordsFromList,
    getWordList
} from './lists-sync.js';

import { canSyncToCloud } from '../../plan-manager.js';
import { ListsUI } from './lists-ui.js';
import { ListsEventHandlers } from './lists-events.js';
import { showAddWordsModal } from './lists-words.js';

export class ListsApp {
    constructor() {
        this.currentLists = [];
        this.filteredLists = [];
        this.currentContextMenuList = null;
        this.ui = new ListsUI();
        this.eventHandlers = new ListsEventHandlers(this);
    }

    async initialize() {
        try {
            // Initialize Firebase Authentication
            if (typeof window.firebaseAuth !== 'undefined') {
                await window.firebaseAuth.initAuth();
            }
            
            this.eventHandlers.setupEventListeners();
            
            // Set up callback for background sync updates
            window.listsUpdatedCallback = () => {
                console.log('Lists updated from background sync');
                this.loadLists();
            };
            
            await this.loadLists();
            
        } catch (error) {
            console.error('Error initializing application:', error);
            this.ui.showError('Erro ao inicializar a aplicação');
        }
    }

    async loadLists() {
        try {
            this.ui.showLoading('Carregando listas...');
            
            const lists = await getAllWordLists();
            this.currentLists = lists;
            this.filteredLists = lists;
            
            this.ui.hideLoading();
            this.ui.renderLists(this.filteredLists);
            
        } catch (error) {
            console.error('Error loading lists:', error);
            this.ui.hideLoading();
            this.ui.showError('Erro ao carregar listas');
        }
    }

    async createList(name, description) {
        try {
            if (!name.trim()) {
                this.ui.showError('Por favor, insira um nome para a lista');
                return false;
            }

            // Check list limit before creating
            const maxAllowed = window.planManager.getMaxListsAllowed();
            if (this.currentLists.length >= maxAllowed) {
                const currentPlan = window.planManager.getCurrentUserPlan();
                const planName = currentPlan === 'free' ? 'gratuito' : currentPlan === 'cloud' ? 'nuvem' : 'inteligente';
                this.ui.showError(`Você atingiu o limite máximo de ${maxAllowed} listas do plano ${planName}. Exclua uma lista existente para criar uma nova.`);
                return false;
            }

            this.ui.showLoading('Criando lista...');

            const newList = await createWordList({ 
                name: name.trim(), 
                description: description.trim(), 
                wordIds: [] 
            });

            this.ui.hideLoading();
            this.ui.showSuccess('Lista criada com sucesso! Você pode adicionar palavras agora.');
            await this.loadLists();
            return true;

        } catch (error) {
            console.error('Error creating list:', error);
            this.ui.hideLoading();
            this.ui.showError('Erro ao criar lista: ' + error.message);
            return false;
        }
    }

    async createListAndAddWords(name, description) {
        try {
            if (!name.trim()) {
                this.ui.showError('Por favor, insira um nome para a lista');
                return false;
            }

            // Check list limit before creating
            const maxAllowed = window.planManager.getMaxListsAllowed();
            if (this.currentLists.length >= maxAllowed) {
                const currentPlan = window.planManager.getCurrentUserPlan();
                const planName = currentPlan === 'free' ? 'gratuito' : currentPlan === 'cloud' ? 'nuvem' : 'inteligente';
                this.ui.showError(`Você atingiu o limite máximo de ${maxAllowed} listas do plano ${planName}. Exclua uma lista existente para criar uma nova.`);
                return false;
            }

            this.ui.showLoading('Criando lista...');

            const newList = await createWordList({ 
                name: name.trim(), 
                description: description.trim(), 
                wordIds: [] 
            });

            this.ui.hideLoading();
            await this.loadLists();
            
            // Immediately open add words modal
            await this.addWordsToList(newList.originalId || newList.id);
            
            return newList.id;

        } catch (error) {
            console.error('Error creating list and adding words:', error);
            this.ui.hideLoading();
            this.ui.showError('Erro ao criar lista: ' + error.message);
            return false;
        }
    }

    async updateList(listId, name, description) {
        try {
            if (!name.trim()) {
                this.ui.showError('Por favor, insira um nome para a lista');
                return false;
            }

            this.ui.showLoading('Salvando alterações...');

            await updateWordList(listId, { 
                name: name.trim(), 
                description: description.trim() 
            });

            this.ui.hideLoading();
            this.ui.showSuccess('Lista atualizada com sucesso!');
            await this.loadLists();
            return true;

        } catch (error) {
            console.error('Error updating list:', error);
            this.ui.hideLoading();
            this.ui.showError('Erro ao atualizar lista: ' + error.message);
            return false;
        }
    }

    async deleteList(listId) {
        try {
            this.ui.showLoading('Excluindo lista...');

            console.log(`Attempting to delete list: ${listId}`);
            const result = await deleteWordList(listId);
            
            if (result) {
                this.ui.hideLoading();
                this.ui.showSuccess('Lista excluída com sucesso!');
                await this.loadLists();
                return true;
            } else {
                throw new Error('Falha ao excluir lista');
            }

        } catch (error) {
            console.error('Error deleting list:', error);
            this.ui.hideLoading();
            this.ui.showError('Erro ao excluir lista: ' + error.message);
            return false;
        }
    }

    async duplicateList(list) {
        try {
            this.ui.showLoading('Duplicando lista...');

            const duplicatedList = await createWordList({
                name: list.name + ' (Cópia)',
                description: list.description,
                wordIds: [...(list.wordIds || [])]
            });

            this.ui.hideLoading();
            this.ui.showSuccess('Lista duplicada com sucesso!');
            await this.loadLists();
            return true;

        } catch (error) {
            console.error('Error duplicating list:', error);
            this.ui.hideLoading();
            this.ui.showError('Erro ao duplicar lista: ' + error.message);
            return false;
        }
    }

    async syncAllLists() {
        try {
            if (!await canSyncToCloud()) {
                this.ui.showError('Sincronização na nuvem não disponível. Faça upgrade para plano Premium.');
                return false;
            }

            // First check for local lists that don't exist in cloud and ask for confirmation
            const { getListsNeedingSyncDB } = await import('./lists-sync.js');
            const { getAllWordListsFirestore } = await import('./lists-firestore.js');
            
            const localListsNeedingSync = await getListsNeedingSyncDB();
            const cloudLists = await getAllWordListsFirestore();
            const cloudListIds = new Set(cloudLists.map(list => list.id));
            
            const newLocalLists = localListsNeedingSync.filter(list => {
                const originalId = list.originalId || list.id.split('_').slice(1).join('_');
                return !cloudListIds.has(originalId);
            });
            
            if (newLocalLists.length > 0) {
                const confirmUpload = confirm(
                    `Você tem ${newLocalLists.length} lista(s) local(is) que não existem na nuvem:\n\n` +
                    newLocalLists.map(list => `- ${list.name}`).join('\n') +
                    `\n\nDeseja enviá-las para a nuvem?`
                );
                
                if (!confirmUpload) {
                    return false;
                }
            }

            this.ui.showLoading('Sincronizando todas as listas...');

            const result = await forceFullSync();
            
            this.ui.hideLoading();
            this.ui.showSuccess(`Sincronização completa: ${result.uploaded} enviadas, ${result.downloaded} baixadas.`);
            
            // Force reload to show updated sync status
            await this.loadLists();
            return true;

        } catch (error) {
            console.error('Error syncing all lists:', error);
            this.ui.hideLoading();
            this.ui.showError('Erro na sincronização: ' + error.message);
            return false;
        }
    }

    searchLists(searchTerm) {
        const term = searchTerm.toLowerCase();
        
        if (term.trim() === '') {
            this.filteredLists = this.currentLists;
        } else {
            this.filteredLists = this.currentLists.filter(list => 
                list.name.toLowerCase().includes(term) ||
                (list.description && list.description.toLowerCase().includes(term))
            );
        }
        
        this.ui.renderLists(this.filteredLists);
    }

    openList(listId) {
        window.location.href = `../index.html?list=${listId}`;
    }

    async viewListWords(listId) {
        try {
            this.ui.showLoading('Carregando palavras da lista...');
            
            // Get list with words
            const list = await this.getListWithWords(listId);
            
            this.ui.hideLoading();
            
            const modal = this.ui.showViewWordsModal(list);
            this.setupViewWordsModalEvents(modal, list);
            
        } catch (error) {
            console.error('Error viewing list words:', error);
            this.ui.hideLoading();
            this.ui.showError('Erro ao carregar palavras da lista: ' + error.message);
        }
    }

    async getListWithWords(listId) {
        const { getWordList } = await import('./lists-sync.js');
        const { initVocabularyDB } = await import('../../vocabulary/vocabulary-db.js');
        
        const list = await getWordList(listId);
        if (!list) {
            throw new Error('Lista não encontrada');
        }

        if (!list.wordIds || list.wordIds.length === 0) {
            return { ...list, words: [] };
        }

        // Get words from vocabulary database
        const db = await initVocabularyDB();
        const tx = db.transaction('systemVocabulary', 'readonly');
        const store = tx.objectStore('systemVocabulary');
        
        const allWords = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });

        const words = [];
        for (const wordId of list.wordIds) {
            const word = allWords.find(w => w.ID === wordId);
            if (word) {
                words.push(word);
            }
        }

        return { ...list, words };
    }

    setupViewWordsModalEvents(modal, list) {
        const closeBtn = modal.querySelector('.close-modal');
        const selectAllBtn = modal.querySelector('#select-all-words');
        const deselectAllBtn = modal.querySelector('#deselect-all-words');
        const removeSelectedBtn = modal.querySelector('#remove-selected-words');
        const addMoreWordsBtn = modal.querySelector('#add-more-words');
        const checkboxes = modal.querySelectorAll('.word-remove-checkbox');

        // Close modal
        closeBtn.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Selection actions
        selectAllBtn.addEventListener('click', () => {
            checkboxes.forEach(checkbox => checkbox.checked = true);
            this.updateRemoveButton(removeSelectedBtn, checkboxes);
        });

        deselectAllBtn.addEventListener('click', () => {
            checkboxes.forEach(checkbox => checkbox.checked = false);
            this.updateRemoveButton(removeSelectedBtn, checkboxes);
        });

        // Update remove button state when checkboxes change
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateRemoveButton(removeSelectedBtn, checkboxes);
            });
        });

        // Remove selected words
        removeSelectedBtn.addEventListener('click', async () => {
            const selectedWordIds = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.closest('.view-word-item').dataset.wordId);

            if (selectedWordIds.length === 0) return;

            if (confirm(`Remover ${selectedWordIds.length} palavra(s) desta lista?`)) {
                try {
                    this.ui.showLoading('Removendo palavras...');
                    
                    await removeWordsFromList(list.id, selectedWordIds);
                    
                    this.ui.hideLoading();
                    this.ui.showSuccess(`${selectedWordIds.length} palavra(s) removida(s) com sucesso!`);
                    
                    modal.remove();
                    await this.loadLists();
                    
                } catch (error) {
                    console.error('Error removing words:', error);
                    this.ui.hideLoading();
                    this.ui.showError('Erro ao remover palavras: ' + error.message);
                }
            }
        });

        // Add more words
        addMoreWordsBtn.addEventListener('click', () => {
            modal.remove();
            this.addWordsToList(list.id);
        });
    }

    updateRemoveButton(removeBtn, checkboxes) {
        const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        
        if (selectedCount > 0) {
            removeBtn.disabled = false;
            removeBtn.textContent = `Remover (${selectedCount})`;
        } else {
            removeBtn.disabled = true;
            removeBtn.textContent = 'Remover Selecionadas';
        }
    }

    async practiceList(listId) {
        try {
            // Redirect to cards page with list parameter
            window.location.href = `../cards/index.html?list=${listId}`;
        } catch (error) {
            console.error('Error redirecting to practice:', error);
            this.ui.showError('Erro ao abrir sessão de prática');
        }
    }

    async addWordsToList(listId) {
        await showAddWordsModal(listId);
        
        // Set up refresh callback
        window.refreshLists = () => {
            this.loadLists();
        };
    }

    async syncSingleList(listId) {
        // Remove this function since we're removing individual sync
        console.log('Individual sync removed - use global sync instead');
        return true;
    }

    setContextMenuList(list) {
        this.currentContextMenuList = list;
    }

    getContextMenuList() {
        return this.currentContextMenuList;
    }
}