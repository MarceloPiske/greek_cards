/**
 * Module for managing leitor state
 */

import { saveProgress, loadProgress, saveModuleCompletion } from '../indexedDB.js';

// Estado global do leitor
export const leitorState = {
    trilhaAtual: null,
    indiceAtual: 0,
    trilhaCompletada: []
};

// Salva o progresso no IndexedDB
export async function salvarProgresso() {
    if (!leitorState.trilhaAtual) return;
    
    const trilhaId = new URLSearchParams(window.location.search).get('trilha') || 'modulo_1';
    try {
        await saveProgress(trilhaId, {
            indiceAtual: leitorState.indiceAtual,
            trilhaCompletada: leitorState.trilhaCompletada
        });
    } catch (error) {
        console.error('Erro ao salvar progresso:', error);
        // Fallback para localStorage se o IndexedDB falhar
        localStorage.setItem(`trilha_${trilhaId}_progresso`, JSON.stringify({
            indiceAtual: leitorState.indiceAtual,
            trilhaCompletada: leitorState.trilhaCompletada
        }));
    }
}

// Carrega o progresso do IndexedDB
export async function carregarProgresso(trilhaId) {
    try {
        const progresso = await loadProgress(trilhaId);
        leitorState.indiceAtual = progresso.indiceAtual || 0;
        leitorState.trilhaCompletada = progresso.trilhaCompletada || [];
    } catch (error) {
        console.error('Erro ao carregar progresso:', error);
        // Fallback para localStorage se o IndexedDB falhar
        const progressoSalvo = localStorage.getItem(`trilha_${trilhaId}_progresso`);
        if (progressoSalvo) {
            const progresso = JSON.parse(progressoSalvo);
            leitorState.indiceAtual = progresso.indiceAtual || 0;
            leitorState.trilhaCompletada = progresso.trilhaCompletada || [];
        } else {
            leitorState.indiceAtual = 0;
            leitorState.trilhaCompletada = [];
        }
    }
}

// Salva informação que o módulo foi concluído
export async function salvarProgressoModuloConcluido(trilhaId) {
    try {
        await saveModuleCompletion(trilhaId);
    } catch (error) {
        console.error('Erro ao salvar conclusão do módulo:', error);
        // Fallback para localStorage
        localStorage.setItem(`trilha_${trilhaId}_concluido`, 'true');
    }
}