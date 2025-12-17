import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FaUser, FaSignOutAlt, FaTrophy, FaBars, FaTimes, FaThLarge, FaCoffee, FaCheck, FaSpinner } from 'react-icons/fa'
import { GiStoneBlock } from 'react-icons/gi'
import { motion, AnimatePresence } from 'framer-motion'
import { ref, get, update, onValue, off, remove } from 'firebase/database'
import { db } from '../lib/firebase'
import Avatar from './Avatar'

export default function Layout({ children }) {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentBrandWord, setCurrentBrandWord] = useState(0)
  const [pendingChallenge, setPendingChallenge] = useState(null)
  const [challengerProfile, setChallengerProfile] = useState(null)
  const [processingChallenge, setProcessingChallenge] = useState(false)
  const [showDeniedModal, setShowDeniedModal] = useState(false)
  const [deniedChallengerName, setDeniedChallengerName] = useState('')
  
  const brandWords = ['Rock', 'Paper', 'Scissors']
  const brandColors = ['#F4D160', '#E94560', '#4ECCA3']
  
  const isActive = (path) => location.pathname === path

  // Animate brand text in mobile navbar
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBrandWord((prev) => (prev + 1) % brandWords.length)
    }, 1500)

    return () => clearInterval(interval)
  }, [brandWords.length])

  // Listen for pending challenges in real-time
  useEffect(() => {
    if (!user) {
      setPendingChallenge(null)
      setChallengerProfile(null)
      return
    }

    const gamesRef = ref(db, 'games')
    const unsubscribe = onValue(gamesRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setPendingChallenge(null)
        setChallengerProfile(null)
        return
      }

      const allGames = snapshot.val()
      
      const challenge = Object.entries(allGames).find(([gameId, gameData]) => {
        return gameData.challenged_user_id === user.uid &&
               gameData.status === 'waiting' &&
               !gameData.player2_id
      })

      if (challenge) {
        const [gameId, gameData] = challenge
        setPendingChallenge({ id: gameId, ...gameData })
        
        setShowDeniedModal(false)
        setDeniedChallengerName('')
        
        if (gameData.player1_id) {
          const challengerRef = ref(db, `profiles/${gameData.player1_id}`)
          const challengerSnapshot = await get(challengerRef)
          if (challengerSnapshot.exists()) {
            setChallengerProfile({ id: gameData.player1_id, ...challengerSnapshot.val() })
          }
        }
      } else {
        setPendingChallenge(null)
        setChallengerProfile(null)
        setShowDeniedModal(false)
        setDeniedChallengerName('')
      }
    }, (error) => {
      console.error('[Layout] Challenge subscription error:', error)
    })

    return () => {
      off(gamesRef, 'value', unsubscribe)
    }
  }, [user])

  const handleAcceptChallenge = async () => {
    if (!pendingChallenge || !user || processingChallenge) return

    setProcessingChallenge(true)
    setShowDeniedModal(false)
    setDeniedChallengerName('')
    
    try {
      const gameRef = ref(db, `games/${pendingChallenge.id}`)
      
      const gameSnapshot = await get(gameRef)
      if (!gameSnapshot.exists() || gameSnapshot.val().player2_id) {
        setPendingChallenge(null)
        setChallengerProfile(null)
        setProcessingChallenge(false)
        return
      }

      await update(gameRef, {
        player2_id: user.uid,
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })

      const profileRef = ref(db, `profiles/${user.uid}`)
      await update(profileRef, { current_game_id: pendingChallenge.id })

      setPendingChallenge(null)
      setChallengerProfile(null)
      setProcessingChallenge(false)

      navigate('/game')
    } catch (error) {
      console.error('Error accepting challenge:', error)
      alert('Failed to accept challenge. Please try again.')
      setProcessingChallenge(false)
    }
  }

  const handleDenyChallenge = async () => {
    if (!pendingChallenge || !user || processingChallenge) return

    setProcessingChallenge(true)
    setShowDeniedModal(false)
    setDeniedChallengerName('')
    
    try {
      const gameRef = ref(db, `games/${pendingChallenge.id}`)
      await remove(gameRef)

      setPendingChallenge(null)
      setChallengerProfile(null)
      setProcessingChallenge(false)
    } catch (error) {
      console.error('Error denying challenge:', error)
      setProcessingChallenge(false)
      setDeniedChallengerName('')
      setShowDeniedModal(true)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setIsMenuOpen(false)
    navigate('/')
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b-2 sticky top-0 z-50" style={{ backgroundColor: '#1A1A2E', borderColor: '#0F3460' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <Link to="/" className="flex items-center space-x-2 sm:space-x-3">
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="text-2xl sm:text-3xl"
              >
                <GiStoneBlock style={{ color: brandColors[currentBrandWord] }} />
              </motion.div>
              <div className="flex flex-col md:flex-row md:items-center md:space-x-1">
                {/* Mobile: Animated cycling text */}
                <div className="flex items-center h-5 sm:h-6 overflow-hidden md:hidden">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={currentBrandWord}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="text-sm sm:text-base font-black uppercase tracking-wider leading-tight whitespace-nowrap"
                      style={{ color: brandColors[currentBrandWord] }}
                    >
                      {brandWords[currentBrandWord]}
                    </motion.span>
                  </AnimatePresence>
                </div>
                {/* Desktop: Static text */}
                <div className="hidden md:flex md:items-center md:space-x-1">
                  <span className="text-base md:text-lg font-black uppercase tracking-wider leading-tight" style={{ color: '#F4D160' }}>Rock</span>
                  <span className="text-base md:text-lg font-black uppercase tracking-wider leading-tight" style={{ color: '#E94560' }}>Paper</span>
                  <span className="text-base md:text-lg font-black uppercase tracking-wider leading-tight" style={{ color: '#4ECCA3' }}>Scissors</span>
                </div>
              </div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-3">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="flex items-center space-x-1.5 text-sm font-semibold transition-colors px-2 py-1"
                    style={{ 
                      color: isActive('/dashboard') ? '#EAEAEA' : 'rgba(234, 234, 234, 0.7)',
                      borderBottom: isActive('/dashboard') ? '2px solid #E94560' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive('/dashboard')) {
                        e.currentTarget.style.color = '#EAEAEA'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive('/dashboard')) {
                        e.currentTarget.style.color = 'rgba(234, 234, 234, 0.7)'
                      }
                    }}
                  >
                    <FaThLarge style={{ color: '#E94560' }} className="text-sm" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to={profile?.username ? `/profile/${profile.username}` : '/profile'}
                    className="flex items-center space-x-1.5 text-sm font-semibold transition-colors px-2 py-1"
                    style={{ 
                      color: (isActive('/profile') || (profile?.username && location.pathname === `/profile/${profile.username}`)) ? '#EAEAEA' : 'rgba(234, 234, 234, 0.7)',
                      borderBottom: (isActive('/profile') || (profile?.username && location.pathname === `/profile/${profile.username}`)) ? '2px solid #E94560' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive('/profile') && !(profile?.username && location.pathname === `/profile/${profile.username}`)) {
                        e.currentTarget.style.color = '#EAEAEA'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive('/profile') && !(profile?.username && location.pathname === `/profile/${profile.username}`)) {
                        e.currentTarget.style.color = 'rgba(234, 234, 234, 0.7)'
                      }
                    }}
                  >
                    <FaUser style={{ color: '#E94560' }} className="text-sm" />
                    <span>{profile?.username || 'Profile'}</span>
                  </Link>
                  <Link
                    to="/leaderboard"
                    className="flex items-center space-x-1.5 text-sm font-semibold transition-colors px-2 py-1"
                    style={{ 
                      color: isActive('/leaderboard') ? '#EAEAEA' : 'rgba(234, 234, 234, 0.7)',
                      borderBottom: isActive('/leaderboard') ? '2px solid #E94560' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive('/leaderboard')) {
                        e.currentTarget.style.color = '#EAEAEA'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive('/leaderboard')) {
                        e.currentTarget.style.color = 'rgba(234, 234, 234, 0.7)'
                      }
                    }}
                  >
                    <FaTrophy style={{ color: '#E94560' }} className="text-sm" />
                    <span>Leaderboard</span>
                  </Link>
                  <Link
                    to="/buy-me-coffee"
                    className="flex items-center space-x-1.5 text-sm font-semibold transition-colors px-2 py-1"
                    style={{ 
                      color: isActive('/buy-me-coffee') ? '#EAEAEA' : 'rgba(234, 234, 234, 0.7)',
                      borderBottom: isActive('/buy-me-coffee') ? '2px solid #E94560' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive('/buy-me-coffee')) {
                        e.currentTarget.style.color = '#EAEAEA'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive('/buy-me-coffee')) {
                        e.currentTarget.style.color = 'rgba(234, 234, 234, 0.7)'
                      }
                    }}
                  >
                    <FaCoffee style={{ color: '#F4D160' }} className="text-sm" />
                    <span>Support</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center space-x-1.5 text-sm font-semibold transition-colors px-2 py-1"
                    style={{ color: 'rgba(234, 234, 234, 0.7)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#EAEAEA'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(234, 234, 234, 0.7)'}
                  >
                    <FaSignOutAlt style={{ color: '#F4D160' }} className="text-sm" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/buy-me-coffee"
                    className="flex items-center space-x-1.5 text-sm font-semibold transition-colors px-2 py-1"
                    style={{ 
                      color: isActive('/buy-me-coffee') ? '#EAEAEA' : 'rgba(234, 234, 234, 0.7)',
                      borderBottom: isActive('/buy-me-coffee') ? '2px solid #E94560' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive('/buy-me-coffee')) {
                        e.currentTarget.style.color = '#EAEAEA'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive('/buy-me-coffee')) {
                        e.currentTarget.style.color = 'rgba(234, 234, 234, 0.7)'
                      }
                    }}
                  >
                    <FaCoffee style={{ color: '#F4D160' }} className="text-sm" />
                    <span>Support</span>
                  </Link>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      to="/auth"
                      className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg font-semibold uppercase tracking-wider text-sm transition-all"
                      style={{
                        backgroundColor: 'rgba(233, 69, 96, 0.15)',
                        color: '#E94560',
                        border: '2px solid #E94560',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(233, 69, 96, 0.25)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(233, 69, 96, 0.15)'
                      }}
                    >
                      <FaUser style={{ color: '#E94560' }} className="text-sm" />
                      <span>Login</span>
                    </Link>
                  </motion.div>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden p-2 transition-colors"
              style={{ color: 'rgba(234, 234, 234, 0.7)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#EAEAEA'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(234, 234, 234, 0.7)'}
              aria-label="Open menu"
            >
              <FaBars className="text-xl" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-64 z-50 md:hidden"
              style={{ backgroundColor: '#1A1A2E' }}
            >
              <div className="flex flex-col h-full border-l-2" style={{ borderColor: '#0F3460' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b-2" style={{ borderColor: 'rgba(15, 52, 96, 0.5)' }}>
                  <div className="flex items-center space-x-2">
                    <GiStoneBlock style={{ color: '#F4D160' }} className="text-2xl" />
                    <div className="flex flex-col">
                      <span className="text-sm font-black uppercase tracking-wider leading-tight">
                        <span style={{ color: '#F4D160' }}>Rock</span>{' '}
                        <span style={{ color: '#E94560' }}>Paper</span>
                      </span>
                      <span className="text-sm font-black uppercase tracking-wider leading-tight" style={{ color: '#4ECCA3' }}>Scissors</span>
                    </div>
                  </div>
                  <button
                    onClick={closeMenu}
                    className="p-2 transition-colors"
                    style={{ color: 'rgba(234, 234, 234, 0.7)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#EAEAEA'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(234, 234, 234, 0.7)'}
                    aria-label="Close menu"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>

                {/* Menu Items */}
                <div className="flex-1 flex flex-col py-4">
                  {user ? (
                    <>
                      <Link
                        to="/dashboard"
                        onClick={closeMenu}
                        className="flex items-center space-x-3 px-6 py-4 transition-all"
                        style={{ 
                          color: isActive('/dashboard') ? '#EAEAEA' : 'rgba(234, 234, 234, 0.7)',
                          backgroundColor: isActive('/dashboard') ? 'rgba(233, 69, 96, 0.15)' : 'transparent',
                          borderLeft: isActive('/dashboard') ? '3px solid #E94560' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive('/dashboard')) {
                            e.currentTarget.style.color = '#EAEAEA'
                            e.currentTarget.style.backgroundColor = 'rgba(233, 69, 96, 0.1)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive('/dashboard')) {
                            e.currentTarget.style.color = 'rgba(234, 234, 234, 0.7)'
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                      >
                        <FaThLarge style={{ color: '#E94560' }} />
                        <span className="font-semibold">Dashboard</span>
                      </Link>
                      <Link
                        to={profile?.username ? `/profile/${profile.username}` : '/profile'}
                        onClick={closeMenu}
                        className="flex items-center space-x-3 px-6 py-4 transition-all"
                        style={{ 
                          color: (isActive('/profile') || (profile?.username && location.pathname === `/profile/${profile.username}`)) ? '#EAEAEA' : 'rgba(234, 234, 234, 0.7)',
                          backgroundColor: (isActive('/profile') || (profile?.username && location.pathname === `/profile/${profile.username}`)) ? 'rgba(233, 69, 96, 0.15)' : 'transparent',
                          borderLeft: (isActive('/profile') || (profile?.username && location.pathname === `/profile/${profile.username}`)) ? '3px solid #E94560' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive('/profile') && !(profile?.username && location.pathname === `/profile/${profile.username}`)) {
                            e.currentTarget.style.color = '#EAEAEA'
                            e.currentTarget.style.backgroundColor = 'rgba(233, 69, 96, 0.1)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive('/profile') && !(profile?.username && location.pathname === `/profile/${profile.username}`)) {
                            e.currentTarget.style.color = 'rgba(234, 234, 234, 0.7)'
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                      >
                        <FaUser style={{ color: '#E94560' }} />
                        <span className="font-semibold">{profile?.username || 'Profile'}</span>
                      </Link>
                      <Link
                        to="/leaderboard"
                        onClick={closeMenu}
                        className="flex items-center space-x-3 px-6 py-4 transition-all"
                        style={{ 
                          color: isActive('/leaderboard') ? '#EAEAEA' : 'rgba(234, 234, 234, 0.7)',
                          backgroundColor: isActive('/leaderboard') ? 'rgba(233, 69, 96, 0.15)' : 'transparent',
                          borderLeft: isActive('/leaderboard') ? '3px solid #E94560' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive('/leaderboard')) {
                            e.currentTarget.style.color = '#EAEAEA'
                            e.currentTarget.style.backgroundColor = 'rgba(233, 69, 96, 0.1)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive('/leaderboard')) {
                            e.currentTarget.style.color = 'rgba(234, 234, 234, 0.7)'
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                      >
                        <FaTrophy style={{ color: '#E94560' }} />
                        <span className="font-semibold">Leaderboard</span>
                      </Link>
                      <Link
                        to="/buy-me-coffee"
                        onClick={closeMenu}
                        className="flex items-center space-x-3 px-6 py-4 transition-all"
                        style={{ 
                          color: isActive('/buy-me-coffee') ? '#EAEAEA' : 'rgba(234, 234, 234, 0.7)',
                          backgroundColor: isActive('/buy-me-coffee') ? 'rgba(233, 69, 96, 0.15)' : 'transparent',
                          borderLeft: isActive('/buy-me-coffee') ? '3px solid #E94560' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive('/buy-me-coffee')) {
                            e.currentTarget.style.color = '#EAEAEA'
                            e.currentTarget.style.backgroundColor = 'rgba(233, 69, 96, 0.1)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive('/buy-me-coffee')) {
                            e.currentTarget.style.color = 'rgba(234, 234, 234, 0.7)'
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                      >
                        <FaCoffee style={{ color: '#F4D160' }} />
                        <span className="font-semibold">Support</span>
                      </Link>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex items-center space-x-3 px-6 py-4 transition-all text-left"
                        style={{ 
                          color: 'rgba(234, 234, 234, 0.7)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#EAEAEA'
                          e.currentTarget.style.backgroundColor = 'rgba(233, 69, 96, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'rgba(234, 234, 234, 0.7)'
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <FaSignOutAlt style={{ color: '#F4D160' }} />
                        <span className="font-semibold">Sign Out</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/buy-me-coffee"
                        onClick={closeMenu}
                        className="flex items-center space-x-3 px-6 py-4 transition-all"
                        style={{ 
                          color: isActive('/buy-me-coffee') ? '#EAEAEA' : 'rgba(234, 234, 234, 0.7)',
                          backgroundColor: isActive('/buy-me-coffee') ? 'rgba(233, 69, 96, 0.15)' : 'transparent',
                          borderLeft: isActive('/buy-me-coffee') ? '3px solid #E94560' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive('/buy-me-coffee')) {
                            e.currentTarget.style.color = '#EAEAEA'
                            e.currentTarget.style.backgroundColor = 'rgba(233, 69, 96, 0.1)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive('/buy-me-coffee')) {
                            e.currentTarget.style.color = 'rgba(234, 234, 234, 0.7)'
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                      >
                        <FaCoffee style={{ color: '#F4D160' }} />
                        <span className="font-semibold">Support</span>
                      </Link>
                      <motion.div
                        className="px-6 mt-4 mb-4"
                        whileTap={{ scale: 0.95 }}
                      >
                        <Link
                          to="/auth"
                          onClick={closeMenu}
                          className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-lg font-semibold uppercase tracking-wider text-sm transition-all"
                          style={{
                            backgroundColor: 'rgba(233, 69, 96, 0.15)',
                            color: '#E94560',
                            border: '2px solid #E94560',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(233, 69, 96, 0.25)'
                            e.currentTarget.style.transform = 'scale(1.02)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(233, 69, 96, 0.15)'
                            e.currentTarget.style.transform = 'scale(1)'
                          }}
                        >
                          <FaUser style={{ color: '#E94560' }} className="text-sm" />
                          <span>Login</span>
                        </Link>
                      </motion.div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1">{children}</main>

      {/* Challenge Notification Modal */}
      <AnimatePresence>
        {pendingChallenge && challengerProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="card max-w-md w-full"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-black mb-4 uppercase tracking-wider" style={{ color: '#EAEAEA' }}>
                  Challenge Received!
                </h2>
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <Avatar profile={challengerProfile} size="lg" className="w-16 h-16 sm:w-20 sm:h-20" />
                  <div>
                    <p className="text-lg sm:text-xl font-bold" style={{ color: '#EAEAEA' }}>
                      {challengerProfile.username}
                    </p>
                    <p className="text-sm" style={{ color: 'rgba(234, 234, 234, 0.7)' }}>
                      wants to play!
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <motion.button
                  onClick={handleDenyChallenge}
                  disabled={processingChallenge}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg font-bold text-sm sm:text-base uppercase tracking-wider transition-all"
                  style={{
                    backgroundColor: 'rgba(255, 107, 107, 0.2)',
                    border: '2px solid #FF6B6B',
                    color: '#FF6B6B',
                    cursor: processingChallenge ? 'not-allowed' : 'pointer',
                    opacity: processingChallenge ? 0.7 : 1
                  }}
                >
                  <FaTimes />
                  <span>Deny</span>
                </motion.button>
                <motion.button
                  onClick={handleAcceptChallenge}
                  disabled={processingChallenge}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg font-bold text-sm sm:text-base uppercase tracking-wider transition-all"
                  style={{
                    backgroundColor: 'rgba(78, 204, 163, 0.2)',
                    border: '2px solid #4ECCA3',
                    color: '#4ECCA3',
                    cursor: processingChallenge ? 'not-allowed' : 'pointer',
                    opacity: processingChallenge ? 0.7 : 1,
                    boxShadow: processingChallenge ? 'none' : '0 2px 10px rgba(78, 204, 163, 0.25)'
                  }}
                >
                  {processingChallenge ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaCheck />
                  )}
                  <span>{processingChallenge ? 'Accepting...' : 'Accept'}</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Challenge Denied Modal */}
      <AnimatePresence>
        {showDeniedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
            onClick={() => {
              setShowDeniedModal(false)
              setDeniedChallengerName('')
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
                  Challenge Denied
                </h2>
                <p className="text-sm sm:text-base mb-6" style={{ color: 'rgba(234, 234, 234, 0.8)' }}>
                  {deniedChallengerName 
                    ? `${deniedChallengerName} denied your challenge.` 
                    : 'Failed to deny challenge. Please try again.'}
                </p>
                <motion.button
                  onClick={() => {
                    setShowDeniedModal(false)
                    setDeniedChallengerName('')
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
