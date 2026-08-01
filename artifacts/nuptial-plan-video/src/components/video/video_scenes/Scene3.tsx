import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Briefcase, CreditCard } from 'lucide-react';

const FEATURES = [
  { id: 0, text: "Invités & RSVPs", icon: Users, color: "text-rose-300" },
  { id: 1, text: "Prestataires", icon: Briefcase, color: "text-sage-500" },
  { id: 2, text: "Budget & Paiements", icon: CreditCard, color: "text-gold-400" },
];

export function Scene3() {
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    // 6 seconds total, 2 seconds per feature
    const t1 = setTimeout(() => setActiveFeature(1), 2000);
    const t2 = setTimeout(() => setActiveFeature(2), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-plum-900"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Background ripples */}
      <motion.div 
        className="absolute w-[80vw] h-[80vw] rounded-full border border-cream-100/5"
        animate={{ scale: [1, 1.5, 2], opacity: [0.5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div 
        className="absolute w-[60vw] h-[60vw] rounded-full border border-cream-100/10"
        animate={{ scale: [1, 1.5, 2], opacity: [0.5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: 0.5 }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeFeature}
          className="flex flex-col items-center justify-center relative z-10"
          initial={{ scale: 0.8, opacity: 0, filter: 'blur(10px)', y: 20 }}
          animate={{ scale: 1, opacity: 1, filter: 'blur(0px)', y: 0 }}
          exit={{ scale: 1.2, opacity: 0, filter: 'blur(10px)', y: -20 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {React.createElement(FEATURES[activeFeature].icon, {
            className: `w-32 h-32 mb-8 ${FEATURES[activeFeature].color} drop-shadow-[0_0_30px_rgba(200,169,110,0.3)]`,
            strokeWidth: 1
          })}
          <h2 className="text-6xl font-display text-cream-100 text-center tracking-wide">
            {FEATURES[activeFeature].text}
          </h2>
        </motion.div>
      </AnimatePresence>

    </motion.div>
  );
}
