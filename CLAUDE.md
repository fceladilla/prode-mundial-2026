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
├── layout.tsx              ← RootLayout: fonts, Providers, Navbar + leaderboard Sidebar
├── providers.tsx           ← Client wrapper around AuthProvider
├── page.tsx                ← Home / fixture grouped by stage; predictions entered inline on each card
├── ranking/page.tsx        ← Full leaderboard (for mobile, where the sidebar is hidden)
├── clasificacion/page.tsx  ← Group standings tables (reads /api/standings)
├── foro/page.tsx           ← Global comment forum (CommentSection with no matchId)
├── perfil/[userId]/page.tsx ← Public profile: totals + predictions revealed for started matches
├── api/sync/route.ts       ← Cron-driven results sync (see Scoring Rules)
└── api/standings/route.ts  ← Group standings proxy (see below)
```

Planned but **not yet built** (see SOP §8): `partido/[id]/page.tsx` (match detail). Score entry happens inline on `MatchCard`, which also hosts collapsible per-match comments (`CommentSection`) and the all-players predictions panel (`MatchPredictionsPanel`, post-kickoff only).

Components live flat under `components/` (`Navbar`, `Sidebar`, `MatchCard`, `LeaderboardTable`, `Avatar`, `SearchBar`, `CommentSection`, `MatchPredictionsPanel`, `FixtureFilters`, `Flag`, `AnimatedNumber`), not in the nested subfolders the SOP proposes. `SearchBar` (in the Navbar) searches client-side over teams, **groups** (typing "grupo A" → navigates to `/clasificacion?grupo=A`, which filters the standings to that group), dates, matches and users — all matched in-memory (accent-insensitive substring), with users loaded once from the public `users` collection.

On the home fixture each section (day or stage/group) is collapsible. The default is derived, not stored: a section starts **collapsed when all its matches are `finished`** (already played) and expanded otherwise, so past days fold away and you land on the current day. Only explicit user toggles are kept in state (`collapsedOverrides`), so the live `onSnapshot` updates never re-open/close a section the user touched.

**Home read model (Firestore-quota-aware).** The home does **not** keep one live `onSnapshot` over all 104 matches. Because a finished match never changes, it's wasteful to keep it under a live target (a resume-token expiry would re-bill the whole collection). Instead `app/page.tsx` splits the read: a **live `onSnapshot(where('status','!=','finished'))`** for the small, shrinking set that actually changes (today/upcoming/live), plus a **one-time cache-first read of finished matches** (`getDocsFromCache`, falling back to `getDocs` from the server only on a truly cold cache). When a match finishes it leaves the live query (a `'removed'` docChange), and a single `getDoc` pulls its final version into the merged `matchesById` state — so the set stays complete, including matches that finished while away (the cached non-finished set still held them, so the listener emits the removal on resync). Net: cold/expired-token re-reads are capped at the non-finished set instead of all 104, and finished matches cost 0 reads for returning users. The `!=` query needs no composite index (single-field inequality, like the sync's). This builds on the persistent IndexedDB cache in `lib/firebase.ts`.

### Internationalization (i18n)

The UI supports **Spanish (default), Catalan and English**. All user-facing strings live in `lib/i18n.ts` (one flat dictionary per language, typed by `TranslationKey`). Components read them via the `useLanguage()` hook (`hooks/useLanguage.tsx` — `LanguageProvider` wraps the app in `app/providers.tsx`): `t(key, vars?)` for strings, `tStage(stage)` to translate Firestore stage names (stored in Spanish: "Grupo A", "Octavos de Final", ...), and `lang` for locale-aware helpers (`argDateLabel(date, LOCALE[lang])`, `formatRelativeTime(date, lang)`). The choice persists in `localStorage` (`prode-lang`); the switcher (ES/CA/EN) is in the Navbar. First render is always Spanish to match the server HTML — the saved language is applied in an effect after mount (don't read localStorage during render). When adding UI text, add the key to all three dictionaries — TypeScript errors on any missing key.

### Firebase initialization (important)

`lib/firebase.ts` does **not** export ready `auth`/`db` instances. It exports lazy getters `getAuthClient()` and `getDbClient()` plus `googleProvider`. Always call these getters from inside an effect or event handler (client-side) — never at module top level. This is deliberate: eager `getAuth()` at import time throws `auth/invalid-api-key` during `next build`'s static prerender (pages have no env vars then). Auth context/hook lives in `hooks/useAuth.tsx`.

**Google sign-in is popup-on-desktop, redirect-on-mobile** (`hooks/useAuth.tsx`). `signInWithPopup` is unreliable on mobile browsers — the user completes the Google flow but returns to the app still signed out (the popup closes and the session is lost silently). So `signIn()` uses `signInWithRedirect` directly when `isMobile()` (userAgent check), and `signInWithPopup` on desktop with a redirect fallback if the browser blocks/closes the popup (`auth/popup-blocked`, `popup-closed-by-user`, `cancelled-popup-request`, `operation-not-supported-in-this-environment`). The redirect flow returns via `getRedirectResult()` (called in the mount effect), which runs the same `upsertUserProfile()` as the popup path — so the Firestore profile is created/refreshed either way. The redirect flow uses the `__/auth/handler` on `authDomain`, so any new app domain must be added under Firebase Console → Authentication → Settings → Authorized domains or the redirect fails.

**First-party `authDomain` (required for redirect on Chrome M115+/Safari/Firefox).** Modern browsers partition/block third-party storage, which broke `signInWithRedirect` on mobile Chrome: the user finished the Google flow but `getRedirectResult()` came back empty (session never started; it only "worked after several tries"). Fix per Firebase's [redirect-best-practices](https://firebase.google.com/docs/auth/web/redirect-best-practices): make the auth handler first-party. `vercel.json` reverse-proxies `/__/auth/:path*` to `https://prode-mundial-2026-e55be.firebaseapp.com/__/auth/:path*` (transparent rewrite, not a 302), and `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` must be set to the **app's own domain** (`prode-mundial-2026-peach.vercel.app`) in Vercel, not `*.firebaseapp.com`. The OAuth redirect URI `https://prode-mundial-2026-peach.vercel.app/__/auth/handler` must also be added to the Google Cloud OAuth client. `.env.local` keeps the `*.firebaseapp.com` value for local dev (desktop popup works on localhost; the proxy only exists on the deployed domain).

## Data Model (Firestore)

Four top-level collections:

| Collection | Purpose |
|---|---|
| `users/{userId}` | Profile + denormalized totals (`totalPoints`, `exactResults`, `correctResults`) |
| `matches/{matchId}` | Fixture data, `status: "upcoming"\|"finished"`, `result` (final score, set by the scoring scripts only). We **don't track live play**: a match stays `upcoming` until it `finishes`; the "EN VIVO" label is derived client-side from kickoff time, so there are no per-minute writes. (`MatchStatus` still includes a legacy `"live"` and an unused `liveScore` field; nothing writes them anymore.) |
| `predictions/{userId}_{matchId}` | One doc per user per match; `evaluated: false` until match finishes. Carries a `displayName`/`photoURL` snapshot so other users can render them post-kickoff. |
| `comments/{commentId}` | Forum comments. `matchId: null` = global forum; otherwise tied to a match. Immutable once posted (author may delete). |
| `leaderboard/{userId}` | Materialized view (SOP). **Not used in the MVP** — the leaderboard reads `users` directly, ordered by `totalPoints` desc. Ties are broken **client-side** in `LeaderboardTable` by `correctResults` desc (more "aciertos" ranks higher), so no composite index is needed. |

Other users' predictions become readable **at kickoff time**: the rules allow reading them once `match.scheduledAt <= request.time` **or** `match.status !== 'upcoming'`. The kickoff condition is what reveals them on time — and it's the only one that fires during the match, since `status` now stays `upcoming` until the match finishes (see "Reveal/lock at kickoff" below). A query on someone else's `userId` is rejected by the rules engine — read the docs by deterministic id `{userId}_{matchId}` instead (see `app/perfil/[userId]/page.tsx`, which queries matches by `scheduledAt <= now`).

`scheduledAt` is stored as UTC timestamp. `scheduledAtARG` and `scheduledAtESP` are pre-computed strings (UTC–3 and UTC+2 respectively — no DST for Argentina; Spain uses CEST in June–July).

## Scoring Rules

- Exact scoreline → **5 points**
- Correct winner/draw (wrong score) → **3 points** (was 2 until 2026-06-12; existing predictions were migrated with `scripts/migrateOutcomePoints.ts`)
- Miss → **0 points**
- Exact replaces (does not stack with) correct-outcome; max 5 pts per match.

**Knockout stage**: matches are scored on the **90-minute (regulation) result only** — extra time and penalty shootouts are ignored, and there is no separate "who advances" pick (decided 2026-06-27). A tie decided on penalties is recorded and scored as a draw. The scoring engine (`computePoints`) is stage-agnostic; the rule lives in **how the sync picks the score** (`scoreAt90` in `lib/sync.ts`). In football-data.org's `score`, `fullTime` is the **grand total** (`fullTime = regularTime + extraTime + penalties`, e.g. a 1-1 won 4-2 on pens arrives as 5-3). We do **not** just trust `score.regularTime`: it is **unreliably `null`** — populated for some penalty games but `{home:null,away:null}` for matches decided in extra time (that exact case mis-scored BEL-SEN as 3-2 instead of 2-2 on 2026-07-02). So `scoreAt90` **derives** the 90' score: `fullTime − extraTime − penalties` (component-wise; `regularTime` used only as a shortcut when present). **Never read `fullTime` directly.** Separately, `knockoutDetail` captures how the match actually ended — stored in `match.resultDetail` (`{ duration, fullTime (after ET, before pens), penalties, winner }`, `null` for regular-time results) purely for display (the "🏆 X avanzó en la prórroga / por penales" line in `MatchCard`); it never affects points. `scripts/reconcileKnockout.ts` (`npm run reconcile-knockout`, add `-- --apply` to write) re-derives every finished knockout match from the API, re-evaluating predictions if the 90' score changed and backfilling `resultDetail`. When loading a knockout result by hand with `set-result`, enter the **90-minute** score.

Scoring is applied by the **`scripts/setResult.ts` admin script** — run `npm run set-result -- <matchId> <home> <away>`. It sets `result` + `status: "finished"`, evaluates every prediction with `computePoints` (`lib/scoring.ts`), and increments `users.totalPoints`/`exactResults`/`correctResults` via the Admin SDK (bypasses rules; no Blaze/Functions needed). Idempotent — skips predictions already `evaluated`. The `evaluatePredictions` Cloud Function (SOP §7) that would do this automatically on `matches/{matchId}` update is the planned upgrade, **not yet built** (needs the Blaze plan). Security rules block clients from writing their own score fields, so the Admin SDK is the only way points are awarded.

**Knockout brackets fill themselves in**: knockout fixtures are seeded with placeholder teams (`code: "TBD"`, name `"2º Grupo A"`). The code-pair `matchKey` can't pair a `TBD` match, so the sync also runs a **fill pass** (`runSync` in `lib/sync.ts`): for each still-`TBD` match it finds the API match by **exact `utcDate`** (knockout kickoffs are staggered, so the timestamp is unique) and, once the API has real teams, writes `homeTeam`/`awayTeam` taking name + emoji flag + code from **our own group-stage team catalog** (`lib/fixtureTeams.ts`, built from `scripts/fixture_mundial2026.json` — Spanish names + emoji flags, not the API's English names/crests). No extra Firestore reads (reuses the already-fetched API matches + the non-finished snapshot). Once a cross has real codes, the normal `matchKey` path finalizes it on later runs. `SyncSummary.filled` counts crosses defined per run.

**Group standings** are served by `GET /api/standings` (`runtime = 'nodejs'`, `revalidate = 1800`), which proxies football-data.org's `/competitions/WC/standings`, caps the upstream call to once per 30 min (`next: { revalidate }` — the opposite of the live sync, where slow standings make caching desirable), and enriches each row with our team catalog (same Spanish-name + emoji-flag rendering as the rest of the app). Public, no auth. The fetch + presentational table live in `components/StandingsTable.tsx` (`useStandings()` hook + `<StandingsTable>`), reused in two places: `app/clasificacion/page.tsx` renders one table per group (top 2 highlighted as qualifying; `?grupo=A` filters to one group), and the **home fixture, when filtered by a country (`?equipo=ARG`), shows that team's group table with the team's row highlighted** (and hides the countdown `Hero` while any search filter is active). Standings come from the API, **not** computed from our `matches`, so FIFA tiebreakers are exact.

**Automatic sync**: the core logic lives in `lib/sync.ts` (`runSync(db, apiKey)`), shared by a CLI script and a serverless endpoint. It pulls scores from football-data.org (competition `WC`), matches fixtures by FIFA code pair + UTC date, and **only finalizes matches**: for each `FINISHED` match it writes `result` + `status: "finished"` and runs the scoring. It does **not** track live play (no `live` status, no `liveScore`). Each run reads only the **non-finished** matches (`where('status','!=','finished')`) and makes **one** API request (free plan allows 10/min) — kept deliberately light to stay well under Firestore's free-tier daily quotas. `lib/firebaseAdmin.ts` provides the single reusable Admin SDK init (`getAdminDb()` — `FIREBASE_SERVICE_ACCOUNT` env in serverless, falls back to `scripts/serviceAccountKey.json` locally).

Because nothing needs refreshing *during* a match, the sync only has to run often enough to finalize matches soon after they end — **every ~30 min during match days is plenty** (was `*/5`, which was both unnecessary and a Firestore-read hog). Three triggers run the same `runSync`:

1. **`GET /api/sync`** (`app/api/sync/route.ts`, `runtime = 'nodejs'`) — the primary path. Protected by `Authorization: Bearer <CRON_SECRET>` (enforced only when `CRON_SECRET` is set). Hit it every ~30 min during match hours from an **external cron (cron-job.org)**. Needs `FOOTBALL_DATA_API_KEY`, `FIREBASE_SERVICE_ACCOUNT`, `CRON_SECRET` as Vercel env vars.
2. **Vercel Cron** (`vercel.json`) — daily safety net (`0 12 * * *`; daily is the max frequency on the Hobby plan). Vercel adds the `CRON_SECRET` bearer automatically.
3. **`scripts/syncResults.ts`** (`npm run sync-results`) — thin wrapper over `runSync`, run manually or by `.github/workflows/sync-results.yml` as a second safety net. Uses the `FOOTBALL_DATA_API_KEY` + `FIREBASE_SERVICE_ACCOUNT` GitHub Actions secrets.

**The upstream `fetch` MUST stay `cache: 'no-store'`.** In Next.js App Router, `fetch()` is cached by the Data Cache by default. When `runSync` runs inside `GET /api/sync` on Vercel, an un-flagged fetch makes the cron evaluate a **stale cached snapshot** of the football-data API — so a match that has already ended keeps being seen as in-play and never gets finalized — even though the cron fires and returns `200 OK`. The CLI (`npm run sync-results`, plain Node) doesn't go through Next's cache, which is why running it locally always shows fresh data and "fixes" a stuck match. `fetchApiMatches` in `lib/sync.ts` passes `cache: 'no-store'` to force fresh data on every run; `dynamic = 'force-dynamic'` on the route alone did **not** propagate to the imported module's fetch. Symptom to watch for: prod `/api/sync` logs show a match as still `IN_PLAY`/`PAUSED` while a direct API call (or `npm run diag-sync` vs the live API) shows it `FINISHED`. To finalize a match immediately, run `npm run sync-results` or `npm run set-result -- <matchId> <h> <a>`.

**`npm run diag-sync`** (`scripts/diagSync.ts`) — read-only diagnostic: dumps the Firestore state (status / `liveScore` / `result` / team codes) of every match within ±24h. Use it to check whether the sync is actually applying updates without touching anything.

### Reveal/lock at kickoff

Predictions both **lock** and become **public to other users** at the exact kickoff time, not when the sync flips `status`. Both UI and rules key off `scheduledAt`: `MatchCard` computes `started = now >= scheduledAt` (with a `setTimeout` that re-renders the card exactly at kickoff so an open page updates without reload), and `locked`/`revealed` derive from it; the rules allow reading others' predictions once `scheduledAt <= request.time`. `useMatchPredictions(matchId, enabled)` and `MatchPredictionsPanel` gate on that boolean, not on `status`. The same `started` boolean also drives the **"EN VIVO"** label (red, pulsing) from kickoff until the match is `finished` — there's no partial score shown, just the live badge and the viewer's own prediction.

## Business Rules

- Predictions lock automatically at kickoff (`scheduledAt <= now`) or when `match.status !== "upcoming"` — enforced by Firestore Security Rules, not just the UI.
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

Framer Motion drives the interaction polish: staggered `MatchCard` entrances; `AnimatedNumber` (`components/AnimatedNumber.tsx`) for numbers that roll to their new value (live scoreboard, `+X pts`, leaderboard totals — it skips the first render and only animates on change); tactile `whileTap`/`whileHover` on the Save / sign-in buttons and fixture filter chips; the `LeaderboardTable` rows reorder with a `layout` spring as points change; the active fixture filter has a sliding `layoutId` pill. The active nav section is highlighted (oro + bold) in the `Navbar` via `usePathname` (`NavLink`).
