import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, Check, Clock3, MapPin } from 'lucide-react';
import { asset, FilmOrb, SceneExit, SceneKicker, WordReveal } from './shared';

const MOMENTS = [
  { time: '08:30', title: 'Mise en place', note: 'Le traiteur est accueilli', tone: 'bg-sage-500', icon: MapPin },
  { time: '10:15', title: 'Photos de famille', note: 'Tout le monde sait où aller', tone: 'bg-rose-300', icon: Clock3 },
  { time: '16:00', title: 'La cérémonie', note: 'Vous êtes là. Vraiment là.', tone: 'bg-gold-400', icon: BellRing },
];

export function Scene3() {
  return (
    <SceneExit className="video-root">
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{ backgroundImage: `url(${asset('images/bokeh-flowers.jpg')})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        animate={{ scale: [1.05, 1, 1.05], x: [0, -12, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <FilmOrb className="w-[62vw] h-[62vw] -right-[24vw] -top-[8vh]" color="rose" />
      <FilmOrb className="w-[55vw] h-[55vw] -left-[30vw] bottom-[5vh]" color="sage" delay={2} />

      <div className="video-safe">
        <SceneKicker>Concept 03 / Le jour J</SceneKicker>
        <div className="mt-[4vh]">
          <WordReveal delay={0.12} className="text-[11.6vw] leading-[0.84]">
            Le plan
          </WordReveal>
          <WordReveal delay={0.3} className="text-[11.6vw] leading-[0.84] italic text-rose-300">
            prend le relais.
          </WordReveal>
        </div>

        <motion.div
          className="absolute top-[48vh] left-[2vw] right-0"
          initial={{ opacity: 0, x: 25 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.72, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative pl-[8vw]">
            <motion.div
              className="absolute left-[2.6vw] top-[2vh] bottom-[1vh] w-px bg-gradient-to-b from-sage-500 via-gold-400 to-rose-300"
              initial={{ scaleY: 0, originY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 1.1, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            />
            {MOMENTS.map(({ time, title, note, tone, icon: Icon }, index) => (
              <motion.div
                key={time}
                className="relative mb-[3vh] flex gap-[4vw]"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.02 + index * 0.22, duration: 0.55 }}
              >
                <motion.div
                  className={`absolute -left-[8vw] top-[1.5vh] w-[5.2vw] h-[5.2vw] rounded-full ${tone} ring-[1vw] ring-plum-900/65 flex items-center justify-center`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.1 + index * 0.22, type: 'spring', stiffness: 260, damping: 18 }}
                >
                  <Icon size="2.6vw" className="text-plum-950" strokeWidth={1.7} />
                </motion.div>
                <div className="w-[17vw] shrink-0">
                  <div className="font-mono text-[3.8vw] text-gold-400">{time}</div>
                  <div className="font-sans text-[2.1vw] uppercase tracking-[0.12em] text-cream-100/45">heure clé</div>
                </div>
                <div className="pt-[0.4vh]">
                  <div className="font-display text-[6.2vw] leading-none text-cream-100">{title}</div>
                  <div className="mt-[1vh] font-sans text-[2.9vw] text-cream-100/62">{note}</div>
                </div>
                {index < 2 && (
                  <Check className="absolute right-[6vw] top-[2vh] text-sage-500" size="4.5vw" strokeWidth={1.4} />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="sync">
          <motion.p
            key="breath-line"
            className="absolute bottom-[1vh] left-0 font-sans text-[3.4vw] text-cream-100/72"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ delay: 1.5, duration: 0.6 }}
          >
            Moins de messages à retrouver. Plus de moments à vivre.
          </motion.p>
        </AnimatePresence>
      </div>
    </SceneExit>
  );
}