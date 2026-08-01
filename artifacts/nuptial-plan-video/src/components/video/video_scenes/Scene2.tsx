import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1000); // UI Base appears
    const t2 = setTimeout(() => setPhase(2), 2000); // Data resolves
    const t3 = setTimeout(() => setPhase(3), 3500); // Light sweep
    
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const metrics = [
    { label: "Jours Restants", value: "87", sub: "12 Octobre 2024", delay: 0 },
    { label: "Invités", value: "184/200", sub: "92% Confirmés", delay: 0.2 },
    { label: "Budget", value: "45k €", sub: "Enveloppe globale", delay: 0.4 },
    { label: "Tâches", value: "24/36", sub: "Phase 3 en cours", delay: 0.6 }
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 1 }}
    >
      
      {/* UI Dashboard Mockup */}
      <motion.div
        className="relative w-[70vw] max-w-5xl h-[60vh] bg-cream-100/10 backdrop-blur-2xl rounded-3xl border border-cream-100/20 shadow-2xl overflow-hidden flex flex-col"
        initial={{ y: '100%', rotateX: 20, opacity: 0 }}
        animate={{ y: '0%', rotateX: 0, opacity: 1 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformPerspective: 1200 }}
      >
        {/* Light Sweep Reflection */}
        {phase >= 3 && (
          <motion.div 
            className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-cream-100/20 to-transparent skew-x-[-45deg] z-50 pointer-events-none"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
        )}

        {/* Top Header */}
        <div className="h-20 border-b border-cream-100/10 flex items-center px-8 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gold-400/20 flex items-center justify-center text-gold-400 font-display">
              EC
            </div>
            <div>
              <h3 className="font-display text-xl text-cream-100">Élise & Thomas</h3>
              <p className="text-xs font-sans text-rose-300 opacity-80 uppercase tracking-widest">Mariage Château de Chantilly</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-sage-500" />
            <div className="w-2 h-2 rounded-full bg-cream-100/20" />
            <div className="w-2 h-2 rounded-full bg-cream-100/20" />
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="flex-1 p-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((m, i) => (
            <motion.div
              key={i}
              className="bg-plum-900/40 rounded-2xl p-6 border border-plum-400/20 flex flex-col justify-between relative overflow-hidden"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={phase >= 1 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.9 }}
              transition={{ duration: 0.8, delay: m.delay + 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Subtle background glow per card */}
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-gold-400/5 rounded-full blur-2xl" />
              
              <h4 className="font-sans text-sm text-cream-100/60 uppercase tracking-wider">{m.label}</h4>
              <div className="mt-4">
                <motion.div 
                  className="font-display text-5xl text-gold-400 mb-1"
                  initial={{ filter: 'blur(10px)', opacity: 0 }}
                  animate={phase >= 2 ? { filter: 'blur(0px)', opacity: 1 } : { filter: 'blur(10px)', opacity: 0 }}
                  transition={{ duration: 1, delay: m.delay + 1 }}
                >
                  {phase >= 2 ? m.value : "---"}
                </motion.div>
                <motion.p 
                  className="font-sans text-xs text-rose-300"
                  initial={{ opacity: 0 }}
                  animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 1, delay: m.delay + 1.2 }}
                >
                  {m.sub}
                </motion.p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

    </motion.div>
  );
}
