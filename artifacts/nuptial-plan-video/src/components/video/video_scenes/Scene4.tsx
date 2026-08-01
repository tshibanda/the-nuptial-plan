import { motion } from 'framer-motion';

export function Scene4() {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      // The background color transition to cream is handled in VideoTemplate for smooth cross-scene fade
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)' }} // Exit to loop back to Scene0
      transition={{ duration: 1 }}
    >
      
      {/* Monogram moving to corner */}
      <motion.div
        className="absolute text-gold-400 font-display opacity-30"
        initial={{ top: '50%', left: '50%', x: '-50%', y: '-50%', scale: 3, opacity: 0 }}
        animate={{ top: '40px', left: '40px', x: '0%', y: '0%', scale: 1, opacity: 1 }}
        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
        style={{ fontSize: '4rem', lineHeight: 1 }}
      >
        N
      </motion.div>

      {/* Finale Text */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="overflow-hidden mb-2">
          <motion.h2 
            className="text-plum-900 font-display text-7xl font-medium tracking-wide"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            Orchestrez le mariage parfait
          </motion.h2>
        </div>
        
        <div className="overflow-hidden mt-4">
          <motion.h3
            className="text-gold-400 font-display italic text-6xl"
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{ duration: 1.2, delay: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            avec excellence.
          </motion.h3>
        </div>

        {/* Small line */}
        <motion.div 
          className="w-px h-16 bg-plum-900/30 mt-12"
          initial={{ scaleY: 0, originY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 1, delay: 1.5, ease: 'easeOut' }}
        />
        
        <motion.p
          className="mt-6 text-plum-900/60 font-sans tracking-[0.3em] text-sm uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2 }}
        >
          The Nuptial Plan
        </motion.p>
      </div>

    </motion.div>
  );
}
