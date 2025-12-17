import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaTrophy, FaChartLine, FaHandRock, FaHandPaper, FaHandScissors } from 'react-icons/fa'

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative">
      {/* Retro grid background effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(rgba(233, 69, 96, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(233, 69, 96, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }}></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 sm:mb-12 md:mb-16 relative z-10"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="inline-block mb-6"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-3 sm:mb-4 relative" style={{ letterSpacing: '0.1em' }}>
            <span style={{ color: '#F4D160' }}>
              ROCK
            </span>
            <br />
            <span style={{ color: '#E94560' }}>
              PAPER
            </span>
            <br />
            <span style={{ color: '#4ECCA3' }}>
              SCISSORS
            </span>
          </h1>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-6 sm:mb-8 uppercase tracking-wider px-2"
          style={{ color: '#E94560' }}
        >
          Challenge players from around the world in real-time!
        </motion.p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12 md:mb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30, rotateX: -15 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
          className="text-center border-2 transition-all rounded-lg p-4 sm:p-6"
          style={{ backgroundColor: 'rgba(244, 209, 96, 0.15)', borderColor: '#F4D160' }}
        >
          <motion.div
            whileHover={{ scale: 1.2, rotate: 15 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="mb-6"
          >
            <FaHandRock 
              className="text-4xl sm:text-5xl md:text-6xl mx-auto" 
              style={{ color: '#F4D160' }}
            />
          </motion.div>
          <h3 className="text-xl sm:text-2xl font-black mb-2 sm:mb-3 uppercase tracking-wider" style={{ color: '#F4D160' }}>
            Rock
          </h3>
          <p className="text-sm sm:text-base font-semibold" style={{ color: 'rgba(244, 209, 96, 0.9)' }}>Crush your opponent's scissors</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, rotateX: -15 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
          className="text-center border-2 transition-all rounded-lg p-6"
          style={{ backgroundColor: 'rgba(233, 69, 96, 0.15)', borderColor: '#E94560' }}
        >
          <motion.div
            whileHover={{ scale: 1.2, rotate: -15 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="mb-6"
          >
            <FaHandPaper 
              className="text-4xl sm:text-5xl md:text-6xl mx-auto" 
              style={{ color: '#E94560' }}
            />
          </motion.div>
          <h3 className="text-xl sm:text-2xl font-black mb-2 sm:mb-3 uppercase tracking-wider" style={{ color: '#E94560' }}>
            Paper
          </h3>
          <p className="text-sm sm:text-base font-semibold" style={{ color: 'rgba(233, 69, 96, 0.9)' }}>Cover your opponent's rock</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, rotateX: -15 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
          className="text-center border-2 transition-all rounded-lg p-6"
          style={{ backgroundColor: 'rgba(78, 204, 163, 0.15)', borderColor: '#4ECCA3' }}
        >
          <motion.div
            whileHover={{ scale: 1.2, rotate: 15 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="mb-6"
          >
            <FaHandScissors 
              className="text-4xl sm:text-5xl md:text-6xl mx-auto" 
              style={{ color: '#4ECCA3' }}
            />
          </motion.div>
          <h3 className="text-xl sm:text-2xl font-black mb-2 sm:mb-3 uppercase tracking-wider" style={{ color: '#4ECCA3' }}>
            Scissors
          </h3>
          <p className="text-sm sm:text-base font-semibold" style={{ color: 'rgba(78, 204, 163, 0.9)' }}>Cut through your opponent's paper</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
          className="card border-l-4"
          style={{
            borderLeftWidth: '8px',
            borderLeftColor: '#E94560',
            borderColor: '#0F3460',
            backgroundColor: 'rgba(233, 69, 96, 0.1)'
          }}
        >
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-4 sm:mb-6 flex flex-col sm:flex-row items-center sm:items-start space-y-2 sm:space-y-0 sm:space-x-4 uppercase tracking-wider" style={{ color: '#EAEAEA' }}>
            <motion.div
              whileHover={{ rotate: 360, scale: 1.2 }}
              transition={{ duration: 0.6 }}
            >
              <FaTrophy className="text-3xl sm:text-4xl" style={{ color: '#F4D160' }} />
            </motion.div>
            <span>Best of 3</span>
          </h2>
          <p className="leading-relaxed text-sm sm:text-base md:text-lg font-semibold" style={{ color: 'rgba(234, 234, 234, 0.9)' }}>
            Each game consists of 3 rounds. First player to win 2 rounds wins the match!
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, type: "spring", stiffness: 100 }}
          className="card border-l-4"
          style={{
            borderLeftWidth: '8px',
            borderLeftColor: '#4ECCA3',
            borderColor: '#0F3460',
            backgroundColor: 'rgba(78, 204, 163, 0.1)'
          }}
        >
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-4 sm:mb-6 flex flex-col sm:flex-row items-center sm:items-start space-y-2 sm:space-y-0 sm:space-x-4 uppercase tracking-wider" style={{ color: '#EAEAEA' }}>
            <motion.div
              whileHover={{ scale: 1.2, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <FaChartLine className="text-3xl sm:text-4xl" style={{ color: '#4ECCA3' }} />
            </motion.div>
            <span>Track Your Stats</span>
          </h2>
          <p className="leading-relaxed text-sm sm:text-base md:text-lg font-semibold" style={{ color: 'rgba(234, 234, 234, 0.9)' }}>
            View your wins, losses, and win rate. Climb the leaderboard and become the champion!
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 100 }}
        className="text-center relative z-10"
      >
        <Link to="/auth">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary text-base sm:text-lg md:text-xl px-6 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 inline-block w-full sm:w-auto"
          >
            Get Started - Play Now!
          </motion.button>
        </Link>
      </motion.div>
    </div>
  )
}
