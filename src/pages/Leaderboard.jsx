import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ref, get, onValue, off } from 'firebase/database'
import { db } from '../lib/firebase'
import { motion } from 'framer-motion'
import { FaTrophy, FaMedal, FaAward, FaUser } from 'react-icons/fa'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()

    // Subscribe to real-time updates
    const gamesRef = ref(db, 'games')
    const profilesRef = ref(db, 'profiles')
    
    const unsubscribeGames = onValue(gamesRef, () => {
      fetchLeaderboard()
    })
    
    const unsubscribeProfiles = onValue(profilesRef, () => {
      fetchLeaderboard()
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

        // Count games where user is a player
        Object.values(allGames).forEach((game) => {
          if (game.status === 'completed' && 
              (game.player1_id === userId || game.player2_id === userId)) {
            totalGames++
            
            if (game.winner_id === userId) {
              wins++
            } else if (game.winner_id && game.winner_id !== userId) {
              losses++
            } else {
              draws++
            }
          }
        })

        return {
          id: userId,
          ...profileData,
          wins,
          losses,
          draws,
          total_games: totalGames
        }
      })

      // Sort by wins (descending), then by win rate, then by total games
      const sorted = profilesWithStats
        .filter(player => player.total_games > 0) // Only show players who have played
        .sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins
          const aWinRate = a.total_games > 0 ? a.wins / a.total_games : 0
          const bWinRate = b.total_games > 0 ? b.wins / b.total_games : 0
          if (bWinRate !== aWinRate) return bWinRate - aWinRate
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
    if (index === 0) return <FaTrophy style={{ color: '#FFD700' }} className="text-2xl sm:text-3xl" />
    if (index === 1) return <FaMedal style={{ color: '#C0C0C0' }} className="text-2xl sm:text-3xl" />
    if (index === 2) return <FaAward style={{ color: '#CD7F32' }} className="text-2xl sm:text-3xl" />
    return <span className="text-base sm:text-lg font-black" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>#{index + 1}</span>
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
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 sm:mb-4 uppercase tracking-wider flex items-center justify-center space-x-3" style={{ color: 'rgb(242, 174, 187)' }}>
          <FaTrophy style={{ color: '#FFD700' }} className="text-3xl sm:text-4xl" />
          <span>Leaderboard</span>
        </h1>
        <p className="text-sm sm:text-base" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>Top players by wins</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        {leaderboard.length === 0 ? (
          <p className="text-center py-8 sm:py-12 text-sm sm:text-base" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>No players yet</p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {leaderboard.map((player, index) => {
              const winRate = player.total_games > 0
                ? Math.round((player.wins / player.total_games) * 100)
                : 0

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
                        ? 'rgba(255, 215, 0, 0.15)' 
                        : index === 1 
                        ? 'rgba(192, 192, 192, 0.15)' 
                        : index === 2 
                        ? 'rgba(205, 127, 50, 0.15)' 
                        : 'rgba(255, 0, 255, 0.1)',
                      borderColor: index === 0 
                        ? '#FFD700' 
                        : index === 1 
                        ? '#C0C0C0' 
                        : index === 2 
                        ? '#CD7F32' 
                        : 'rgba(255, 0, 255, 0.3)'
                    }}
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                      <div className="w-10 sm:w-12 flex-shrink-0 flex justify-center">
                        {getRankIcon(index)}
                      </div>
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 overflow-hidden flex-shrink-0" style={{
                        backgroundColor: 'rgba(255, 0, 255, 0.15)',
                        borderColor: '#FF00FF'
                      }}>
                        {player.photo_url ? (
                          <img 
                            src={player.photo_url} 
                            alt={player.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FaUser style={{ color: '#FF00FF' }} className="text-lg sm:text-xl" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-base sm:text-lg font-black uppercase tracking-wider truncate" style={{ color: 'rgb(242, 174, 187)' }}>
                          {player.username}
                        </div>
                        <div className="text-xs sm:text-sm" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>
                          {player.total_games} {player.total_games === 1 ? 'game' : 'games'} played
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 sm:space-x-6 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-center">
                        <div className="text-lg sm:text-xl font-black" style={{ color: '#39FF14' }}>{player.wins}</div>
                        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(57, 255, 20, 0.8)' }}>Wins</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg sm:text-xl font-black" style={{ color: '#BF1A1A' }}>{player.losses}</div>
                        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(191, 26, 26, 0.8)' }}>Losses</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg sm:text-xl font-black" style={{ color: '#FFD700' }}>{player.draws}</div>
                        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255, 215, 0, 0.8)' }}>Draws</div>
                      </div>
                      <div className="text-center border-l-2 pl-4 sm:pl-6" style={{ borderColor: 'rgba(255, 0, 255, 0.3)' }}>
                        <div className="text-lg sm:text-xl font-black" style={{ color: '#FF00FF' }}>{winRate}%</div>
                        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255, 0, 255, 0.8)' }}>Win Rate</div>
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
