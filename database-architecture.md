# Arquitetura do Banco de Dados - Koiné App

## Visão Geral

O Koiné App utiliza uma arquitetura híbrida de banco de dados que combina **IndexedDB** (armazenamento local) com **Firestore** (armazenamento na nuvem), proporcionando funcionalidade offline e sincronização em tempo real para usuários premium.

### Estrutura Geral
- **Nome do Banco IndexedDB**: `koineAppDB`
- **Versão Atual**: 6
- **Banco Cloud**: Firestore (Firebase)
- **Estratégia**: Local-first com sincronização opcional

## IndexedDB - Armazenamento Local

### 1. Store: `systemVocabulary`
**Propósito**: Armazena o vocabulário base do sistema (dados do Strong's)

**Estrutura dos Campos**:
```javascript
{
  ID: string,                           // Chave primária (Strong's number)
  LEXICAL_FORM: string,                 // Forma grega da palavra (κοινή)
  TRANSLITERATED_LEXICAL_FORM: string, // Transliteração (koine)
  PART_OF_SPEECH: string,               // Classe gramatical (substantivo, verbo, etc.)
  PHONETIC_SPELLING: string,            // Pronúncia fonética
  DEFINITION: string,                   // Definição em inglês
  ORIGIN: string,                       // Origem etimológica
  USAGE: string                         // Tradução/uso em português
}
```

### 2. Store: `wordProgress`
**Propósito**: Armazena o progresso do usuário em aprender palavras

**Estrutura dos Campos**:
```javascript
{
  wordId: string,                      // ID da palavra
  userId: string,                      // ID do usuário
  status: string,                      // Status de aprendizado (unread, reading, familiar, memorized)
  reviewCount: number,                 // Número de revisões
  lastReviewed: string,                // Data da última revisão
  createdAt: string,                   // Data de criação
  updatedAt: string,                   // Data de última atualização
  syncedAt: string                      // Data de última sincronização
}
```

### 3. Store: `wordLists`
**Propósito**: Armazena as listas de palavras criadas pelo usuário

**Estrutura dos Campos**:
```javascript
{
  id: string,                          // ID da lista
  userId: string,                      // ID do usuário
  name: string,                        // Nome da lista
  description: string,                 // Descrição da lista
  wordIds: array<string>,               // IDs das palavras na lista
  createdAt: string,                   // Data de criação
  updatedAt: string,                   // Data de última atualização
  syncedAt: string                      // Data de última sincronização
}
```

### 4. Store: `progresso` (Trilha Progress)
**Propósito**: Armazena o progresso do usuário nas trilhas de estudo com suporte multi-usuário

**Chave Composta**: `['userId', 'modulo_id']`

**Estrutura dos Campos**:
```javascript
{
  userId: string,                      // ID do usuário (Firebase UID ou 'anonymous')
  modulo_id: string,                   // ID do módulo/trilha (ex: 'modulo_1', 'modulo_2')
  ultimaAtualizacao: string,           // Data da última atualização (ISO string)
  versaoLocal: number,                 // Timestamp para controle de versão local
  syncStatus: string,                  // Status de sincronização ('pending', 'synced', 'none')
  blocosConcluidos: array<string>,     // IDs dos blocos/atividades concluídos
  respostas: object,                   // Respostas dos exercícios
  tempoTotal: number,                  // Tempo total gasto no módulo (em minutos)
  notasPessoais: string,               // Anotações pessoais do usuário
  favoritos: array<string>,            // IDs dos blocos marcados como favoritos
  versaoModulo: string,                // Versão do conteúdo do módulo
  migratedAt: string,                  // Data de migração (se aplicável)
  dispositivo: object                  // Informações do dispositivo
}
```

## Firestore - Armazenamento na Nuvem

### 1. Coleção: `users`
**Propósito**: Armazena informações dos usuários

**Estrutura dos Campos**:
```javascript
{
  uid: string,                         // ID do usuário
  nome: string,                        // Nome do usuário
  email: string,                       // E-mail do usuário
  plano: string,                       // Plano do usuário (free, cloud, ai)
  ultimaAtualizacao: string,            // Data da última atualização
  settings: object,                    // Configurações do usuário
  activity: object                     // Atividades do usuário
}
```

### 2. Coleção: `wordProgress`
**Propósito**: Armazena o progresso do usuário em aprender palavras

**Estrutura dos Campos**:
```javascript
{
  wordId: string,                      // ID da palavra
  userId: string,                      // ID do usuário
  status: string,                      // Status de aprendizado (unread, reading, familiar, memorized)
  reviewCount: number,                 // Número de revisões
  lastReviewed: string,                // Data da última revisão
  createdAt: string,                   // Data de criação
  updatedAt: string,                   // Data de última atualização
  syncedAt: string                      // Data de última sincronização
}
```

### 3. Coleção: `wordLists`
**Propósito**: Armazena as listas de palavras criadas pelo usuário

**Estrutura dos Campos**:
```javascript
{
  id: string,                          // ID da lista
  userId: string,                      // ID do usuário
  name: string,                        // Nome da lista
  description: string,                 // Descrição da lista
  wordIds: array<string>,               // IDs das palavras na lista
  createdAt: string,                   // Data de criação
  updatedAt: string,                   // Data de última atualização
  syncedAt: string                      // Data de última sincronização
}
```

## Benefícios da Arquitetura

A arquitetura híbrida do Koiné App oferece vários benefícios, incluindo:

*   **Funcionalidade offline**: O usuário pode acessar e aprender palavras mesmo sem conexão com a internet.
*   **Sincronização em tempo real**: Quando o usuário estiver online, o progresso e as listas de palavras são sincronizados automaticamente com a nuvem.
*   **Escalabilidade**: A arquitetura é projetada para lidar com um grande número de usuários e palavras, garantindo que o aplicativo permaneça responsivo e eficiente.
*   **Segurança**: A utilização do Firestore e do IndexedDB garante que os dados do usuário sejam armazenados de forma segura e confiável.

## Conclusão

A arquitetura do banco de dados do Koiné App é projetada para fornecer uma experiência de aprendizado de palavras gregas eficaz e escalável. Com a combinação do IndexedDB e do Firestore, o aplicativo pode oferecer funcionalidade offline e sincronização em tempo real, tornando-o uma ferramenta valiosa para estudantes e pesquisadores de grego bíblico.