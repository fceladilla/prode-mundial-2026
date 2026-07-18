'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  limit as fbLimit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getDbClient } from '@/lib/firebase';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDisplayName } from '@/lib/formatName';
import type { LeaderboardUser } from '@/lib/types';
import { Avatar } from './Avatar';
import { Confetti } from './Confetti';

// Medallas del podio, en orden 1ro/2do/3ro (mismo criterio que LeaderboardTable).
const MEDALS = ['🥇', '🥈', '🥉'] as const;

// Anillo de las cards de 2do/3ro: plata y bronce (mismos tonos que el podio del
// leaderboard). El indice matchea con `rest` (0 = 2do, 1 = 3ro).
const MINOR_RING = ['ring-slate-300/50', 'ring-amber-600/50'] as const;

/**
 * Cierre del torneo. Se muestra en el Hero una vez jugada la Final: destaca al
 * campeon del prode y, debajo, al 2do y 3ro, con un mensaje de felicitaciones y
 * un cierre de agradecimiento.
 *
 * Hace UNA lectura en vivo de `users` (top ~10) y aplica el mismo desempate por
 * aciertos que el leaderboard. Solo se monta al terminar el Mundial, cuando el
 * listener normal del fixture ya no tiene nada que seguir, asi que no agrega
 * costo de cuota durante el torneo.
 */
export function Champions() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<LeaderboardUser[]>([]);
  // Se incrementa cada pocos segundos para remontar el confeti (celebracion
  // reiterada mientras la card esta a la vista).
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    const q = query(
      collection(getDbClient(), 'users'),
      orderBy('totalPoints', 'desc'),
      fbLimit(10)
    );
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<LeaderboardUser, 'id'>),
      }));
      // Mismo desempate que LeaderboardTable: a igual puntaje, mas aciertos
      // (correctResults) queda mejor. Ordenamos en cliente (sin indice compuesto).
      data.sort(
        (a, b) =>
          (b.totalPoints ?? 0) - (a.totalPoints ?? 0) ||
          (b.correctResults ?? 0) - (a.correctResults ?? 0)
      );
      setRows(data.slice(0, 3));
    });
  }, []);

  // Confeti reiterado cada ~5s.
  useEffect(() => {
    const id = setInterval(() => setBurst((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  if (rows.length === 0) return null;

  const [first, ...rest] = rows;

  return (
    <div className="relative mt-4">
      {/* Confeti sobre el campeon; se remonta con `burst` para repetirse. */}
      <Confetti key={burst} count={22} />

      <p className="text-center text-xs font-semibold uppercase tracking-wide text-oro">
        {t('heroChampionsTitle')}
      </p>

      {/* Campeon destacado */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-3 flex flex-col items-center"
      >
        <p className="mb-2 font-display text-lg font-bold text-white">
          {t('heroCongrats', { name: formatDisplayName(first.displayName) })}
        </p>
        <Link
          href={`/perfil/${first.id}`}
          className="flex flex-col items-center gap-1 rounded-xl bg-oro/10 px-6 py-4 ring-1 ring-oro/50 shadow-[0_0_20px_rgba(201,168,76,0.3)] transition hover:ring-oro"
        >
          <span className="text-3xl leading-none">{MEDALS[0]}</span>
          <Avatar src={first.photoURL} name={first.displayName} size={56} />
          <span className="mt-1 font-display text-xl font-bold text-white">
            {formatDisplayName(first.displayName)}
          </span>
          <span className="text-xs uppercase tracking-wide text-oro">
            {t('heroChampion')}
          </span>
          <span className="font-display text-2xl font-bold tabular-nums text-oro">
            {first.totalPoints ?? 0}{' '}
            <span className="text-sm font-semibold">{t('heroPts')}</span>
          </span>
        </Link>
      </motion.div>

      {/* 2do y 3ro: mismas cards que el campeon pero mas chicas, lado a lado. */}
      {rest.length > 0 && (
        <div className="mt-3 flex justify-center gap-3">
          {rest.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
              className="min-w-0 flex-1 sm:max-w-[9rem]"
            >
              <Link
                href={`/perfil/${r.id}`}
                className={`flex flex-col items-center gap-1 rounded-xl bg-black/25 px-3 py-3 ring-1 transition hover:ring-oro/60 ${MINOR_RING[i]}`}
              >
                <span className="text-2xl leading-none">{MEDALS[i + 1]}</span>
                <Avatar src={r.photoURL} name={r.displayName} size={40} />
                <span className="mt-0.5 max-w-full truncate font-display text-sm font-bold text-white">
                  {formatDisplayName(r.displayName)}
                </span>
                <span className="font-display text-lg font-bold tabular-nums text-oro">
                  {r.totalPoints ?? 0}{' '}
                  <span className="text-xs font-semibold">{t('heroPts')}</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <p className="mt-4 text-center text-sm font-semibold text-suave">
        {t('heroThanks')}
      </p>
    </div>
  );
}
