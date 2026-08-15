import { motion } from 'framer-motion';
import { CalendarDays, ClipboardList, UsersRound, WalletCards } from 'lucide-react';
import { asset, FilmOrb, SceneExit, SceneKicker, WordReveal } from './shared';

const STACK = [
  { label: 'Invités', icon: UsersRound, tone: 'text-rose-300', angle: -8 },
  { label: 'Prestataires', icon: ClipboardList, tone: 'text-sage-500', angle: 5 },
  { label: 'Budget', icon: WalletCards, tone: 'text-gold-400', angle: -3 },
  { label: 'Calendrier', icon: CalendarDays, tone: 'text-cream-100', angle: 7 },
];

export function Scene1() {
  return (
    <SceneExit className="video-root">
      <FilmOrb className="w-[80vw] h-[80vw] -right-[35vw] top-[15vh]" color="sage" />
      <motion.div
        className="absolute inset-x-0 bottom-0 h-[48vh] opacity-45"
        style={{ backgroundImage: `url(${asset('images/bokeh-flowers.jpg')})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        initial={{ scale: 1.15, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.45 }}
        transition={{ duration: 4, ease: 'easeOut' }}
      />

      <div className="video-safe">
        <SceneKicker>Concept 01 / Le plan central</SceneKicker>
        <div className="mt-[5vh]">
          <WordReveal delay={0.15} className="text-[13vw] leading-[0.86]">
            Tout
          </WordReveal>
          <WordReveal delay={0.28} className="text-[13vw] leading-[0.86] text-gold-400">
            au même
          </WordReveal>
          <WordReveal delay={0.41} className="text-[13vw] leading-[0.86] italic text-rose-300">
            endroit.
          </WordReveal>
        </div>

        <motion.div
          className="absolute top-[43vh] left-[9vw] w-[68vw] h-[35vh] glass-panel rounded-[2.2rem] p-[5vw] rotate-[-4deg]"
          initial={{ y: '45vh', rotate: 8, opacity: 0 }}
          animate={{ y: 0, rotate: -4, opacity: 1 }}
          transition={{ delay: 0.85, duration: 1.1, type: 'spring', stiffness: 90, damping: 18 }}
        >
          <div className="flex items-center justify-between mb-[5vh]">
            <div>
              <div className="font-display text-[7vw] leading-none text-cream-100">Élise &amp; Thomas</div>
              <div className="font-sans text-[2.2vw] tracking-editorial uppercase text-rose-300 mt-[1.4vh]">12 octobre / Chantilly</div>
            </div>
            <div className="w-[9vw] h-[9vw] rounded-full bg-gold-400/15 flex items-center justify-center text-gold-400">
              <CalendarDays size="5vw" strokeWidth={1.2} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-[2vw]">
            {STACK.map(({ label, icon: Icon, tone, angle }, index) => (
              <motion.div
                key={label}
                className="flex items-center gap-[2vw] border-t border-cream-100/12 pt-[1.6vh]"
                initial={{ opacity: 0, x: index % 2 ? 18 : -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.25 + index * 0.14, duration: 0.5 }}
                style={{ rotate: angle * 0.12 }}
              >
                <Icon className={tone} size="4.4vw" strokeWidth={1.2} />
                <span className="font-sans text-[3.1vw] text-cream-100/78">{label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.p
          className="absolute bottom-[1vh] left-0 font-sans text-[3.2vw] text-cream-100/65"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7, duration: 0.8 }}
        >
          Vos idées, vos équipes, vos échéances — enfin réunies.
        </motion.p>
      </div>
    </SceneExit>
  );
}