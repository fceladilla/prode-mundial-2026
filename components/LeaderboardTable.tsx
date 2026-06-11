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
import { getDbClient } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { formatDisplayName } from '@/lib/formatName';
import type { LeaderboardUser } from '@/lib/types';
import { Avatar } from './Avatar';

export function LeaderboardTable({ limitRows = 50 }: { limitRows?: number }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderboardUser[]>([]);

  useEffect(() => {
    const q = query(
      collection(getDbClient(), 'users'),
      orderBy('totalPoints', 'desc'),
      fbLimit(limitRows)
    );
    return onSnapshot(q, (snap) => {
      setRows(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<LeaderboardUser, 'id'>),
        }))
      );
    });
  }, [limitRows]);

  if (rows.length === 0) {
    return <p className="text-sm text-suave">Todavia no hay jugadores.</p>;
  }

  return (
    <ol className="space-y-1">
      {rows.map((r, i) => {
        const isMe = user?.uid === r.id;
        return (
          <li key={r.id}>
            <Link
              href={`/perfil/${r.id}`}
              className={`flex items-center gap-3 rounded-md px-2 py-1.5 transition hover:ring-1 hover:ring-oro/40 ${
                isMe ? 'bg-oro/15 ring-1 ring-oro/40' : 'bg-carbon'
              }`}
            >
              <span className="w-5 text-center font-display font-bold text-suave">
                {i + 1}
              </span>
              <Avatar src={r.photoURL} name={r.displayName} size={28} />
              <span className="min-w-0 flex-1 truncate text-sm">
                {formatDisplayName(r.displayName)}
              </span>
              <span className="font-display font-bold text-oro">
                {r.totalPoints ?? 0}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
