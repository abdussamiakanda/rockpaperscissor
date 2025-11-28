import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ref, get, onValue, off } from 'firebase/database'
import { db } from '../lib/firebase'
import { motion, AnimatePresence } from 'framer-motion'
import { FaTrophy, FaChartLine, FaUser, FaHandRock, FaHandPaper, FaHandScissors, FaTimes, FaHandshake, FaThumbsUp, FaThumbsDown } from 'react-icons/fa'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Profile() {
  const { username: urlUsername } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [targetProfile, setTargetProfile] = useState(null)
  const [targetUserId, setTargetUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recentGames, setRecentGames] = useState([])
  const [stats, setStats] = useState({
    wins: 0,
    losses: 0,
    draws: 0,
    total_games: 0
  })
  const [selectedGame, setSelectedGame] = useState(null)
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
  const [showChoices, setShowChoices] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [winnerUsername, setWinnerUsername] = useState(null)

  const CHOICES = {
    rock: { icon: FaHandRock, name: 'Rock', hexColor: '#FFD700' },
    paper: { icon: FaHandPaper, name: 'Paper', hexColor: '#FF00FF' },
    scissors: { icon: FaHandScissors, name: 'Scissors', hexColor: '#39FF14' },
  }

  // Find user by username
  useEffect(() => {
    const findUserByUsername = async () => {
      if (!urlUsername) {
        // No username in URL, use current user
        setTargetUserId(user?.uid || null)
        setTargetProfile(profile)
        setLoading(false)
        return
      }

      try {
        // Fetch all profiles to find the one with matching username
        const profilesRef = ref(db, 'profiles')
        const profilesSnapshot = await get(profilesRef)
        
        if (profilesSnapshot.exists()) {
          const allProfiles = profilesSnapshot.val()
          const foundProfile = Object.entries(allProfiles).find(
            ([userId, profileData]) => profileData.username === urlUsername
          )
          
          if (foundProfile) {
            const [userId, profileData] = foundProfile
            setTargetUserId(userId)
            setTargetProfile({ id: userId, ...profileData })
          } else {
            // Username not found
            setTargetUserId(null)
            setTargetProfile(null)
          }
        } else {
          setTargetUserId(null)
          setTargetProfile(null)
        }
      } catch (error) {
        console.error('Error finding user by username:', error)
        setTargetUserId(null)
        setTargetProfile(null)
      } finally {
        setLoading(false)
      }
    }

    if (user || urlUsername) {
      findUserByUsername()
    }
  }, [urlUsername, user, profile])

  const fetchRecentGames = async (userGames, targetUid) => {
    if (!targetUid || !userGames || userGames.length === 0) {
      setRecentGames([])
      return
    }

    try {
      // Fetch opponent profiles for recent games (limit to 20)
      const recentGamesList = userGames.slice(0, 20)
      const gamesWithOpponents = await Promise.all(
        recentGamesList.map(async (game) => {
          const opponentId = game.player1_id === targetUid ? game.player2_id : game.player1_id
          
          // Fetch player1 profile
          const p1Ref = ref(db, `profiles/${game.player1_id}`)
          const p1Snapshot = await get(p1Ref)
          const p1Data = p1Snapshot.exists() ? p1Snapshot.val() : null

          // Fetch player2 profile
          let p2Data = null
          if (game.player2_id) {
            const p2Ref = ref(db, `profiles/${game.player2_id}`)
            const p2Snapshot = await get(p2Ref)
            p2Data = p2Snapshot.exists() ? p2Snapshot.val() : null
          }

          // Get opponent username
          let opponentUsername = 'Unknown'
          if (opponentId) {
            const opponentRef = ref(db, `profiles/${opponentId}`)
            const opponentSnapshot = await get(opponentRef)
            const opponentData = opponentSnapshot.exists() ? opponentSnapshot.val() : null
            opponentUsername = opponentData?.username || 'Unknown'
          }

          return {
            ...game,
            opponentUsername: opponentUsername,
            player1_username: p1Data?.username || 'Player 1',
            player2_username: p2Data?.username || 'Player 2',
          }
        })
      )
      setRecentGames(gamesWithOpponents)
    } catch (error) {
      console.error('Error fetching recent games:', error)
    }
  }

  // Calculate stats from games for target user
  useEffect(() => {
    if (!targetUserId) {
      setStats({ wins: 0, losses: 0, draws: 0, total_games: 0 })
      setRecentGames([])
      return
    }

    const gamesRef = ref(db, 'games')
    const unsubscribe = onValue(gamesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setStats({ wins: 0, losses: 0, draws: 0, total_games: 0 })
        fetchRecentGames([], targetUserId)
        return
      }

      const allGames = snapshot.val()
      let wins = 0
      let losses = 0
      let draws = 0
      let totalGames = 0

      const userGames = Object.entries(allGames)
        .map(([gameId, gameData]) => ({
          id: gameId,
          ...gameData
        }))
        .filter(game => 
          (game.player1_id === targetUserId || game.player2_id === targetUserId) &&
          game.status === 'completed'
        )
        .sort((a, b) => {
          const dateA = new Date(a.created_at || 0)
          const dateB = new Date(b.created_at || 0)
          return dateB - dateA
        })

      userGames.forEach((game) => {
        totalGames++
        
        if (game.winner_id === targetUserId) {
          wins++
        } else if (game.winner_id && game.winner_id !== targetUserId) {
          losses++
        } else {
          draws++
        }
      })

      setStats({ wins, losses, draws, total_games: totalGames })
      fetchRecentGames(userGames, targetUserId)
    }, (error) => {
      console.error('[Profile] Games subscription error:', error)
    })

    return () => {
      off(gamesRef, 'value', unsubscribe)
    }
  }, [targetUserId])

  if (loading) {
    return <LoadingSpinner message="Loading profile..." />
  }

  if (!targetProfile) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="text-2xl font-black mb-4 uppercase tracking-wider" style={{ color: 'rgb(242, 174, 187)' }}>
            Profile Not Found
          </div>
          <p className="text-base mb-6" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>
            The user "{urlUsername}" does not exist.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const isOwnProfile = !urlUsername || targetUserId === user?.uid

  const winRate = stats.total_games > 0 
    ? Math.round((stats.wins / stats.total_games) * 100) 
    : 0

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card mb-6 sm:mb-8"
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-6 sm:mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-4xl sm:text-5xl border-2 overflow-hidden" style={{ 
            backgroundColor: 'rgba(255, 0, 255, 0.15)',
            borderColor: '#FF00FF'
          }}>
            {targetProfile.photo_url ? (
              <img 
                src={targetProfile.photo_url} 
                alt={targetProfile.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <FaUser style={{ color: '#FF00FF' }} />
            )}
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2 uppercase tracking-wider" style={{ color: 'rgb(242, 174, 187)' }}>
              {targetProfile.username}
            </h1>
            {isOwnProfile && user?.email && (
              <p className="text-sm sm:text-base" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>{user.email}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="rounded-lg p-4 sm:p-5 text-center border-2" style={{
            backgroundColor: 'rgba(57, 255, 20, 0.15)',
            borderColor: '#39FF14'
          }}>
            <div className="text-2xl sm:text-3xl font-black mb-1" style={{ color: '#39FF14' }}>{stats.wins}</div>
            <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(57, 255, 20, 0.9)' }}>Wins</div>
          </div>
          <div className="rounded-lg p-4 sm:p-5 text-center border-2" style={{
            backgroundColor: 'rgba(191, 26, 26, 0.15)',
            borderColor: '#BF1A1A'
          }}>
            <div className="text-2xl sm:text-3xl font-black mb-1" style={{ color: '#BF1A1A' }}>{stats.losses}</div>
            <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(191, 26, 26, 0.9)' }}>Losses</div>
          </div>
          <div className="rounded-lg p-4 sm:p-5 text-center border-2" style={{
            backgroundColor: 'rgba(255, 215, 0, 0.15)',
            borderColor: '#FFD700'
          }}>
            <div className="text-2xl sm:text-3xl font-black mb-1" style={{ color: '#FFD700' }}>{stats.draws}</div>
            <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(255, 215, 0, 0.9)' }}>Draws</div>
          </div>
          <div className="rounded-lg p-4 sm:p-5 text-center border-2" style={{
            backgroundColor: 'rgba(255, 0, 255, 0.15)',
            borderColor: '#FF00FF'
          }}>
            <div className="text-2xl sm:text-3xl font-black mb-1" style={{ color: '#FF00FF' }}>{stats.total_games}</div>
            <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(255, 0, 255, 0.9)' }}>Total</div>
          </div>
        </div>

        <div className="mt-6 sm:mt-8">
          <div className="flex justify-between items-center mb-2 sm:mb-3">
            <span className="text-sm sm:text-base font-semibold uppercase tracking-wider" style={{ color: 'rgba(242, 174, 187, 0.9)' }}>Win Rate</span>
            <span className="text-lg sm:text-xl font-black" style={{ color: 'rgb(242, 174, 187)' }}>{winRate}%</span>
          </div>
          <div className="w-full rounded-full h-3 sm:h-4" style={{ backgroundColor: 'rgba(242, 174, 187, 0.2)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${winRate}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-3 sm:h-4 rounded-full"
              style={{ backgroundColor: '#FF00FF' }}
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-4 sm:mb-6 uppercase tracking-wider flex items-center space-x-3" style={{ color: 'rgb(242, 174, 187)' }}>
          <FaChartLine style={{ color: '#FF00FF' }} className="text-xl sm:text-2xl" />
          <span>Recent Games</span>
        </h2>
        {recentGames.length === 0 ? (
          <p className="text-center py-8 sm:py-12 text-sm sm:text-base" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>No games played yet</p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {recentGames.map((game) => {
              const isWinner = game.winner_id === targetUserId
              const isDraw = !game.winner_id

              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  onClick={async () => {
                    setSelectedGame(game)
                    setCurrentRoundIndex(0)
                    setShowChoices(false)
                    setShowResult(false)
                    setWinnerUsername(null)
                    
                    // Fetch winner username if winner exists
                    if (game.winner_id) {
                      try {
                        const winnerRef = ref(db, `profiles/${game.winner_id}`)
                        const winnerSnapshot = await get(winnerRef)
                        if (winnerSnapshot.exists()) {
                          setWinnerUsername(winnerSnapshot.val().username || 'Unknown')
                        }
                      } catch (error) {
                        console.error('Error fetching winner username:', error)
                      }
                    }
                  }}
                  className="p-4 sm:p-5 rounded-lg border-2 cursor-pointer transition-all"
                  style={{
                    backgroundColor: isWinner 
                      ? 'rgba(57, 255, 20, 0.15)' 
                      : isDraw 
                      ? 'rgba(255, 215, 0, 0.15)' 
                      : 'rgba(191, 26, 26, 0.15)',
                    borderColor: isWinner 
                      ? '#39FF14' 
                      : isDraw 
                      ? '#FFD700' 
                      : '#BF1A1A'
                  }}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                    <div className="flex-1">
                      <div className="text-base sm:text-lg font-black uppercase tracking-wider mb-1" style={{ color: 'rgb(242, 174, 187)' }}>
                        vs {game.opponentUsername || 'Unknown'}
                      </div>
                      <div className="text-xs sm:text-sm" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>
                        {new Date(game.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      {isWinner ? (
                        <span className="text-base sm:text-lg font-black uppercase tracking-wider px-3 py-1 rounded" style={{ 
                          color: '#39FF14',
                          backgroundColor: 'rgba(57, 255, 20, 0.2)'
                        }}>Win</span>
                      ) : isDraw ? (
                        <span className="text-base sm:text-lg font-black uppercase tracking-wider px-3 py-1 rounded" style={{ 
                          color: '#FFD700',
                          backgroundColor: 'rgba(255, 215, 0, 0.2)'
                        }}>Draw</span>
                      ) : (
                        <span className="text-base sm:text-lg font-black uppercase tracking-wider px-3 py-1 rounded" style={{ 
                          color: '#BF1A1A',
                          backgroundColor: 'rgba(191, 26, 26, 0.2)'
                        }}>Loss</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Game View Modal */}
      <AnimatePresence>
        {selectedGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 pb-8 overflow-y-auto"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
            onClick={() => setSelectedGame(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -20 }}
              onClick={(e) => e.stopPropagation()}
              className="card max-w-4xl mx-auto w-full"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider mb-2" style={{ color: 'rgb(242, 174, 187)' }}>
                    Game Details
                  </h2>
                  {selectedGame.created_at && (
                    <p className="text-sm sm:text-base mb-2" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>
                      {new Date(selectedGame.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                  {selectedGame.winner_id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="inline-flex items-center space-x-2 px-3 py-1 rounded"
                      style={{
                        backgroundColor: 'rgba(57, 255, 20, 0.2)',
                        border: '2px solid #39FF14'
                      }}
                    >
                      <FaTrophy style={{ color: '#39FF14' }} />
                      <span className="text-sm sm:text-base font-black uppercase tracking-wider" style={{ color: '#39FF14' }}>
                        {winnerUsername || selectedGame.player1_username || selectedGame.player2_username || 'Unknown'} Won!
                      </span>
                    </motion.div>
                  )}
                  {!selectedGame.winner_id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="inline-flex items-center space-x-2 px-3 py-1 rounded"
                      style={{
                        backgroundColor: 'rgba(255, 215, 0, 0.2)',
                        border: '2px solid #FFD700'
                      }}
                    >
                      <FaHandshake style={{ color: '#FFD700' }} />
                      <span className="text-sm sm:text-base font-black uppercase tracking-wider" style={{ color: '#FFD700' }}>
                        Draw
                      </span>
                    </motion.div>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedGame(null)}
                  className="p-2 rounded-full"
                  style={{ color: '#BF1A1A' }}
                >
                  <FaTimes className="text-2xl" />
                </motion.button>
              </div>

              {selectedGame.turn_results && selectedGame.turn_results.length > 0 ? (
                <GameRoundViewer
                  game={selectedGame}
                  currentRoundIndex={currentRoundIndex}
                  setCurrentRoundIndex={setCurrentRoundIndex}
                  showChoices={showChoices}
                  setShowChoices={setShowChoices}
                  showResult={showResult}
                  setShowResult={setShowResult}
                  CHOICES={CHOICES}
                  targetUserId={targetUserId}
                  currentUserId={user?.uid}
                />
              ) : (
                <p className="text-center py-8" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>
                  No rounds played in this game
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function GameRoundViewer({ game, currentRoundIndex, setCurrentRoundIndex, showChoices, setShowChoices, showResult, setShowResult, CHOICES, targetUserId, currentUserId }) {
  const [shaking, setShaking] = useState(false)
  const [shakeCount, setShakeCount] = useState(0)
  const [player1Username, setPlayer1Username] = useState(game.player1_username || 'Player 1')
  const [player2Username, setPlayer2Username] = useState(game.player2_username || 'Player 2')
  const rounds = game.turn_results || []
  const currentRound = rounds[currentRoundIndex]

  // Fetch usernames if not already set
  useEffect(() => {
    const fetchUsernames = async () => {
      if (!game.player1_username && game.player1_id) {
        try {
          const p1Ref = ref(db, `profiles/${game.player1_id}`)
          const p1Snapshot = await get(p1Ref)
          if (p1Snapshot.exists()) {
            setPlayer1Username(p1Snapshot.val().username || 'Player 1')
          }
        } catch (error) {
          console.error('Error fetching player1 username:', error)
        }
      }

      if (!game.player2_username && game.player2_id) {
        try {
          const p2Ref = ref(db, `profiles/${game.player2_id}`)
          const p2Snapshot = await get(p2Ref)
          if (p2Snapshot.exists()) {
            setPlayer2Username(p2Snapshot.val().username || 'Player 2')
          }
        } catch (error) {
          console.error('Error fetching player2 username:', error)
        }
      }
    }

    fetchUsernames()
  }, [game.player1_id, game.player2_id, game.player1_username, game.player2_username])

  useEffect(() => {
    if (!currentRound) return

    // Reset states for new round
    setShowChoices(false)
    setShowResult(false)
    setShaking(false)
    setShakeCount(0)

    // Start shaking animation
    const shakeInterval = setInterval(() => {
      setShaking(true)
      setTimeout(() => {
        setShaking(false)
        setShakeCount((prev) => {
          const newCount = prev + 1
          if (newCount >= 3) {
            clearInterval(shakeInterval)
            // After 3 shakes, show choices
            setTimeout(() => {
              setShowChoices(true)
              // After showing choices, show result
              setTimeout(() => {
                setShowResult(true)
                // Auto-advance to next round after 2 seconds
                setTimeout(() => {
                  if (currentRoundIndex < rounds.length - 1) {
                    setCurrentRoundIndex(currentRoundIndex + 1)
                  }
                }, 2000)
              }, 1500)
            }, 500)
          }
          return newCount
        })
      }, 200)
    }, 600)

    return () => clearInterval(shakeInterval)
  }, [currentRoundIndex, currentRound, rounds.length, setCurrentRoundIndex])

  if (!currentRound) {
    return (
      <div className="text-center py-8">
        <p style={{ color: 'rgb(242, 174, 187)' }}>All rounds completed!</p>
      </div>
    )
  }

  const roundResult = typeof currentRound === 'string' ? currentRound : currentRound.result
  const player1Choice = typeof currentRound === 'object' ? currentRound.player1_choice : null
  const player2Choice = typeof currentRound === 'object' ? currentRound.player2_choice : null

  const isCurrentUserPlayer = game.player1_id === currentUserId || game.player2_id === currentUserId
  const isPlayer1 = game.player1_id === targetUserId
  const userWon = (roundResult === 'player1' && isPlayer1) || (roundResult === 'player2' && !isPlayer1)
  const isDraw = roundResult === 'draw'
  
  // Determine winner for display
  let winnerDisplay = null
  if (!isDraw) {
    if (roundResult === 'player1') {
      winnerDisplay = player1Username
    } else if (roundResult === 'player2') {
      winnerDisplay = player2Username
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wider mb-4" style={{ color: 'rgb(242, 174, 187)' }}>
          Round {currentRoundIndex + 1} of {rounds.length}
        </h3>
        <div className="flex justify-center items-center space-x-3 sm:space-x-4">
          {rounds.map((round, idx) => {
            const roundResult = typeof round === 'string' ? round : round.result
            const isPlayer1 = game.player1_id === targetUserId
            let userResult = null
            if (roundResult === 'player1' && isPlayer1) {
              userResult = 'win'
            } else if (roundResult === 'player1' && !isPlayer1) {
              userResult = 'loss'
            } else if (roundResult === 'player2' && !isPlayer1) {
              userResult = 'win'
            } else if (roundResult === 'player2' && isPlayer1) {
              userResult = 'loss'
            } else if (roundResult === 'draw') {
              userResult = 'draw'
            }

            return (
              <motion.button
                key={idx}
                onClick={() => {
                  setCurrentRoundIndex(idx)
                  setShowChoices(false)
                  setShowResult(false)
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 transition-all ${
                  idx === currentRoundIndex ? 'ring-4 ring-offset-2' : ''
                }`}
                style={{
                  backgroundColor: userResult === 'win'
                    ? 'rgba(57, 255, 20, 0.2)'
                    : userResult === 'loss'
                    ? 'rgba(191, 26, 26, 0.2)'
                    : userResult === 'draw'
                    ? 'rgba(255, 215, 0, 0.2)'
                    : 'rgba(242, 174, 187, 0.1)',
                  borderColor: idx === currentRoundIndex
                    ? '#FF00FF'
                    : userResult === 'win'
                    ? '#39FF14'
                    : userResult === 'loss'
                    ? '#BF1A1A'
                    : userResult === 'draw'
                    ? '#FFD700'
                    : 'rgba(242, 174, 187, 0.3)',
                  ringColor: '#FF00FF',
                  ringOffsetColor: '#1a1a2e'
                }}
              >
                {userResult === 'win' ? (
                  <FaThumbsUp style={{ color: '#39FF14' }} className="text-lg sm:text-xl" />
                ) : userResult === 'loss' ? (
                  <FaThumbsDown style={{ color: '#BF1A1A' }} className="text-lg sm:text-xl" />
                ) : userResult === 'draw' ? (
                  <FaHandshake style={{ color: '#FFD700' }} className="text-lg sm:text-xl" />
                ) : (
                  <span style={{ color: 'rgba(242, 174, 187, 0.7)' }} className="text-sm sm:text-base font-bold">
                    {idx + 1}
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      <div className="flex justify-around items-center">
        {/* Player 1 Choice */}
        <motion.div
          animate={shaking ? {
            x: [0, -10, 10, -10, 10, 0],
            rotate: [0, -5, 5, -5, 5, 0]
          } : {}}
          transition={{ duration: 0.2 }}
          className="text-center flex flex-col items-center"
        >
          <div className="mb-2 text-sm" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>
            {player1Username}
          </div>
          {showChoices && player1Choice ? (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              {React.createElement(CHOICES[player1Choice].icon, {
                className: 'text-5xl sm:text-6xl md:text-7xl',
                style: { color: CHOICES[player1Choice].hexColor }
              })}
              <div className="text-sm mt-2 font-semibold" style={{ color: CHOICES[player1Choice].hexColor }}>
                {CHOICES[player1Choice].name}
              </div>
            </motion.div>
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center border-2" style={{
              borderColor: 'rgba(242, 174, 187, 0.3)',
              backgroundColor: 'rgba(242, 174, 187, 0.1)'
            }}>
              <FaHandRock className="text-3xl" style={{ color: 'rgba(242, 174, 187, 0.3)' }} />
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-2xl sm:text-3xl font-bold" style={{ color: '#00F5FF' }}
        >
          VS
        </motion.div>

        {/* Player 2 Choice */}
        <motion.div
          animate={shaking ? {
            x: [0, 10, -10, 10, -10, 0],
            rotate: [0, 5, -5, 5, -5, 0]
          } : {}}
          transition={{ duration: 0.2 }}
          className="text-center flex flex-col items-center"
        >
          <div className="mb-2 text-sm" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>
            {player2Username}
          </div>
          {showChoices && player2Choice ? (
            <motion.div
              initial={{ scale: 0, rotate: 180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              {React.createElement(CHOICES[player2Choice].icon, {
                className: 'text-5xl sm:text-6xl md:text-7xl',
                style: { color: CHOICES[player2Choice].hexColor }
              })}
              <div className="text-sm mt-2 font-semibold" style={{ color: CHOICES[player2Choice].hexColor }}>
                {CHOICES[player2Choice].name}
              </div>
            </motion.div>
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center border-2" style={{
              borderColor: 'rgba(242, 174, 187, 0.3)',
              backgroundColor: 'rgba(242, 174, 187, 0.1)'
            }}>
              <FaHandRock className="text-3xl" style={{ color: 'rgba(242, 174, 187, 0.3)' }} />
            </div>
          )}
        </motion.div>
      </div>

      {showResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center p-4 rounded-lg ${
            userWon ? 'bg-green-500/20' : isDraw ? 'bg-yellow-500/20' : 'bg-red-500/20'
          }`}
          style={{
            border: `2px solid ${userWon ? '#39FF14' : isDraw ? '#FFD700' : '#BF1A1A'}`,
            color: userWon ? '#39FF14' : isDraw ? '#FFD700' : '#BF1A1A'
          }}
        >
          {isDraw ? (
            <div className="flex items-center justify-center space-x-2">
              <FaHandshake />
              <span className="font-black uppercase">It's a Draw!</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <FaTrophy />
              <span className="font-black uppercase">{winnerDisplay || 'Unknown'} Wins This Round!</span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
