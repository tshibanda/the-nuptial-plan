import { motion } from 'framer-motion';
import { Check, ChevronUp, Users, Wallet } from 'lucide-react';
import { asset, FilmOrb, SceneExit, SceneKicker, WordReveal } from './shared';

export function Scene2() {
  const cards = [
    { label: 'Budget suivi', value: '42 680 €', note: 'sur 45 000 €', color: 'text-gold-400', icon: Wallet },
    { label: 'Invités confirmés', value: '186', note: 'sur 200 personnes', color: 'text-rose-300', icon: Users },
  ];

  return (
    <SceneExit className="video-root">
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{ backgroundImage: `url(${asset('images/botanical-texture.png')})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        animate={{ scale: [1, 1.08, 1], rotate: [0, 2, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <FilmOrb className="w-[70vw] h-[70vw] -left-[28vw] bottom-[8vh]" color="gold" />
      <FilmOrb className="w-[48vw] h-[48vw] -right-[18vw] top-[4vh]" color="rose" delay={2} />

      <div className="video-safe">
        <SceneKicker>Concept 02 / Les chiffres qui rassurent</SceneKicker>
        <div className="mt-[4vh]">
          <WordReveal delay={0.12} className="text-[11.5vw] leading-[0.86]">
            Chaque euro.
          </WordReveal>
          <WordReveal delay={0.28} className="text-[11.5vw] leading-[0.86] text-gold-400 italic">
            Chaque invité.
          </WordReveal>
          <motion.p
            className="mt-[3vh] max-w-[72vw] font-sans text-[3.4vw] leading-tight text-cream-100/70"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
          >
            Une information fiable au moment où vous en avez besoin.
          </motion.p>
        </div>

        <motion.div
          className="absolute top-[50vh] left-[2vw] right-[2vw] rounded-[2rem] border border-cream-100/16 bg-plum-950/55 p-[4vw] backdrop-blur-xl"
          initial={{ y: '36vh', opacity: 0, scale: 0.94 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.86, duration: 1, type: 'spring', stiffness: 110, damping: 18 }}
        >
          <div className="flex items-center justify-between mb-[3vh]">
            <span className="font-sans text-[2.2vw] tracking-editorial uppercase text-cream-100/50">Vue d’ensemble / aujourd’hui</span>
            <motion.span
              className="font-mono text-[2.3vw] text-sage-500"
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            >
              ● à jour
            </motion.span>
          </div>
          <div className="grid grid-cols-2 gap-[2vw]">
            {cards.map(({ label, value, note, color, icon: Icon }, index) => (
              <motion.div
                key={label}
                className="glass-panel rounded-[1.2rem] p-[3vw] min-h-[18vh]"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.15 + index * 0.18, duration: 0.55 }}
              >
                <Icon className={`${color} mb-[2vh]`} size="5vw" strokeWidth={1.25} />
                <div className="font-sans text-[2.3vw] uppercase tracking-[0.12em] text-cream-100/48">{label}</div>
                <div className={`font-display text-[8vw] leading-none mt-[1vh] ${color}`}>{value}</div>
                <div className="font-sans text-[2.6vw] text-cream-100/58 mt-[1vh]">{note}</div>
              </motion.div>
            ))}
          </div>
          <div className="mt-[3vh] flex items-center gap-[2vw]">
            <div className="h-[1.3vh] flex-1 rounded-full bg-cream-100/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-rose-300 via-gold-400 to-sage-500"
                initial={{ width: 0 }}
                animate={{ width: '76%' }}
                transition={{ delay: 1.5, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <ChevronUp className="text-sage-500" size="4.5vw" />
            <Check className="text-gold-400" size="4.5vw" />
          </div>
        </motion.div>
      </div>
    </SceneExit>
  );
}