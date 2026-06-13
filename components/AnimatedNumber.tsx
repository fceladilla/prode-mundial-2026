'use client';

import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';

/**
 * Numero que "rueda" hacia su nuevo valor cuando cambia (goles en vivo, puntos,
 * total del ranking). En el primer render no anima: el motion value arranca en
 * `value`, asi que solo se mueve ante un cambio posterior.
 */
export function AnimatedNumber({
  value,
  className,
  duration = 0.5,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: 'easeOut' });
    return controls.stop;
  }, [value, duration, mv]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
