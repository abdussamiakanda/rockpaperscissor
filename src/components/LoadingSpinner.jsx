import { motion } from 'framer-motion'
import { FaHandRock, FaHandPaper, FaHandScissors } from 'react-icons/fa'

export default function LoadingSpinner({ message = 'Loading...' }) {
  const choices = [
    { icon: FaHandRock, color: '#F4D160' },
    { icon: FaHandPaper, color: '#E94560' },
    { icon: FaHandScissors, color: '#4ECCA3' },
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="flex items-center justify-center space-x-4 sm:space-x-6 mb-6">
        {choices.map((choice, index) => {
          const Icon = choice.icon
          return (
            <motion.div
              key={index}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 360],
                y: [0, -20, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.2,
                ease: "easeInOut"
              }}
              className="flex items-center justify-center"
            >
              <Icon 
                className="text-4xl sm:text-5xl md:text-6xl" 
                style={{ color: choice.color }}
              />
            </motion.div>
          )
        })}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ 
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-wider"
        style={{ color: '#EAEAEA' }}
      >
        {message}
      </motion.p>
    </div>
  )
}
