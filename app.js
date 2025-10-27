// Game Tracker Application
class GameTracker {
    constructor() {
        this.games = [];
        this.userProgress = this.loadProgress();
        this.currentGameId = null;
        this.filters = {
            search: '',
            genre: '',
            decade: '',
            status: '',
            sortBy: 'title'
        };
        this.init();
    }

    async init() {
        await this.loadGames();
        this.populateGenreFilter();
        this.renderGames();
        this.updateStats();
        this.attachEventListeners();
    }

    // Load games from JSON file
    async loadGames() {
        try {
            const response = await fetch('games.json');
            this.games = await response.json();
        } catch (error) {
            console.error('Error loading games:', error);
            this.showError('Failed to load games. Please refresh the page.');
        }
    }

    // Local Storage Management
    loadProgress() {
        const saved = localStorage.getItem('gameTrackerProgress');
        return saved ? JSON.parse(saved) : {};
    }

    saveProgress() {
        localStorage.setItem('gameTrackerProgress', JSON.stringify(this.userProgress));
        this.updateStats();
    }

    // Get user progress for a specific game
    getGameProgress(gameId) {
        return this.userProgress[gameId] || { played: false, rating: 0 };
    }

    // Update game progress
    updateGameProgress(gameId, progress) {
        this.userProgress[gameId] = { ...this.getGameProgress(gameId), ...progress };
        this.saveProgress();
    }

    // Statistics
    updateStats() {
        const stats = this.calculateStats();
        document.getElementById('played-count').textContent = stats.playedCount;
        document.getElementById('unplayed-count').textContent = stats.unplayedCount;
        document.getElementById('avg-rating').textContent = stats.avgRating;
        document.getElementById('completion-percentage').textContent = stats.completionPercentage;
    }

    calculateStats() {
        let playedCount = 0;
        let totalRating = 0;
        let ratedCount = 0;

        Object.values(this.userProgress).forEach(progress => {
            if (progress.played) {
                playedCount++;
                if (progress.rating > 0) {
                    totalRating += progress.rating;
                    ratedCount++;
                }
            }
        });

        const unplayedCount = this.games.length - playedCount;
        const avgRating = ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : '-';
        const completionPercentage = ((playedCount / this.games.length) * 100).toFixed(0) + '%';

        return { playedCount, unplayedCount, avgRating, completionPercentage };
    }

    // Populate genre filter dropdown
    populateGenreFilter() {
        const genres = [...new Set(this.games.map(game => game.genre))].sort();
        const genreFilter = document.getElementById('genre-filter');

        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreFilter.appendChild(option);
        });
    }

    // Filter and Sort Games
    getFilteredGames() {
        let filtered = [...this.games];

        // Search filter
        if (this.filters.search) {
            const searchLower = this.filters.search.toLowerCase();
            filtered = filtered.filter(game =>
                game.title.toLowerCase().includes(searchLower) ||
                game.genre.toLowerCase().includes(searchLower) ||
                game.themes.some(theme => theme.toLowerCase().includes(searchLower))
            );
        }

        // Genre filter
        if (this.filters.genre) {
            filtered = filtered.filter(game => game.genre === this.filters.genre);
        }

        // Decade filter
        if (this.filters.decade) {
            const startYear = parseInt(this.filters.decade);
            const endYear = startYear + 9;
            filtered = filtered.filter(game => game.year >= startYear && game.year <= endYear);
        }

        // Status filter
        if (this.filters.status) {
            filtered = filtered.filter(game => {
                const progress = this.getGameProgress(game.id);
                if (this.filters.status === 'played') return progress.played;
                if (this.filters.status === 'unplayed') return !progress.played;
                return true;
            });
        }

        // Sorting
        filtered.sort((a, b) => {
            switch (this.filters.sortBy) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'year':
                    return b.year - a.year;
                case 'rating':
                    const ratingA = this.getGameProgress(a.id).rating || 0;
                    const ratingB = this.getGameProgress(b.id).rating || 0;
                    return ratingB - ratingA;
                case 'recent':
                    // Games marked as played most recently appear first
                    const progressA = this.getGameProgress(a.id);
                    const progressB = this.getGameProgress(b.id);
                    if (progressA.played && !progressB.played) return -1;
                    if (!progressA.played && progressB.played) return 1;
                    return 0;
                default:
                    return 0;
            }
        });

        return filtered;
    }

    // Render Games
    renderGames() {
        const gamesGrid = document.getElementById('games-grid');
        const filteredGames = this.getFilteredGames();

        // Update game count
        const gameCount = document.getElementById('game-count');
        gameCount.textContent = `Showing ${filteredGames.length} of ${this.games.length} games`;

        if (filteredGames.length === 0) {
            gamesGrid.innerHTML = `
                <div class="empty-state">
                    <h3>No games found</h3>
                    <p>Try adjusting your filters</p>
                </div>
            `;
            return;
        }

        gamesGrid.innerHTML = filteredGames.map(game => this.createGameCard(game)).join('');

        // Attach click listeners to game cards
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                this.openGameModal(parseInt(card.dataset.gameId));
            });
        });
    }

    createGameCard(game) {
        const progress = this.getGameProgress(game.id);
        const statusClass = progress.played ? 'played' : 'unplayed';
        const statusText = progress.played ? 'Played' : 'Not Played';

        const ratingStars = progress.rating > 0
            ? this.createStarDisplay(progress.rating)
            : '<span style="color: var(--text-secondary); font-size: 0.85rem;">No rating</span>';

        return `
            <div class="game-card ${statusClass}" data-game-id="${game.id}">
                <h3 class="game-title">${game.title}</h3>
                <div class="game-meta">
                    <span class="game-year">${game.year}</span>
                    <span class="game-genre">${game.genre}</span>
                </div>
                <div class="game-themes">
                    ${game.themes.map(theme => `<span class="theme-tag">${theme}</span>`).join('')}
                </div>
                <div class="game-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    <div class="game-rating">${ratingStars}</div>
                </div>
            </div>
        `;
    }

    createStarDisplay(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            const starClass = i <= rating ? 'star' : 'star empty';
            stars += `<span class="${starClass}">&#9733;</span>`;
        }
        return stars;
    }

    // Modal Management
    openGameModal(gameId) {
        const game = this.games.find(g => g.id === gameId);
        if (!game) return;

        this.currentGameId = gameId;
        const progress = this.getGameProgress(gameId);

        // Populate modal
        document.getElementById('modal-title').textContent = game.title;
        document.getElementById('modal-year').textContent = game.year;
        document.getElementById('modal-genre').textContent = game.genre;
        document.getElementById('modal-themes').textContent = game.themes.join(', ');

        // Update star rating
        this.updateModalStars(progress.rating);

        // Update rating text
        const ratingText = document.getElementById('rating-text');
        if (progress.rating > 0) {
            ratingText.textContent = `You rated this ${progress.rating} out of 5 stars`;
        } else {
            ratingText.textContent = 'Not yet rated';
        }

        // Show/hide buttons based on status
        const markUnplayedBtn = document.getElementById('mark-unplayed');
        const clearRatingBtn = document.getElementById('clear-rating');

        if (progress.played) {
            markUnplayedBtn.style.display = 'inline-block';
            clearRatingBtn.style.display = 'inline-block';
        } else {
            markUnplayedBtn.style.display = 'none';
            clearRatingBtn.style.display = 'none';
        }

        // Show modal
        const modal = document.getElementById('game-modal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeGameModal() {
        const modal = document.getElementById('game-modal');
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        this.currentGameId = null;
    }

    updateModalStars(rating) {
        const stars = document.querySelectorAll('.star-rating .star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    // Rating System
    rateGame(rating) {
        if (!this.currentGameId) return;

        this.updateGameProgress(this.currentGameId, {
            played: true,
            rating: rating
        });

        this.updateModalStars(rating);
        const ratingText = document.getElementById('rating-text');
        ratingText.textContent = `You rated this ${rating} out of 5 stars`;

        // Show action buttons
        document.getElementById('mark-unplayed').style.display = 'inline-block';
        document.getElementById('clear-rating').style.display = 'inline-block';

        // Re-render games to reflect changes
        this.renderGames();
    }

    markAsUnplayed() {
        if (!this.currentGameId) return;

        this.updateGameProgress(this.currentGameId, {
            played: false,
            rating: 0
        });

        this.updateModalStars(0);
        const ratingText = document.getElementById('rating-text');
        ratingText.textContent = 'Not yet rated';

        // Hide action buttons
        document.getElementById('mark-unplayed').style.display = 'none';
        document.getElementById('clear-rating').style.display = 'none';

        // Re-render games
        this.renderGames();
    }

    clearRating() {
        if (!this.currentGameId) return;

        this.updateGameProgress(this.currentGameId, {
            played: false,
            rating: 0
        });

        this.updateModalStars(0);
        const ratingText = document.getElementById('rating-text');
        ratingText.textContent = 'Not yet rated';

        // Hide action buttons
        document.getElementById('mark-unplayed').style.display = 'none';
        document.getElementById('clear-rating').style.display = 'none';

        // Re-render games
        this.renderGames();
    }

    // Event Listeners
    attachEventListeners() {
        // Search
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.renderGames();
        });

        // Filters
        document.getElementById('genre-filter').addEventListener('change', (e) => {
            this.filters.genre = e.target.value;
            this.renderGames();
        });

        document.getElementById('decade-filter').addEventListener('change', (e) => {
            this.filters.decade = e.target.value;
            this.renderGames();
        });

        document.getElementById('status-filter').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.renderGames();
        });

        document.getElementById('sort-by').addEventListener('change', (e) => {
            this.filters.sortBy = e.target.value;
            this.renderGames();
        });

        // Modal close
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeGameModal();
        });

        // Close modal on outside click
        document.getElementById('game-modal').addEventListener('click', (e) => {
            if (e.target.id === 'game-modal') {
                this.closeGameModal();
            }
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeGameModal();
            }
        });

        // Star rating
        document.querySelectorAll('.star-rating .star').forEach(star => {
            star.addEventListener('click', () => {
                const rating = parseInt(star.dataset.rating);
                this.rateGame(rating);
            });

            // Hover effect
            star.addEventListener('mouseenter', () => {
                const rating = parseInt(star.dataset.rating);
                this.updateModalStars(rating);
            });
        });

        // Reset stars on mouse leave
        document.querySelector('.star-rating').addEventListener('mouseleave', () => {
            if (this.currentGameId) {
                const progress = this.getGameProgress(this.currentGameId);
                this.updateModalStars(progress.rating);
            }
        });

        // Mark as unplayed button
        document.getElementById('mark-unplayed').addEventListener('click', () => {
            this.markAsUnplayed();
        });

        // Clear rating button
        document.getElementById('clear-rating').addEventListener('click', () => {
            this.clearRating();
        });
    }

    showError(message) {
        const gamesGrid = document.getElementById('games-grid');
        gamesGrid.innerHTML = `
            <div class="empty-state">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GameTracker();
});
