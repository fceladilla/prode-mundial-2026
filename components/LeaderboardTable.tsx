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
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDisplayName } from '@/lib/formatName';
import type { LeaderboardUser } from '@/lib/types';
import { Avatar } from './Avatar';
import { AnimatedNumber } from './AnimatedNumber';

// Estilo del podio (1ro/2do/3ro): medalla + anillo y fondo con el color del
// metal. El oro reusa el token de marca; plata/bronce van con la paleta default.
const PODIUM = [
  { medal: '🥇', ring: 'ring-oro/60', bg: 'bg-oro/10', glow: 'shadow-[0_0_14px_rgba(201,168,76,0.25)]' },
  { medal: '🥈', ring: 'ring-slate-300/50', bg: 'bg-slate-300/5', glow: '' },
  { medal: '🥉', ring: 'ring-amber-600/50', bg: 'bg-amber-700/10', glow: '' },
] as const;

export function LeaderboardTable({ limitRows = 50 }: { limitRows?: number }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [rows, setRows] = useState<LeaderboardUser[]>([]);

  useEffect(() => {
    const q = query(
      collection(getDbClient(), 'users'),
      orderBy('totalPoints', 'desc'),
      fbLimit(limitRows)
    );
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<LeaderboardUser, 'id'>),
      }));
      // Firestore ya los trae por puntaje desc; aca aplicamos el desempate: a
      // igual puntaje, queda mejor posicionado quien tiene mas aciertos
      // (correctResults). Se ordena en cliente para no requerir indice compuesto.
      data.sort(
        (a, b) =>
          (b.totalPoints ?? 0) - (a.totalPoints ?? 0) ||
          (b.correctResults ?? 0) - (a.correctResults ?? 0)
      );
      setRows(data);
    });
  }, [limitRows]);

  if (rows.length === 0) {
    return <p className="text-sm text-suave">{t('noPlayersYet')}</p>;
  }

  return (
    <ol className="space-y-1">
      {rows.map((r, i) => {
        const isMe = user?.uid === r.id;
        const podium = i < 3 ? PODIUM[i] : null;
        // El resaltado "soy yo" tiene prioridad; si no, aplica el podio.
        const rowStyle = isMe
          ? 'bg-oro/15 ring-1 ring-oro/40'
          : podium
            ? `${podium.bg} ring-1 ${podium.ring} ${podium.glow}`
            : 'bg-carbon';
        return (
          <motion.li
            key={r.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ layout: { type: 'spring', stiffness: 500, damping: 40 } }}
          >
            <Link
              href={`/perfil/${r.id}`}
              className={`flex items-center gap-3 rounded-md px-2 py-1.5 transition hover:ring-1 hover:ring-oro/40 ${rowStyle}`}
            >
              <span className="w-5 text-center font-display font-bold text-suave">
                {podium ? <span className="text-base leading-none">{podium.medal}</span> : i + 1}
              </span>
              <Avatar src={r.photoURL} name={r.displayName} size={28} />
              <span className="min-w-0 flex-1 truncate text-sm">
                {formatDisplayName(r.displayName)}
              </span>
              <AnimatedNumber
                value={r.totalPoints ?? 0}
                className="font-display font-bold text-oro"
              />
            </Link>
          </motion.li>
        );
      })}
    </ol>
  );
}
