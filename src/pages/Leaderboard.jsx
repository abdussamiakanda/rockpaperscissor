import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ref, get, onValue, off } from 'firebase/database'
import { db } from '../lib/firebase'
import { motion } from 'framer-motion'
import { FaTrophy, FaMedal, FaAward, FaUser, FaFire } from 'react-icons/fa'
import Avatar from '../components/Avatar'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [onlineStatus, setOnlineStatus] = useState({})

  useEffect(() => {
    fetchLeaderboard()

    // Subscribe to real-time updates
    const gamesRef = ref(db, 'games')
    const profilesRef = ref(db, 'profiles')
    
    const unsubscribeGames = onValue(gamesRef, () => {
      fetchLeaderboard()
    })
    
    const unsubscribeProfiles = onValue(profilesRef, (snapshot) => {
      fetchLeaderboard()
      
      // Update online status
      if (snapshot.exists()) {
        const allProfiles = snapshot.val()
        const onlineMap = {}
        Object.entries(allProfiles).forEach(([userId, profileData]) => {
          onlineMap[userId] = profileData.is_online === true
        })
        setOnlineStatus(onlineMap)
      }
    })

    return () => {
      off(gamesRef, 'value', unsubscribeGames)
      off(profilesRef, 'value', unsubscribeProfiles)
    }
  }, [])

  const fetchLeaderboard = async () => {
    try {
      // Fetch all profiles and games
      const [profilesSnapshot, gamesSnapshot] = await Promise.all([
        get(ref(db, 'profiles')),
        get(ref(db, 'games'))
      ])

      if (!profilesSnapshot.exists()) {
        setLeaderboard([])
        setLoading(false)
        return
      }

      const allProfiles = profilesSnapshot.val()
      const allGames = gamesSnapshot.exists() ? gamesSnapshot.val() : {}

      // Calculate stats for each user from games
      const profilesWithStats = Object.entries(allProfiles).map(([userId, profileData]) => {
        let wins = 0
        let losses = 0
        let draws = 0
        let totalGames = 0
        let roundsWon = 0
        let roundsLost = 0
        let roundsDrawn = 0
        let winStreak = 0

        // Get all games for this user, sorted by date (most recent first)
        const userGames = Object.entries(allGames)
          .map(([gameId, gameData]) => ({
            id: gameId,
            ...gameData
          }))
          .filter(game => 
            game.status === 'completed' && 
            (game.player1_id === userId || game.player2_id === userId)
          )
          .sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime()
            const dateB = new Date(b.created_at || 0).getTime()
            return dateB - dateA // Most recent first
          })

        // Count games and rounds where user is a player
        userGames.forEach((game) => {
          totalGames++
          
          const isPlayer1 = game.player1_id === userId
          const isPlayer2 = game.player2_id === userId
          
          // Count game results
          if (game.winner_id === userId) {
            wins++
          } else if (game.winner_id && game.winner_id !== userId) {
            losses++
          } else {
            draws++
          }
          
          // Count round results from turn_results
          if (game.turn_results && Array.isArray(game.turn_results)) {
            game.turn_results.forEach((round) => {
              const roundResult = typeof round === 'string' ? round : round.result
              
              if (roundResult === 'player1' && isPlayer1) {
                roundsWon++
              } else if (roundResult === 'player1' && isPlayer2) {
                roundsLost++
              } else if (roundResult === 'player2' && isPlayer2) {
                roundsWon++
              } else if (roundResult === 'player2' && isPlayer1) {
                roundsLost++
              } else if (roundResult === 'draw') {
                roundsDrawn++
              }
            })
          }
        })

        // Calculate win streak (consecutive wins from most recent game)
        for (const game of userGames) {
          if (game.winner_id === userId) {
            winStreak++
          } else {
            break // Stop counting when we hit a non-win
          }
        }

        // Calculate score based on performance, not activity
        // Formula:
        // - Rounds Won: 10 points each (primary scoring)
        // - Rounds Lost: -2 points each (penalty)
        // - Rounds Drawn: 2 points each (neutral contribution)
        // - Game Wins: +5 bonus per game (reward for winning overall)
        // - Game Losses: -3 penalty per game (penalty for losing overall)
        // This focuses on performance quality, not quantity of games played
        const score = (roundsWon * 10) - (roundsLost * 2) + (roundsDrawn * 2) + (wins * 5) - (losses * 3)

        return {
          id: userId,
          ...profileData,
          wins,
          losses,
          draws,
          total_games: totalGames,
          rounds_won: roundsWon,
          rounds_lost: roundsLost,
          rounds_drawn: roundsDrawn,
          win_streak: winStreak,
          score
        }
      })

      // Sort by score (descending), then by wins, then by rounds won
      // Show all users, but prioritize those who have played games
      const sorted = profilesWithStats
        .sort((a, b) => {
          // First, prioritize players who have played games
          if (a.total_games === 0 && b.total_games > 0) return 1
          if (a.total_games > 0 && b.total_games === 0) return -1
          
          // Then sort by score, wins, rounds won
          if (b.score !== a.score) return b.score - a.score
          if (b.wins !== a.wins) return b.wins - a.wins
          if (b.rounds_won !== a.rounds_won) return b.rounds_won - a.rounds_won
          return b.total_games - a.total_games
        })
        .slice(0, 100)

      setLeaderboard(sorted)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (index) => {
    if (index === 0) return <FaTrophy style={{ color: '#F4D160' }} className="text-2xl sm:text-3xl" />
    if (index === 1) return <FaMedal style={{ color: '#C0C0C0' }} className="text-2xl sm:text-3xl" />
    if (index === 2) return <FaAward style={{ color: '#CD7F32' }} className="text-2xl sm:text-3xl" />
    return <span className="text-base sm:text-lg font-black" style={{ color: 'rgba(234, 234, 234, 0.7)' }}>#{index + 1}</span>
  }

  if (loading) {
    return <LoadingSpinner message="Loading leaderboard..." />
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 sm:mb-8"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 sm:mb-4 uppercase tracking-wider flex items-center justify-center space-x-3" style={{ color: '#EAEAEA' }}>
          <FaTrophy style={{ color: '#F4D160' }} className="text-3xl sm:text-4xl" />
          <span>Leaderboard</span>
        </h1>
        <p className="text-sm sm:text-base" style={{ color: 'rgba(234, 234, 234, 0.7)' }}>
          Top players ranked by score (considers wins, losses, draws, and round performance)
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        {leaderboard.length === 0 ? (
          <p className="text-center py-8 sm:py-12 text-sm sm:text-base" style={{ color: 'rgba(234, 234, 234, 0.7)' }}>No players yet</p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {leaderboard.map((player, index) => {
              return (
                <Link
                  key={player.id}
                  to={`/profile/${player.username}`}
                  className="block"
                >
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`p-4 sm:p-5 rounded-lg border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 transition-all ${
                      index < 3
                        ? 'hover:scale-[1.02]'
                        : 'hover:scale-[1.01]'
                    }`}
                    style={{
                      backgroundColor: index === 0 
                        ? 'rgba(244, 209, 96, 0.15)' 
                        : index === 1 
                        ? 'rgba(192, 192, 192, 0.15)' 
                        : index === 2 
                        ? 'rgba(205, 127, 50, 0.15)' 
                        : 'rgba(233, 69, 96, 0.1)',
                      borderColor: index === 0 
                        ? '#F4D160' 
                        : index === 1 
                        ? '#C0C0C0' 
                        : index === 2 
                        ? '#CD7F32' 
                        : 'rgba(233, 69, 96, 0.3)'
                    }}
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                      <div className="w-10 sm:w-12 flex-shrink-0 flex justify-center">
                        {getRankIcon(index)}
                      </div>
                      <div className="flex-shrink-0">
                        <Avatar profile={player} size="lg" className="w-14 h-14 sm:w-16 sm:h-16" isOnline={onlineStatus[player.id] === true} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-base sm:text-lg font-black uppercase tracking-wider truncate" style={{ color: '#EAEAEA' }}>
                          {player.username}
                        </div>
                        <div className="text-xs sm:text-sm" style={{ color: 'rgba(234, 234, 234, 0.7)' }}>
                          {player.total_games} {player.total_games === 1 ? 'game' : 'games'} played
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 sm:space-x-6 w-full sm:w-auto justify-between sm:justify-end">
                      {player.win_streak > 3 && (
                        <div className="text-center">
                          <div className="text-lg sm:text-xl font-black flex items-center justify-center space-x-1" style={{ color: '#FF6B6B' }}>
                            <FaFire className="text-base sm:text-lg" />
                            <span>{player.win_streak}</span>
                          </div>
                          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255, 69, 0, 0.8)' }}>Streak</div>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-lg sm:text-xl font-black" style={{ color: '#4ECCA3' }}>{player.wins}</div>
                        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(78, 204, 163, 0.8)' }}>Wins</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg sm:text-xl font-black" style={{ color: '#FF6B6B' }}>{player.losses}</div>
                        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255, 107, 107, 0.8)' }}>Losses</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg sm:text-xl font-black" style={{ color: '#F4D160' }}>{player.draws}</div>
                        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(244, 209, 96, 0.8)' }}>Draws</div>
                      </div>
                      <div className="text-center border-l-2 pl-4 sm:pl-6" style={{ borderColor: 'rgba(233, 69, 96, 0.3)' }}>
                        <div className="text-lg sm:text-xl font-black" style={{ color: '#E94560' }}>{player.score}</div>
                        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(233, 69, 96, 0.8)' }}>Score</div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
