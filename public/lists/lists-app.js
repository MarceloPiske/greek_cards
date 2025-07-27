/**
 * Lists Manager Application Logic
 */

import { 
    createWordList, 
    getAllWordLists, 
    updateWordList, 
    deleteWordList,
    forceFullSync,
} from './lists-sync.js';

import { canSyncToCloud } from '../../plan-manager.js';
import { ListsUI } from './lists-ui.js';
import { ListsEventHandlers } from './lists-events.js';
import { showAddWordsModal, showRemoveWordsModal } from './lists-words.js';

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
            if (this.currentLists.length >= 5) {
                this.ui.showError('Você atingiu o limite máximo de 5 listas. Exclua uma lista existente para criar uma nova.');
                return false;
            }

            this.ui.showLoading('Criando lista...');

            const newList = await createWordList({ 
                name: name.trim(), 
                description: description.trim(), 
                wordIds: [] 
            });

            this.ui.hideLoading();
            this.ui.showSuccess('Lista criada com sucesso!');
            await this.loadLists();
            return true;

        } catch (error) {
            console.error('Error creating list:', error);
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

            await deleteWordList(listId);

            this.ui.hideLoading();
            this.ui.showSuccess('Lista excluída com sucesso!');
            await this.loadLists();
            return true;

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

    async addWordsToList(listId) {
        await showAddWordsModal(listId);
    }

    async removeWordsFromList(listId, selectedWords) {
        await showRemoveWordsModal(listId, selectedWords);
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