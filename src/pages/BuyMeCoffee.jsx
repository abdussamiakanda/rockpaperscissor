import { motion } from 'framer-motion'
import { FaCoffee, FaHeart, FaGift } from 'react-icons/fa'

export default function BuyMeCoffee() {
  return (
    <div className="flex items-start justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 pt-8 sm:pt-12 pb-8 sm:pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card max-w-2xl w-full"
        style={{ marginTop: 0 }}
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-block mb-4"
          >
            <FaCoffee className="text-6xl sm:text-7xl" style={{ color: '#F4D160' }} />
          </motion.div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 uppercase tracking-wider" style={{ color: '#EAEAEA' }}>
            Buy Me a Coffee
          </h1>
          
          <p className="text-base sm:text-lg font-semibold leading-relaxed" style={{ color: 'rgba(234, 234, 234, 0.9)' }}>
            Love playing Rock Paper Scissors? Support the development and help keep the game running!
          </p>
        </div>

        <div className="space-y-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-start space-x-4 p-4 rounded-lg"
            style={{ backgroundColor: 'rgba(233, 69, 96, 0.1)' }}
          >
            <FaHeart className="text-2xl mt-1 flex-shrink-0" style={{ color: '#E94560' }} />
            <div>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#EAEAEA' }}>
                Why Support?
              </h3>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgba(234, 234, 234, 0.9)' }}>
                Your support helps maintain servers, improve features, and keep the game free for everyone. Every contribution, no matter how small, makes a difference!
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-start space-x-4 p-4 rounded-lg"
            style={{ backgroundColor: 'rgba(78, 204, 163, 0.1)' }}
          >
            <FaGift className="text-2xl mt-1 flex-shrink-0" style={{ color: '#4ECCA3' }} />
            <div>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#EAEAEA' }}>
                What's Next?
              </h3>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgba(234, 234, 234, 0.9)' }}>
                With your support, we can add new features like tournaments, custom game modes, achievements, and more exciting updates!
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <motion.a
            href="https://ko-fi.com/abdussamiakanda"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center space-x-3 px-8 py-4 rounded-xl font-bold text-lg uppercase tracking-wider transition-all shadow-lg"
            style={{
              backgroundColor: '#F4D160',
              color: '#1A1A2E',
              border: '2px solid #F4D160',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FFE082'
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(244, 209, 96, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F4D160'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
          >
            <FaCoffee className="text-2xl" />
            <span>Support on Ko-fi</span>
          </motion.a>
          
          <p className="mt-4 text-sm" style={{ color: 'rgba(234, 234, 234, 0.6)' }}>
            Or support via{' '}
            <a
              href="https://paypal.me/AbdusSamiAkanda"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold"
              style={{ color: '#EAEAEA' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#E94560'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#EAEAEA'}
            >
              PayPal
            </a>
            {' '}or{' '}
            <a
              href="https://buymeacoffee.com/abdussamiakanda"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold"
              style={{ color: '#EAEAEA' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#E94560'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#EAEAEA'}
            >
              Buy Me a Coffee
            </a>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <p className="text-sm" style={{ color: 'rgba(234, 234, 234, 0.5)' }}>
            Thank you for your support! <span style={{ color: '#E94560' }}>❤️</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
