import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FaUser, FaSignOutAlt, FaTrophy, FaBars, FaTimes, FaThLarge } from 'react-icons/fa'
import { GiStoneBlock } from 'react-icons/gi'
import { motion, AnimatePresence } from 'framer-motion'

export default function Layout({ children }) {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentBrandWord, setCurrentBrandWord] = useState(0)
  
  const brandWords = ['Rock', 'Paper', 'Scissors']
  const brandColors = ['#FFD700', '#FF00FF', '#39FF14']
  
  const isActive = (path) => location.pathname === path

  // Animate brand text in mobile navbar
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBrandWord((prev) => (prev + 1) % brandWords.length)
    }, 1500) // Change word every 1.5 seconds

    return () => clearInterval(interval)
  }, [brandWords.length])

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
      <nav className="border-b-2 border-brand-secondary sticky top-0 z-50" style={{ backgroundColor: '#1a1a2e' }}>
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
                  <span className="text-base md:text-lg font-black uppercase tracking-wider leading-tight" style={{ color: '#FFD700' }}>Rock</span>
                  <span className="text-base md:text-lg font-black uppercase tracking-wider leading-tight" style={{ color: '#FF00FF' }}>Paper</span>
                  <span className="text-base md:text-lg font-black uppercase tracking-wider leading-tight" style={{ color: '#39FF14' }}>Scissors</span>
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
                      color: isActive('/dashboard') ? 'rgb(242, 174, 187)' : 'rgba(242, 174, 187, 0.8)',
                      borderBottom: isActive('/dashboard') ? '2px solid #FF00FF' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive('/dashboard')) {
                        e.currentTarget.style.color = 'rgb(242, 174, 187)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive('/dashboard')) {
                        e.currentTarget.style.color = 'rgba(242, 174, 187, 0.8)'
                      }
                    }}
                  >
                    <FaThLarge style={{ color: '#FF00FF' }} className="text-sm" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to={profile?.username ? `/profile/${profile.username}` : '/profile'}
                    className="flex items-center space-x-1.5 text-sm font-semibold transition-colors px-2 py-1"
                    style={{ 
                      color: (isActive('/profile') || (profile?.username && location.pathname === `/profile/${profile.username}`)) ? 'rgb(242, 174, 187)' : 'rgba(242, 174, 187, 0.8)',
                      borderBottom: (isActive('/profile') || (profile?.username && location.pathname === `/profile/${profile.username}`)) ? '2px solid #FF00FF' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive('/profile') && !(profile?.username && location.pathname === `/profile/${profile.username}`)) {
                        e.currentTarget.style.color = 'rgb(242, 174, 187)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive('/profile') && !(profile?.username && location.pathname === `/profile/${profile.username}`)) {
                        e.currentTarget.style.color = 'rgba(242, 174, 187, 0.8)'
                      }
                    }}
                  >
                    <FaUser style={{ color: '#FF00FF' }} className="text-sm" />
                    <span>{profile?.username || 'Profile'}</span>
                  </Link>
                  <Link
                    to="/leaderboard"
                    className="flex items-center space-x-1.5 text-sm font-semibold transition-colors px-2 py-1"
                    style={{ 
                      color: isActive('/leaderboard') ? 'rgb(242, 174, 187)' : 'rgba(242, 174, 187, 0.8)',
                      borderBottom: isActive('/leaderboard') ? '2px solid #FF00FF' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive('/leaderboard')) {
                        e.currentTarget.style.color = 'rgb(242, 174, 187)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive('/leaderboard')) {
                        e.currentTarget.style.color = 'rgba(242, 174, 187, 0.8)'
                      }
                    }}
                  >
                    <FaTrophy style={{ color: '#FF00FF' }} className="text-sm" />
                    <span>Leaderboard</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center space-x-1.5 text-sm font-semibold transition-colors px-2 py-1"
                    style={{ color: 'rgba(242, 174, 187, 0.8)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(242, 174, 187)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(242, 174, 187, 0.8)'}
                  >
                    <FaSignOutAlt style={{ color: '#FFD700' }} className="text-sm" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/auth"
                    className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg font-semibold uppercase tracking-wider text-sm transition-all"
                    style={{
                      backgroundColor: 'rgba(0, 245, 255, 0.15)',
                      color: '#00F5FF',
                      border: '2px solid #00F5FF',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 245, 255, 0.25)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 245, 255, 0.15)'
                    }}
                  >
                    <FaUser style={{ color: '#00F5FF' }} className="text-sm" />
                    <span>Login</span>
                  </Link>
                </motion.div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden p-2 transition-colors"
              style={{ color: 'rgba(242, 174, 187, 0.8)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(242, 174, 187)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(242, 174, 187, 0.8)'}
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
              style={{ backgroundColor: '#1a1a2e' }}
            >
              <div className="flex flex-col h-full border-l-2 border-brand-secondary">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b-2 border-brand-secondary/30">
                  <div className="flex items-center space-x-2">
                    <GiStoneBlock style={{ color: '#FFD700' }} className="text-2xl" />
                    <div className="flex flex-col">
                      <span className="text-sm font-black uppercase tracking-wider leading-tight">
                        <span style={{ color: '#FFD700' }}>Rock</span>{' '}
                        <span style={{ color: '#FF00FF' }}>Paper</span>
                      </span>
                      <span className="text-sm font-black uppercase tracking-wider leading-tight" style={{ color: '#39FF14' }}>Scissors</span>
                    </div>
                  </div>
                  <button
                    onClick={closeMenu}
                    className="p-2 transition-colors"
                    style={{ color: 'rgba(242, 174, 187, 0.8)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'rgb(242, 174, 187)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(242, 174, 187, 0.8)'}
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
                          color: isActive('/dashboard') ? 'rgb(242, 174, 187)' : 'rgba(242, 174, 187, 0.8)',
                          backgroundColor: isActive('/dashboard') ? 'rgba(242, 174, 187, 0.15)' : 'transparent',
                          borderLeft: isActive('/dashboard') ? '3px solid #FF00FF' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive('/dashboard')) {
                            e.currentTarget.style.color = 'rgb(242, 174, 187)'
                            e.currentTarget.style.backgroundColor = 'rgba(242, 174, 187, 0.1)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive('/dashboard')) {
                            e.currentTarget.style.color = 'rgba(242, 174, 187, 0.8)'
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                      >
                        <FaThLarge style={{ color: '#FF00FF' }} />
                        <span className="font-semibold">Dashboard</span>
                      </Link>
                      <Link
                        to={profile?.username ? `/profile/${profile.username}` : '/profile'}
                        onClick={closeMenu}
                        className="flex items-center space-x-3 px-6 py-4 transition-all"
                        style={{ 
                          color: (isActive('/profile') || (profile?.username && location.pathname === `/profile/${profile.username}`)) ? 'rgb(242, 174, 187)' : 'rgba(242, 174, 187, 0.8)',
                          backgroundColor: (isActive('/profile') || (profile?.username && location.pathname === `/profile/${profile.username}`)) ? 'rgba(242, 174, 187, 0.15)' : 'transparent',
                          borderLeft: (isActive('/profile') || (profile?.username && location.pathname === `/profile/${profile.username}`)) ? '3px solid #FF00FF' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive('/profile') && !(profile?.username && location.pathname === `/profile/${profile.username}`)) {
                            e.currentTarget.style.color = 'rgb(242, 174, 187)'
                            e.currentTarget.style.backgroundColor = 'rgba(242, 174, 187, 0.1)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive('/profile') && !(profile?.username && location.pathname === `/profile/${profile.username}`)) {
                            e.currentTarget.style.color = 'rgba(242, 174, 187, 0.8)'
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                      >
                        <FaUser style={{ color: '#FF00FF' }} />
                        <span className="font-semibold">{profile?.username || 'Profile'}</span>
                      </Link>
                      <Link
                        to="/leaderboard"
                        onClick={closeMenu}
                        className="flex items-center space-x-3 px-6 py-4 transition-all"
                        style={{ 
                          color: isActive('/leaderboard') ? 'rgb(242, 174, 187)' : 'rgba(242, 174, 187, 0.8)',
                          backgroundColor: isActive('/leaderboard') ? 'rgba(242, 174, 187, 0.15)' : 'transparent',
                          borderLeft: isActive('/leaderboard') ? '3px solid #FF00FF' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive('/leaderboard')) {
                            e.currentTarget.style.color = 'rgb(242, 174, 187)'
                            e.currentTarget.style.backgroundColor = 'rgba(242, 174, 187, 0.1)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive('/leaderboard')) {
                            e.currentTarget.style.color = 'rgba(242, 174, 187, 0.8)'
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                      >
                        <FaTrophy style={{ color: '#FF00FF' }} />
                        <span className="font-semibold">Leaderboard</span>
                      </Link>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex items-center space-x-3 px-6 py-4 transition-all text-left"
                        style={{ 
                          color: 'rgba(242, 174, 187, 0.8)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'rgb(242, 174, 187)'
                          e.currentTarget.style.backgroundColor = 'rgba(242, 174, 187, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'rgba(242, 174, 187, 0.8)'
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <FaSignOutAlt style={{ color: '#FFD700' }} />
                        <span className="font-semibold">Sign Out</span>
                      </button>
                    </>
                  ) : (
                    <motion.div
                      className="px-6 mt-4 mb-4"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link
                        to="/auth"
                        onClick={closeMenu}
                        className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-lg font-semibold uppercase tracking-wider text-sm transition-all"
                        style={{
                          backgroundColor: 'rgba(0, 245, 255, 0.15)',
                          color: '#00F5FF',
                          border: '2px solid #00F5FF',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 245, 255, 0.25)'
                          e.currentTarget.style.transform = 'scale(1.02)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 245, 255, 0.15)'
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                      >
                        <FaUser style={{ color: '#00F5FF' }} className="text-sm" />
                        <span>Login</span>
                      </Link>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1">{children}</main>
    </div>
  )
}
