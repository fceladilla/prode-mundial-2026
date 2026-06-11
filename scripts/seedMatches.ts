/**
 * Carga el fixture oficial (scripts/fixture_mundial2026.json) en Firestore,
 * mapeandolo al esquema que consume la app.
 *
 * - El doc id es el id del partido del JSON (ej. "M001").
 * - Los partidos de grupos se guardan con stage "Grupo A".."Grupo L" para que
 *   la app los muestre en secciones separadas; los de eliminacion mantienen su
 *   ronda ("Ronda de 32", "Octavos de Final", ...).
 * - scheduledAtARG/ESP se toman del JSON si vienen; si no, se calculan del UTC.
 *
 * Uso: npm run seed
 *
 * OJO: sobrescribe cada partido por id. Re-ejecutarlo resetea result/status a
 * "upcoming". Para cargar el resultado de un partido usar `npm run set-result`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

interface RawTeam {
  name: string;
  code: string;
  flag?: string;
}

interface RawMatch {
  id: string;
  matchNumber: number;
  stage: string;
  group?: string | null;
  homeTeam: RawTeam;
  awayTeam: RawTeam;
  venue: { name: string; city: string; country: string };
  utcDate: string;
  argTime?: string;
  espTime?: string;
  status?: 'upcoming' | 'live' | 'finished';
  result?: { homeGoals: number; awayGoals: number } | null;
}

function formatZone(timeZone: string, date: Date): string {
  const time = new Intl.DateTimeFormat('es-AR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  const day = new Intl.DateTimeFormat('es-AR', {
    timeZone,
    day: 'numeric',
    month: 'short',
  })
    .format(date)
    .replace('.', '');
  return `${time} (${day})`;
}

async function main() {
  const sa = JSON.parse(
    readFileSync(resolve(process.cwd(), 'scripts/serviceAccountKey.json'), 'utf8')
  );
  initializeApp({ credential: cert(sa) });
  const db = getFirestore();

  const raw = readFileSync(
    resolve(process.cwd(), 'scripts/fixture_mundial2026.json'),
    'utf8'
  );
  const matches: RawMatch[] = JSON.parse(raw);

  let batch = db.batch();
  let ops = 0;
  let written = 0;
  for (const m of matches) {
    const date = new Date(m.utcDate);
    const stage = m.group ? `Grupo ${m.group}` : m.stage;

    batch.set(db.collection('matches').doc(m.id), {
      matchNumber: m.matchNumber,
      stage,
      group: m.group ?? null,
      homeTeam: {
        name: m.homeTeam.name,
        code: m.homeTeam.code,
        flag: m.homeTeam.flag ?? null,
      },
      awayTeam: {
        name: m.awayTeam.name,
        code: m.awayTeam.code,
        flag: m.awayTeam.flag ?? null,
      },
      venue: m.venue,
      scheduledAt: Timestamp.fromDate(date),
      scheduledAtARG:
        m.argTime ?? formatZone('America/Argentina/Buenos_Aires', date),
      scheduledAtESP: m.espTime ?? formatZone('Europe/Madrid', date),
      status: m.status ?? 'upcoming',
      result: m.result ?? null,
    });

    ops++;
    written++;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  console.log(`OK: ${written} partidos cargados en Firestore.`);
  console.log(
    `Primero: ${matches[0].homeTeam.name} vs ${matches[0].awayTeam.name} (${matches[0].id})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
