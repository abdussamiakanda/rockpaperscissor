import { motion } from 'framer-motion'
import { FaHandRock, FaHandPaper, FaHandScissors } from 'react-icons/fa'

export default function LoadingSpinner({ message = 'Loading...' }) {
  const choices = [
    { icon: FaHandRock, color: 'rgba(255, 215, 0, 0.8)' },
    { icon: FaHandPaper, color: 'rgba(255, 0, 255, 0.8)' },
    { icon: FaHandScissors, color: 'rgba(57, 255, 20, 0.8)' },
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
        style={{ color: 'rgb(242, 174, 187)' }}
      >
        {message}
      </motion.p>
    </div>
  )
}

