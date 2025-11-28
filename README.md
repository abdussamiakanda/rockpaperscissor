# Rock Paper Scissors - Multiplayer Game

A modern, real-time multiplayer Rock Paper Scissors game built with React, Supabase, and Tailwind CSS. Play against other players in best-of-3 matches with live updates, profiles, and leaderboards.

## Features

- 🎮 **Real-time Multiplayer**: Play against other players live
- 🏆 **Best of 3**: Each game consists of 3 rounds
- 👤 **User Profiles**: Track your wins, losses, draws, and win rate
- 📊 **Leaderboard**: See top players ranked by wins
- 🎨 **Modern UI**: Beautiful animations and professional design
- 🔐 **Authentication**: Secure user authentication with Supabase

## Tech Stack

- **React** - UI framework
- **Vite** - Build tool
- **Supabase** - Backend (Database & Authentication)
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Router** - Routing
- **React Icons** - Icons

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase account (free tier works)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd rockpaperscissor
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Create a new project at [supabase.com](https://supabase.com)
   - Follow the instructions in `SUPABASE_SETUP.md` to set up your database
   - Create a `.env` file in the root directory:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
rockpaperscissor/
├── src/
│   ├── components/       # Reusable components
│   │   └── Layout.jsx    # Main layout with navigation
│   ├── contexts/         # React contexts
│   │   └── AuthContext.jsx  # Authentication context
│   ├── lib/              # Utilities
│   │   └── supabase.js   # Supabase client
│   ├── pages/            # Page components
│   │   ├── Home.jsx      # Main lobby/matchmaking
│   │   ├── Game.jsx      # Game component
│   │   ├── Login.jsx     # Login page
│   │   ├── Signup.jsx    # Signup page
│   │   ├── Profile.jsx   # User profile
│   │   └── Leaderboard.jsx  # Leaderboard
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── SUPABASE_SETUP.md     # Database setup instructions
└── package.json
```

## How to Play

1. **Sign Up**: Create an account with your email and choose a username
2. **Find Match**: Click "Find Match" to search for an opponent
3. **Play**: Make your choice (Rock, Paper, or Scissor) each round
4. **Win**: First player to win 2 out of 3 rounds wins the game
5. **Track Stats**: View your profile to see your stats and recent games

## Database Schema

The app uses two main tables:

- **profiles**: User profiles with stats (wins, losses, draws, total_games)
- **games**: Game records with player choices, turn results, and winner

See `SUPABASE_SETUP.md` for detailed schema and setup instructions.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
