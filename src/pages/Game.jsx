import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ref, get, update, onValue, off, remove } from 'firebase/database'
import { db } from '../lib/firebase'
import { motion } from 'framer-motion'
import { FaHandRock, FaHandPaper, FaHandScissors, FaCheck, FaSpinner, FaTrophy, FaHandshake, FaTimes, FaThumbsUp, FaThumbsDown } from 'react-icons/fa'
import LoadingSpinner from '../components/LoadingSpinner'

const CHOICES = {
  rock: { icon: FaHandRock, name: 'Rock', beats: 'scissors', color: 'text-brand-danger', hexColor: '#FFD700' }, // Gold
  paper: { icon: FaHandPaper, name: 'Paper', beats: 'rock', color: 'text-brand-accent', hexColor: '#FF00FF' }, // Pink
  scissors: { icon: FaHandScissors, name: 'Scissors', beats: 'paper', color: 'text-brand-neon', hexColor: '#39FF14' }, // Neon Green
}

export default function Game() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [game, setGame] = useState(null)
  const [gameId, setGameId] = useState(null)
  const [player1, setPlayer1] = useState(null)
  const [player2, setPlayer2] = useState(null)
  const [selectedChoice, setSelectedChoice] = useState(null)
  const [player1Choice, setPlayer1Choice] = useState(null)
  const [player2Choice, setPlayer2Choice] = useState(null)
  const [turnResults, setTurnResults] = useState([])
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState(null)
  const [resolvingTurn, setResolvingTurn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [gameAbandoned, setGameAbandoned] = useState(false)
  const [userAbandoned, setUserAbandoned] = useState(false) // Track if current user abandoned
  const choiceTimeoutRef = useRef(null)
  const gameAbandonedRef = useRef(false)

  // Find user's current game
  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }

    let unsubscribeGame = null

    findCurrentGame().then((unsub) => {
      unsubscribeGame = unsub
    })

    return () => {
      if (unsubscribeGame) {
        unsubscribeGame()
      }
      // Clear timeout on unmount
      if (choiceTimeoutRef.current) {
        clearTimeout(choiceTimeoutRef.current)
        choiceTimeoutRef.current = null
      }
    }
  }, [user])

  const findCurrentGame = async () => {
    if (!user) return null

    setLoading(true)
    try {
      // Check if user has a current game stored in profile
      if (profile?.current_game_id) {
        const gameRef = ref(db, `games/${profile.current_game_id}`)
        const gameSnapshot = await get(gameRef)
        
        if (gameSnapshot.exists()) {
          const gameData = gameSnapshot.val()
          // Check if game is still active (not completed)
          if (gameData.status !== 'completed' && 
              (gameData.player1_id === user.uid || gameData.player2_id === user.uid)) {
            setGameId(profile.current_game_id)
            const unsubscribe = subscribeToGame(profile.current_game_id)
            setLoading(false)
            return unsubscribe
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
          setGameId(foundGameId)
          // Update profile with current game
          const profileRef = ref(db, `profiles/${user.uid}`)
          await update(profileRef, { current_game_id: foundGameId })
          const unsubscribe = subscribeToGame(foundGameId)
          setLoading(false)
          return unsubscribe
        }
      }

      // No active game found
      setLoading(false)
      navigate('/dashboard')
      return null
    } catch (error) {
      console.error('Error finding current game:', error)
      setLoading(false)
      navigate('/dashboard')
      return null
    }
  }

  const subscribeToGame = (currentGameId) => {
    if (!currentGameId) {
      console.error('Cannot subscribe: gameId is null')
      return () => {}
    }

    const gameRef = ref(db, `games/${currentGameId}`)
    
    // Subscribe to game changes
    const unsubscribe = onValue(gameRef, async (snapshot) => {
      if (!snapshot.exists()) {
        // If game was abandoned, don't navigate away - show abandoned message
        if (gameAbandonedRef.current) {
          // Keep the game state so UI can show abandoned message
          return
        }
        console.error('Game not found')
        navigate('/dashboard')
        return
      }

      const gameData = snapshot.val()
      
      // Check if game was marked as abandoned
      if (gameData.status === 'abandoned') {
        // Determine which player made a choice (the one who didn't abandon)
        const hasP1Choice = !!gameData.player1_choice
        const hasP2Choice = !!gameData.player2_choice
        const playerWhoChose = hasP1Choice ? gameData.player1_id : gameData.player2_id
        const isCurrentUserWhoChose = playerWhoChose === user.uid
        
        if (!gameAbandonedRef.current) {
          gameAbandonedRef.current = true
          setGameAbandoned(true)
          setGameOver(true)
          
          if (isCurrentUserWhoChose) {
            // Player who made a choice - opponent abandoned
            setUserAbandoned(false)
            setWinner('Abandoned')
          } else {
            // Player who didn't make a choice - they abandoned
            setUserAbandoned(true)
            setWinner('You Abandoned')
          }
          
          // Clear current_game_id from current user's profile only
          try {
            if (user) {
              const profileRef = ref(db, `profiles/${user.uid}`)
              await update(profileRef, { current_game_id: null })
            }
          } catch (error) {
            console.error('Error clearing profile:', error)
          }
        }
        
        // Keep the game data so UI can display abandoned message
        setGame(gameData)
        return
      }
      
      setGame(gameData)

      // Fetch player profiles
      if (gameData.player1_id) {
        const p1Ref = ref(db, `profiles/${gameData.player1_id}`)
        const p1Snapshot = await get(p1Ref)
        if (p1Snapshot.exists()) {
          setPlayer1({ username: p1Snapshot.val().username })
        }
      }

      if (gameData.player2_id) {
        const p2Ref = ref(db, `profiles/${gameData.player2_id}`)
        const p2Snapshot = await get(p2Ref)
        if (p2Snapshot.exists()) {
          setPlayer2({ username: p2Snapshot.val().username })
        }
      }

      // Load turn results
      if (gameData.turn_results) {
        // Handle both old format (array of strings) and new format (array of objects)
        const results = gameData.turn_results.map((result) => {
          if (typeof result === 'string') {
            // Old format - convert to new format (we don't have choices for old games)
            return { result }
          }
          return result
        })
        setTurnResults(results)
      }

      // Check if game is over
      if (gameData.status === 'completed') {
        setGameOver(true)
        if (gameData.winner_id === user.uid) {
          setWinner('You')
        } else if (gameData.winner_id) {
          // Fetch winner profile to get their username
          const winnerRef = ref(db, `profiles/${gameData.winner_id}`)
          const winnerSnapshot = await get(winnerRef)
          if (winnerSnapshot.exists()) {
            const winnerData = winnerSnapshot.val()
            setWinner(winnerData.username || 'Opponent')
          } else {
            // Fallback: use already loaded player data if available
            const winnerUsername = gameData.winner_id === gameData.player1_id 
              ? (player1?.username || 'Opponent')
              : (player2?.username || 'Opponent')
            setWinner(winnerUsername)
          }
        } else {
          setWinner('Draw')
        }
        // Clear current game from profile
        const profileRef = ref(db, `profiles/${user.uid}`)
        await update(profileRef, { current_game_id: null })
      }

      // Load choices for current turn
      if (gameData.player1_choice) {
        setPlayer1Choice(gameData.player1_choice)
      }
      if (gameData.player2_choice) {
        setPlayer2Choice(gameData.player2_choice)
      }

      // Handle timeout for when one player makes a choice but the other doesn't
      // Only start timeout if one player has chosen but the other hasn't
      if (gameData.status === 'in_progress' && !resolvingTurn && currentGameId) {
        const hasP1Choice = !!gameData.player1_choice
        const hasP2Choice = !!gameData.player2_choice
        
        // Clear any existing timeout
        if (choiceTimeoutRef.current) {
          clearTimeout(choiceTimeoutRef.current)
          choiceTimeoutRef.current = null
        }
        
        // If one player has chosen but the other hasn't, start 30 second timeout
        if ((hasP1Choice && !hasP2Choice) || (!hasP1Choice && hasP2Choice)) {
          choiceTimeoutRef.current = setTimeout(async () => {
            // Check again if the other player still hasn't chosen
            const gameRef = ref(db, `games/${currentGameId}`)
            const checkSnapshot = await get(gameRef)
            if (checkSnapshot.exists()) {
              const checkGame = checkSnapshot.val()
              const stillHasP1Choice = !!checkGame.player1_choice
              const stillHasP2Choice = !!checkGame.player2_choice
              
              // If still only one player has chosen, abandon the game
              if ((stillHasP1Choice && !stillHasP2Choice) || (!stillHasP1Choice && stillHasP2Choice)) {
                // Determine which player made a choice and which didn't
                const playerWhoChose = stillHasP1Choice ? checkGame.player1_id : checkGame.player2_id
                const isCurrentUserWhoChose = playerWhoChose === user.uid
                
                // Set abandoned state for both players, but with different messages
                gameAbandonedRef.current = true
                setGameOver(true)
                
                if (isCurrentUserWhoChose) {
                  // Player who made a choice - opponent abandoned
                  setGameAbandoned(true)
                  setUserAbandoned(false)
                  setWinner('Abandoned')
                } else {
                  // Player who didn't choose - they abandoned
                  setGameAbandoned(true)
                  setUserAbandoned(true)
                  setWinner('You Abandoned')
                }
                
                // Clear current_game_id from current user's profile only
                try {
                  if (user) {
                    const profileRef = ref(db, `profiles/${user.uid}`)
                    await update(profileRef, { current_game_id: null })
                  }
                } catch (error) {
                  console.error('Error clearing profile:', error)
                }
                
                // Mark game as abandoned in database instead of deleting
                // This allows the UI to show the message
                try {
                  await update(gameRef, {
                    status: 'abandoned',
                    updated_at: new Date().toISOString()
                  })
                } catch (error) {
                  console.error('Error marking game as abandoned:', error)
                }
              }
            }
            choiceTimeoutRef.current = null
          }, 30000) // 30 seconds
        }
      }

      // If both players have made choices and turn hasn't been resolved yet, resolve the turn
      if (
        gameData.player1_choice && 
        gameData.player2_choice && 
        gameData.status === 'in_progress' &&
        !resolvingTurn &&
        currentGameId
      ) {
        // Clear timeout since both players have chosen
        if (choiceTimeoutRef.current) {
          clearTimeout(choiceTimeoutRef.current)
          choiceTimeoutRef.current = null
        }
        // Small delay to ensure both updates are processed
        setTimeout(() => {
          resolveTurn(gameData, currentGameId)
        }, 500)
      }
    })

    return unsubscribe
  }

  const makeChoice = async (choice) => {
    if (!game || !gameId || selectedChoice || game.status !== 'in_progress') {
      return
    }

    const isPlayer1 = game.player1_id === user.uid
    const choiceField = isPlayer1 ? 'player1_choice' : 'player2_choice'

    setSelectedChoice(choice)

    const gameRef = ref(db, `games/${gameId}`)
    try {
      await update(gameRef, {
        [choiceField]: choice,
        updated_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error making choice:', error)
      setSelectedChoice(null)
      return
    }

    // The realtime subscription will handle checking when both players have chosen
    // But we also check immediately in case both choices were made simultaneously
    setTimeout(async () => {
      const gameSnapshot = await get(gameRef)
      if (gameSnapshot.exists()) {
        const updatedGame = gameSnapshot.val()
        if (updatedGame.player1_choice && updatedGame.player2_choice && updatedGame.status === 'in_progress' && gameId) {
          await resolveTurn(updatedGame, gameId)
        }
      }
    }, 1000)
  }

  const resolveTurn = async (gameData, currentGameId) => {
    // Use the passed gameId or fallback to state
    const gameIdToUse = currentGameId || gameId
    
    // Prevent duplicate turn resolutions
    if (resolvingTurn || !gameIdToUse) {
      return
    }

    const p1Choice = gameData.player1_choice
    const p2Choice = gameData.player2_choice

    if (!p1Choice || !p2Choice) {
      console.error('Both choices required to resolve turn')
      return
    }

    setResolvingTurn(true)

    let result
    if (p1Choice === p2Choice) {
      result = 'draw'
    } else if (CHOICES[p1Choice].beats === p2Choice) {
      result = 'player1'
    } else {
      result = 'player2'
    }

    // Use gameData's turn_results instead of state to avoid stale data
    const currentTurnResults = gameData.turn_results || []
    // Convert old format to new format if needed
    const normalizedResults = currentTurnResults.map((r) => {
      if (typeof r === 'string') {
        return { result: r }
      }
      return r
    })
    
    // Store the turn result with choices
    const turnResult = {
      player1_choice: p1Choice,
      player2_choice: p2Choice,
      result: result
    }
    const newTurnResults = [...normalizedResults, turnResult]
    const player1Wins = newTurnResults.filter((r) => (typeof r === 'string' ? r : r.result) === 'player1').length
    const player2Wins = newTurnResults.filter((r) => (typeof r === 'string' ? r : r.result) === 'player2').length

    let newStatus = 'in_progress'
    let winnerId = null
    let nextTurn = gameData.current_turn

    // Check if game is over (best of 3)
    if (newTurnResults.length >= 3) {
      newStatus = 'completed'
      if (player1Wins > player2Wins) {
        winnerId = gameData.player1_id
      } else if (player2Wins > player1Wins) {
        winnerId = gameData.player2_id
      }
      // If draw after 3 turns, it's still a draw
    } else {
      nextTurn = gameData.current_turn + 1
    }

    // Update game
    const gameRef = ref(db, `games/${gameIdToUse}`)
    try {
      await update(gameRef, {
        turn_results: newTurnResults,
        current_turn: nextTurn,
        status: newStatus,
        winner_id: winnerId,
        player1_choice: null,
        player2_choice: null,
        updated_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error resolving turn:', error)
      setResolvingTurn(false)
      return
    }

    // Clear current_game_id from both players' profiles when game is completed
    // Stats are calculated from games, so we don't update wins/losses/draws here
    if (newStatus === 'completed') {
      // Clear current_game_id for player1
      try {
        const p1Ref = ref(db, `profiles/${gameData.player1_id}`)
        const p1Snapshot = await get(p1Ref)
        if (p1Snapshot.exists() && gameData.player1_id === user.uid) {
          // Only update if it's the current user's profile (to avoid permission errors)
          await update(p1Ref, { current_game_id: null })
        }
      } catch (error) {
        console.error('Error clearing player1 current_game_id:', error)
      }

      // Clear current_game_id for player2
      try {
        if (gameData.player2_id) {
          const p2Ref = ref(db, `profiles/${gameData.player2_id}`)
          const p2Snapshot = await get(p2Ref)
          if (p2Snapshot.exists() && gameData.player2_id === user.uid) {
            // Only update if it's the current user's profile (to avoid permission errors)
            await update(p2Ref, { current_game_id: null })
          }
        }
      } catch (error) {
        console.error('Error clearing player2 current_game_id:', error)
      }
    }

    // Clear choices after a short delay to show results
    setTimeout(() => {
      setPlayer1Choice(null)
      setPlayer2Choice(null)
      setSelectedChoice(null)
      setResolvingTurn(false)
    }, 3000)
  }

  const isPlayer1 = game?.player1_id === user.uid
  const isPlayer2 = game?.player2_id === user.uid
  const canPlay = (isPlayer1 && !player1Choice) || (isPlayer2 && !player2Choice)
  const waitingForOpponent = (isPlayer1 && player1Choice && !player2Choice) || (isPlayer2 && player2Choice && !player1Choice)

  if (loading) {
    return <LoadingSpinner message="Loading game..." />
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-xl mb-4" style={{ color: 'rgb(242, 174, 187)' }}>No active game found</div>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">
          Go to Dashboard
        </button>
      </div>
    )
  }

  const cancelWaitingGame = async () => {
    if (!gameId || !user) return

    try {
      // Delete the waiting game
      const gameRef = ref(db, `games/${gameId}`)
      await remove(gameRef)

      // Clear current_game_id from profile
      const profileRef = ref(db, `profiles/${user.uid}`)
      await update(profileRef, { current_game_id: null })

      // Navigate back to dashboard
      navigate('/dashboard')
    } catch (error) {
      console.error('Error canceling game:', error)
    }
  }

  if (game.status === 'waiting') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center max-w-md w-full"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="mb-6"
          >
            <FaSpinner className="animate-spin text-4xl sm:text-5xl mx-auto mb-4" style={{ color: '#FF00FF' }} />
            <h2 className="text-2xl sm:text-3xl font-black mb-2 uppercase tracking-wider" style={{ color: 'rgb(242, 174, 187)' }}>Waiting for opponent...</h2>
            <p className="text-sm sm:text-base" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>
              Looking for someone to play with
            </p>
          </motion.div>
          <motion.button
            onClick={cancelWaitingGame}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full flex items-center justify-center space-x-2 font-black uppercase tracking-wider py-3 sm:py-4 rounded-lg border-2 transition-all"
            style={{
              backgroundColor: 'rgba(191, 26, 26, 0.2)',
              color: '#BF1A1A',
              borderColor: '#BF1A1A',
            }}
          >
            <FaTimes />
            <span>Cancel</span>
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-4 sm:space-y-0">
          <div className="text-center flex-1">
            <div className="text-base sm:text-lg font-black uppercase tracking-wider" style={{ color: 'rgb(242, 174, 187)' }}>{player1?.username || 'Player 1'}</div>
            <div className="text-xs sm:text-sm font-semibold" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>
              {turnResults.filter((r) => (typeof r === 'string' ? r : r.result) === 'player1').length} wins
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-black uppercase tracking-wider" style={{ color: 'rgb(242, 174, 187)' }}>VS</div>
            <div className="text-xs sm:text-sm font-semibold" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>Turn {game.current_turn}/3</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-base sm:text-lg font-black uppercase tracking-wider" style={{ color: 'rgb(242, 174, 187)' }}>{player2?.username || 'Player 2'}</div>
            <div className="text-xs sm:text-sm font-semibold" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>
              {turnResults.filter((r) => (typeof r === 'string' ? r : r.result) === 'player2').length} wins
            </div>
          </div>
        </div>

        <div className="flex justify-center space-x-3 mb-4">
          {[1, 2, 3].map((turnNum) => {
            const turnResult = turnResults[turnNum - 1]
            const result = turnResult ? (typeof turnResult === 'string' ? turnResult : turnResult.result) : null
            const isCurrentTurn = turnNum === game.current_turn && !gameOver
            const isPlayer1 = game?.player1_id === user.uid
            const isPlayer2 = game?.player2_id === user.uid
            
            // Determine if this round was a win, loss, or draw for the current user
            let userResult = null
            if (result === 'player1' && isPlayer1) {
              userResult = 'win'
            } else if (result === 'player1' && isPlayer2) {
              userResult = 'loss'
            } else if (result === 'player2' && isPlayer2) {
              userResult = 'win'
            } else if (result === 'player2' && isPlayer1) {
              userResult = 'loss'
            } else if (result === 'draw') {
              userResult = 'draw'
            }
            
            return (
              <motion.div
                key={turnNum}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: turnNum * 0.1 }}
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                  userResult === 'win'
                    ? 'border-brand-accent'
                    : userResult === 'loss'
                    ? 'border-brand-danger'
                    : userResult === 'draw'
                    ? 'border-brand-secondary'
                    : isCurrentTurn
                    ? 'border-brand-accent'
                    : 'border-brand-secondary/30'
                }`}
                style={{
                  backgroundColor: userResult === 'win'
                    ? 'rgba(255, 0, 255, 0.2)'
                    : userResult === 'loss'
                    ? 'rgba(255, 215, 0, 0.2)'
                    : userResult === 'draw'
                    ? 'rgba(0, 245, 255, 0.2)'
                    : isCurrentTurn
                    ? 'rgba(255, 0, 255, 0.1)'
                    : 'rgba(0, 245, 255, 0.05)'
                }}
              >
                {userResult ? (
                  userResult === 'win' ? (
                    <FaThumbsUp style={{ color: '#FF00FF' }} />
                  ) : userResult === 'loss' ? (
                    <FaThumbsDown style={{ color: '#FFD700' }} />
                  ) : (
                    <FaHandshake style={{ color: '#00F5FF' }} />
                  )
                ) : (
                  <span style={{ color: 'rgba(242, 174, 187, 0.7)' }}>{turnNum}</span>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {gameOver ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="card text-center"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 mb-4 sm:mb-6">
            {winner === 'You' && <FaTrophy style={{ color: '#FFD700' }} className="text-3xl sm:text-4xl md:text-5xl" />}
            {winner === 'Draw' && <FaHandshake style={{ color: '#00F5FF' }} className="text-3xl sm:text-4xl md:text-5xl" />}
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-wider text-center" style={{ color: 'rgb(242, 174, 187)' }}>
              {gameAbandoned 
                ? (userAbandoned ? 'You Abandoned!' : 'Game Abandoned!')
                : winner === 'You' 
                ? 'You Win!' 
                : winner === 'Draw' 
                ? "It's a Draw!" 
                : `${winner} Wins!`}
            </h2>
            {winner === 'You' && <FaTrophy style={{ color: '#FFD700' }} className="text-3xl sm:text-4xl md:text-5xl" />}
          </div>
          {gameAbandoned && (
            <p className="text-base sm:text-lg mb-4 sm:mb-6" style={{ color: 'rgba(242, 174, 187, 0.8)' }}>
              {userAbandoned 
                ? 'You did not make a choice in time.' 
                : 'Your opponent did not make a choice in time.'}
            </p>
          )}
          <div className="space-y-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                // Delete the game only if it was abandoned
                if (gameAbandoned && gameId) {
                  try {
                    const gameRef = ref(db, `games/${gameId}`)
                    const gameSnapshot = await get(gameRef)
                    if (gameSnapshot.exists()) {
                      // Clear current_game_id from current user's profile only
                      if (user) {
                        const profileRef = ref(db, `profiles/${user.uid}`)
                        await update(profileRef, { current_game_id: null })
                      }
                      // Delete the abandoned game
                      await remove(gameRef)
                    }
                  } catch (error) {
                    console.error('Error deleting abandoned game:', error)
                  }
                }
                navigate('/dashboard')
              }}
              className="btn-primary mt-4"
            >
              Back to Dashboard
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(profile?.username ? `/profile/${profile.username}` : '/profile')}
              className="btn-secondary mt-2 block mx-auto"
            >
              View Profile
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <>
          {player1Choice && player2Choice ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card text-center mb-6"
            >
              <h3 className="text-xl sm:text-2xl md:text-3xl font-black mb-4 sm:mb-6 uppercase tracking-wider" style={{ color: 'rgb(242, 174, 187)' }}>Round {game.current_turn} Results</h3>
              <div className="flex justify-around items-center mb-4 sm:mb-6">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="text-center flex flex-col items-center"
                >
                  <div className="mb-2 text-xs sm:text-sm" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>{player1?.username || 'Player 1'}</div>
                  <div className="flex justify-center items-center">
                    {React.createElement(CHOICES[player1Choice].icon, {
                      className: `text-4xl sm:text-5xl md:text-6xl lg:text-7xl ${CHOICES[player1Choice].color}`,
                      style: { color: CHOICES[player1Choice].hexColor }
                    })}
                  </div>
                  <div className={`text-xs sm:text-sm mt-2 font-semibold text-center`} style={{ color: CHOICES[player1Choice].hexColor }}>{CHOICES[player1Choice].name}</div>
                </motion.div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-center" style={{ color: '#00F5FF' }}
                >
                  VS
                </motion.div>
                <motion.div
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                  className="text-center flex flex-col items-center"
                >
                  <div className="mb-2 text-xs sm:text-sm" style={{ color: 'rgba(242, 174, 187, 0.7)' }}>{player2?.username || 'Player 2'}</div>
                  <div className="flex justify-center items-center">
                    {React.createElement(CHOICES[player2Choice].icon, {
                      className: `text-4xl sm:text-5xl md:text-6xl lg:text-7xl ${CHOICES[player2Choice].color}`,
                      style: { color: CHOICES[player2Choice].hexColor }
                    })}
                  </div>
                  <div className={`text-xs sm:text-sm mt-2 font-semibold text-center`} style={{ color: CHOICES[player2Choice].hexColor }}>{CHOICES[player2Choice].name}</div>
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className={`text-base sm:text-lg md:text-xl lg:text-2xl font-bold p-3 sm:p-4 rounded-lg ${
                  turnResults.length > 0 && (typeof turnResults[turnResults.length - 1] === 'string' ? turnResults[turnResults.length - 1] : turnResults[turnResults.length - 1].result) === 'player1'
                    ? 'bg-brand-accent/20'
                    : turnResults.length > 0 && (typeof turnResults[turnResults.length - 1] === 'string' ? turnResults[turnResults.length - 1] : turnResults[turnResults.length - 1].result) === 'player2'
                    ? 'bg-brand-danger/20'
                    : 'bg-brand-secondary/20'
                }`}
                style={{
                  color: turnResults.length > 0 && (typeof turnResults[turnResults.length - 1] === 'string' ? turnResults[turnResults.length - 1] : turnResults[turnResults.length - 1].result) === 'player1'
                    ? '#FF00FF'
                    : turnResults.length > 0 && (typeof turnResults[turnResults.length - 1] === 'string' ? turnResults[turnResults.length - 1] : turnResults[turnResults.length - 1].result) === 'player2'
                    ? '#FFD700'
                    : '#00F5FF'
                }}
              >
                {turnResults.length > 0 &&
                  ((typeof turnResults[turnResults.length - 1] === 'string' ? turnResults[turnResults.length - 1] : turnResults[turnResults.length - 1].result) === 'player1' ? (
                    <div className="flex items-center justify-center space-x-2 flex-wrap">
                      <FaTrophy className="text-lg sm:text-xl md:text-2xl" style={{ color: '#39FF14' }} />
                      <span className="text-center">{player1?.username || 'Player 1'} wins this round!</span>
                    </div>
                  ) : (typeof turnResults[turnResults.length - 1] === 'string' ? turnResults[turnResults.length - 1] : turnResults[turnResults.length - 1].result) === 'player2' ? (
                    <div className="flex items-center justify-center space-x-2 flex-wrap">
                      <FaTrophy className="text-lg sm:text-xl md:text-2xl" style={{ color: '#39FF14' }} />
                      <span className="text-center">{player2?.username || 'Player 2'} wins this round!</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2 flex-wrap">
                      <FaHandshake className="text-lg sm:text-xl md:text-2xl" style={{ color: '#FFD700' }} />
                      <span className="text-center">It's a draw!</span>
                    </div>
                  ))}
              </motion.div>
            </motion.div>
          ) : (
            <div className="card mb-6">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-black mb-4 text-center uppercase tracking-wider" style={{ color: 'rgb(242, 174, 187)' }}>Make Your Choice</h3>
              {waitingForOpponent && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="flex items-center justify-center space-x-2 mb-4 font-semibold"
                  style={{ color: '#FF00FF' }}
                >
                  <FaSpinner className="animate-spin" />
                  <span>Waiting for opponent...</span>
                </motion.div>
              )}
              {selectedChoice && !waitingForOpponent && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center space-x-2 mb-4 font-semibold"
                  style={{ color: '#39FF14' }}
                >
                  <FaCheck />
                  <span>Choice locked in!</span>
                </motion.div>
              )}
              <div className="flex justify-center items-center space-x-1.5 sm:space-x-3 md:space-x-4 lg:space-x-6 w-full">
                {Object.entries(CHOICES).map(([key, choice]) => {
                  const Icon = choice.icon
                  const isSelected = selectedChoice === key
                  return (
                    <motion.button
                      key={key}
                      whileHover={canPlay && !selectedChoice ? { scale: 1.05 } : {}}
                      whileTap={canPlay && !selectedChoice ? { scale: 0.95 } : {}}
                      onClick={() => makeChoice(key)}
                      disabled={!canPlay || selectedChoice}
                      className={`relative w-[30%] sm:w-auto sm:min-w-[120px] md:min-w-[140px] lg:min-w-[160px] p-2.5 sm:p-4 md:p-6 lg:p-8 rounded-xl sm:rounded-2xl transition-all border-2 flex flex-col items-center justify-center ${
                        isSelected
                          ? 'scale-110 shadow-lg cursor-pointer'
                          : canPlay && !selectedChoice
                          ? 'cursor-pointer'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                      style={{
                        backgroundColor: isSelected
                          ? 'rgba(255, 0, 255, 0.2)'
                          : canPlay && !selectedChoice
                          ? 'rgba(10, 10, 15, 0.7)'
                          : 'rgba(10, 10, 15, 0.5)',
                        borderColor: isSelected
                          ? '#FF00FF'
                          : canPlay && !selectedChoice
                          ? 'rgba(255, 0, 255, 0.5)'
                          : 'rgba(255, 0, 255, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        if (canPlay && !selectedChoice && !isSelected) {
                          e.currentTarget.style.borderColor = '#FF00FF'
                          e.currentTarget.style.backgroundColor = 'rgba(10, 10, 15, 0.8)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (canPlay && !selectedChoice && !isSelected) {
                          e.currentTarget.style.borderColor = 'rgba(255, 0, 255, 0.5)'
                          e.currentTarget.style.backgroundColor = 'rgba(10, 10, 15, 0.7)'
                        }
                      }}
                    >
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center"
                          style={{ backgroundColor: '#39FF14' }}
                        >
                          <FaCheck className="text-xs sm:text-sm" style={{ color: '#0A0A0F' }} />
                        </motion.div>
                      )}
                      <motion.div
                        animate={canPlay && !selectedChoice ? {
                          rotate: [0, 5, -5, 0],
                          scale: [1, 1.05, 1]
                        } : {}}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <Icon className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl" style={{ color: isSelected ? choice.hexColor : choice.hexColor }} />
                      </motion.div>
                      <div className="text-xs sm:text-sm md:text-base mt-1.5 sm:mt-3 font-semibold" style={{ color: isSelected ? choice.hexColor : choice.hexColor }}>
                        {choice.name}
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
