'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { getDbClient } from '@/lib/firebase';
import { formatDisplayName } from '@/lib/formatName';
import type { Match } from '@/lib/types';
import { Avatar } from './Avatar';

interface UserResult {
  uid: string;
  displayName: string;
  photoURL: string | null;
  totalPoints: number;
}

type Result =
  | { kind: 'match'; match: Match }
  | { kind: 'user'; user: UserResult };

const MAX_PER_GROUP = 5;

/** Sin acentos y en minusculas, para comparar "Mexico" con "México". */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function scrollToMatch(matchId: string) {
  // El card puede tardar en montarse si venimos de otra pagina.
  let tries = 0;
  const tick = () => {
    const el = document.getElementById(`match-${matchId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-oro');
      setTimeout(() => el.classList.remove('ring-2', 'ring-oro'), 2000);
    } else if (tries++ < 20) {
      setTimeout(tick, 150);
    }
  };
  tick();
}

export function SearchBar({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matchesCache = useRef<Match[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Busqueda con debounce de 300ms.
  useEffect(() => {
    const t = term.trim();
    if (t.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const handle = setTimeout(async () => {
      const db = getDbClient();

      // Partidos: una sola carga, despues se filtra en memoria.
      if (!matchesCache.current) {
        const snap = await getDocs(
          query(collection(db, 'matches'), orderBy('scheduledAt', 'asc'))
        );
        matchesCache.current = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Match, 'id'>),
        }));
      }
      const nt = normalize(t);
      const matchHits: Result[] = matchesCache.current
        .filter(
          (m) =>
            normalize(m.homeTeam.name).includes(nt) ||
            normalize(m.awayTeam.name).includes(nt) ||
            normalize(m.venue.city).includes(nt)
        )
        .slice(0, MAX_PER_GROUP)
        .map((match) => ({ kind: 'match' as const, match }));

      // Usuarios: prefix-search sobre displayNameLower (Firestore no tiene
      // full-text search; ver CLAUDE.md / mejoras).
      let userHits: Result[] = [];
      try {
        const lower = t.toLowerCase();
        const snap = await getDocs(
          query(
            collection(db, 'users'),
            where('displayNameLower', '>=', lower),
            where('displayNameLower', '<=', lower + ''),
            limit(MAX_PER_GROUP)
          )
        );
        userHits = snap.docs.map((d) => ({
          kind: 'user' as const,
          user: {
            uid: d.id,
            displayName: d.data().displayName ?? 'Jugador',
            photoURL: d.data().photoURL ?? null,
            totalPoints: d.data().totalPoints ?? 0,
          },
        }));
      } catch {
        // Sin resultados de usuarios si la query falla.
      }

      setResults([...matchHits, ...userHits]);
      setActive(0);
      setOpen(true);
    }, 300);

    return () => clearTimeout(handle);
  }, [term]);

  // Click afuera cierra el dropdown.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const select = (r: Result) => {
    setOpen(false);
    setTerm('');
    if (r.kind === 'user') {
      router.push(`/perfil/${r.user.uid}`);
    } else {
      if (pathname !== '/') router.push('/');
      scrollToMatch(r.match.id);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) {
      if (e.key === 'Escape') setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const matchResults = results.filter((r) => r.kind === 'match');
  const userResults = results.filter((r) => r.kind === 'user');

  return (
    <div ref={rootRef} className="relative w-full">
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        autoFocus={autoFocus}
        placeholder="Buscar partido o jugador..."
        aria-label="Buscar partido o jugador"
        className="h-9 w-full rounded-md bg-carbon px-3 text-sm outline-none ring-1 ring-white/15 placeholder:text-suave focus:ring-2 focus:ring-oro"
      />

      {open && (
        <div className="absolute left-0 right-0 top-11 z-30 max-h-80 overflow-y-auto rounded-md border border-white/10 bg-negro shadow-xl">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-suave">Sin resultados.</p>
          ) : (
            <>
              {matchResults.length > 0 && (
                <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-suave">
                  Partidos
                </p>
              )}
              {matchResults.map((r, i) =>
                r.kind === 'match' ? (
                  <button
                    key={r.match.id}
                    onClick={() => select(r)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                      i === active ? 'bg-carbon' : ''
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {r.match.homeTeam.name} vs {r.match.awayTeam.name}
                    </span>
                    <span className="shrink-0 text-xs text-suave">
                      {r.match.venue.city}
                    </span>
                  </button>
                ) : null
              )}
              {userResults.length > 0 && (
                <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-suave">
                  Jugadores
                </p>
              )}
              {userResults.map((r, i) => {
                if (r.kind !== 'user') return null;
                const idx = matchResults.length + i;
                return (
                  <button
                    key={r.user.uid}
                    onClick={() => select(r)}
                    onMouseEnter={() => setActive(idx)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                      idx === active ? 'bg-carbon' : ''
                    }`}
                  >
                    <Avatar
                      src={r.user.photoURL}
                      name={r.user.displayName}
                      size={22}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {formatDisplayName(r.user.displayName)}
                    </span>
                    <span className="shrink-0 font-display text-xs font-bold text-oro">
                      {r.user.totalPoints} pts
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
