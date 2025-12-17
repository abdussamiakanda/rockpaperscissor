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
  const [onlineCount, setOnlineCount] = useState(0)

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
        if (game.status === 'completed' && 
            (game.player1_id === user.uid || game.player2_id === user.uid)) {
          totalGames++
          
          if (game.winner_id === user.uid) {
            wins++
          } else if (game.winner_id && game.winner_id !== user.uid) {
            losses++
          } else {
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
    const profilesRef = ref(db, 'profiles')
    const unsubscribe = onValue(profilesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setOnlineCount(0)
        return
      }

      const allProfiles = snapshot.val()
      let count = 0
      Object.values(allProfiles).forEach((profile) => {
        if (profile.is_online === true) {
          count++
        }
      })
      setOnlineCount(count)
    }, (error) => {
      console.error('[Dashboard] Online count subscription error:', error)
    })

    return () => {
      off(profilesRef, 'value', unsubscribe)
    }
  }, [])

  useEffect(() => {
    if (user && profile) {
      checkForOngoingGame()
    }
  }, [user, profile])


  const checkForOngoingGame = async () => {
    if (!user) return

    try {
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
      const gamesRef = ref(db, 'games')
      const waitingGamesQuery = query(
        gamesRef,
        orderByChild('status'),
        equalTo('waiting'),
        limitToFirst(10)
      )

      const waitingGamesSnapshot = await get(waitingGamesQuery)
      
      let availableGame = null
      if (waitingGamesSnapshot.exists()) {
        const games = waitingGamesSnapshot.val()
        availableGame = Object.entries(games).find(([gameId, gameData]) => {
          if (gameData.player1_id === user.uid) return false
          if (gameData.player2_id) return false
          if (gameData.challenged_user_id && gameData.challenged_user_id !== user.uid) return false
          return true
        })
      }

      if (availableGame) {
        const [gameId, gameData] = availableGame
        
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
              
              const profileRef = ref(db, `profiles/${user.uid}`)
              await update(profileRef, { current_game_id: gameId })
              setSearching(false)
              navigate('/game')
              return
            } catch (updateError) {
              // Game may have been taken by another player
            }
          }
        }
      }

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
      
      const profileRef = ref(db, `profiles/${user.uid}`)
      await update(profileRef, { current_game_id: gameId })

      const timeoutId = setTimeout(async () => {
        setSearching(false)
        off(newGameRef, 'value', unsubscribe)
        await remove(newGameRef)
        if (user) {
          try {
            const profileRef = ref(db, `profiles/${user.uid}`)
            await update(profileRef, { current_game_id: null })
          } catch (error) {
            console.error('Error clearing current_game_id on timeout:', error)
          }
        }
      }, 30000)

      const unsubscribe = onValue(newGameRef, (snapshot) => {
        if (!snapshot.exists()) return
        
        const game = snapshot.val()
        if (game.player2_id && game.status === 'in_progress') {
          clearTimeout(timeoutId)
          setSearching(false)
          off(newGameRef, 'value', unsubscribe)
          navigate('/game')
        }
      })

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
          <h2 className="text-xl sm:text-2xl font-black mb-3 sm:mb-4 uppercase tracking-wider" style={{ color: '#EAEAEA' }}>Quick Match</h2>
          <p className="mb-6 text-sm sm:text-base" style={{ color: 'rgba(234, 234, 234, 0.7)' }}>
            Find an opponent and play a best-of-3 match!
          </p>
          <motion.button
            onClick={findMatch}
            disabled={searching}
            whileHover={!searching ? { scale: 1.05 } : {}}
            whileTap={!searching ? { scale: 0.95 } : {}}
            className="w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-black uppercase tracking-wider py-4 sm:py-5 rounded-lg border-2 transition-all"
            style={{
              backgroundColor: searching ? 'rgba(233, 69, 96, 0.2)' : 'rgba(233, 69, 96, 0.15)',
              color: '#E94560',
              borderColor: '#E94560',
            }}
          >
            {searching ? (
              <>
                <FaSpinner className="animate-spin" style={{ color: '#E94560' }} />
                <span>Searching for opponent...</span>
              </>
            ) : (
              <>
                <FaPlay style={{ color: '#E94560' }} />
                <span>Find Match</span>
              </>
            )}
          </motion.button>
          <p className="mt-3 text-center text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(78, 204, 163, 0.9)' }}>
            {onlineCount} {onlineCount === 1 ? 'player' : 'players'} online
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h2 className="text-xl sm:text-2xl font-black mb-3 sm:mb-4 uppercase tracking-wider" style={{ color: '#EAEAEA' }}>Stats</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="rounded-lg p-3 sm:p-4 text-center border-2" style={{
              backgroundColor: 'rgba(78, 204, 163, 0.15)',
              borderColor: '#4ECCA3'
            }}>
              <div className="text-xl sm:text-2xl font-black mb-1" style={{ color: '#4ECCA3' }}>{stats.wins}</div>
              <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(78, 204, 163, 0.9)' }}>Wins</div>
            </div>
            <div className="rounded-lg p-3 sm:p-4 text-center border-2" style={{
              backgroundColor: 'rgba(255, 107, 107, 0.15)',
              borderColor: '#FF6B6B'
            }}>
              <div className="text-xl sm:text-2xl font-black mb-1" style={{ color: '#FF6B6B' }}>{stats.losses}</div>
              <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(255, 107, 107, 0.9)' }}>Losses</div>
            </div>
            <div className="rounded-lg p-3 sm:p-4 text-center border-2" style={{
              backgroundColor: 'rgba(244, 209, 96, 0.15)',
              borderColor: '#F4D160'
            }}>
              <div className="text-xl sm:text-2xl font-black mb-1" style={{ color: '#F4D160' }}>{stats.draws}</div>
              <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(244, 209, 96, 0.9)' }}>Draws</div>
            </div>
            <div className="rounded-lg p-3 sm:p-4 text-center border-2" style={{
              backgroundColor: 'rgba(233, 69, 96, 0.15)',
              borderColor: '#E94560'
            }}>
              <div className="text-xl sm:text-2xl font-black mb-1" style={{ color: '#E94560' }}>{stats.total_games}</div>
              <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(233, 69, 96, 0.9)' }}>Total</div>
            </div>
          </div>
          {stats.total_games > 0 && (
            <div className="flex justify-between items-center pt-3 mt-2 border-t-2" style={{ borderColor: 'rgba(233, 69, 96, 0.5)' }}>
              <span className="text-base sm:text-lg font-semibold uppercase tracking-wider" style={{ color: 'rgba(234, 234, 234, 0.9)' }}>Win Rate:</span>
              <span className="text-lg sm:text-xl font-black" style={{ color: '#EAEAEA' }}>
                {Math.round((stats.wins / stats.total_games) * 100)}%
              </span>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
