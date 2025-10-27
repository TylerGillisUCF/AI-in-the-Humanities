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
        this.updateRecommendations();
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
        this.updateRecommendations();
    }

    // Get user progress for a specific game
    getGameProgress(gameId) {
        return this.userProgress[gameId] || { played: false, rating: 0, notes: '' };
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

    // Recommendation System
    generateRecommendations() {
        // Get all rated games (only games with ratings)
        const ratedGames = this.games.filter(game => {
            const progress = this.getGameProgress(game.id);
            return progress.played && progress.rating > 0;
        });

        // Need at least 2 rated games for recommendations
        if (ratedGames.length < 2) {
            return [];
        }

        // Build preference profile based on highly rated games (4-5 stars)
        const highlyRatedGames = ratedGames.filter(game => {
            const progress = this.getGameProgress(game.id);
            return progress.rating >= 4;
        });

        // If no highly rated games, use games rated 3+ stars
        const preferredGames = highlyRatedGames.length > 0
            ? highlyRatedGames
            : ratedGames.filter(game => this.getGameProgress(game.id).rating >= 3);

        if (preferredGames.length === 0) {
            return [];
        }

        // Calculate theme and genre weights
        const themeWeights = {};
        const genreWeights = {};

        preferredGames.forEach(game => {
            const rating = this.getGameProgress(game.id).rating;
            const weight = rating / 5; // Normalize to 0-1

            // Weight genres
            genreWeights[game.genre] = (genreWeights[game.genre] || 0) + weight;

            // Weight themes
            game.themes.forEach(theme => {
                themeWeights[theme] = (themeWeights[theme] || 0) + weight;
            });
        });

        // Get unplayed games
        const unplayedGames = this.games.filter(game => {
            const progress = this.getGameProgress(game.id);
            return !progress.played;
        });

        // Score each unplayed game
        const scoredGames = unplayedGames.map(game => {
            let score = 0;

            // Genre matching (higher weight)
            if (genreWeights[game.genre]) {
                score += genreWeights[game.genre] * 2;
            }

            // Theme matching
            game.themes.forEach(theme => {
                if (themeWeights[theme]) {
                    score += themeWeights[theme];
                }
            });

            // Bonus for games from similar time periods
            const avgYear = preferredGames.reduce((sum, g) => sum + g.year, 0) / preferredGames.length;
            const yearDiff = Math.abs(game.year - avgYear);
            if (yearDiff <= 5) {
                score += 1;
            } else if (yearDiff <= 10) {
                score += 0.5;
            }

            return { game, score };
        });

        // Sort by score and return top recommendations
        scoredGames.sort((a, b) => b.score - a.score);

        return scoredGames
            .filter(item => item.score > 0)
            .slice(0, 6)
            .map(item => item.game);
    }

    updateRecommendations() {
        const recommendations = this.generateRecommendations();
        const section = document.getElementById('recommendations-section');
        const grid = document.getElementById('recommendations-grid');

        if (recommendations.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        grid.innerHTML = recommendations.map(game => this.createRecommendationCard(game)).join('');

        // Attach click listeners
        grid.querySelectorAll('.recommendation-card').forEach(card => {
            card.addEventListener('click', () => {
                this.openGameModal(parseInt(card.dataset.gameId));
            });
        });
    }

    createRecommendationCard(game) {
        const matchReasons = this.getMatchReasons(game);

        return `
            <div class="recommendation-card" data-game-id="${game.id}">
                <div class="recommendation-badge">Recommended</div>
                <h3 class="game-title">${game.title}</h3>
                <div class="game-meta">
                    <span class="game-year">${game.year}</span>
                    <span class="game-genre">${game.genre}</span>
                </div>
                <div class="game-themes">
                    ${game.themes.slice(0, 3).map(theme => `<span class="theme-tag">${theme}</span>`).join('')}
                </div>
                <div class="match-reasons">
                    <p class="match-text">${matchReasons}</p>
                </div>
            </div>
        `;
    }

    getMatchReasons(game) {
        // Get highly rated games to compare
        const highlyRated = this.games.filter(g => {
            const progress = this.getGameProgress(g.id);
            return progress.played && progress.rating >= 4;
        });

        if (highlyRated.length === 0) return 'Based on your ratings';

        // Find matching themes and genres
        const matchingThemes = new Set();
        const matchingGenres = new Set();

        highlyRated.forEach(ratedGame => {
            if (ratedGame.genre === game.genre) {
                matchingGenres.add(ratedGame.title);
            }
            game.themes.forEach(theme => {
                if (ratedGame.themes.includes(theme)) {
                    matchingThemes.add(theme);
                }
            });
        });

        const reasons = [];

        if (matchingGenres.size > 0) {
            reasons.push(`Similar to ${game.genre} games you enjoyed`);
        }

        if (matchingThemes.size > 0) {
            const themesArray = Array.from(matchingThemes).slice(0, 2);
            reasons.push(`Matches your interest in ${themesArray.join(' & ')}`);
        }

        return reasons.length > 0 ? reasons[0] : 'Based on your ratings';
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

        // Notes preview (truncated to 80 characters)
        const notesPreview = progress.notes && progress.notes.trim()
            ? `<div class="notes-preview">
                   <div class="notes-preview-label">Your Notes</div>
                   <div class="notes-preview-text">${this.truncateText(progress.notes, 80)}</div>
               </div>`
            : '';

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
                ${notesPreview}
                <div class="game-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    <div class="game-rating">${ratingStars}</div>
                </div>
            </div>
        `;
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
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

        // Update notes
        const notesTextarea = document.getElementById('game-notes');
        notesTextarea.value = progress.notes || '';
        this.updateNotesCharCount();

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

    updateNotesCharCount() {
        const notesTextarea = document.getElementById('game-notes');
        const charCount = document.getElementById('notes-char-count');
        const currentLength = notesTextarea.value.length;
        charCount.textContent = `${currentLength} / 1000`;
    }

    saveNotes() {
        if (!this.currentGameId) return;

        const notesTextarea = document.getElementById('game-notes');
        const notes = notesTextarea.value.trim();

        this.updateGameProgress(this.currentGameId, { notes });

        // Show visual feedback
        const saveBtn = document.getElementById('save-notes');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saved!';
        saveBtn.style.background = 'linear-gradient(135deg, var(--success), var(--success))';

        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = '';
        }, 1500);

        // Re-render games to update any notes previews
        this.renderGames();
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

        // Notes functionality
        const notesTextarea = document.getElementById('game-notes');
        notesTextarea.addEventListener('input', () => {
            this.updateNotesCharCount();
        });

        // Save notes button
        document.getElementById('save-notes').addEventListener('click', () => {
            this.saveNotes();
        });

        // Auto-save notes on Ctrl+S or Cmd+S
        notesTextarea.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveNotes();
            }
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
    initParticles();
});

// Particle Animation System
function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId;

    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle class
    class Particle {
        constructor() {
            this.reset();
            this.y = Math.random() * canvas.height;
            this.opacity = Math.random() * 0.5 + 0.2;
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = -10;
            this.size = Math.random() * 2 + 1;
            this.speedY = Math.random() * 0.5 + 0.2;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.5 + 0.2;

            // Random color from our palette
            const colors = [
                'rgba(6, 182, 212, ',    // cyan
                'rgba(168, 85, 247, ',   // purple
                'rgba(236, 72, 153, '    // pink
            ];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.y += this.speedY;
            this.x += this.speedX;

            // Subtle floating motion
            this.x += Math.sin(this.y * 0.01) * 0.2;

            // Reset when particle goes off screen
            if (this.y > canvas.height + 10) {
                this.reset();
            }

            if (this.x < -10 || this.x > canvas.width + 10) {
                this.reset();
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color + this.opacity + ')';
            ctx.fill();

            // Add subtle glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color + '0.5)';
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    // Create particles
    const particleCount = Math.min(50, Math.floor(window.innerWidth / 20));
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        animationId = requestAnimationFrame(animate);
    }

    animate();

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        cancelAnimationFrame(animationId);
    });
}
