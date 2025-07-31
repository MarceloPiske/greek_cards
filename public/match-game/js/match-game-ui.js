/**
 * Match Game UI Handler
 * Handles all UI rendering and DOM manipulation for the match game
 */

export class MatchGameUI {
    constructor(controller) {
        this.controller = controller;
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('back-button').addEventListener('click', () => {
            window.location.href = '../index.html';
        });

        document.getElementById('back-to-lists').addEventListener('click', () => {
            this.showScreen('main');
            this.controller.setGameMode('single');
        });

        document.getElementById('back-to-lists-final').addEventListener('click', () => {
            this.showScreen('main');
            this.controller.setGameMode(this.controller.gameMode);
        });

        // Game mode selection
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.getAttribute('data-mode');
                this.controller.setGameMode(mode);
            });
        });

        // List selection (delegated)
        document.getElementById('available-lists-single').addEventListener('click', (e) => {
            const card = e.target.closest('.list-game-card');
            if (card) {
                const listId = card.getAttribute('data-list-id');
                this.controller.handleListSelection(listId);
            }
        });
        document.getElementById('available-lists-multiplayer').addEventListener('click', (e) => {
            const card = e.target.closest('.list-game-card');
            if (card) {
                const listId = card.getAttribute('data-list-id');
                this.controller.handleListSelection(listId);
            }
        });

        // Multiplayer controls
        document.getElementById('create-room-btn')?.addEventListener('click', () => {
            this.controller.handleCreateRoom();
        });

        document.getElementById('join-room-btn')?.addEventListener('click', () => {
            this.controller.handleJoinRoom();
        });

        document.getElementById('refresh-public-rooms-btn')?.addEventListener('click', () => {
            this.controller.multiplayer.loadPublicRooms(1);
        });

        document.getElementById('toggle-ready-btn')?.addEventListener('click', () => {
            this.controller.multiplayer.toggleReady();
        });

        document.getElementById('start-game-btn')?.addEventListener('click', () => {
            this.controller.multiplayer.startGame();
        });

        document.getElementById('leave-room-btn')?.addEventListener('click', () => {
            this.controller.multiplayer.leaveRoom();
        });
        
        // Leaderboard controls
        document.getElementById('show-leaderboard-btn')?.addEventListener('click', () => {
            this.showLeaderboardScreen();
        });

        document.getElementById('show-personal-stats-btn')?.addEventListener('click', () => {
            this.controller.leaderboard.showPersonalStats();
        });

        // Game controls
        document.getElementById('play-again').addEventListener('click', () => {
            this.controller.startGame(this.controller.currentList);
        });

        this.setupAuth();
    }

    setupNavigation() {
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

    setupAuth() {
        // This can be simplified if a global auth handler exists
        const loginBtn = document.getElementById('login-button');
        if (loginBtn) {
            loginBtn.onclick = () => {
                 const modal = document.getElementById('loginModal');
                 if (modal) modal.style.display = 'flex';
            };
        }
    }

    updateUIMode(mode) {
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.mode-btn[data-mode="${mode}"]`)?.classList.add('active');
        
        // Show/hide the correct content sections
        const singlePlayerContent = document.getElementById('single-player-content');
        const multiplayerContent = document.getElementById('multiplayer-content');
        const leaderboardActions = document.getElementById('leaderboard-actions');
        
        if (singlePlayerContent) {
            singlePlayerContent.style.display = mode === 'single' ? 'block' : 'none';
        }
        if (multiplayerContent) {
            multiplayerContent.style.display = mode === 'multiplayer' ? 'block' : 'none';
        }
        if (leaderboardActions) {
            leaderboardActions.style.display = mode === 'multiplayer' ? 'block' : 'none';
        }
        
        // Clear lists to show loading state
        document.getElementById('available-lists-single').innerHTML = '';
        document.getElementById('available-lists-multiplayer').innerHTML = '';
        document.getElementById('empty-lists').style.display = 'none';
    }

    showLoadingLists(mode) {
        const containerId = mode === 'single' ? 'available-lists-single' : 'available-lists-multiplayer';
        document.getElementById(containerId).innerHTML = `
            <div class="loading-state">
                <span class="material-symbols-sharp loading-icon">sync</span>
                <p>Carregando suas listas...</p>
            </div>`;
    }

    renderLists(lists, mode) {
        const containerId = mode === 'single' ? 'available-lists-single' : 'available-lists-multiplayer';
        const container = document.getElementById(containerId);
        const emptyState = document.getElementById('empty-lists');

        if (lists.length === 0) {
            container.innerHTML = '';
            if (mode === 'single') {
                 emptyState.style.display = 'block';
            } else {
                 emptyState.style.display = 'none'; // In multiplayer, not having lists is ok
            }
            return;
        }
        
        emptyState.style.display = 'none';
        container.innerHTML = lists.map(list => this.createListCard(list)).join('');
    }

    createListCard(list) {
        const wordCount = list.wordIds ? list.wordIds.length : 0;
        const cardTitle = this.controller.gameMode === 'multiplayer' 
            ? 'Selecionar esta lista para criar uma sala' 
            : `Jogar com a lista: ${this.controller.escapeHtml(list.name)}`;

        return `
            <div class="list-game-card" data-list-id="${list.id}" title="${cardTitle}">
                <div class="list-card-header">
                    <div class="list-info">
                        <h3>${this.controller.escapeHtml(list.name)}</h3>
                    </div>
                </div>
                <div class="list-stats">
                    <div class="list-stat">
                        <span class="material-symbols-sharp">style</span>
                        <span>${wordCount} palavras</span>
                    </div>
                </div>
                 <div class="list-card-description">
                    <p>${this.controller.escapeHtml(list.description) || 'Sem descrição'}</p>
                </div>
            </div>`;
    }
    
    highlightSelectedList(listId) {
        document.querySelectorAll('.list-game-card').forEach(card => {
            card.classList.toggle('selected', card.getAttribute('data-list-id') === listId);
        });
        
        const multiActions = document.getElementById('multiplayer-list-actions');
        if (multiActions) {
             multiActions.style.display = listId ? 'block' : 'none';
        }
    }

    showErrorLoadingLists(mode) {
        const containerId = mode === 'single' ? 'available-lists-single' : 'available-lists-multiplayer';
        document.getElementById(containerId).innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-sharp">error</span>
                <h3>Erro ao carregar listas</h3>
                <p>Não foi possível carregar suas listas. Tente recarregar a página.</p>
            </div>`;
    }

    renderGameUI() {
        const gameState = this.controller.getGameState();
        document.getElementById('current-list-name').textContent = gameState.currentList.name;
        this.updateGameStats();
    }

    updateGameStats() {
        const gameState = this.controller.getGameState();
        document.getElementById('current-score').textContent = gameState.gameStats.score;
    }

    renderWords() {
        const greekContainer = document.getElementById('greek-words');
        const portugueseContainer = document.getElementById('portuguese-words');
        const gameState = this.controller.getGameState();
        
        const greekItems = [];
        const portugueseItems = [];
        
        // Get active words (limit to maximum 5)
        const activeWords = (gameState.currentDisplayWords || []).slice(0, 5);
        
        // Only show completed words at the top when there are fewer than 5 total words remaining
        const totalRemainingWords = (gameState.allWords || []).length - (gameState.completedWords || []).length;
        const shouldShowCompleted = totalRemainingWords < 5;
        
        if (shouldShowCompleted) {
            // Add completed words at the top (but don't exceed 5 total)
            const completedWords = gameState.completedWords || [];
            const maxCompleted = Math.max(0, 5 - activeWords.length);
            const recentCompleted = completedWords.slice(-maxCompleted);

            recentCompleted.forEach(word => {
                greekItems.push(this.createWordItem(word, 'greek', true));
                portugueseItems.push(this.createWordItem(word, 'portuguese', true));
            });
        }

        // Create arrays with the same words but different shuffling for each side
        const greekWordsToShow = [...activeWords];
        const portugueseWordsToShow = [...activeWords];
        
        // Shuffle each side independently but ensure both have the same words
        greekWordsToShow.sort(() => Math.random() - 0.5);
        portugueseWordsToShow.sort(() => Math.random() - 0.5);

        greekWordsToShow.forEach(word => {
             greekItems.push(this.createWordItem(word, 'greek', false));
        });
        portugueseWordsToShow.forEach(word => {
             portugueseItems.push(this.createWordItem(word, 'portuguese', false));
        });

        // Ensure we never have more than 5 items and both sides have the same count
        const finalGreekItems = greekItems.slice(0, 5);
        const finalPortugueseItems = portugueseItems.slice(0, 5);
        
        greekContainer.innerHTML = finalGreekItems.join('');
        portugueseContainer.innerHTML = finalPortugueseItems.join('');
        
        this.setupWordClickHandlers();
    }

    createWordItem(word, type, isCompleted) {
        const completedClass = isCompleted ? 'completed' : '';
        if (type === 'greek') {
            return `<div class="word-item greek-item ${completedClass}" data-word-id="${word.ID}">
                        <div class="greek-word">${word.LEXICAL_FORM}</div>
                        <div class="transliteration">${word.TRANSLITERATED_LEXICAL_FORM || ''}</div>
                    </div>`;
        }
        return `<div class="word-item portuguese-item ${completedClass}" data-word-id="${word.ID}">
                    <div class="portuguese-word">${word.DEFINITION || word.USAGE || 'Sem tradução'}</div>
                </div>`;
    }

    setupWordClickHandlers() {
        document.querySelectorAll('.word-item:not(.completed)').forEach(item => {
            item.addEventListener('click', (e) => {
                const currentItem = e.currentTarget;
                if (currentItem.classList.contains('greek-item')) {
                    this.controller.core.setGreekSelection(currentItem);
                } else {
                    this.controller.core.setPortugueseSelection(currentItem);
                }

                if (this.controller.core.selectedGreek && this.controller.core.selectedPortuguese) {
                    this.controller.checkMatch(this.controller.core.selectedGreek, this.controller.core.selectedPortuguese);
                }
            });
        });
    }
    
    showMatchResult(greekItem, portugueseItem, isCorrect) {
        const className = isCorrect ? 'correct' : 'incorrect';
        greekItem.classList.add(className);
        portugueseItem.classList.add(className);

        if (!isCorrect) {
            setTimeout(() => {
                greekItem.classList.remove(className, 'selected');
                portugueseItem.classList.remove(className, 'selected');
            }, 1000);
        }
    }

    removeMatchedItems(greekItem, portugueseItem) {
        // This function is no longer needed as renderWords handles everything
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById(`${screenName}-screen`)?.classList.add('active');
        this.controller.currentScreen = screenName;
        // If returning to main screen, reset selections
        if (screenName === 'main') {
            this.highlightSelectedList(null);
        }
    }

    /**
     * Show leaderboard screen
     */
    async showLeaderboardScreen() {
        this.showScreen('leaderboard');
        const leaderboardContent = document.getElementById('leaderboard-content');
        leaderboardContent.innerHTML = `<div class="loading-state"><span class="material-symbols-sharp loading-icon">sync</span><p>Carregando ranking...</p></div>`;
        await this.controller.leaderboard.loadLeaderboard('week');
    }

    /**
     * Show multiplayer waiting screen while other players finish
     */
    showMultiplayerWaitingScreen(gameResults) {
        const container = document.getElementById('multiplayer-waiting-content');
        if (!container) {
            // Create the waiting screen content if it doesn't exist
            const waitingScreen = document.getElementById('multiplayer-waiting-screen');
            if (waitingScreen) {
                waitingScreen.innerHTML = `
                    <div class="multiplayer-waiting-content" id="multiplayer-waiting-content">
                        <div class="waiting-header">
                            <div class="waiting-icon">
                                <span class="material-symbols-sharp">timer</span>
                            </div>
                            <h2>Você terminou!</h2>
                            <p>Aguardando os outros jogadores terminarem...</p>
                        </div>
                        
                        <div class="your-results">
                            <h3>Seus Resultados</h3>
                            <div class="results-summary">
                                <div class="result-item">
                                    <span class="material-symbols-sharp">star</span>
                                    <div>
                                        <div class="result-value">${gameResults.score}</div>
                                        <div class="result-label">Pontos</div>
                                    </div>
                                </div>
                                <div class="result-item">
                                    <span class="material-symbols-sharp">check</span>
                                    <div>
                                        <div class="result-value">${gameResults.correct}</div>
                                        <div class="result-label">Corretas</div>
                                    </div>
                                </div>
                                <div class="result-item">
                                    <span class="material-symbols-sharp">close</span>
                                    <div>
                                        <div class="result-value">${gameResults.incorrect}</div>
                                        <div class="result-label">Incorretas</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="players-progress" id="players-progress">
                            <h3>Progresso dos Jogadores</h3>
                            <div id="players-progress-list"></div>
                        </div>
                    </div>
                `;
            }
        }
        
        this.showScreen('multiplayer-waiting');
    }

    /**
     * Update players progress in waiting screen
     */
    updatePlayersProgress(players) {
        const progressList = document.getElementById('players-progress-list');
        if (!progressList) return;

        const playersList = Object.values(players || {});
        
        progressList.innerHTML = playersList.map(player => `
            <div class="player-progress-item ${player.isFinished ? 'finished' : 'playing'}">
                <img src="${player.avatar}" alt="${player.name}" class="player-avatar-small">
                <div class="player-progress-info">
                    <div class="player-name">${this.controller.escapeHtml(player.name)}</div>
                    <div class="player-status">
                        ${player.isFinished ? 
                            `<span class="finished-status">✓ Terminou (${player.finalScore || player.score} pts)</span>` : 
                            `<span class="playing-status">🎮 Jogando...</span>`
                        }
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Show multiplayer results
     */
    showMultiplayerResults(players, userPlayer) {
        const container = document.getElementById('multiplayer-results-content');
        if (!container) return;

        const userRank = players.findIndex(p => p.id === userPlayer?.id) + 1;
        const rankText = userRank > 0 ? `#${userRank} de ${players.length}` : "Não ranqueado";
        
        container.innerHTML = `
            <div class="multiplayer-results-header">
                <h2>🏆 Ranking Final</h2>
                <div class="your-position"><span>Sua posição: ${rankText}</span></div>
            </div>
            <div class="final-leaderboard">
                ${players.map((player, index) => {
                    const rank = index + 1;
                    let rankIcon = `#${rank}`;
                    if (rank === 1) rankIcon = '🥇';
                    else if (rank === 2) rankIcon = '🥈';
                    else if (rank === 3) rankIcon = '🥉';
                    
                    const finalScore = player.finalScore || player.score;
                    const finalCorrect = player.finalCorrect || player.correct;
                    const finalIncorrect = player.finalIncorrect || player.incorrect;
                    
                    return `<div class="final-player-card ${player.id === userPlayer?.id ? 'current-user' : ''} rank-${rank}">
                        <div class="rank-badge">${rankIcon}</div>
                        <img src="${player.avatar}" alt="${player.name}" class="player-avatar">
                        <div class="player-info">
                            <div class="player-name">
                                ${this.controller.escapeHtml(player.name)}
                                ${player.id === userPlayer?.id ? '<span class="you-badge">VOCÊ</span>' : ''}
                            </div>
                            <div class="player-final-stats">
                                <span>${finalScore} pontos</span>
                                <span>${finalCorrect}/${finalCorrect + finalIncorrect} acertos</span>
                            </div>
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
        this.showScreen('multiplayer-results');
    }

    renderResultsScreen(results) {
        document.getElementById('final-correct').textContent = results.correct;
        document.getElementById('final-incorrect').textContent = results.incorrect;
        document.getElementById('final-score').textContent = results.score;

        const icon = document.getElementById('results-icon');
        const title = document.getElementById('results-title');
        const message = document.getElementById('results-message');

        if (results.percentage >= 80) {
            icon.className = 'material-symbols-sharp success'; icon.textContent = 'military_tech';
            title.textContent = 'Excelente!';
        } else if (results.percentage >= 60) {
            icon.className = 'material-symbols-sharp warning'; icon.textContent = 'emoji_events';
            title.textContent = 'Bom trabalho!';
        } else {
            icon.className = 'material-symbols-sharp'; icon.textContent = 'refresh';
            title.textContent = 'Continue praticando!';
        }
        message.textContent = `Você acertou ${results.correct} de ${results.totalWords} palavras (${results.percentage.toFixed(0)}%).`;
    }

    renderProgressSummary() {
        const container = document.getElementById('progress-summary');
        const gameState = this.controller.getGameState();
        const updatedWords = Array.from(gameState.wordProgress.entries()).filter(([_, p]) => p.wasUpdated);

        if (updatedWords.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        const itemsHtml = updatedWords.map(([wordId, progress]) => {
            const word = gameState.allWords.find(w => w.ID === wordId);
            if (!word) return '';
            const statusInfo = this.controller.getStatusInfo(progress.status);
            return `
                <div class="progress-item ${progress.status}">
                    <span class="material-symbols-sharp" style="color: ${statusInfo.color}">${statusInfo.icon}</span>
                    <span><strong>${word.LEXICAL_FORM}</strong> agora está <strong>${statusInfo.label}</strong>.</span>
                </div>`;
        }).join('');
        container.querySelector('#progress-items-list').innerHTML = itemsHtml;
    }

    showLoading(message = 'Carregando...') {
        this.hideLoading();
        const overlay = `<div class="loading-overlay" id="loading-overlay">
                            <div class="loading-content">
                                <div class="loading-spinner"></div><p>${message}</p>
                            </div>
                         </div>`;
        document.body.insertAdjacentHTML('beforeend', overlay);
    }

    hideLoading() {
        document.getElementById('loading-overlay')?.remove();
    }

    showError(message) {
        this.hideLoading();
        alert(`Erro: ${message}`); // Simple alert for now
    }
}