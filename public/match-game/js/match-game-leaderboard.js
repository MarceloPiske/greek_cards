/**
 * Match Game Leaderboard System
 * Handles weekly and general rankings display
 */

export class MatchGameLeaderboard {
    constructor() {
        this.currentPeriod = 'week'; // week, month, all
        this.currentFilter = 'score'; // score, accuracy, games
    }

    /**
     * Load and display leaderboard
     */
    async loadLeaderboard(period = 'week', limit = 100) {
        if (!window.firebaseAuth?.isAuthenticated()) {
            this.showLoginRequired();
            return;
        }

        try {
            const db = window.firebaseAuth.db;
            const { collection, query, where, orderBy, limit: limitQuery, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            let q = collection(db, 'leaderboard');

            // Add period filter
            if (period === 'week') {
                const currentWeek = this.getCurrentWeekIdentifier();
                q = query(q, where('week', '==', currentWeek));
            } else if (period === 'month') {
                const currentMonth = this.getCurrentMonthIdentifier();
                q = query(q, where('month', '==', currentMonth));
            }

            // Order by score (descending) and limit results
            q = query(q, orderBy('score', 'desc'), limitQuery(limit));

            const querySnapshot = await getDocs(q);
            const results = [];
            
            querySnapshot.forEach((doc) => {
                results.push({ id: doc.id, ...doc.data() });
            });

            // Aggregate results by user (sum scores, calculate averages)
            const aggregatedResults = this.aggregateUserResults(results);
            
            this.displayLeaderboard(aggregatedResults, period);
            return aggregatedResults;

        } catch (error) {
            console.error('Error loading leaderboard:', error);
            this.showError('Erro ao carregar ranking');
        }
    }

    /**
     * Aggregate results by user
     */
    aggregateUserResults(results) {
        const userMap = new Map();

        results.forEach(result => {
            const userId = result.userId;
            
            if (userMap.has(userId)) {
                const existing = userMap.get(userId);
                existing.totalScore += result.score;
                existing.totalCorrect += result.correct;
                existing.totalIncorrect += result.incorrect;
                existing.gamesPlayed += 1;
                existing.bestScore = Math.max(existing.bestScore, result.score);
                existing.lastPlayed = new Date(Math.max(
                    new Date(existing.lastPlayed).getTime(),
                    result.playedAt?.toDate?.()?.getTime() || 0
                ));
            } else {
                userMap.set(userId, {
                    userId: result.userId,
                    userName: result.userName,
                    userAvatar: result.userAvatar,
                    totalScore: result.score,
                    totalCorrect: result.correct,
                    totalIncorrect: result.incorrect,
                    gamesPlayed: 1,
                    bestScore: result.score,
                    averageScore: result.score,
                    accuracy: result.accuracy,
                    lastPlayed: result.playedAt?.toDate?.() || new Date()
                });
            }
        });

        // Calculate averages and sort
        const aggregated = Array.from(userMap.values()).map(user => ({
            ...user,
            averageScore: Math.round(user.totalScore / user.gamesPlayed),
            accuracy: user.totalCorrect / (user.totalCorrect + user.totalIncorrect)
        }));

        return aggregated.sort((a, b) => b.totalScore - a.totalScore);
    }

    /**
     * Display leaderboard in UI
     */
    displayLeaderboard(results, period) {
        const container = document.getElementById('leaderboard-content');
        if (!container) return;

        const currentUser = window.firebaseAuth.getCurrentUser();
        const periodText = period === 'week' ? 'Semanal' : period === 'month' ? 'Mensal' : 'Geral';

        let html = `
            <div class="leaderboard-header">
                <h3>🏆 Ranking ${periodText}</h3>
                <div class="leaderboard-filters">
                    <button class="filter-btn ${period === 'week' ? 'active' : ''}" data-period="week">Semanal</button>
                    <button class="filter-btn ${period === 'month' ? 'active' : ''}" data-period="month">Mensal</button>
                    <button class="filter-btn ${period === 'all' ? 'active' : ''}" data-period="all">Geral</button>
                </div>
            </div>
        `;

        if (results.length === 0) {
            html += `
                <div class="empty-leaderboard">
                    <span class="material-symbols-sharp">emoji_events</span>
                    <h4>Nenhum resultado encontrado</h4>
                    <p>Seja o primeiro a aparecer no ranking!</p>
                </div>
            `;
        } else {
            html += '<div class="leaderboard-list">';
            
            results.forEach((user, index) => {
                const isCurrentUser = user.userId === currentUser?.uid;
                const rank = index + 1;
                let rankIcon = '🥉';
                
                if (rank === 1) rankIcon = '🥇';
                else if (rank === 2) rankIcon = '🥈';
                else if (rank <= 3) rankIcon = '🥉';
                else rankIcon = `#${rank}`;

                html += `
                    <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
                        <div class="rank">
                            <span class="rank-icon">${rankIcon}</span>
                        </div>
                        <img src="${user.userAvatar}" alt="${user.userName}" class="user-avatar">
                        <div class="user-info">
                            <div class="user-name">
                                ${user.userName}
                                ${isCurrentUser ? '<span class="you-badge">VOCÊ</span>' : ''}
                            </div>
                            <div class="user-stats">
                                <span class="games">${user.gamesPlayed} jogos</span>
                                <span class="accuracy">${Math.round(user.accuracy * 100)}% precisão</span>
                            </div>
                        </div>
                        <div class="scores">
                            <div class="total-score">${user.totalScore.toLocaleString()} pts</div>
                            <div class="best-score">Melhor: ${user.bestScore}</div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
        }

        container.innerHTML = html;

        // Add event listeners to filter buttons
        container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const period = btn.getAttribute('data-period');
                this.loadLeaderboard(period);
            });
        });
    }

    /**
     * Show login required message
     */
    showLoginRequired() {
        const container = document.getElementById('leaderboard-content');
        if (!container) return;

        container.innerHTML = `
            <div class="login-required">
                <span class="material-symbols-sharp">person</span>
                <h4>Login necessário</h4>
                <p>Faça login para ver o ranking e competir com outros jogadores!</p>
                <button class="btn primary" onclick="document.getElementById('loginModal').style.display = 'flex'">
                    Fazer Login
                </button>
            </div>
        `;
    }

    /**
     * Show error message
     */
    showError(message) {
        const container = document.getElementById('leaderboard-content');
        if (!container) return;

        container.innerHTML = `
            <div class="error-state">
                <span class="material-symbols-sharp">error</span>
                <h4>Erro</h4>
                <p>${message}</p>
                <button class="btn" onclick="location.reload()">Tentar novamente</button>
            </div>
        `;
    }

    /**
     * Get current week identifier
     */
    getCurrentWeekIdentifier() {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const pastDaysOfYear = (now - startOfYear) / 86400000;
        const week = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
        return `${now.getFullYear()}-W${week.toString().padStart(2, '0')}`;
    }

    /**
     * Get current month identifier
     */
    getCurrentMonthIdentifier() {
        const now = new Date();
        return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    /**
     * Get user's position in leaderboard
     */
    async getUserPosition(period = 'week') {
        if (!window.firebaseAuth?.isAuthenticated()) return null;

        try {
            const results = await this.loadLeaderboard(period, 1000);
            const currentUser = window.firebaseAuth.getCurrentUser();
            
            const userIndex = results.findIndex(user => user.userId === currentUser.uid);
            return userIndex >= 0 ? userIndex + 1 : null;
            
        } catch (error) {
            console.error('Error getting user position:', error);
            return null;
        }
    }

    /**
     * Show personal stats modal
     */
    async showPersonalStats() {
        if (!window.firebaseAuth?.isAuthenticated()) {
            this.showLoginRequired();
            return;
        }

        try {
            const db = window.firebaseAuth.db;
            const user = window.firebaseAuth.getCurrentUser();
            
            const { collection, query, where, getDocs, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            // Get user's all-time stats
            const q = query(
                collection(db, 'leaderboard'),
                where('userId', '==', user.uid),
                orderBy('playedAt', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const userGames = [];
            
            querySnapshot.forEach((doc) => {
                userGames.push({ id: doc.id, ...doc.data() });
            });

            this.displayPersonalStats(userGames);

        } catch (error) {
            console.error('Error loading personal stats:', error);
        }
    }

    /**
     * Display personal stats modal
     */
    displayPersonalStats(games) {
        if (games.length === 0) {
            alert('Você ainda não jogou nenhuma partida!');
            return;
        }

        const totalScore = games.reduce((sum, game) => sum + game.score, 0);
        const totalCorrect = games.reduce((sum, game) => sum + game.correct, 0);
        const totalIncorrect = games.reduce((sum, game) => sum + game.incorrect, 0);
        const bestScore = Math.max(...games.map(game => game.score));
        const averageScore = Math.round(totalScore / games.length);
        const accuracy = Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100);

        const modalHtml = `
            <div class="modal" id="personal-stats-modal">
                <div class="modal-content large">
                    <button class="close-modal">&times;</button>
                    <h2>📊 Suas Estatísticas</h2>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <span class="material-symbols-sharp">emoji_events</span>
                            <div class="stat-value">${totalScore.toLocaleString()}</div>
                            <div class="stat-label">Pontos Totais</div>
                        </div>
                        <div class="stat-card">
                            <span class="material-symbols-sharp">star</span>
                            <div class="stat-value">${bestScore}</div>
                            <div class="stat-label">Melhor Pontuação</div>
                        </div>
                        <div class="stat-card">
                            <span class="material-symbols-sharp">trending_up</span>
                            <div class="stat-value">${averageScore}</div>
                            <div class="stat-label">Média por Jogo</div>
                        </div>
                        <div class="stat-card">
                            <span class="material-symbols-sharp">percent</span>
                            <div class="stat-value">${accuracy}%</div>
                            <div class="stat-label">Precisão</div>
                        </div>
                        <div class="stat-card">
                            <span class="material-symbols-sharp">sports_esports</span>
                            <div class="stat-value">${games.length}</div>
                            <div class="stat-label">Jogos Jogados</div>
                        </div>
                        <div class="stat-card">
                            <span class="material-symbols-sharp">check_circle</span>
                            <div class="stat-value">${totalCorrect}</div>
                            <div class="stat-label">Acertos Totais</div>
                        </div>
                    </div>

                    <div class="recent-games">
                        <h3>Jogos Recentes</h3>
                        <div class="games-list">
                            ${games.slice(0, 10).map(game => `
                                <div class="game-item">
                                    <div class="game-info">
                                        <div class="game-score">${game.score} pts</div>
                                        <div class="game-details">
                                            ${game.correct}/${game.correct + game.incorrect} acertos
                                            ${game.gameMode === 'multiplayer' ? '• Multiplayer' : '• Solo'}
                                        </div>
                                    </div>
                                    <div class="game-date">
                                        ${new Date(game.playedAt?.toDate?.() || game.playedAt).toLocaleDateString('pt-BR')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('personal-stats-modal');
        
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => modal.remove());
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        modal.style.display = 'flex';
    }
}