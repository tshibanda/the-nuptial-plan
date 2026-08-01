import { motion } from 'framer-motion';
import { getAssetUrl } from '../VideoTemplate';

const CHAOS_TEXTS = [
  { text: "200 invités", x: "15%", y: "20%", delay: 0.2, scale: 1.2 },
  { text: "14 prestataires", x: "60%", y: "15%", delay: 0.4, scale: 1 },
  { text: "Budget: 45 000 €", x: "25%", y: "60%", delay: 0.6, scale: 1.5 },
  { text: "J-87", x: "70%", y: "50%", delay: 0.8, scale: 2 },
  { text: "Plan de table", x: "10%", y: "80%", delay: 1.0, scale: 1.1 },
  { text: "Contrats signés?", x: "55%", y: "85%", delay: 1.2, scale: 1.3 },
  { text: "Allergies", x: "45%", y: "35%", delay: 1.4, scale: 0.9 },
];

export function Scene1() {
  return (
    <motion.div 
      className="absolute inset-0 overflow-hidden bg-plum-900/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 1 }}
    >
      {/* Background Image (Planner Notebook Flatlay) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center opacity-30 mix-blend-luminosity"
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1.05, opacity: 0.3 }}
        exit={{ scale: 1, opacity: 0 }}
        transition={{ duration: 6, ease: 'easeOut' }}
      >
        <img 
          src={getAssetUrl('/images/planner-notebook.png')} 
          alt="Planner" 
          className="w-full h-full object-cover object-center"
        />
      </motion.div>

      {/* Chaotic Typographic Swarm */}
      <div className="absolute inset-0 z-10">
        {CHAOS_TEXTS.map((item, i) => (
          <motion.div
            key={i}
            className="absolute text-cream-100 font-display italic whitespace-nowrap"
            style={{ 
              left: item.x, 
              top: item.y,
              fontSize: `${2 * item.scale}rem`
            }}
            initial={{ opacity: 0, scale: 0.5, filter: 'blur(20px)', zIndex: i }}
            animate={{ 
              opacity: [0, 0.9, 0.4], 
              scale: [0.5, item.scale, item.scale * 1.1],
              filter: ['blur(20px)', 'blur(0px)', 'blur(4px)'],
              x: [0, (i % 2 === 0 ? 30 : -30)],
              y: [0, (i % 3 === 0 ? -20 : 20)]
            }}
            transition={{ 
              duration: 4, 
              delay: item.delay, 
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {item.text}
          </motion.div>
        ))}
      </div>
      
      {/* Central narrative text */}
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <motion.div
          className="bg-plum-950/80 backdrop-blur-md px-12 py-8 rounded-3xl border border-rose-300/20"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.2, delay: 2.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.h2 
            className="text-gold-400 font-display text-5xl text-center"
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1, delay: 3 }}
          >
            Le chaos de la perfection
          </motion.h2>
        </motion.div>
      </div>
    </motion.div>
  );
}
