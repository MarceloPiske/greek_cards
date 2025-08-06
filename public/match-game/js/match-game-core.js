/**
 * Match Game Core Logic
 * Handles game state, word processing, scoring, and progress tracking
 */

import { getWordById } from '../../vocabulary/vocabulary-db.js?v=1.1';
import { saveWordProgress, getWordProgress } from '../../word_progress/word-progress-sync.js?v=1.1';

export class MatchGameCore {
    constructor() {
        this.currentList = null;
        this.allWords = []; // All words from the list
        this.remainingWords = []; // Words still to be matched
        this.correctMatches = new Map();
        this.gameStats = {
            round: 1,
            totalRounds: 1,
            score: 0,
            correct: 0,
            incorrect: 0
        };
        this.wordProgress = new Map(); // Track progress for words in current session
        this.selectedGreek = null;
        this.selectedPortuguese = null;
        this.currentDisplayWords = []; // Currently displayed 5 words
        this.completedWords = []; // Words that have been correctly matched (in order)
        this.tempWordProgress = []; // Store progress updates temporarily until game end
    }

    /**
     * Initialize game with a word list
     */
    async initializeGame(list) {
        try {
            this.currentList = list;
            
            // Use all words from the list
            const allWordIds = list.wordIds || [];
            if (allWordIds.length < 5) {
                throw new Error('A lista precisa ter pelo menos 5 palavras para jogar');
            }
            
            // Load all word details
            const words = [];
            for (const wordId of allWordIds) {
                const word = await getWordById(wordId);
                if (word) {
                    words.push(word);
                    // Mark word as seen
                    await this.updateWordProgress(wordId, 'reading');
                }
            }
            
            this.allWords = words;
            this.remainingWords = [...words];
            this.completedWords = [];
            
            this.gameStats = {
                round: 1,
                totalRounds: 1,
                score: 0,
                correct: 0,
                incorrect: 0
            };
            
            await this.loadRound();
            return true;
            
        } catch (error) {
            console.error('Error initializing game:', error);
            throw error;
        }
    }

    /**
     * Initialize multiplayer game with room word data
     */
    async initializeMultiplayerGame(roomList) {
        try {
            this.currentList = roomList;
            
            // Use the words directly from the room data
            const words = roomList.words || [];
            if (words.length < 5) {
                throw new Error('A sala precisa ter pelo menos 5 palavras para jogar');
            }
            
            this.allWords = words;
            this.remainingWords = [...words];
            this.completedWords = [];
            
            this.gameStats = {
                round: 1,
                totalRounds: 1,
                score: 0,
                correct: 0,
                incorrect: 0
            };
            
            await this.loadRound();
            return true;
            
        } catch (error) {
            console.error('Error initializing multiplayer game:', error);
            throw error;
        }
    }

    /**
     * Load the current round with words
     */
    async loadRound() {
        try {
            // Always show exactly 5 words (or remaining if less than 5)
            const wordsToShow = Math.min(5, this.remainingWords.length);
            this.currentDisplayWords = this.remainingWords.slice(0, wordsToShow);
            
            this.correctMatches.clear();
            this.selectedGreek = null;
            this.selectedPortuguese = null;
            
            // Create correct matches map for current display words
            this.currentDisplayWords.forEach(word => {
                this.correctMatches.set(word.ID, word.ID);
            });
            
        } catch (error) {
            console.error('Error loading round:', error);
            throw error;
        }
    }

    /**
     * Check if a match is correct
     */
    isCorrectMatch(greekId, portugueseId) {
        return this.correctMatches.get(greekId) === portugueseId;
    }

    /**
     * Process a correct match
     */
    async processCorrectMatch(greekId) {
        // Update score and stats
        this.gameStats.score += 10;
        this.gameStats.correct++;
        
        // Update word progress
        await this.updateWordProgress(greekId, 'familiar', true);
        
        // Find the matched word and add to completed (in order)
        const matchedWord = this.currentDisplayWords.find(w => w.ID === greekId);
        if (matchedWord) {
            this.completedWords.push(matchedWord);
        }
        
        // Remove from remaining words
        this.remainingWords = this.remainingWords.filter(w => w.ID !== greekId);
        
        // Remove completed word from current display
        this.currentDisplayWords = this.currentDisplayWords.filter(w => w.ID !== greekId);
        
        // Add new word if we have available words and current display has less than 5
        if (this.currentDisplayWords.length < 5 && this.remainingWords.length > 0) {
            const availableWords = this.remainingWords.filter(w => 
                !this.currentDisplayWords.find(dw => dw.ID === w.ID)
            );
            
            if (availableWords.length > 0) {
                const newWord = availableWords[0];
                this.currentDisplayWords.push(newWord);
                this.correctMatches.set(newWord.ID, newWord.ID);
            }
        }

        return this.remainingWords.length === 0; // Game is complete when no words are left to be matched
    }

    /**
     * Process an incorrect match
     */
    processIncorrectMatch() {
        // Update score and stats
        this.gameStats.score = Math.max(0, this.gameStats.score - 5);
        this.gameStats.incorrect++;
    }

    /**
     * Update word progress temporarily (don't save to DB yet)
     */
    async updateWordProgress(wordId, newStatus, isCorrect = false) {
        try {
            const currentProgress = await getWordProgress(wordId);
            let status = currentProgress.status;
            let reviewCount = currentProgress.reviewCount || 0;
            
            // Update status based on correct answers
            if (status === 'unread') {
                status = 'reading';
            }
            
            if (isCorrect) {
                reviewCount++;
                
                if (reviewCount >= 5) {
                    status = 'memorized';
                } else if (reviewCount >= 3) {
                    status = 'familiar';
                }
            }
            
            // Store in temporary array instead of saving immediately
            const existingTempIndex = this.tempWordProgress.findIndex(p => p.wordId === wordId);
            const progressUpdate = {
                wordId,
                status,
                reviewCount,
                lastReviewed: new Date().toISOString(),
                wasUpdated: status !== currentProgress.status
            };

            if (existingTempIndex >= 0) {
                this.tempWordProgress[existingTempIndex] = progressUpdate;
            } else {
                this.tempWordProgress.push(progressUpdate);
            }
            
            // Track in session for results display
            this.wordProgress.set(wordId, progressUpdate);
            
        } catch (error) {
            console.error('Error updating word progress:', error);
        }
    }

    /**
     * Save all temporary word progress to database
     */
    async saveAllWordProgress() {
        try {
            console.log(`Saving ${this.tempWordProgress.length} word progress updates to database...`);
            
            for (const progressUpdate of this.tempWordProgress) {
                await saveWordProgress(progressUpdate.wordId, {
                    status: progressUpdate.status,
                    reviewCount: progressUpdate.reviewCount,
                    lastReviewed: progressUpdate.lastReviewed
                });
            }
            
            console.log('All word progress saved successfully');
        } catch (error) {
            console.error('Error saving word progress to database:', error);
        }
    }

    /**
     * Get game completion statistics
     */
    getGameResults() {
        const totalWords = this.allWords.length;
        const percentage = Math.round((this.gameStats.correct / totalWords) * 100);
        
        return {
            totalWords,
            percentage,
            correct: this.gameStats.correct,
            incorrect: this.gameStats.incorrect,
            score: this.gameStats.score
        };
    }

    /**
     * Get status information for a status type
     */
    getStatusInfo(status) {
        switch (status) {
            case 'reading':
                return { label: 'sendo estudada', icon: 'visibility', color: '#f59e0b' };
            case 'familiar':
                return { label: 'familiar', icon: 'psychology', color: '#3b82f6' };
            case 'memorized':
                return { label: 'memorizada', icon: 'star', color: '#22c55e' };
            default:
                return { label: 'não estudada', icon: 'circle', color: '#6b7280' };
        }
    }

    /**
     * Clear selections
     */
    clearSelections() {
        this.selectedGreek = null;
        this.selectedPortuguese = null;
    }

    /**
     * Set Greek selection
     */
    setGreekSelection(element) {
        if (this.selectedGreek) {
            this.selectedGreek.classList.remove('selected');
        }
        this.selectedGreek = element;
        element.classList.add('selected');
    }

    /**
     * Set Portuguese selection
     */
    setPortugueseSelection(element) {
        if (this.selectedPortuguese) {
            this.selectedPortuguese.classList.remove('selected');
        }
        this.selectedPortuguese = element;
        element.classList.add('selected');
    }

    /**
     * Check if game is complete
     */
    isGameComplete() {
        return this.remainingWords.length === 0;
    }

    /**
     * Get current game state for UI
     */
    getGameState() {
        return {
            currentList: this.currentList,
            gameStats: this.gameStats,
            currentDisplayWords: this.currentDisplayWords,
            completedWords: this.completedWords,
            wordProgress: this.wordProgress,
            allWords: this.allWords
        };
    }
}