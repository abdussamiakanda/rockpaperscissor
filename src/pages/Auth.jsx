import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'framer-motion'
import { FaEnvelope, FaLock, FaUser } from 'react-icons/fa'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Auth() {
  const [activeTab, setActiveTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, loading: authLoading, signIn, signUp } = useAuth()
  const navigate = useNavigate()

  // Redirect to dashboard if user is already logged in
  if (authLoading) {
    return <LoadingSpinner message="Loading..." />
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) throw error
      navigate('/dashboard')
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate username: only a-z and 0-9
    const usernameRegex = /^[a-z0-9]+$/
    if (!usernameRegex.test(username)) {
      setError('Username can only contain lowercase letters (a-z) and numbers (0-9)')
      setLoading(false)
      return
    }

    if (username.length > 15) {
      setError('Username must be 15 characters or less')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const { error } = await signUp(email, password, username)
      if (error) throw error
      navigate('/dashboard')
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-start justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 pt-8 sm:pt-12 pb-8 sm:pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card max-w-md w-full"
        style={{ marginTop: 0 }}
      >
        {/* Tabs */}
        <div className="flex mb-6 border-b-2 border-brand-secondary/30">
          <button
            onClick={() => {
              setActiveTab('login')
              setError('')
            }}
            className={`flex-1 py-3 sm:py-4 text-center font-bold text-sm sm:text-base transition-all ${
              activeTab === 'login'
                ? 'border-b-2 border-brand-accent'
                : ''
            }`}
            style={{ 
              color: activeTab === 'login' 
                ? 'rgb(242, 174, 187)' 
                : 'rgba(242, 174, 187, 0.6)' 
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'login') {
                e.target.style.color = 'rgba(242, 174, 187, 0.8)'
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'login') {
                e.target.style.color = 'rgba(242, 174, 187, 0.6)'
              }
            }}
          >
            Login
          </button>
          <button
            onClick={() => {
              setActiveTab('signup')
              setError('')
            }}
            className={`flex-1 py-3 sm:py-4 text-center font-bold text-sm sm:text-base transition-all ${
              activeTab === 'signup'
                ? 'border-b-2 border-brand-accent'
                : ''
            }`}
            style={{ 
              color: activeTab === 'signup' 
                ? 'rgb(242, 174, 187)' 
                : 'rgba(242, 174, 187, 0.6)' 
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'signup') {
                e.target.style.color = 'rgba(242, 174, 187, 0.8)'
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'signup') {
                e.target.style.color = 'rgba(242, 174, 187, 0.6)'
              }
            }}
          >
            Sign Up
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-center mb-6 sm:mb-8 uppercase tracking-wider" style={{ color: 'rgb(242, 174, 187)' }}>
          {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
        </h1>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 sm:p-4 bg-brand-danger/20 border-2 border-brand-danger rounded-lg text-brand-danger text-sm sm:text-base font-semibold"
          >
            {error}
          </motion.div>
        )}

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block mb-2 text-sm sm:text-base font-semibold" style={{ color: 'rgba(242, 174, 187, 0.9)' }}>Email</label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-brand-accent text-sm sm:text-base" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10 sm:pl-12 text-sm sm:text-base"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm sm:text-base font-semibold" style={{ color: 'rgba(242, 174, 187, 0.9)' }}>Password</label>
              <div className="relative">
                <FaLock className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-brand-danger text-sm sm:text-base" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 sm:pl-12 text-sm sm:text-base"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block mb-2 text-sm sm:text-base font-semibold" style={{ color: 'rgba(242, 174, 187, 0.9)' }}>Username</label>
              <div className="relative">
                <FaUser className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-brand-accent text-sm sm:text-base" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')
                    if (value.length <= 15) {
                      setUsername(value)
                    }
                  }}
                  maxLength={15}
                  className="input-field pl-10 sm:pl-12 text-sm sm:text-base"
                  placeholder="Choose a username (a-z, 0-9, max 15)"
                  required
                />
              </div>
              <p className="mt-1 text-xs" style={{ color: 'rgba(242, 174, 187, 0.6)' }}>
                {username.length}/15 characters (lowercase letters and numbers only)
              </p>
            </div>

            <div>
              <label className="block mb-2 text-sm sm:text-base font-semibold" style={{ color: 'rgba(242, 174, 187, 0.9)' }}>Email</label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-brand-accent text-sm sm:text-base" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10 sm:pl-12 text-sm sm:text-base"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm sm:text-base font-semibold" style={{ color: 'rgba(242, 174, 187, 0.9)' }}>Password</label>
              <div className="relative">
                <FaLock className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-brand-danger text-sm sm:text-base" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 sm:pl-12 text-sm sm:text-base"
                  placeholder="At least 6 characters"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}

