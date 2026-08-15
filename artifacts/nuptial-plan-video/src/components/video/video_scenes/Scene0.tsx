import { motion } from 'framer-motion';
import { asset, FilmOrb, SceneExit, SceneKicker, WordReveal } from './shared';

export function Scene0() {
  return (
    <SceneExit className="video-root">
      <FilmOrb className="w-[60vw] h-[60vw] -left-[28vw] top-[14vh]" color="rose" />
      <FilmOrb className="w-[42vw] h-[42vw] -right-[20vw] bottom-[8vh]" color="gold" delay={2} />

      <motion.div
        className="absolute -right-[22vw] top-[8vh] w-[78vw] h-[78vw] opacity-70"
        animate={{ rotate: [0, 8, 0], scale: [1, 1.03, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img
          src={asset('images/botanical-texture.png')}
          alt=""
          className="w-full h-full object-cover mix-blend-screen opacity-25"
        />
      </motion.div>

      <div className="video-safe">
        <div className="flex items-center justify-between">
          <SceneKicker>Jardin Parisien / 01</SceneKicker>
          <motion.div
            className="h-[9vw] w-[9vw] rounded-full border border-gold-400/60 flex items-center justify-center text-gold-400 font-display text-[6vw]"
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, duration: 0.8, type: 'spring', stiffness: 220, damping: 18 }}
          >
            N
          </motion.div>
        </div>

        <div className="absolute top-[24vh] left-0 right-0">
          <motion.div
            className="w-[20vw] hairline mb-[4vh]"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '20vw', opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.8 }}
          />
          <WordReveal delay={0.35} className="text-[15vw] leading-[0.82]">
            Votre
          </WordReveal>
          <WordReveal delay={0.55} className="text-[15vw] leading-[0.82] italic text-rose-300">
            mariage
          </WordReveal>
          <WordReveal delay={0.75} className="text-[15vw] leading-[0.82]">
            commence ici.
          </WordReveal>
        </div>

        <motion.div
          className="absolute bottom-[6vh] left-0 right-0 flex items-end justify-between"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          <div className="max-w-[64vw]">
            <p className="font-sans text-[3.6vw] leading-tight text-cream-100/75">
              Une seule vue pour les décisions qui comptent.
            </p>
          </div>
          <img src={asset('tnp-gold-logo.png')} alt="The Nuptial Plan" className="w-[17vw] h-[17vw] object-contain opacity-80" />
        </motion.div>
      </div>
    </SceneExit>
  );
}