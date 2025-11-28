import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  ref, 
  query, 
  orderByChild, 
  equalTo, 
  get, 
  push, 
  update, 
  onValue,
  off,
  remove,
  limitToFirst
} from 'firebase/database'
import { db } from '../lib/firebase'
import { motion } from 'framer-motion'
import { FaPlay, FaSpinner } from 'react-icons/fa'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [searching, setSearching] = useState(false)
  const [stats, setStats] = useState({
    wins: 0,
    losses: 0,
    draws: 0,
    total_games: 0
  })

  // Calculate stats from games
  useEffect(() => {
    if (!user) {
      setStats({ wins: 0, losses: 0, draws: 0, total_games: 0 })
      return
    }

    const gamesRef = ref(db, 'games')
    const unsubscribe = onValue(gamesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setStats({ wins: 0, losses: 0, draws: 0, total_games: 0 })
        return
      }

      const allGames = snapshot.val()
      let wins = 0
      let losses = 0
      let draws = 0
      let totalGames = 0

      Object.values(allGames).forEach((game) => {
        // Only count completed games where user is a player
        if (game.status === 'completed' && 
            (game.player1_id === user.uid || game.player2_id === user.uid)) {
          totalGames++
          
          if (game.winner_id === user.uid) {
            wins++
          } else if (game.winner_id && game.winner_id !== user.uid) {
            losses++
          } else {
            // winner_id is null, meaning it's a draw
            draws++
          }
        }
      })

      setStats({ wins, losses, draws, total_games: totalGames })
    }, (error) => {
      console.error('[Dashboard] Games subscription error:', error)
    })

    return () => {
      off(gamesRef, 'value', unsubscribe)
    }
  }, [user])

  useEffect(() => {
    // Check for ongoing game on mount
    if (user && profile) {
      checkForOngoingGame()
    }
  }, [user, profile])


  const checkForOngoingGame = async () => {
    if (!user) return

    try {
      // Check profile for current game
      if (profile?.current_game_id) {
        const gameRef = ref(db, `games/${profile.current_game_id}`)
        const gameSnapshot = await get(gameRef)
        
        if (gameSnapshot.exists()) {
          const gameData = gameSnapshot.val()
          if (gameData.status !== 'completed' && 
              (gameData.player1_id === user.uid || gameData.player2_id === user.uid)) {
            navigate('/game')
            return
          }
        }
      }

      // Search for active games where user is a player
      const gamesRef = ref(db, 'games')
      const gamesSnapshot = await get(gamesRef)
      
      if (gamesSnapshot.exists()) {
        const allGames = gamesSnapshot.val()
        const userGame = Object.entries(allGames).find(([id, gameData]) => {
          return (gameData.player1_id === user.uid || gameData.player2_id === user.uid) &&
                 gameData.status !== 'completed'
        })

        if (userGame) {
          const [foundGameId] = userGame
          // Update profile with current game
          const profileRef = ref(db, `profiles/${user.uid}`)
          await update(profileRef, { current_game_id: foundGameId })
          navigate('/game')
        }
      }
    } catch (error) {
      console.error('Error checking for ongoing game:', error)
    }
  }

  const findMatch = async () => {
    if (!user) {
      return
    }

    setSearching(true)

    try {
      // Step 1: Search for waiting games (excluding our own)
      const gamesRef = ref(db, 'games')
      const waitingGamesQuery = query(
        gamesRef,
        orderByChild('status'),
        equalTo('waiting'),
        limitToFirst(10)
      )

      const waitingGamesSnapshot = await get(waitingGamesQuery)
      
      // Filter out games where we are player1 and where player2_id exists
      let availableGame = null
      if (waitingGamesSnapshot.exists()) {
        const games = waitingGamesSnapshot.val()
        availableGame = Object.entries(games).find(([gameId, gameData]) => {
          return gameData.player1_id !== user.uid && !gameData.player2_id
        })
      }

      // Step 2: If found, try to join it
      if (availableGame) {
        const [gameId, gameData] = availableGame
        
        // Double-check the game is still available
        const gameRef = ref(db, `games/${gameId}`)
        const currentGameSnapshot = await get(gameRef)
        
        if (currentGameSnapshot.exists()) {
          const currentGame = currentGameSnapshot.val()
          if (currentGame.status === 'waiting' && !currentGame.player2_id) {
            try {
              await update(gameRef, {
                player2_id: user.uid,
                status: 'in_progress',
                updated_at: new Date().toISOString(),
              })
              
              // Store game ID in profile
              const profileRef = ref(db, `profiles/${user.uid}`)
              await update(profileRef, { current_game_id: gameId })
              setSearching(false)
              navigate('/game')
              return
            } catch (updateError) {
              // Game may have been taken by another player, continue to create new one
            }
          }
        }
      }

      // Step 3: If no waiting games found, create a new one
      const newGameRef = push(ref(db, 'games'))
      const newGame = {
        player1_id: user.uid,
        player2_id: null,
        status: 'waiting',
        current_turn: 1,
        player1_choice: null,
        player2_choice: null,
        turn_results: [],
        winner_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      await update(newGameRef, newGame)
      const gameId = newGameRef.key
      
      // Store game ID in profile
      const profileRef = ref(db, `profiles/${user.uid}`)
      await update(profileRef, { current_game_id: gameId })

      // Timeout after 30 seconds - cancel the game if no opponent found
      const timeoutId = setTimeout(async () => {
        setSearching(false)
        off(newGameRef, 'value', unsubscribe)
        // Delete the waiting game
        await remove(newGameRef)
        // Clear current_game_id from profile
        if (user) {
          try {
            const profileRef = ref(db, `profiles/${user.uid}`)
            await update(profileRef, { current_game_id: null })
          } catch (error) {
            console.error('Error clearing current_game_id on timeout:', error)
          }
        }
      }, 30000)

      // Subscribe to game changes - watch for when someone joins our game
      const unsubscribe = onValue(newGameRef, (snapshot) => {
        if (!snapshot.exists()) return
        
        const game = snapshot.val()
        if (game.player2_id && game.status === 'in_progress') {
          // Clear the timeout since opponent joined
          clearTimeout(timeoutId)
          setSearching(false)
          off(newGameRef, 'value', unsubscribe)
          navigate('/game')
        }
      })

      // Cleanup on unmount
      return () => {
        clearTimeout(timeoutId)
        off(newGameRef, 'value', unsubscribe)
      }
    } catch (error) {
      console.error('Error in findMatch:', error)
      setSearching(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <h2 className="text-xl sm:text-2xl font-black mb-3 sm:mb-4 uppercase tracking-wider" style={{ color: 'rgb(242, 174, 187)' }}>Quick Match</h2>
          <p className="mb-6 text-sm sm:text-base" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>
            Find an opponent and play a best-of-3 match!
          </p>
          <motion.button
            onClick={findMatch}
            disabled={searching}
            whileHover={!searching ? { scale: 1.05 } : {}}
            whileTap={!searching ? { scale: 0.95 } : {}}
            className="w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-black uppercase tracking-wider py-4 sm:py-5 rounded-lg border-2 transition-all"
            style={{
              backgroundColor: searching ? 'rgba(0, 245, 255, 0.2)' : 'rgba(0, 245, 255, 0.15)',
              color: '#00F5FF',
              borderColor: '#00F5FF',
            }}
          >
            {searching ? (
              <>
                <FaSpinner className="animate-spin" style={{ color: '#00F5FF' }} />
                <span>Searching for opponent...</span>
              </>
            ) : (
              <>
                <FaPlay style={{ color: '#00F5FF' }} />
                <span>Find Match</span>
              </>
            )}
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h2 className="text-xl sm:text-2xl font-black mb-3 sm:mb-4 uppercase tracking-wider" style={{ color: 'rgb(242, 174, 187)' }}>Stats</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="rounded-lg p-3 sm:p-4 text-center border-2" style={{
              backgroundColor: 'rgba(57, 255, 20, 0.15)',
              borderColor: '#39FF14'
            }}>
              <div className="text-xl sm:text-2xl font-black mb-1" style={{ color: '#39FF14' }}>{stats.wins}</div>
              <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(57, 255, 20, 0.9)' }}>Wins</div>
            </div>
            <div className="rounded-lg p-3 sm:p-4 text-center border-2" style={{
              backgroundColor: 'rgba(191, 26, 26, 0.15)',
              borderColor: '#BF1A1A'
            }}>
              <div className="text-xl sm:text-2xl font-black mb-1" style={{ color: '#BF1A1A' }}>{stats.losses}</div>
              <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(191, 26, 26, 0.9)' }}>Losses</div>
            </div>
            <div className="rounded-lg p-3 sm:p-4 text-center border-2" style={{
              backgroundColor: 'rgba(255, 215, 0, 0.15)',
              borderColor: '#FFD700'
            }}>
              <div className="text-xl sm:text-2xl font-black mb-1" style={{ color: '#FFD700' }}>{stats.draws}</div>
              <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(255, 215, 0, 0.9)' }}>Draws</div>
            </div>
            <div className="rounded-lg p-3 sm:p-4 text-center border-2" style={{
              backgroundColor: 'rgba(255, 0, 255, 0.15)',
              borderColor: '#FF00FF'
            }}>
              <div className="text-xl sm:text-2xl font-black mb-1" style={{ color: '#FF00FF' }}>{stats.total_games}</div>
              <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(255, 0, 255, 0.9)' }}>Total</div>
            </div>
          </div>
          {stats.total_games > 0 && (
            <div className="flex justify-between items-center pt-3 mt-2 border-t-2" style={{ borderColor: 'rgba(255, 0, 255, 0.5)' }}>
              <span className="text-base sm:text-lg font-semibold uppercase tracking-wider" style={{ color: 'rgba(242, 174, 187, 0.9)' }}>Win Rate:</span>
              <span className="text-lg sm:text-xl font-black" style={{ color: 'rgb(242, 174, 187)' }}>
                {Math.round((stats.wins / stats.total_games) * 100)}%
              </span>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
