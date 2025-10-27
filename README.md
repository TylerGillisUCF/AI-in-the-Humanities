# Game Tracker

A video game tracking website that helps you catalog and rate your gaming journey. Track games you've played, rate them, and discover new titles from a curated collection of 100 classic and modern video games.

## Features

- **100 Curated Games**: A diverse collection spanning multiple genres and decades (1980s-2020s)
- **Smart Recommendations**: Get personalized game suggestions based on your ratings
- **Local Storage**: All your ratings and progress are saved locally in your browser
- **Smart Filtering**: Filter by genre, decade, play status, or search by title/theme
- **Rating System**: Rate games with a 5-star system
- **Statistics Dashboard**: Track your progress with real-time statistics
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Dark Theme**: Easy on the eyes with a modern dark interface

## Technologies Used

- **HTML5**: Semantic markup for accessibility
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **JavaScript (ES6+)**: Vanilla JS with classes and async/await
- **Local Storage API**: Client-side data persistence
- **JSON**: Game data storage

## Game Collection

The collection includes 100 games across various genres:
- Action-Adventure
- RPG & JRPG
- First-Person Shooter
- Puzzle
- Strategy
- Fighting
- Horror
- Platformer
- Simulation
- And many more!

Each game is tagged with:
- Release year
- Genre
- Multiple theme tags (Fantasy, Sci-Fi, Challenging, Story-Rich, etc.)

## Usage

1. **Browse Games**: Scroll through the collection or use filters to find specific games
2. **Search**: Use the search bar to find games by title, genre, or theme
3. **Rate Games**: Click on any game card to open the rating modal
4. **Star Rating**: Click stars to rate a game (automatically marks it as played)
5. **Track Progress**: View your statistics at the top of the page
6. **Filter**: Use dropdown menus to filter by genre, decade, or play status

## Local Development

To run locally:

1. Clone the repository
2. Open `index.html` in a web browser
3. No build process or server required!

## GitHub Pages Deployment

This site is optimized for GitHub Pages:

1. Push the code to your GitHub repository
2. Go to Settings > Pages
3. Select the branch to deploy (usually `main` or `master`)
4. Your site will be available at `https://yourusername.github.io/repository-name/`

## File Structure

```
.
├── index.html      # Main HTML structure
├── styles.css      # All styling and responsive design
├── app.js          # JavaScript application logic
├── games.json      # Game data (100 games)
└── README.md       # Documentation
```

## Features in Detail

### Statistics Dashboard
- **Games Played**: Total number of games you've marked as played
- **Not Yet Played**: Remaining games in your backlog
- **Average Rating**: Your average rating across all rated games
- **Completion**: Percentage of games you've played

### Filtering Options
- **Search**: Real-time search across titles, genres, and themes
- **Genre**: Filter by specific game genre
- **Decade**: Filter by release decade (1980s-2020s)
- **Status**: Show only played or unplayed games
- **Sort**: Sort by title, year, rating, or recently played

### Recommendation System
The intelligent recommendation engine analyzes your ratings to suggest games you might enjoy:
- **Minimum Requirements**: Rate at least 2 games to get recommendations
- **Smart Matching**: Prioritizes games rated 4-5 stars for preference analysis
- **Multi-Factor Algorithm**:
  - Matches genres (highest weight)
  - Matches themes and tags
  - Considers time period preferences
  - Shows top 6 most relevant unplayed games
- **Dynamic Updates**: Recommendations refresh automatically as you rate games
- **Personalized Insights**: Each recommendation includes explanation of why it was suggested

### Privacy
All data is stored locally in your browser using localStorage. No data is sent to any server or third party.

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (90+)
- Firefox (88+)
- Safari (14+)
- Mobile browsers

## License

This project is created for educational purposes as part of an AI in the Humanities assignment.

## Credits

Game data compiled from various sources representing iconic titles across gaming history.
