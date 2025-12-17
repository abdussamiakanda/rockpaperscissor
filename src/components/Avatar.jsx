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

// Avatar options with new color palette
export const AVATAR_OPTIONS = [
  { id: 'rock', icon: FaHandRock, name: 'Rock', color: '#F4D160' },
  { id: 'paper', icon: FaHandPaper, name: 'Paper', color: '#E94560' },
  { id: 'scissors', icon: FaHandScissors, name: 'Scissors', color: '#4ECCA3' },
  { id: 'trophy', icon: FaTrophy, name: 'Trophy', color: '#F4D160' },
  { id: 'fire', icon: FaFire, name: 'Fire', color: '#FF6B6B' },
  { id: 'star', icon: FaStar, name: 'Star', color: '#F4D160' },
  { id: 'crown', icon: FaCrown, name: 'Crown', color: '#F4D160' },
  { id: 'robot', icon: FaRobot, name: 'Robot', color: '#4ECCA3' },
  { id: 'alien', icon: FaUserAstronaut, name: 'Alien', color: '#4ECCA3' },
  { id: 'ghost', icon: FaGhost, name: 'Ghost', color: '#E94560' },
  { id: 'ninja', icon: GiNinjaHead, name: 'Ninja', color: '#E94560' },
  { id: 'wizard', icon: GiWizardStaff, name: 'Wizard', color: '#9D5CFF' },
]

export default function Avatar({ profile, size = 'md', className = '', isOnline = false }) {
  const renderAvatar = () => {
    if (!profile) {
      return (
        <div className={`rounded-full flex items-center justify-center border-2 overflow-hidden ${className}`} style={{ 
          backgroundColor: 'rgba(233, 69, 96, 0.15)',
          borderColor: '#E94560'
        }}>
          <FaUser style={{ color: '#E94560' }} className={getSizeClass(size)} />
        </div>
      )
    }

    if (profile.avatar) {
      const avatarOption = AVATAR_OPTIONS.find(opt => opt.id === profile.avatar)
      if (avatarOption) {
        const IconComponent = avatarOption.icon
        return (
          <div className={`rounded-full flex items-center justify-center border-2 overflow-hidden ${className}`} style={{ 
            backgroundColor: 'rgba(233, 69, 96, 0.15)',
            borderColor: '#E94560'
          }}>
            <IconComponent 
              style={{ color: avatarOption.color || '#E94560' }} 
              className={getSizeClass(size)}
              aria-label={avatarOption.name}
            />
          </div>
        )
      }
    }

    if (profile.photo_url) {
      return (
        <div className={`rounded-full flex items-center justify-center border-2 overflow-hidden ${className}`} style={{ 
          backgroundColor: 'rgba(233, 69, 96, 0.15)',
          borderColor: '#E94560'
        }}>
          <img 
            src={profile.photo_url} 
            alt={profile.username || 'User'}
            className="w-full h-full object-cover"
          />
        </div>
      )
    }

    return (
      <div className={`rounded-full flex items-center justify-center border-2 overflow-hidden ${className}`} style={{ 
        backgroundColor: 'rgba(233, 69, 96, 0.15)',
        borderColor: '#E94560'
      }}>
        <FaUser style={{ color: '#E94560' }} className={getSizeClass(size)} />
      </div>
    )
  }

  const avatarElement = renderAvatar()
  
  if (isOnline) {
    return (
      <div className="relative inline-block">
        {avatarElement}
        <div 
          className="absolute rounded-full border-2 animate-pulse"
          style={{
            width: size === 'xs' ? '8px' : size === 'sm' ? '10px' : size === 'lg' ? '14px' : size === 'xl' ? '16px' : '12px',
            height: size === 'xs' ? '8px' : size === 'sm' ? '10px' : size === 'lg' ? '14px' : size === 'xl' ? '16px' : '12px',
            backgroundColor: '#4ECCA3',
            borderColor: '#1A1A2E',
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
