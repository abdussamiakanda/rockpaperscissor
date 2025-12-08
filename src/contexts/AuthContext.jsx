import { createContext, useContext, useEffect, useState } from 'react'
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth'
import { 
  ref, 
  get, 
  set, 
  update,
  onValue,
  off,
  onDisconnect,
  serverTimestamp
} from 'firebase/database'
import { auth, db, isFirebaseConfigured } from '../lib/firebase'

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  signUp: async () => ({ user: null, error: new Error('Auth not initialized') }),
  signIn: async () => ({ user: null, error: new Error('Auth not initialized') }),
  signOut: async () => {},
  fetchProfile: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  const fetchProfile = async (userId) => {
    if (!userId) return
    
    try {
      const profileRef = ref(db, `profiles/${userId}`)
      const snapshot = await get(profileRef)
      
      if (snapshot.exists()) {
        const profileData = snapshot.val()
        
        // Update photo URL if it exists in Firebase Auth but not in profile
        const firebasePhotoURL = user?.photoURL
        if (firebasePhotoURL && profileData.photo_url !== firebasePhotoURL) {
          await update(profileRef, { photo_url: firebasePhotoURL })
          profileData.photo_url = firebasePhotoURL
        }
        
        setProfile({ id: userId, ...profileData })
        
        // Check if user has an ongoing game
        if (profileData.current_game_id) {
          const gameRef = ref(db, `games/${profileData.current_game_id}`)
          const gameSnapshot = await get(gameRef)
          
          if (gameSnapshot.exists()) {
            const gameData = gameSnapshot.val()
            // If game is still active, return the game ID so we can redirect
            if (gameData.status !== 'completed' && 
                (gameData.player1_id === userId || gameData.player2_id === userId)) {
              return profileData.current_game_id
            } else {
              // Game is completed, clear it from profile
              await update(profileRef, { current_game_id: null })
            }
          }
        }
      } else {
        // Profile doesn't exist - this shouldn't happen after signup
        // But if it does, don't overwrite with default username
        // Just return null and let the signup process handle it
        console.warn('Profile not found for user:', userId)
        return null
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      // Create a temporary profile
      const tempProfile = {
        id: userId,
        username: user?.email?.split('@')[0] || 'Player',
        wins: 0,
        losses: 0,
        draws: 0,
        total_games: 0,
        current_game_id: null,
      }
      setProfile(tempProfile)
    }
    return null
  }

  const signUp = async (email, password, username) => {
    try {
      // Validate username is not empty
      if (!username || username.trim() === '') {
        return { 
          user: null, 
          error: { 
            message: 'Username is required.' 
          } 
        }
      }

      // Trim and normalize username
      const normalizedUsername = username.trim().toLowerCase()
      
      // Check if username already exists
      const profilesRef = ref(db, 'profiles')
      const profilesSnapshot = await get(profilesRef)
      
      if (profilesSnapshot.exists()) {
        const profiles = profilesSnapshot.val()
        const usernameExists = Object.values(profiles).some(
          profile => profile.username && profile.username.toLowerCase() === normalizedUsername
        )
        
        if (usernameExists) {
          return { 
            user: null, 
            error: { 
              message: 'Username already taken. Please choose a different username.' 
            } 
          }
        }
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      // Create profile in Realtime Database with the normalized username
      const profileRef = ref(db, `profiles/${user.uid}`)
      const profileData = {
        username: normalizedUsername,
        photo_url: user.photoURL || null,
        wins: 0,
        losses: 0,
        draws: 0,
        total_games: 0,
        current_game_id: null,
        is_online: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      await set(profileRef, profileData)
      
      // Set up disconnect handler for online status
      const onlineRef = ref(db, `profiles/${user.uid}/is_online`)
      onDisconnect(onlineRef).set(false)
      
      // Set profile in state immediately
      setProfile({ id: user.uid, ...profileData })
      
      return { user, error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      return { user: null, error }
    }
  }

  const signIn = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      return { user: userCredential.user, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { user: null, error }
    }
  }

  const signOut = async () => {
    try {
      // Set offline status before signing out
      if (user) {
        const profileRef = ref(db, `profiles/${user.uid}`)
        await update(profileRef, { is_online: false })
      }
      await firebaseSignOut(auth)
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false)
      return
    }

    let profileUnsubscribe = null
    let loadingResolved = false

    const resolveLoading = () => {
      if (!loadingResolved) {
        loadingResolved = true
        setLoading(false)
      }
    }

    // Timeout to ensure loading always resolves
    const timeoutId = setTimeout(() => {
      resolveLoading()
    }, 2000)

    let onlineRef = null
    let disconnectHandler = null

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeoutId)
      
      if (firebaseUser) {
        setUser(firebaseUser)
        
        // Wait a bit to ensure profile is created after signup
        await new Promise(resolve => setTimeout(resolve, 100))
        
        await fetchProfile(firebaseUser.uid)
        
        // Update photo URL if it exists in Firebase Auth
        if (firebaseUser.photoURL) {
          const profileRef = ref(db, `profiles/${firebaseUser.uid}`)
          const profileSnapshot = await get(profileRef)
          if (profileSnapshot.exists()) {
            const profileData = profileSnapshot.val()
            if (profileData.photo_url !== firebaseUser.photoURL) {
              await update(profileRef, { photo_url: firebaseUser.photoURL })
            }
          }
        }
        
        // Set online status (only if profile exists)
        const profileCheckRef = ref(db, `profiles/${firebaseUser.uid}`)
        const profileCheckSnapshot = await get(profileCheckRef)
        if (profileCheckSnapshot.exists()) {
          const profileUpdateRef = ref(db, `profiles/${firebaseUser.uid}`)
          await update(profileUpdateRef, { is_online: true })
          
          // Set up disconnect handler to set offline when user disconnects
          onlineRef = ref(db, `profiles/${firebaseUser.uid}/is_online`)
          disconnectHandler = onDisconnect(onlineRef)
          disconnectHandler.set(false)
        }
        
        // Subscribe to profile updates
        const profileRef = ref(db, `profiles/${firebaseUser.uid}`)
        profileUnsubscribe = onValue(profileRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile({ id: firebaseUser.uid, ...snapshot.val() })
          }
        })
      } else {
        // User signed out - set offline if we have a reference
        if (onlineRef && user) {
          try {
            const profileRef = ref(db, `profiles/${user.uid}`)
            await update(profileRef, { is_online: false })
          } catch (error) {
            console.error('Error setting offline status:', error)
          }
        }
        // Cancel disconnect handler if it exists
        if (disconnectHandler) {
          try {
            disconnectHandler.cancel()
          } catch (error) {
            console.error('Error canceling disconnect handler:', error)
          }
        }
        setUser(null)
        setProfile(null)
      }
      resolveLoading()
    })

    return () => {
      clearTimeout(timeoutId)
      unsubscribe()
      if (profileUnsubscribe) {
        profileUnsubscribe()
      }
      // Cancel disconnect handler if it exists
      if (disconnectHandler) {
        try {
          disconnectHandler.cancel()
        } catch (error) {
          console.error('Error canceling disconnect handler:', error)
        }
      }
    }
  }, [])

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    fetchProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
