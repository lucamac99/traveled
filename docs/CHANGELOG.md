# Changelog

## M1 — Scaffold, sign-in, trips, members, invites (2026-11-18)

**Demo (local):** sign in → create "Japan" (3–17 Apr 2027) → Members & invites → create an Editor link → a second
user opens the link, sees the trip preview, taps Join → both see Luca (Owner) and Giulia (Editor).

- Next.js 16.4 + Tailwind 4 + design tokens from M0; Fraunces/Inter; EN/IT.
- Supabase schema: `profiles`, `trips`, `trip_members`, `trip_invites`, RLS on all, invite RPCs, keep-alive `ping()`.
- Google sign-in (PKCE) with safe `next` redirects; proxy refreshes the session.
- Security headers; join page sends no referrer.
- Tests: 21 unit + 11 database/RLS tests (local Supabase). CI runs lint, typecheck, tests, build, DB tests, type drift.
- Daily Vercel Cron keep-alive; nightly encrypted DB backup workflow (needs secrets).

**Not done yet:** deployed URL (needs your GitHub, Vercel, Supabase and Google accounts — see README › Deploy).

**Known issue:** submitting a form before the page finishes loading used to show a blank page; buttons now wait for
hydration.
