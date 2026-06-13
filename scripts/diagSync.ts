/** Diagnostico de solo lectura: estado de los partidos de hoy en Firestore. */
import { getAdminDb } from '../lib/firebaseAdmin';

async function main() {
  const db = getAdminDb();
  const snap = await db.collection('matches').get();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const rows = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((m) => {
      const t = m.scheduledAt?.toMillis?.() ?? 0;
      return Math.abs(now - t) < dayMs; // partidos en +-24h
    })
    .sort((a, b) => (a.scheduledAt?.toMillis?.() ?? 0) - (b.scheduledAt?.toMillis?.() ?? 0));

  console.log(`Hora actual UTC: ${new Date(now).toISOString()}`);
  console.log(`Partidos en ventana +-24h: ${rows.length}\n`);

  for (const m of rows) {
    const kid = m.scheduledAt?.toDate?.()?.toISOString() ?? '?';
    const live = m.liveScore ? `${m.liveScore.homeGoals}-${m.liveScore.awayGoals}` : '—';
    const res = m.result ? `${m.result.homeGoals}-${m.result.awayGoals}` : '—';
    console.log(
      `${m.id} | ${m.homeTeam?.code} vs ${m.awayTeam?.code} | kickoff ${kid} | ` +
        `status=${m.status} | liveScore=${live} | result=${res}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
