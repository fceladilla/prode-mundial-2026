import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function main() {
  const codes = process.argv.slice(2).map((c) => c.toUpperCase());
  const sa = JSON.parse(
    readFileSync(resolve(process.cwd(), 'scripts/serviceAccountKey.json'), 'utf8')
  );
  initializeApp({ credential: cert(sa) });
  const db = getFirestore();
  const snap = await db.collection('matches').get();
  for (const d of snap.docs) {
    const m = d.data();
    const hc = m.homeTeam?.code;
    const ac = m.awayTeam?.code;
    if (codes.length === 0 || (codes.includes(hc) && codes.includes(ac))) {
      const res = m.result ? `${m.result.homeGoals}-${m.result.awayGoals}` : '-';
      console.log(`${d.id} | ${hc} ${res} ${ac} | status=${m.status} | ${m.stage ?? ''}`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
