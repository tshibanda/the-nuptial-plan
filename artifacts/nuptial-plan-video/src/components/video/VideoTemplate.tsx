import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useVideoPlayer } from '@/lib/video';
import { Scene0 } from './video_scenes/Scene0';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';

export const SCENE_DURATIONS: Record<string, number> = {
  opening:  4200,
  chaos:    5200,
  solution: 6400,
  features: 6200,
  finale:   4800,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  opening:  Scene0,
  chaos:    Scene1,
  solution: Scene2,
  features: Scene3,
  finale:   Scene4,
};

export const getAssetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

const SCENE_KEYS = Object.keys(SCENE_DURATIONS);

// Derive per-scene audio start times from canonical durations
const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let ms = 0;
  for (const [key, dur] of Object.entries(SCENE_DURATIONS)) {
    out[key] = ms / 1000;
    ms += dur;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON = 0.18;

// Persistent element positions indexed by scene
const GOLD_LINE = [
  { top: '50%', left: '0%',   width: '0%',   height: '1px', opacity: 0.5 },
  { top: '15%', left: '10%',  width: '80%',  height: '1px', opacity: 1   },
  { top: '80%', left: '10%',  width: '80%',  height: '1px', opacity: 1   },
  { top: '50%', left: '0%',   width: '100%', height: '1px', opacity: 1   },
  { top: '10%', left: '50%',  width: '1px',  height: '80%', opacity: 0.6 },
];

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  // Scene-synced audio playback
  const baseKey = currentSceneKey.replace(/_r[12]$/, '');
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    const target = SCENE_START_SEC[baseKey] ?? 0;
    if (Math.abs(audio.currentTime - target) > AUDIO_SEEK_EPSILON) {
      audio.currentTime = target;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseKey, muted]);

  // Strip _r1/_r2 suffixes, resolve scene index
  const sceneIndex = SCENE_KEYS.indexOf(baseKey);
  const idx = sceneIndex >= 0 ? sceneIndex : 0;
  const SceneComponent = SCENE_COMPONENTS[baseKey] ?? Scene0;
  const gl = GOLD_LINE[idx] ?? GOLD_LINE[0];

  return (
    <>
      <div className="video-root relative w-full h-screen overflow-hidden">

        {/* ── PERSISTENT BACKGROUND ── */}
        <motion.div
          className="absolute inset-0 z-0"
          animate={{ backgroundColor: idx === 4 ? '#F8F3EE' : '#3C1A3C' }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        >
          {/* Bokeh flower photo */}
          <motion.div
            className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
            style={{ backgroundImage: `url(${getAssetUrl('images/bokeh-flowers.jpg')})` }}
            animate={{ scale: 1 + idx * 0.05, opacity: idx === 4 ? 0 : 0.4 }}
            transition={{ duration: 6, ease: 'linear' }}
          />
          {/* Botanical watercolour texture */}
          <motion.div
            className="absolute inset-0 bg-cover bg-center mix-blend-color-dodge"
            style={{ backgroundImage: `url(${getAssetUrl('images/botanical-texture.png')})` }}
            animate={{ x: idx * -20, y: idx * -10, opacity: idx === 4 ? 1 : 0.2 }}
            transition={{ duration: 4, ease: 'easeInOut' }}
          />
        </motion.div>

        {/* ── PERSISTENT GOLD ACCENT LINE ── */}
        <motion.div
          className="absolute z-40 bg-gold-400"
          animate={gl}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* ── SCENE FOREGROUND ── */}
        <div className="relative z-10 w-full h-full">
          <AnimatePresence mode="popLayout">
            <SceneComponent key={currentSceneKey} />
          </AnimatePresence>
        </div>
      </div>

      {/* Background music */}
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </>
  );
}
