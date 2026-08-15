import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export const asset = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export function SceneKicker({
  children,
  light = false,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <div
      className={`font-sans text-[2.3vw] tracking-editorial uppercase ${
        light ? 'text-plum-900/60' : 'text-cream-100/55'
      }`}
    >
      {children}
    </div>
  );
}

export function WordReveal({
  children,
  delay = 0,
  className = '',
  light = false,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  light?: boolean;
}) {
  return (
    <div className="overflow-hidden">
      <motion.div
        initial={{ y: '110%', opacity: 0, rotate: 2 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={{ delay, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className={`display-tight ${light ? 'text-plum-900' : 'text-cream-100'} ${className}`}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function FilmOrb({
  className = '',
  color = 'rose',
  delay = 0,
}: {
  className?: string;
  color?: 'rose' | 'gold' | 'sage';
  delay?: number;
}) {
  const colors = {
    rose: 'bg-rose-300/20',
    gold: 'bg-gold-400/18',
    sage: 'bg-sage-500/18',
  };

  return (
    <motion.div
      className={`absolute rounded-full blur-3xl ${colors[color]} ${className}`}
      animate={{ x: [0, 12, -8, 0], y: [0, -18, 10, 0], scale: [1, 1.08, 0.96, 1] }}
      transition={{ duration: 11 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

export function SceneExit({
  children,
  className = '',
  background = 'bg-plum-900',
}: {
  children: ReactNode;
  className?: string;
  background?: string;
}) {
  return (
    <motion.div
      className={`absolute inset-0 overflow-hidden ${background} ${className}`}
      initial={{ opacity: 0, clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ opacity: 1, clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0, scale: 1.08, clipPath: 'circle(0% at 50% 50%)' }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}