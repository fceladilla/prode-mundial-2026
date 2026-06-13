/**
 * GET /api/sync — dispara una corrida del sync (football-data.org -> Firestore).
 *
 * Pensado para un cron externo (cron-job.org) cada ~5 min durante el Mundial,
 * con el Vercel Cron diario de vercel.json como red de seguridad. Reemplaza la
 * dependencia exclusiva del GitHub Action, cuyo schedule cada-5-min GitHub no respeta.
 *
 * Seguridad: si esta seteada la env CRON_SECRET, exige el header
 *   Authorization: Bearer <CRON_SECRET>
 * Vercel Cron lo agrega automaticamente; en cron-job.org se configura a mano.
 *
 * Envs necesarias en Vercel (Production):
 *   FOOTBALL_DATA_API_KEY, FIREBASE_SERVICE_ACCOUNT (JSON en una linea), CRON_SECRET
 */
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { runSync } from '@/lib/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'Falta FOOTBALL_DATA_API_KEY' },
      { status: 500 }
    );
  }

  try {
    const summary = await runSync(getAdminDb(), apiKey);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
