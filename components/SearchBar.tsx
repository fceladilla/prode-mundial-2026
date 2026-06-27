'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { getDbClient } from '@/lib/firebase';
import { useLanguage } from '@/hooks/useLanguage';
import { LOCALE } from '@/lib/i18n';
import { formatDisplayName } from '@/lib/formatName';
import { argDateKey, argDateLabel } from '@/lib/dates';
import type { Match, Team } from '@/lib/types';
import { Avatar } from './Avatar';
import { Flag } from './Flag';

interface UserResult {
  uid: string;
  displayName: string;
  photoURL: string | null;
  totalPoints: number;
}

interface DateResult {
  key: string; // "2026-06-11"
  label: string; // "Jueves 11 de junio"
  count: number;
}

type Result =
  | { kind: 'team'; team: Team; count: number }
  | { kind: 'group'; group: string } // letra del grupo: "A".."L"
  | { kind: 'date'; date: DateResult }
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

/** Formas escribibles de un dia ("11 de junio", "11/6", "hoy"...) ya normalizadas. */
function dateForms(key: string, label: string): string[] {
  const [, month, day] = key.split('-'); // "2026-06-11"
  const d = Number(day);
  const m = Number(month);
  const forms = [normalize(label), `${d}/${m}`, `${d}/${month}`, key];
  const todayKey = argDateKey(new Date());
  const tomorrowKey = argDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
  // Palabras de hoy/manana en los tres idiomas de la app (es, ca, en).
  if (key === todayKey) forms.push('hoy', 'avui', 'today');
  if (key === tomorrowKey) forms.push('manana', 'dema', 'tomorrow');
  return forms;
}

/** Formas escribibles de un grupo ("grupo a", "grup a", "group a"), normalizadas. */
function groupForms(letter: string): string[] {
  const l = letter.toLowerCase();
  return [`grupo ${l}`, `grup ${l}`, `group ${l}`, `grupo${l}`];
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
  const { lang, t } = useLanguage();
  const locale = LOCALE[lang];
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matchesCache = useRef<Match[] | null>(null);
  const usersCache = useRef<UserResult[] | null>(null);
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
      const all = matchesCache.current;

      // Equipos: unicos por codigo, con cantidad de partidos.
      const teamMap = new Map<string, { team: Team; count: number }>();
      for (const m of all) {
        for (const team of [m.homeTeam, m.awayTeam]) {
          if (!normalize(team.name).includes(nt)) continue;
          const e = teamMap.get(team.code);
          if (e) e.count++;
          else teamMap.set(team.code, { team, count: 1 });
        }
      }
      const teamHits: Result[] = Array.from(teamMap.values())
        .slice(0, MAX_PER_GROUP)
        .map((e) => ({ kind: 'team' as const, ...e }));

      // Grupos: letras distintas (A..L) cuya forma escrita coincide ("grupo a").
      const groupSet = new Set<string>();
      for (const m of all) if (m.group) groupSet.add(m.group);
      const groupHits: Result[] = Array.from(groupSet)
        .sort()
        .filter((letter) => groupForms(letter).some((f) => f.includes(nt)))
        .map((group) => ({ kind: 'group' as const, group }));

      // Fechas: dias distintos cuya forma escrita coincide con el termino.
      const dayMap = new Map<string, DateResult>();
      for (const m of all) {
        const d = m.scheduledAt.toDate();
        const key = argDateKey(d);
        const e = dayMap.get(key);
        if (e) e.count++;
        else dayMap.set(key, { key, label: argDateLabel(d, locale), count: 1 });
      }
      const dateHits: Result[] = Array.from(dayMap.values())
        .filter((day) => dateForms(day.key, day.label).some((f) => f.includes(nt)))
        .slice(0, 3)
        .map((date) => ({ kind: 'date' as const, date }));

      // Partidos sueltos: si el termino ya matcheo un equipo, solo por sede
      // (los partidos del equipo se ven con su filtro y serian redundantes).
      const matchHits: Result[] = all
        .filter((m) =>
          teamHits.length > 0
            ? normalize(m.venue.city).includes(nt)
            : normalize(m.homeTeam.name).includes(nt) ||
              normalize(m.awayTeam.name).includes(nt) ||
              normalize(m.venue.city).includes(nt)
        )
        .slice(0, MAX_PER_GROUP)
        .map((match) => ({ kind: 'match' as const, match }));

      // Usuarios: la coleccion es chica y publica, asi que tambien se carga
      // una vez y se filtra en memoria (busca por subcadena y sin acentos,
      // sin depender de que el doc tenga displayNameLower).
      if (!usersCache.current) {
        const snap = await getDocs(
          query(collection(db, 'users'), orderBy('totalPoints', 'desc'))
        );
        usersCache.current = snap.docs.map((d) => ({
          uid: d.id,
          displayName: d.data().displayName ?? 'Jugador',
          photoURL: d.data().photoURL ?? null,
          totalPoints: d.data().totalPoints ?? 0,
        }));
      }
      const userHits: Result[] = usersCache.current
        .filter((u) => normalize(u.displayName).includes(nt))
        .slice(0, MAX_PER_GROUP)
        .map((user) => ({ kind: 'user' as const, user }));

      setResults([
        ...teamHits,
        ...groupHits,
        ...dateHits,
        ...matchHits,
        ...userHits,
      ]);
      setActive(0);
      setOpen(true);
    }, 300);

    return () => clearTimeout(handle);
  }, [term, locale]);

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
    } else if (r.kind === 'team') {
      router.push(`/?equipo=${encodeURIComponent(r.team.code)}`);
    } else if (r.kind === 'group') {
      router.push(`/clasificacion?grupo=${encodeURIComponent(r.group)}`);
    } else if (r.kind === 'date') {
      router.push(`/?fecha=${r.date.key}`);
    } else {
      // push('/') tambien limpia un filtro ?equipo=/?fecha= activo,
      // que podria ocultar el card buscado.
      router.push('/');
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

  // Grupos en el orden en que estan en `results`, para que el indice
  // activo del teclado coincida con el orden visual.
  const groups: { title: string; items: { result: Result; idx: number }[] }[] = [
    { title: t('searchTeams'), items: [] },
    { title: t('searchGroups'), items: [] },
    { title: t('searchDates'), items: [] },
    { title: t('searchMatches'), items: [] },
    { title: t('searchPlayers'), items: [] },
  ];
  results.forEach((result, idx) => {
    const gi =
      result.kind === 'team'
        ? 0
        : result.kind === 'group'
          ? 1
          : result.kind === 'date'
            ? 2
            : result.kind === 'match'
              ? 3
              : 4;
    groups[gi].items.push({ result, idx });
  });

  const rowClass = (idx: number) =>
    `flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
      idx === active ? 'bg-carbon' : ''
    }`;

  return (
    <div ref={rootRef} className="relative w-full">
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        autoFocus={autoFocus}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
        className="h-9 w-full rounded-md bg-carbon px-3 text-sm outline-none ring-1 ring-white/15 placeholder:text-suave focus:ring-2 focus:ring-oro"
      />

      {open && (
        <div className="absolute left-0 right-0 top-11 z-30 max-h-80 overflow-y-auto rounded-md border border-white/10 bg-negro shadow-xl">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-suave">{t('noResults')}</p>
          ) : (
            groups.map((g) =>
              g.items.length === 0 ? null : (
                <div key={g.title}>
                  <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-suave">
                    {g.title}
                  </p>
                  {g.items.map(({ result: r, idx }) => (
                    <button
                      key={idx}
                      onClick={() => select(r)}
                      onMouseEnter={() => setActive(idx)}
                      className={rowClass(idx)}
                    >
                      {r.kind === 'team' ? (
                        <>
                          <Flag
                            flag={r.team.flag}
                            code={r.team.code}
                            name={r.team.name}
                            height={16}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {r.team.name}
                          </span>
                          <span className="shrink-0 text-xs text-suave">
                            {r.count} {r.count === 1 ? t('match') : t('matches')}
                          </span>
                        </>
                      ) : r.kind === 'group' ? (
                        <>
                          <span aria-hidden>🏆</span>
                          <span className="min-w-0 flex-1 truncate">
                            {t('standingsGroup', { group: r.group })}
                          </span>
                          <span className="shrink-0 text-xs text-suave">
                            {t('navStandings')}
                          </span>
                        </>
                      ) : r.kind === 'date' ? (
                        <>
                          <span aria-hidden>📅</span>
                          <span className="min-w-0 flex-1 truncate">
                            {r.date.label}
                          </span>
                          <span className="shrink-0 text-xs text-suave">
                            {r.date.count}{' '}
                            {r.date.count === 1 ? t('match') : t('matches')}
                          </span>
                        </>
                      ) : r.kind === 'match' ? (
                        <>
                          <span className="min-w-0 flex-1 truncate">
                            {r.match.homeTeam.name} vs {r.match.awayTeam.name}
                          </span>
                          <span className="shrink-0 text-xs text-suave">
                            {r.match.venue.city}
                          </span>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )
            )
          )}
        </div>
      )}
    </div>
  );
}
