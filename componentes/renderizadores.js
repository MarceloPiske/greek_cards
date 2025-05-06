/**
 * Componentes de renderização para atividades
 * Este arquivo é mantido para compatibilidade com código existente
 * mas as funções foram movidas para leitor/activities.js
 */

// Importar as funções do novo módulo
import { 
    renderVocabulario, 
    renderInterlinear, 
    renderQuiz, 
    renderExplicacao, 
    renderLeitura,
    verificarQuiz 
} from '../leitor/activities.js';

// Exportar para o window para compatibilidade com código antigo
window.renderVocabulario = renderVocabulario;
window.renderInterlinear = renderInterlinear;
window.renderQuiz = renderQuiz;
window.renderExplicacao = renderExplicacao;
window.renderLeitura = renderLeitura;
window.verificarQuiz = verificarQuiz;