import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene0() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2000); // N forms fully, then expands
    const t2 = setTimeout(() => setPhase(2), 3500); // Tagline appears
    
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ scale: 1.5, opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative flex flex-col items-center justify-center z-10">
        
        {/* Monogram "N" -> Full Logo */}
        <div className="relative h-32 flex items-center justify-center mb-6">
          <motion.div
            className="text-gold-400 font-display font-light absolute flex items-center justify-center"
            initial={{ scale: 0.8, opacity: 0, filter: 'blur(20px)' }}
            animate={
              phase === 0 ? { scale: 1, opacity: 1, filter: 'blur(0px)' } :
              { scale: 1.2, opacity: 0, filter: 'blur(10px)' }
            }
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ fontSize: '10rem', lineHeight: 1 }}
          >
            N
          </motion.div>
          
          <motion.h1
            className="text-gold-400 font-display font-medium text-6xl tracking-[0.2em] uppercase whitespace-nowrap"
            initial={{ opacity: 0, scale: 0.9, letterSpacing: '0.1em', filter: 'blur(10px)' }}
            animate={
              phase >= 1 
                ? { opacity: 1, scale: 1, letterSpacing: '0.2em', filter: 'blur(0px)' } 
                : { opacity: 0, scale: 0.9, letterSpacing: '0.1em', filter: 'blur(10px)' }
            }
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          >
            The Nuptial Plan
          </motion.h1>
        </div>

        {/* Tagline */}
        <motion.div
          className="overflow-hidden"
        >
          <motion.p
            className="text-cream-100 font-sans tracking-[0.3em] text-sm uppercase opacity-70"
            initial={{ y: 20, opacity: 0 }}
            animate={phase >= 2 ? { y: 0, opacity: 0.7 } : { y: 20, opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            Atelier de Planification Nuptiale
          </motion.p>
        </motion.div>
      </div>

      {/* Floating particles/petals specific to scene 0 */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-rose-300/10 mix-blend-screen"
          style={{
            width: 100 + i * 50,
            height: 100 + i * 50,
            left: `${20 + (i * 15)}%`,
            top: `${10 + (i % 3) * 30}%`,
            filter: 'blur(40px)',
          }}
          initial={{ y: 100, x: -50, opacity: 0 }}
          animate={{ 
            y: [-20, -100], 
            x: [0, i % 2 === 0 ? 50 : -50],
            opacity: [0, 0.6, 0]
          }}
          transition={{ 
            duration: 5 + i, 
            ease: 'linear',
            times: [0, 0.5, 1] 
          }}
        />
      ))}
    </motion.div>
  );
}
