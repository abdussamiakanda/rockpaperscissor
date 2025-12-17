import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ref, get, onValue, off, update, push, remove } from 'firebase/database'
import { db } from '../lib/firebase'
import { motion, AnimatePresence } from 'framer-motion'
import { FaTrophy, FaChartLine, FaUser, FaHandRock, FaHandPaper, FaHandScissors, FaTimes, FaHandshake, FaThumbsUp, FaThumbsDown, FaEdit, FaFire, FaStar, FaCrown, FaRobot, FaGhost, FaUserAstronaut, FaPlay, FaSpinner } from 'react-icons/fa'
import LoadingSpinner from '../components/LoadingSpinner'
import Avatar, { AVATAR_OPTIONS } from '../components/Avatar'

export default function Profile() {
  const { username: urlUsername } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [targetProfile, setTargetProfile] = useState(null)
  const [targetUserId, setTargetUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(false)
  const [recentGames, setRecentGames] = useState([])
  const [stats, setStats] = useState({
    wins: 0,
    losses: 0,
    draws: 0,
    total_games: 0,
    win_streak: 0
  })
  const [selectedGame, setSelectedGame] = useState(null)
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
  const [showChoices, setShowChoices] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [winnerUsername, setWinnerUsername] = useState(null)
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [challenging, setChallenging] = useState(false)
  const challengeTimeoutRef = useRef(null)
  const [editingBio, setEditingBio] = useState(false)
  const [bioText, setBioText] = useState('')
  const [savingBio, setSavingBio] = useState(false)
  const [showTimeoutModal, setShowTimeoutModal] = useState(false)
  const [timeoutMessage, setTimeoutMessage] = useState('')

  const CHOICES = {
    rock: { icon: FaHandRock, name: 'Rock', hexColor: '#F4D160' },
    paper: { icon: FaHandPaper, name: 'Paper', hexColor: '#E94560' },
    scissors: { icon: FaHandScissors, name: 'Scissors', hexColor: '#4ECCA3' },
  }



  // Save avatar selection
  const handleAvatarSelect = async (avatarId) => {
    if (!user || !targetUserId || targetUserId !== user.uid) return
    
    setSavingAvatar(true)
    try {
      const profileRef = ref(db, `profiles/${user.uid}`)
      await update(profileRef, { 
        avatar: avatarId,
        updated_at: new Date().toISOString()
      })
      setShowAvatarSelector(false)
    } catch (error) {
      console.error('Error saving avatar:', error)
    } finally {
      setSavingAvatar(false)
    }
  }

  // Save bio
  const handleSaveBio = async () => {
    if (!user || !targetUserId || targetUserId !== user.uid) return
    
    setSavingBio(true)
    try {
      const profileRef = ref(db, `profiles/${user.uid}`)
      await update(profileRef, { 
        bio: bioText.trim(),
        updated_at: new Date().toISOString()
      })
      setEditingBio(false)
    } catch (error) {
      console.error('Error saving bio:', error)
    } finally {
      setSavingBio(false)
    }
  }

  // Challenge user to a game (like dashboard findMatch but for specific player)
  const handleChallenge = async () => {
    if (!user || !targetUserId || targetUserId === user.uid || challenging) return

    // Reset timeout modal state when starting new challenge
    setShowTimeoutModal(false)
    setTimeoutMessage('')
    setChallenging(true)
    try {
      // Check if user already has an active game
      if (profile?.current_game_id) {
        const currentGameRef = ref(db, `games/${profile.current_game_id}`)
        const currentGameSnapshot = await get(currentGameRef)
        if (currentGameSnapshot.exists()) {
          const currentGame = currentGameSnapshot.val()
          if (currentGame.status !== 'completed') {
            // User already has an active game, navigate to it
            navigate('/game')
            setChallenging(false)
            return
          }
        }
      }

      // Check if target user has an active game
      const targetProfileRef = ref(db, `profiles/${targetUserId}`)
      const targetProfileSnapshot = await get(targetProfileRef)
      if (targetProfileSnapshot.exists()) {
        const targetProfile = targetProfileSnapshot.val()
        if (targetProfile.current_game_id) {
          const targetGameRef = ref(db, `games/${targetProfile.current_game_id}`)
          const targetGameSnapshot = await get(targetGameRef)
          if (targetGameSnapshot.exists()) {
            const targetGame = targetGameSnapshot.val()
            if (targetGame.status !== 'completed') {
              alert(`${targetProfile.username} is already in a game!`)
              setChallenging(false)
              return
            }
          }
        }
      }

      // Create a waiting game (like dashboard)
      const newGameRef = push(ref(db, 'games'))
      const newGame = {
        player1_id: user.uid,
        player2_id: null, // Will be set when target player joins
        status: 'waiting',
        current_turn: 1,
        player1_choice: null,
        player2_choice: null,
        turn_results: [],
        winner_id: null,
        challenged_user_id: targetUserId, // Store who we're challenging
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      await update(newGameRef, newGame)
      const gameId = newGameRef.key
      
      // Store game ID in profile
      const userProfileRef = ref(db, `profiles/${user.uid}`)
      await update(userProfileRef, { current_game_id: gameId })

      // Timeout after 30 seconds - cancel the game if opponent doesn't join
      challengeTimeoutRef.current = setTimeout(async () => {
        setChallenging(false)
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
        setTimeoutMessage(`${targetProfile?.username || 'Player'} didn't join in time. Challenge cancelled.`)
        setShowTimeoutModal(true)
      }, 30000)

      // Subscribe to game changes - watch for when target player joins or game is deleted (denied)
      const unsubscribe = onValue(newGameRef, (snapshot) => {
        if (!snapshot.exists()) {
          // Game was deleted (denied or cancelled)
          if (challengeTimeoutRef.current) {
            clearTimeout(challengeTimeoutRef.current)
            challengeTimeoutRef.current = null
          }
          setChallenging(false)
          off(newGameRef, 'value', unsubscribe)
          
          // Check if it was denied (game deleted before timeout)
          const now = Date.now()
          const gameCreated = new Date(newGame.created_at || 0).getTime()
          const timeSinceCreation = now - gameCreated
          
          // If game was deleted within 30 seconds, it was likely denied
          if (timeSinceCreation < 30000) {
            // Fetch target player name for the modal
            const targetProfileRef = ref(db, `profiles/${targetUserId}`)
            get(targetProfileRef).then((snapshot) => {
              if (snapshot.exists()) {
                const profile = snapshot.val()
                setTimeoutMessage(`${profile.username || 'Player'} denied your challenge.`)
                setShowTimeoutModal(true)
              } else {
                setTimeoutMessage('Challenge was denied.')
                setShowTimeoutModal(true)
              }
            }).catch(() => {
              setTimeoutMessage('Challenge was denied.')
              setShowTimeoutModal(true)
            })
          }
          return
        }
        
        const game = snapshot.val()
        if (game.player2_id && game.status === 'in_progress') {
          // Clear the timeout since opponent joined
          if (challengeTimeoutRef.current) {
            clearTimeout(challengeTimeoutRef.current)
            challengeTimeoutRef.current = null
          }
          setChallenging(false)
          off(newGameRef, 'value', unsubscribe)
          navigate('/game')
        }
      })

      // Cleanup on unmount
      return () => {
        if (challengeTimeoutRef.current) {
          clearTimeout(challengeTimeoutRef.current)
          challengeTimeoutRef.current = null
        }
        off(newGameRef, 'value', unsubscribe)
      }
    } catch (error) {
      console.error('Error challenging user:', error)
      if (challengeTimeoutRef.current) {
        clearTimeout(challengeTimeoutRef.current)
        challengeTimeoutRef.current = null
      }
      alert('Failed to challenge user. Please try again.')
      setChallenging(false)
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (challengeTimeoutRef.current) {
        clearTimeout(challengeTimeoutRef.current)
        challengeTimeoutRef.current = null
      }
    }
  }, [])

  // Update bio text when profile changes
  useEffect(() => {
    if (targetProfile?.bio !== undefined) {
      setBioText(targetProfile.bio || '')
    }
  }, [targetProfile])

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

  // Subscribe to online status for target user
  useEffect(() => {
    if (!targetUserId) {
      setIsOnline(false)
      return
    }

    const onlineRef = ref(db, `profiles/${targetUserId}/is_online`)
    const unsubscribe = onValue(onlineRef, (snapshot) => {
      setIsOnline(snapshot.val() === true)
    }, (error) => {
      console.error('Error subscribing to online status:', error)
      setIsOnline(false)
    })

    return () => {
      off(onlineRef, 'value', unsubscribe)
    }
  }, [targetUserId])

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
      setStats({ wins: 0, losses: 0, draws: 0, total_games: 0, win_streak: 0 })
      setRecentGames([])
      return
    }

    const gamesRef = ref(db, 'games')
    const unsubscribe = onValue(gamesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setStats({ wins: 0, losses: 0, draws: 0, total_games: 0, win_streak: 0 })
        fetchRecentGames([], targetUserId)
        return
      }

      const allGames = snapshot.val()
      let wins = 0
      let losses = 0
      let draws = 0
      let totalGames = 0
      let winStreak = 0

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

      // Calculate win streak (consecutive wins from most recent game)
      for (const game of userGames) {
        if (game.winner_id === targetUserId) {
          winStreak++
        } else {
          break // Stop counting when we hit a non-win
        }
      }

      setStats({ wins, losses, draws, total_games: totalGames, win_streak: winStreak })
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
          <div className="text-2xl font-black mb-4 uppercase tracking-wider" style={{ color: '#EAEAEA' }}>
            Profile Not Found
          </div>
          <p className="text-base mb-6" style={{ color: 'rgba(234, 234, 234, 0.7)' }}>
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
        <div className="flex flex-row flex-wrap items-start gap-6 mb-6 sm:mb-8">
          <div className="flex flex-row items-start space-x-6 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <Avatar profile={targetProfile} size="xl" className="w-20 h-20 sm:w-24 sm:h-24" isOnline={isOnline && targetUserId !== user?.uid} />
              {isOwnProfile && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAvatarSelector(true)}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center border-2"
                  style={{
                    backgroundColor: '#1A1A2E',
                    borderColor: '#E94560',
                    color: '#E94560'
                  }}
                  title="Change Avatar"
                >
                  <FaEdit className="text-sm" />
                </motion.button>
              )}
            </div>
            <div className="text-left flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-wider" style={{ color: '#EAEAEA' }}>
                  {targetProfile.username}
                </h1>
                {targetUserId && targetUserId !== user?.uid && (
                  <div className="flex items-center space-x-1">
                    <div 
                      className={`w-2 h-2 rounded-full ${isOnline ? 'animate-pulse' : ''}`}
                      style={{
                        backgroundColor: isOnline ? '#4ECCA3' : '#FF6B6B'
                      }}
                      title={isOnline ? 'Online' : 'Offline'}
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ 
                      color: isOnline ? 'rgba(78, 204, 163, 0.8)' : 'rgba(255, 107, 107, 0.8)' 
                    }}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                )}
              </div>
              {isOwnProfile && user?.email && (
                <p className="text-sm sm:text-base mb-2" style={{ color: 'rgba(234, 234, 234, 0.7)' }}>{user.email}</p>
              )}
              {editingBio ? (
                <div className="mt-2">
                  <textarea
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    placeholder="Write a short bio..."
                    maxLength={150}
                    className="w-full px-3 py-2 rounded-lg border-2 bg-transparent resize-none text-sm sm:text-base"
                    style={{
                      borderColor: '#E94560',
                      color: '#EAEAEA',
                      minHeight: '60px'
                    }}
                    rows={3}
                  />
                  <div className="flex items-center space-x-2 mt-2">
                    <motion.button
                      onClick={handleSaveBio}
                      disabled={savingBio}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider"
                      style={{
                        backgroundColor: 'rgba(78, 204, 163, 0.2)',
                        border: '2px solid #4ECCA3',
                        color: '#4ECCA3',
                        cursor: savingBio ? 'not-allowed' : 'pointer',
                        opacity: savingBio ? 0.7 : 1
                      }}
                    >
                      {savingBio ? 'Saving...' : 'Save'}
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setEditingBio(false)
                        setBioText(targetProfile?.bio || '')
                      }}
                      disabled={savingBio}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider"
                      style={{
                        backgroundColor: 'rgba(255, 107, 107, 0.2)',
                        border: '2px solid #FF6B6B',
                        color: '#FF6B6B',
                        cursor: savingBio ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Cancel
                    </motion.button>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'rgba(242, 174, 187, 0.5)' }}>
                    {bioText.length}/150 characters
                  </p>
                </div>
              ) : (
                <div className="mt-2">
                  {targetProfile.bio ? (
                    <p className="text-sm sm:text-base mb-2" style={{ color: 'rgba(234, 234, 234, 0.8)' }}>
                      {targetProfile.bio}
                    </p>
                  ) : (
                    <p className="text-sm sm:text-base mb-2 italic" style={{ color: 'rgba(242, 174, 187, 0.5)' }}>
                      {isOwnProfile ? 'No bio yet. Click edit to add one.' : 'No bio available.'}
                    </p>
                  )}
                  {isOwnProfile && (
                    <motion.button
                      onClick={() => setEditingBio(true)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: 'rgba(233, 69, 96, 0.15)',
                        border: '1px solid rgba(233, 69, 96, 0.5)',
                        color: '#E94560'
                      }}
                    >
                      <FaEdit className="text-xs" />
                      <span>{targetProfile.bio ? 'Edit Bio' : 'Add Bio'}</span>
                    </motion.button>
                  )}
                </div>
              )}
            </div>
          </div>
          {!isOwnProfile && user && (
            <div className="w-full sm:w-auto flex justify-end">
              <motion.button
                onClick={handleChallenge}
                disabled={challenging}
                whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(78, 204, 163, 0.4)' }}
                whileTap={{ scale: 0.95 }}
                className="flex-shrink-0 inline-flex items-center space-x-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider transition-all"
                style={{
                  backgroundColor: challenging ? 'rgba(78, 204, 163, 0.3)' : 'rgba(78, 204, 163, 0.2)',
                  border: '2px solid #4ECCA3',
                  color: '#4ECCA3',
                  cursor: challenging ? 'not-allowed' : 'pointer',
                  opacity: challenging ? 0.7 : 1,
                  boxShadow: challenging ? 'none' : '0 2px 10px rgba(78, 204, 163, 0.25)'
                }}
              >
                {challenging ? (
                  <>
                    <FaSpinner className="animate-spin text-xs sm:text-sm" />
                    <span>Challenging...</span>
                  </>
                ) : (
                  <>
                    <FaPlay className="text-xs sm:text-sm" />
                    <span>Challenge</span>
                  </>
                )}
              </motion.button>
            </div>
          )}
        </div>

        {stats.win_streak > 3 && (
          <div className="mb-4 sm:mb-6 flex items-center justify-center">
            <div className="rounded-lg p-4 sm:p-5 text-center border-2" style={{
              backgroundColor: 'rgba(255, 69, 0, 0.15)',
              borderColor: '#FF6B6B'
            }}>
              <div className="text-2xl sm:text-3xl font-black mb-1 flex items-center justify-center space-x-2" style={{ color: '#FF6B6B' }}>
                <FaFire className="text-xl sm:text-2xl" />
                <span>{stats.win_streak}</span>
              </div>
              <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(255, 69, 0, 0.9)' }}>Win Streak</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="rounded-lg p-4 sm:p-5 text-center border-2" style={{
            backgroundColor: 'rgba(78, 204, 163, 0.15)',
            borderColor: '#4ECCA3'
          }}>
            <div className="text-2xl sm:text-3xl font-black mb-1" style={{ color: '#4ECCA3' }}>{stats.wins}</div>
            <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(78, 204, 163, 0.9)' }}>Wins</div>
          </div>
          <div className="rounded-lg p-4 sm:p-5 text-center border-2" style={{
            backgroundColor: 'rgba(255, 107, 107, 0.15)',
            borderColor: '#FF6B6B'
          }}>
            <div className="text-2xl sm:text-3xl font-black mb-1" style={{ color: '#FF6B6B' }}>{stats.losses}</div>
            <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(255, 107, 107, 0.9)' }}>Losses</div>
          </div>
          <div className="rounded-lg p-4 sm:p-5 text-center border-2" style={{
            backgroundColor: 'rgba(244, 209, 96, 0.15)',
            borderColor: '#F4D160'
          }}>
            <div className="text-2xl sm:text-3xl font-black mb-1" style={{ color: '#F4D160' }}>{stats.draws}</div>
            <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(244, 209, 96, 0.9)' }}>Draws</div>
          </div>
          <div className="rounded-lg p-4 sm:p-5 text-center border-2" style={{
            backgroundColor: 'rgba(233, 69, 96, 0.15)',
            borderColor: '#E94560'
          }}>
            <div className="text-2xl sm:text-3xl font-black mb-1" style={{ color: '#E94560' }}>{stats.total_games}</div>
            <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(233, 69, 96, 0.9)' }}>Total</div>
          </div>
        </div>

        <div className="mt-6 sm:mt-8">
          <div className="flex justify-between items-center mb-2 sm:mb-3">
            <span className="text-sm sm:text-base font-semibold uppercase tracking-wider" style={{ color: 'rgba(234, 234, 234, 0.9)' }}>Win Rate</span>
            <span className="text-lg sm:text-xl font-black" style={{ color: '#EAEAEA' }}>{winRate}%</span>
          </div>
          <div className="w-full rounded-full h-3 sm:h-4" style={{ backgroundColor: 'rgba(242, 174, 187, 0.2)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${winRate}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-3 sm:h-4 rounded-full"
              style={{ backgroundColor: '#E94560' }}
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
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-4 sm:mb-6 uppercase tracking-wider flex items-center space-x-3" style={{ color: '#EAEAEA' }}>
          <FaChartLine style={{ color: '#E94560' }} className="text-xl sm:text-2xl" />
          <span>Recent Games</span>
        </h2>
        {recentGames.length === 0 ? (
          <p className="text-center py-8 sm:py-12 text-sm sm:text-base" style={{ color: 'rgba(234, 234, 234, 0.7)' }}>No games played yet</p>
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
                      ? 'rgba(78, 204, 163, 0.15)' 
                      : isDraw 
                      ? 'rgba(244, 209, 96, 0.15)' 
                      : 'rgba(255, 107, 107, 0.15)',
                    borderColor: isWinner 
                      ? '#4ECCA3' 
                      : isDraw 
                      ? '#F4D160' 
                      : '#FF6B6B'
                  }}
                >
                  <div className="flex flex-row justify-between items-center">
                    <div className="flex-1">
                      <div className="text-base sm:text-lg font-black uppercase tracking-wider mb-1 flex items-center space-x-2">
                        <span style={{ color: 'rgba(234, 234, 234, 0.6)' }}>vs</span>
                        <span style={{ color: '#EAEAEA' }}>{game.opponentUsername || 'Unknown'}</span>
                      </div>
                      <div className="text-xs sm:text-sm" style={{ color: 'rgba(234, 234, 234, 0.7)' }}>
                        {new Date(game.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {isWinner ? (
                        <span className="text-base sm:text-lg font-black uppercase tracking-wider px-3 py-1 rounded" style={{ 
                          color: '#4ECCA3',
                          backgroundColor: 'rgba(78, 204, 163, 0.2)'
                        }}>Win</span>
                      ) : isDraw ? (
                        <span className="text-base sm:text-lg font-black uppercase tracking-wider px-3 py-1 rounded" style={{ 
                          color: '#F4D160',
                          backgroundColor: 'rgba(244, 209, 96, 0.2)'
                        }}>Draw</span>
                      ) : (
                        <span className="text-base sm:text-lg font-black uppercase tracking-wider px-3 py-1 rounded" style={{ 
                          color: '#FF6B6B',
                          backgroundColor: 'rgba(255, 107, 107, 0.2)'
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
                  <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider mb-2" style={{ color: '#EAEAEA' }}>
                    Game Details
                  </h2>
                  {selectedGame.created_at && (
                    <p className="text-sm sm:text-base mb-2" style={{ color: 'rgba(234, 234, 234, 0.7)' }}>
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
                        backgroundColor: 'rgba(78, 204, 163, 0.2)',
                        border: '2px solid #4ECCA3'
                      }}
                    >
                      <FaTrophy style={{ color: '#4ECCA3' }} />
                      <span className="text-sm sm:text-base font-black uppercase tracking-wider" style={{ color: '#4ECCA3' }}>
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
                        backgroundColor: 'rgba(244, 209, 96, 0.2)',
                        border: '2px solid #F4D160'
                      }}
                    >
                      <FaHandshake style={{ color: '#F4D160' }} />
                      <span className="text-sm sm:text-base font-black uppercase tracking-wider" style={{ color: '#F4D160' }}>
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
                  style={{ color: '#FF6B6B' }}
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
                <p className="text-center py-8" style={{ color: 'rgba(234, 234, 234, 0.7)' }}>
                  No rounds played in this game
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar Selector Modal */}
      <AnimatePresence>
        {showAvatarSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
            onClick={() => !savingAvatar && setShowAvatarSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card max-w-md md:max-w-2xl lg:max-w-3xl w-full"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider" style={{ color: '#EAEAEA' }}>
                  Choose Your Avatar
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => !savingAvatar && setShowAvatarSelector(false)}
                  className="p-2 rounded-full"
                  style={{ color: '#FF6B6B' }}
                  disabled={savingAvatar}
                >
                  <FaTimes className="text-2xl" />
                </motion.button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-6 gap-4 md:gap-6">
                {AVATAR_OPTIONS.map((avatar) => {
                  const isSelected = targetProfile?.avatar === avatar.id
                  const IconComponent = avatar.icon
                  return (
                    <motion.button
                      key={avatar.id}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleAvatarSelect(avatar.id)}
                      disabled={savingAvatar}
                      className={`w-16 h-16 sm:w-20 sm:h-20 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center border-2 transition-all ${
                        isSelected ? 'ring-4 ring-offset-2' : ''
                      }`}
                      style={{
                        backgroundColor: isSelected 
                          ? 'rgba(233, 69, 96, 0.3)' 
                          : 'rgba(233, 69, 96, 0.15)',
                        borderColor: isSelected ? '#E94560' : 'rgba(233, 69, 96, 0.5)',
                        ringColor: '#E94560',
                        ringOffsetColor: '#1A1A2E',
                        opacity: savingAvatar ? 0.5 : 1,
                        cursor: savingAvatar ? 'not-allowed' : 'pointer'
                      }}
                      title={avatar.name}
                    >
                      <IconComponent 
                        style={{ color: avatar.color || '#E94560' }} 
                        className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl"
                        aria-label={avatar.name}
                      />
                    </motion.button>
                  )
                })}
              </div>

              {savingAvatar && (
                <div className="mt-6 text-center">
                  <p className="text-sm" style={{ color: 'rgba(234, 234, 234, 0.7)' }}>
                    Saving...
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeout Modal */}
      <AnimatePresence>
        {showTimeoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
            onClick={() => {
              setShowTimeoutModal(false)
              setTimeoutMessage('')
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card max-w-md w-full"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-black mb-4 uppercase tracking-wider" style={{ color: '#EAEAEA' }}>
                  {timeoutMessage.includes('denied') ? 'Challenge Denied' : 'Challenge Timeout'}
                </h2>
                <p className="text-sm sm:text-base mb-6" style={{ color: 'rgba(234, 234, 234, 0.8)' }}>
                  {timeoutMessage}
                </p>
                <motion.button
                  onClick={() => {
                    setShowTimeoutModal(false)
                    setTimeoutMessage('')
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full flex items-center justify-center space-x-2 py-3 rounded-lg font-bold text-sm sm:text-base uppercase tracking-wider transition-all"
                  style={{
                    backgroundColor: 'rgba(233, 69, 96, 0.2)',
                    border: '2px solid #E94560',
                    color: '#E94560',
                    boxShadow: '0 2px 10px rgba(233, 69, 96, 0.25)'
                  }}
                >
                  <span>OK</span>
                </motion.button>
              </div>
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
        <p style={{ color: '#EAEAEA' }}>All rounds completed!</p>
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
        <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wider mb-4" style={{ color: '#EAEAEA' }}>
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
                    ? 'rgba(78, 204, 163, 0.2)'
                    : userResult === 'loss'
                    ? 'rgba(255, 107, 107, 0.2)'
                    : userResult === 'draw'
                    ? 'rgba(244, 209, 96, 0.2)'
                    : 'rgba(233, 69, 96, 0.1)',
                  borderColor: idx === currentRoundIndex
                    ? '#E94560'
                    : userResult === 'win'
                    ? '#4ECCA3'
                    : userResult === 'loss'
                    ? '#FF6B6B'
                    : userResult === 'draw'
                    ? '#F4D160'
                    : 'rgba(242, 174, 187, 0.3)',
                  ringColor: '#E94560',
                  ringOffsetColor: '#1A1A2E'
                }}
              >
                {userResult === 'win' ? (
                  <FaThumbsUp style={{ color: '#4ECCA3' }} className="text-lg sm:text-xl" />
                ) : userResult === 'loss' ? (
                  <FaThumbsDown style={{ color: '#FF6B6B' }} className="text-lg sm:text-xl" />
                ) : userResult === 'draw' ? (
                  <FaHandshake style={{ color: '#F4D160' }} className="text-lg sm:text-xl" />
                ) : (
                  <span style={{ color: 'rgba(234, 234, 234, 0.7)' }} className="text-sm sm:text-base font-bold">
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
          <div className="mb-2 text-sm" style={{ color: 'rgba(234, 234, 234, 0.7)' }}>
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
              backgroundColor: 'rgba(233, 69, 96, 0.1)'
            }}>
              <FaHandRock className="text-3xl" style={{ color: 'rgba(242, 174, 187, 0.3)' }} />
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-2xl sm:text-3xl font-bold" style={{ color: '#E94560' }}
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
          <div className="mb-2 text-sm" style={{ color: 'rgba(234, 234, 234, 0.7)' }}>
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
              backgroundColor: 'rgba(233, 69, 96, 0.1)'
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
            border: `2px solid ${userWon ? '#4ECCA3' : isDraw ? '#F4D160' : '#FF6B6B'}`,
            color: userWon ? '#4ECCA3' : isDraw ? '#F4D160' : '#FF6B6B'
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
