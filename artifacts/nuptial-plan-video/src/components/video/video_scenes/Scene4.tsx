import { motion } from 'framer-motion';
import { asset, FilmOrb, SceneExit, SceneKicker, WordReveal } from './shared';

export function Scene4() {
  return (
    <SceneExit className="video-root bg-cream-100" background="bg-cream-100">
      <motion.div
        className="absolute -right-[30vw] top-[8vh] w-[100vw] h-[100vw] opacity-55"
        animate={{ rotate: [0, 4, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img
          src={asset('images/botanical-texture.png')}
          alt=""
          className="w-full h-full object-cover mix-blend-multiply opacity-25"
        />
      </motion.div>
      <FilmOrb className="w-[64vw] h-[64vw] -left-[32vw] bottom-[2vh]" color="rose" />

      <div className="video-safe">
        <div className="flex items-start justify-between">
          <SceneKicker light>La suite / pour respirer</SceneKicker>
          <motion.img
            src={asset('tnp-gold-logo.png')}
            alt="The Nuptial Plan"
            className="w-[17vw] h-[17vw] object-contain"
            initial={{ opacity: 0, scale: 0.7, rotate: -18 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, duration: 0.8, type: 'spring', stiffness: 160, damping: 16 }}
          />
        </div>

        <div className="absolute top-[26vh] left-0 right-0">
          <motion.div
            className="w-[18vw] hairline mb-[4vh] bg-gradient-to-r from-plum-900/70 to-transparent"
            initial={{ width: 0 }}
            animate={{ width: '18vw' }}
            transition={{ delay: 0.45, duration: 0.7 }}
          />
          <WordReveal delay={0.4} light className="text-[13.2vw] leading-[0.82]">
            Respirez.
          </WordReveal>
          <WordReveal delay={0.58} light className="text-[13.2vw] leading-[0.82] italic text-plum-700">
            Le reste est
          </WordReveal>
          <WordReveal delay={0.76} light className="text-[13.2vw] leading-[0.82]">
            orchestré.
          </WordReveal>
        </div>

        <motion.div
          className="absolute bottom-[4vh] left-0 right-0 border-t border-plum-900/15 pt-[2.4vh] flex items-end justify-between"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.45, duration: 0.8 }}
        >
          <div>
            <div className="font-display text-[6vw] leading-none text-plum-900">The Nuptial Plan</div>
            <div className="font-sans text-[2.3vw] tracking-editorial uppercase text-plum-900/55 mt-[1.3vh]">
              Planifiez avec plus de calme.
            </div>
          </div>
          <div className="font-mono text-[2.4vw] text-plum-900/45">tnp / jardin parisien</div>
        </motion.div>
      </div>
    </SceneExit>
  );
}