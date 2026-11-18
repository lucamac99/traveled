# Wayfare

Mobile-first trip planner and memories app for small groups of friends. Spec: [APP_DESCRIPTION.md](APP_DESCRIPTION.md). Decisions: [docs/DECISIONS.md](docs/DECISIONS.md).

Stack: Next.js 16 (App Router, Cache Components) · Tailwind 4 · next-intl (EN/IT) · Supabase (Postgres, Auth, RLS) · Vercel Hobby. Running cost target: €0.

## Local development

Needs Node 24 and Docker.

```bash
npm install
npx supabase start            # local Postgres + Auth, applies supabase/migrations
cp .env.example .env.local    # fill in the URL and publishable key printed by `supabase start`
npm run dev                   # http://localhost:3000
```

Local sign-in: Google is off by default locally. Either put Google OAuth credentials in `supabase/.env`
(`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`) and set
`[auth.external.google] enabled = true` in `supabase/config.toml`, or create a test user in the local
Auth API and sign in with it.

## Checks

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

`npm test` runs unit tests. The RLS/invite tests in `tests/db` run only when `SUPABASE_TEST_URL`,
`SUPABASE_TEST_PUBLISHABLE_KEY` and `SUPABASE_TEST_SECRET_KEY` point at **local** Supabase (they refuse any other URL).
CI runs both, on every push and PR.

After changing a migration: `npx supabase db reset`, then
`npx supabase gen types typescript --local > src/lib/supabase/database.types.ts && npx prettier --write src/lib/supabase/database.types.ts`.

## Deploy (first time)

1. **GitHub:** create a private repo and push.
2. **Supabase:** create a free project. Then:
   - `npx supabase link --project-ref <ref>` and `npx supabase db push` (applies migrations).
   - Auth > Providers: enable **Google**; disable **Email** (v1 is Google-only, see DECISIONS #2).
   - Auth > URL Configuration: Site URL = your Vercel URL; add `https://<your-app>.vercel.app/auth/callback`
     (and `http://localhost:3000/auth/callback` for local) to Redirect URLs.
3. **Google Cloud:** create an OAuth client (Web). Authorized redirect URI = `https://<ref>.supabase.co/auth/v1/callback`.
   Paste client ID and secret into the Supabase Google provider.
4. **Vercel:** import the repo (Hobby). Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`. The daily keep-alive cron is in `vercel.json`.
5. **Backups (recommended):** add repo secrets `SUPABASE_DB_URL` and `BACKUP_PASSPHRASE` for the nightly encrypted dump.
