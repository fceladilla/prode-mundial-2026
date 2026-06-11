# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Prode Mundial 2026** is a FIFA World Cup 2026 prediction game (prode) — a web app where users sign in with Google, predict match scores, and compete on a real-time leaderboard.

The full planning specification is in `SOP_Prode_Mundial2026.md` (Spanish). This CLAUDE.md summarizes the key decisions made there.

## Tech Stack

- **Frontend**: Next.js 14+ with App Router, Tailwind CSS, Framer Motion
- **Backend/DB**: Firebase (Firestore + Auth + Cloud Functions)
- **Auth**: Firebase Authentication with Google OAuth only
- **Hosting**: Vercel (frontend) + Firebase (backend)
- **Fonts**: Rajdhani (primary, Bold/SemiBold/Regular) + Noto Sans (secondary/UI)

## Common Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
```

For Firebase Functions (from `functions/` directory):
```bash
npm run build        # Compile TypeScript functions
firebase emulators:start   # Run local emulators (Auth + Firestore + Functions)
firebase deploy --only functions
```

Seed the match fixture:
```bash
npx ts-node scripts/seedMatches.ts
```

## App Router Structure

Built in the MVP:

```
app/
├── layout.tsx       ← RootLayout: fonts, Providers, Navbar + leaderboard Sidebar
├── providers.tsx    ← Client wrapper around AuthProvider
├── page.tsx         ← Home / fixture grouped by stage; predictions entered inline on each card
└── ranking/page.tsx ← Full leaderboard (for mobile, where the sidebar is hidden)
```

Planned but **not yet built** (see SOP §8): `partido/[id]/page.tsx` (match detail) and `perfil/page.tsx` (my predictions). For the MVP, score entry happens inline on `MatchCard` rather than on a dedicated detail page.

Components live flat under `components/` (`Navbar`, `Sidebar`, `MatchCard`, `LeaderboardTable`, `Avatar`), not in the nested subfolders the SOP proposes.

### Firebase initialization (important)

`lib/firebase.ts` does **not** export ready `auth`/`db` instances. It exports lazy getters `getAuthClient()` and `getDbClient()` plus `googleProvider`. Always call these getters from inside an effect or event handler (client-side) — never at module top level. This is deliberate: eager `getAuth()` at import time throws `auth/invalid-api-key` during `next build`'s static prerender (pages have no env vars then). Auth context/hook lives in `hooks/useAuth.tsx`.

## Data Model (Firestore)

Four top-level collections:

| Collection | Purpose |
|---|---|
| `users/{userId}` | Profile + denormalized totals (`totalPoints`, `exactResults`, `correctResults`) |
| `matches/{matchId}` | Fixture data, `status: "upcoming"\|"live"\|"finished"`, and `result` (set by Cloud Function only) |
| `predictions/{userId}_{matchId}` | One doc per user per match; `evaluated: false` until match finishes |
| `leaderboard/{userId}` | Materialized view (SOP). **Not used in the MVP** — the leaderboard reads `users` directly, ordered by `totalPoints` desc. |

`scheduledAt` is stored as UTC timestamp. `scheduledAtARG` and `scheduledAtESP` are pre-computed strings (UTC–3 and UTC+2 respectively — no DST for Argentina; Spain uses CEST in June–July).

## Scoring Rules

- Exact scoreline → **5 points**
- Correct winner/draw (wrong score) → **2 points**
- Miss → **0 points**
- Exact replaces (does not stack with) correct-outcome; max 5 pts per match.

Scoring is applied by the **`scripts/setResult.ts` admin script** — run `npm run set-result -- <matchId> <home> <away>`. It sets `result` + `status: "finished"`, evaluates every prediction with `computePoints` (`lib/scoring.ts`), and increments `users.totalPoints`/`exactResults`/`correctResults` via the Admin SDK (bypasses rules; no Blaze/Functions needed). Idempotent — skips predictions already `evaluated`. The `evaluatePredictions` Cloud Function (SOP §7) that would do this automatically on `matches/{matchId}` update is the planned upgrade, **not yet built** (needs the Blaze plan). Security rules block clients from writing their own score fields, so this admin path is the only way points are awarded.

## Business Rules

- Predictions lock automatically when `match.status !== "upcoming"` (enforced by Firestore Security Rules, not just the UI).
- Match results can only be written by Cloud Functions — the client has no write access to `matches/` or `leaderboard/`.
- Users cannot read other users' predictions until the match has started.
- The leaderboard is publicly readable without authentication.
- Validate score inputs on both client and in Security Rules (no negative values).

## Environment Variables

All Firebase config goes in `.env.local` (never committed). Client-side vars use the `NEXT_PUBLIC_FIREBASE_*` prefix (normal for Firebase Web SDK). See `lib/firebase.ts` for the full list of required keys.

## Visual Identity

Dark-mode-first palette:

| Token | Hex | Use |
|---|---|---|
| `#0A0A0A` | Negro Profundo | Main background |
| `#C9A84C` | Oro FIFA | Accents, CTAs, scores |
| `#D62828` | Rojo Vibrante | Errors, alerts |
| `#1A3A5C` | Azul Acero | Secondary cards |
| `#1E1E1E` | Gris Carbón | Cards, panels |
| `#2D6A4F` | Verde Estadio | Finished match indicators |

Framer Motion is used for page transitions (`AnimatePresence` in `layout.tsx`), staggered match card entrances, and `AnimatedNumber` for live point changes.
