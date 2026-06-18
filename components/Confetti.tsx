'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#C9A84C', '#2D6A4F', '#1A3A5C', '#D62828', '#ffffff'];

/**
 * Pequeno estallido de confeti hecho 100% con framer (sin dependencias ni
 * canvas). Se monta una sola vez para celebrar un acierto exacto y se desmonta
 * solo al terminar via `onDone`. Cada particula sale del centro, cae y se
 * desvanece. No toca la base de datos.
 */
export function Confetti({
  count = 14,
  onDone,
}: {
  count?: number;
  onDone?: () => void;
}) {
  // Generamos los parametros una vez para que no cambien en cada render.
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        color: COLORS[i % COLORS.length],
        x: (Math.random() - 0.5) * 220, // desplazamiento horizontal final
        y: 60 + Math.random() * 80, // caida
        rotate: (Math.random() - 0.5) * 540,
        delay: Math.random() * 0.12,
        size: 5 + Math.random() * 5,
      })),
    [count]
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 overflow-visible"
    >
      <div className="absolute left-1/2 top-1/2">
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
            animate={{ opacity: 0, x: p.x, y: p.y, rotate: p.rotate }}
            transition={{ duration: 1, ease: 'easeOut', delay: p.delay }}
            onAnimationComplete={p.id === 0 ? onDone : undefined}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size,
              borderRadius: 1,
              backgroundColor: p.color,
            }}
          />
        ))}
      </div>
    </div>
  );
}
