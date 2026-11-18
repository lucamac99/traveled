# Decisions log

Newest first. Each entry: what was decided, why, and what it affects.

## 2026-11-18 — M1 build

| # | Decision | Why | Affects |
|---|---|---|---|
| 1 | Next.js **16.4** with Cache Components (scaffold default). Every Supabase read sits behind `<Suspense>` and calls `connection()`. | Supabase reads cookies and the clock, which must never be prerendered. | All pages |
| 2 | i18n with **next-intl**, no locale in URLs: locale comes from the `NEXT_LOCALE` cookie or browser language, **English as fallback**. EN + IT strings from day one. | Keeps invite links language-neutral; default language question still open, fallback is easy to change in `src/i18n/routing.ts`. | All UI |
| 3 | Invites: 32-byte random token in the link, only its **sha256** stored; join and preview only through `security definer` RPCs. Links expire after 14 days and can be revoked. | A database leak must not leak usable invite links; non-members can't read trips directly. | M1 |
| 4 | Profiles readable only by people who share a trip (`shares_trip_with`). Signed-out (`anon`) has no table access at all. | Least privilege. | All tables |
| 5 | Supabase new key format: **publishable key** in the app; no secret/service key in the app yet. | Not needed until the public recap (M7). | Env vars |
| 6 | shadcn/ui is added when first needed (sheets/dialogs in M2–M3), not in M1. | M1 only needs buttons and inputs, built on the tokens. | UI |
| 7 | Backups run nightly as an **encrypted artifact in the private repo** (30 days) until R2 exists in M6. | Supabase free plan has no backups; R2 isn't set up yet. | Ops |
| 8 | Action forms stay disabled until hydrated. | With Cache Components, a no-JS form-action response rendered a blank page in testing (data was saved). | Forms |

## 2026-11-18 — M0 design defaults

| # | Decision | Why | Affects |
|---|---|---|---|
| 1 | Name stays **Wayfare**. Accent **terracotta `#C2532B`** on warm paper `#F7F5F1`. | User chose defaults. | All UI |
| 2 | Fonts: **Fraunces** (titles), **Inter** (UI). Caveat only in the Polaroid template. | Spec suggestion; Inter reads best at small sizes in the street. | All UI, templates |
| 3 | 10-colour day palette, darkened so white numerals stay readable; repeats after day 10. | Each day needs one consistent colour on map, chips and timeline. | Map, Plan, templates |
| 4 | Dark mode: accent `#E07A52` with dark text on it. | White on the lighter accent fails AA contrast. | Buttons in dark mode |
| 5 | Tokens live in `src/styles/tokens.css`; the design canvas is the visual reference. | Spec §4.1. | M1 Tailwind setup |

## 2026-11-18 — Spec review before M0

| # | Decision | Why | Affects |
|---|---|---|---|
| 1 | Project lives in its own folder and repo (`wayfare`), on personal GitHub/Vercel/Supabase accounts. | The spec was drafted inside an unrelated work repository. | Setup, M1 |
| 2 | v1 sign-in is **Google OAuth only**. Magic link is deferred until a custom SMTP provider is configured. | Supabase's default email only reaches members of the Supabase org team and is capped at 2 emails/hour ([docs](https://supabase.com/docs/guides/auth/auth-smtp)). | M1 |
| 3 | Each **day** has an optional timezone that overrides the trip default. | A single trip timezone shows travel-day times wrong (e.g. a Milan departure in Tokyo time) and misplaces photos. | Data model, Today, M6 auto-placement |
| 4 | The service worker caches media by **storage key**, ignoring the signed-URL query string. | Signed URLs change on every request, so URL-keyed caches miss when offline. | M4 |
| 5 | **Photon** for search-as-you-type; **Nominatim** only as a fallback for one-off lookups, with an app-identifying User-Agent. | Nominatim's usage policy forbids autocomplete and generic User-Agents. | M2 |
| 6 | Explicit RLS exceptions for `profiles`, `places`, private `documents` and the public recap. | "Member of the trip" does not fit tables that are not trip-scoped, or anonymous public reads. | M1, M5, M7 |
| 7 | Nightly `supabase db dump` via GitHub Actions to an encrypted private bucket, plus per-trip JSON export. | The Supabase free plan has no automatic backups ([FAQ](https://supabase.com/kb/faqs/platform/free-plan-backups)). | M1 (workflow), Settings |
| 8 | R2 bucket CORS allows `PUT` and `GET` from the app origin. | Browser presigned uploads and canvas-based album export both need it. | M6, M7 |
| 9 | Google Maps link resolution follows redirects manually and checks every hop against the allowlist, with a hop cap. | Checking only the first URL still allows SSRF through redirects. | M2 |
| 10 | Test GPS extraction on a real iPhone at the start of M6; fall back to time-only placement. | iPhone Safari may strip location from uploaded photos. | M6 |

## Pending (ask before the related milestone)

- App name, colors and mood references (M0). Working name: Wayfare.
- Default UI language, Italian or English (M1).
- Group size and expected photos/videos per trip (M6).
- Current free-tier limits of Supabase, R2, Vercel, ORS and OpenFreeMap: record them here at setup (M1).
