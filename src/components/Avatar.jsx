import React from 'react'
import { 
  FaUser, 
  FaTrophy, 
  FaFire, 
  FaStar, 
  FaCrown,
  FaRobot,
  FaGhost,
  FaHandRock,
  FaHandPaper,
  FaHandScissors,
  FaUserAstronaut
} from 'react-icons/fa'
import { GiNinjaHead, GiWizardStaff } from 'react-icons/gi'

// Avatar options - must match Profile.jsx
export const AVATAR_OPTIONS = [
  { id: 'rock', icon: FaHandRock, name: 'Rock', color: '#FFD700' },
  { id: 'paper', icon: FaHandPaper, name: 'Paper', color: '#FF00FF' },
  { id: 'scissors', icon: FaHandScissors, name: 'Scissors', color: '#39FF14' },
  { id: 'trophy', icon: FaTrophy, name: 'Trophy', color: '#FFD700' },
  { id: 'fire', icon: FaFire, name: 'Fire', color: '#FF4500' },
  { id: 'star', icon: FaStar, name: 'Star', color: '#FFD700' },
  { id: 'crown', icon: FaCrown, name: 'Crown', color: '#FFD700' },
  { id: 'robot', icon: FaRobot, name: 'Robot', color: '#00F5FF' },
  { id: 'alien', icon: FaUserAstronaut, name: 'Alien', color: '#39FF14' },
  { id: 'ghost', icon: FaGhost, name: 'Ghost', color: '#FF00FF' },
  { id: 'ninja', icon: GiNinjaHead, name: 'Ninja', color: '#FF00FF' },
  { id: 'wizard', icon: GiWizardStaff, name: 'Wizard', color: '#9D00FF' },
]

export default function Avatar({ profile, size = 'md', className = '', isOnline = false }) {
  const renderAvatar = () => {
    if (!profile) {
      return (
        <div className={`rounded-full flex items-center justify-center border-2 overflow-hidden ${className}`} style={{ 
          backgroundColor: 'rgba(255, 0, 255, 0.15)',
          borderColor: '#FF00FF'
        }}>
          <FaUser style={{ color: '#FF00FF' }} className={getSizeClass(size)} />
        </div>
      )
    }

    // Check for selected avatar first
    if (profile.avatar) {
      const avatarOption = AVATAR_OPTIONS.find(opt => opt.id === profile.avatar)
      if (avatarOption) {
        const IconComponent = avatarOption.icon
        return (
          <div className={`rounded-full flex items-center justify-center border-2 overflow-hidden ${className}`} style={{ 
            backgroundColor: 'rgba(255, 0, 255, 0.15)',
            borderColor: '#FF00FF'
          }}>
            <IconComponent 
              style={{ color: avatarOption.color || '#FF00FF' }} 
              className={getSizeClass(size)}
              aria-label={avatarOption.name}
            />
          </div>
        )
      }
    }

    // Fallback to photo_url
    if (profile.photo_url) {
      return (
        <div className={`rounded-full flex items-center justify-center border-2 overflow-hidden ${className}`} style={{ 
          backgroundColor: 'rgba(255, 0, 255, 0.15)',
          borderColor: '#FF00FF'
        }}>
          <img 
            src={profile.photo_url} 
            alt={profile.username || 'User'}
            className="w-full h-full object-cover"
          />
        </div>
      )
    }

    // Default icon
    return (
      <div className={`rounded-full flex items-center justify-center border-2 overflow-hidden ${className}`} style={{ 
        backgroundColor: 'rgba(255, 0, 255, 0.15)',
        borderColor: '#FF00FF'
      }}>
        <FaUser style={{ color: '#FF00FF' }} className={getSizeClass(size)} />
      </div>
    )
  }

  const avatarElement = renderAvatar()
  
  // Add online indicator dot
  if (isOnline) {
    return (
      <div className="relative inline-block">
        {avatarElement}
        <div 
          className="absolute rounded-full border-2 animate-pulse"
          style={{
            width: size === 'xs' ? '8px' : size === 'sm' ? '10px' : size === 'lg' ? '14px' : size === 'xl' ? '16px' : '12px',
            height: size === 'xs' ? '8px' : size === 'sm' ? '10px' : size === 'lg' ? '14px' : size === 'xl' ? '16px' : '12px',
            backgroundColor: '#39FF14',
            borderColor: '#1a1a2e',
            bottom: size === 'xs' ? '2px' : size === 'sm' ? '3px' : size === 'lg' ? '4px' : size === 'xl' ? '5px' : '3px',
            right: size === 'xs' ? '2px' : size === 'sm' ? '3px' : size === 'lg' ? '4px' : size === 'xl' ? '5px' : '3px'
          }}
          title="Online"
        />
      </div>
    )
  }

  return avatarElement
}

function getSizeClass(size) {
  const sizeMap = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-lg sm:text-xl',
    lg: 'text-3xl sm:text-4xl',
    xl: 'text-4xl sm:text-5xl',
  }
  return sizeMap[size] || sizeMap.md
}

