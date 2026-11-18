# Wayfare — Travel Planner & Memories (App Description)

> **Purpose of this file:** the single source of truth Claude uses to design and build the app.
> Read it fully before writing code. When something is ambiguous, pick the option that best serves
> **"open the app on your phone, in the street, and know exactly what to do next"**, and log the
> decision in `docs/DECISIONS.md`.
>
> *Working name: "Wayfare". You can rename it.*

---

## 1. Vision

Replace the shared Word doc on Google Drive (a long page of links, notes and phone numbers) with a
**beautiful, mobile-first web app** for a small group of friends that:

1. **Plans** the trip day by day on a real map, with a clear, good-looking route.
2. **Guides** you during the trip: what's next, one tap to navigate, call, or open the booking.
3. **Prepares** you before you leave: documents, flights, insurance, checklist.
4. **Remembers** the trip afterwards: everyone's photos and videos, pick the best ones, and export
   ready-to-post albums (Instagram carousel or story, web recap).

**Users:** the owner and friends, a few groups of about 2–10 people. **Budget: €0** to run and deploy.

### Product principles
- **Phone first, in the street.** One-handed use, large tap targets, works with poor signal (offline).
- **Everything in one place.** Every stop has its navigate link, phone, website, booking code and notes.
- **Beautiful by default.** Premium, modern, calm. No admin-panel look.
- **Low effort input.** Paste a Google Maps link and the app fills the rest. Bulk import is supported.
- **Collaborative.** Everyone can add, edit and upload, with live updates.

---

## 2. Scope

### In scope (v1)
| Area | Summary |
|---|---|
| Trips | Create, edit and archive trips. Invite friends by link. Roles: owner, editor, viewer. |
| Itinerary | Days, then ordered stops. Each stop has time, place, links, phone, notes, images, booking info. |
| Map | Real interactive map. Numbered stops. Route drawn per day with distinct colors. Transport mode per leg. |
| On-trip mode | "Today" screen that opens automatically during the trip, showing Now/Next and one-tap navigate. |
| Pre-departure | Checklist (shared and per person), bookings (flights, hotels, cars), documents vault, key info, countdown. |
| Contacts & info | Hotel and host phones, emergency numbers, embassy, Wi-Fi codes, all tappable. |
| Media | Everyone uploads photos and videos, which are auto-placed on day and stop using EXIF date and GPS. |
| Curation | Hearts/votes, "Best of" auto-selection, manual picks. |
| Album studio | Graphic templates, then export to Instagram carousel (4:5), Story (9:16), or a shareable web recap. |
| Import | Import trips from JSON (schema below), plus a helper to convert the 2 existing trips. |
| PWA | Installable on the phone home screen, with the trip available offline. |
| i18n | English and Italian, chosen from browser language and switchable in settings. |

### Out of scope (v1). Do not build unless asked.
Expense splitting, booking engines and price search, public social feed, native apps, AI features that
need paid APIs, server-side video transcoding, print photobook ordering.

---

## 3. Tech stack (all free tier)

Do not swap any of these without logging the reason in `docs/DECISIONS.md`.

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js (latest stable, App Router) + TypeScript (strict)** | Server actions or route handlers for the small backend needs. |
| UI | **Tailwind CSS + shadcn/ui + Motion (framer-motion)** | Design tokens as CSS variables. Light and dark themes. |
| Map rendering | **MapLibre GL JS** (via `react-map-gl/maplibre`) | Free, vector, can be styled to match the brand. |
| Map tiles | **OpenFreeMap** (no API key) | MapTiler free tier is the fallback. Keep attribution visible. |
| Geocoding | **Photon** (komoot), **Nominatim** as fallback | Photon powers search-as-you-type. Nominatim forbids autocomplete and requires a User-Agent that identifies the app (e.g. `Wayfare/1.0`), so use it only for one-off lookups. Debounce and cache results in the DB. |
| Routing (road/walk) | **OpenRouteService** free API key | Compute once when a leg is saved and **store the geometry**. Never compute on every render. The key is used server-side only. |
| Navigation | **Google Maps / Apple Maps deep links** | No Google API key needed. See §6.4. |
| DB, auth, realtime | **Supabase** (Postgres + Auth + Realtime + RLS) | v1 sign-in is **Google OAuth only**. Magic link is deferred: Supabase's default email only reaches members of the Supabase org team (max 2 emails/hour), so it needs a custom SMTP provider (e.g. Brevo free tier). |
| Media storage | **Cloudflare R2** (S3 API, presigned uploads) | About 10 GB free and no egress fees. Needs a card on file but costs €0 within the free tier. Fallback: Supabase Storage (≈1 GB). Configure bucket **CORS** for the app origin: `PUT` for presigned uploads and `GET` so the album export canvas is not tainted. |
| Image processing | Client-side: `browser-image-compression`, `exifr`, `heic2any` | iPhone HEIC is converted to JPEG/WebP before upload. |
| Album export | `html-to-image` + `JSZip` + Web Share API | Templates are React components rendered to PNG at exact pixel sizes. |
| PWA / offline | **Serwist** | Cache the app shell, trip JSON, stop thumbnails and visited map tiles. |
| Hosting | **Vercel Hobby** | Non-commercial personal use is allowed. One daily Vercel Cron pings Supabase so the free project does not pause. |
| Quality | ESLint, Prettier, Vitest (unit), Playwright (key flows) | Run them in a GitHub Actions workflow. |
| Backups | Nightly `supabase db dump` in GitHub Actions, plus per-trip JSON export | The Supabase free plan has no automatic backups. Dumps contain personal data: store them encrypted in a private bucket, not as public CI artifacts. |

> Free-tier limits change. **Check the current limits of Supabase, R2, Vercel, ORS and OpenFreeMap at
> setup** and write them in `docs/DECISIONS.md`.
> Firebase was rejected because Storage now needs the paid Blaze plan.
> Google Maps JS API was rejected because it needs a billing account. Google is used for deep links only.

---

## 4. Design direction

### 4.1 Use Claude Design first (Phase 0)
Before building the UI, create the visual system and key screens in **Claude Design**, then hand them
off to Claude Code:
- **Design system:** colors, type scale, spacing, radii, shadows, motion, icon set, map style palette.
- **Key screens (mobile first, plus desktop):** Trips list, Trip home, Day timeline, Map (full screen
  and split), Stop detail sheet, Today/On-trip, Pre-departure, Media gallery, Album studio, and 3+
  Instagram templates.
- Export tokens into `src/styles/tokens.css` and Tailwind config, and keep them in sync.

### 4.2 Look & feel
- **Mood:** a modern travel magazine with a calm, premium feel. Big imagery, generous whitespace,
  soft depth (layered cards, subtle blur on sheets).
- **Typography:** one expressive display face for trip and day titles (e.g. *Fraunces* or
  *Instrument Serif*) and a clean sans for UI (e.g. *Inter* or *Geist*). Use Google Fonts.
- **Color:** neutral base with one warm accent. Each day gets its own color from a harmonious
  palette of 8–10 colors, used **consistently** on map routes, day chips and timeline markers.
- **Map style:** muted custom MapLibre style (desaturated land, soft water, few labels) so the route
  and markers stand out. Provide light and dark versions.
- **Motion:** route lines animate when drawn, sheets snap to height (peek, half, full), and shared
  layout transitions go from timeline card to stop detail. Honor `prefers-reduced-motion`.
- **Mobile patterns:** bottom tab bar (Plan · Map · Today · Prep · Memories), bottom sheets instead of
  modals, swipe between days, sticky day header.
- **Accessibility:** WCAG AA contrast, 44px minimum tap targets, full keyboard navigation on desktop,
  alt text on media.

---

## 5. Information architecture

```
/                          → My trips (cards with cover, dates, countdown or "ongoing" badge)
/t/[tripId]                → Trip home (cover, dates, members, quick stats, next action)
/t/[tripId]/plan           → Days list + timeline per day (drag to reorder)
/t/[tripId]/map            → Full-screen map, day filter, route legend
/t/[tripId]/today          → On-trip mode (auto default route while trip is ongoing)
/t/[tripId]/prep           → Pre-departure: checklist, bookings, documents, key info
/t/[tripId]/memories       → Gallery (by day/stop/person), voting, Best of
/t/[tripId]/memories/studio→ Album studio: templates → export
/t/[tripId]/settings       → Members, invite link, roles, import/export, delete
/r/[shareSlug]             → Public read-only web recap (opt-in, unguessable slug)
```

---

## 6. Features in detail

### 6.1 Trips & members
- Create a trip with title, destination(s), dates, cover image and a default timezone. Each day
  inherits it and can override it (travel days, trips across time zones).
- Invite friends with a link that has a token, can expire, and can be revoked. Roles are **owner**,
  **editor** and **viewer**.
- All changes sync live between members (Supabase Realtime) and show small "edited by" avatars.

### 6.2 Itinerary (Plan)
- The trip has **Days** (auto-generated from the dates, editable title, e.g. "Day 3 · Kyoto temples").
- Each day has ordered **Stops**:
  - `title`, `category` (sight, food, hotel, transport, activity, shopping, other), `start_time`,
    `duration`, `place` (name, address, lat/lng, google_maps_url), `phone`, `website`,
    `booking` (provider, confirmation code, check-in/out, price, PDF attachment), `notes` (markdown),
    `images`, `opening_hours` (free text), `tags`, and an optional `is_optional` flag.
- **Quick add:** paste a Google Maps link and the app resolves it to name, address and coordinates:
  - Resolve short links (`maps.app.goo.gl/...`) **server-side** by following the redirect, then parse
    `@lat,lng`, `!3d..!4d..`, `q=` or `place/` from the URL. If that fails, geocode the name with Photon.
  - Always keep the original link for navigation.
- Drag and drop reorders stops within a day and moves them between days.
- Each **Leg** between two consecutive stops has a transport mode (walk, car, public transport,
  train, ferry, flight) and an estimated duration and distance.

### 6.3 Map
- Numbered markers in the day color with a category icon. Clusters appear when zoomed out.
- **Route rendering:**
  - Walk and car legs use real road geometry from ORS (cached in DB).
  - Train, ferry and public transport legs use a smooth dashed curve. Store the real geometry
    if one is available.
  - Flight legs use a geodesic arc with a small plane icon.
  - The line has a casing (outline), so it stays readable on any background, plus a subtle glow.
    Draw-on animation runs when a day is selected.
- Day filter chips: All days, or Day N. The map fits bounds to the selection.
- Tapping a marker opens the stop bottom sheet. Tapping a timeline card flies the map to the stop.
- Desktop: split view (timeline left, map right). Mobile: full-screen map with a draggable sheet.
- Show "You are here" when the user grants geolocation permission. It is optional and never stored.

### 6.4 Today / On-trip mode (key UX)
- While the trip is ongoing, the trip opens on **Today**.
- **Now / Next card:** the next stop, its time, the travel time from the current location (if
  permitted), and big buttons for **Navigate · Call · Open booking · Website**.
- **Navigate deep link** (no API key):
  `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&travelmode=<walking|driving|transit>`.
  Use the stored `google_maps_url` when it identifies a specific place. Offer Apple Maps on iOS.
- Phones are `tel:` links with numbers stored in E.164. Addresses can be copied with one tap.
- The day timeline marks stops as done or upcoming. Swipe to the next day.
- **Must work offline:** the whole trip (text, contacts, booking codes, thumbnails) is cached on the device.
  Signed URLs change on every request, so the service worker caches media by **storage key** (query
  string ignored), not by full URL.

### 6.5 Pre-departure (Prep)
- **Countdown** to departure and progress on the checklist.
- **Checklist** of shared items and per-person items (each member ticks their own):
  - Default template: passport validity (≥6 months), ID card, visa/ESTA/eTA, flights booked,
    online check-in, travel insurance, health card (EHIC), vaccines, driving licence + IDP, eSIM/roaming,
    currency/cards, adapters, offline maps, accommodation confirmed, emergency contacts shared.
  - Items have an optional due date, assignee and link.
- **Bookings:** flights (number, times, terminal, PNR), accommodation, car rental, tours. These also
  appear automatically as stops in the itinerary.
- **Documents vault:** PDFs and images (tickets, insurance policy).
  - **Personal documents (e.g. passport scans) are private to their owner** by default and can be
    shared explicitly.
  - Use signed URLs only.
- **Key info:** local emergency number, embassy/consulate, insurance hotline, Wi-Fi codes, currency
  and time difference, useful phrases (free text).

### 6.6 Media (Memories)
- **Upload from everyone:** multi-select from the phone gallery, drag and drop on desktop.
  - Run the processing in a web worker: read EXIF (date, GPS, orientation), convert HEIC to JPEG,
    then create a **display version** (≈2048px long edge, WebP/JPEG ~80%) and a **thumbnail** (≈400px).
  - Ask the user whether to keep the original. The default is display version only, to save storage.
  - Upload directly to R2 with presigned URLs.
- **Videos:** size cap (e.g. 200 MB), client-side poster frame, played in-browser. No server transcoding.
- **Auto-placement:** match each media item to a day from its EXIF timestamp, using **that day's
  timezone** (EXIF dates usually carry no offset). Match it to the nearest stop from GPS within about
  500 m. Allow manual override.
  - iPhone Safari may strip GPS from uploaded photos. Verify on a real iPhone at the start of M6.
    Without GPS, place by time only.
- **Views:** grid by day, by stop, by person, and a map of photos.
- **Curation:** each member can heart items, and the owner/editors can "pick" items.
  **Best of** = picks plus the top-hearted items, balanced across days.
  Hide duplicates and near-duplicates (perceptual hash).

### 6.7 Album studio (output)
- Choose a **format**:
  - Instagram carousel (1080×1350, up to 20 slides)
  - Story (1080×1920)
  - Square (1080×1080)
  - Web recap page
- Choose a **template** (at least 5 in v1, designed in Claude Design):
  1. *Minimal* (full-bleed photo with a small caption and date)
  2. *Polaroid* (white frame, handwritten-style caption)
  3. *Film strip* (3 frames, grain)
  4. *Map + photo* (mini route map of the day with a hero photo)
  5. *Day recap* (title slide, collage grid, stats: km, stops, photos)
- Auto-fill from Best of, then let the user reorder slides, swap photos, edit captions, and choose
  colors from the trip palette.
- **Export:** PNG/JPEG files at exact sizes, as a ZIP, or with the **Web Share API** so the user can
  share straight to Instagram from mobile.
- **Web recap:** a scrollytelling page that replays the route day by day with photos. It is read-only
  and can be shared through an unguessable link that the owner can revoke.
- *Stretch:* slideshow video (Reel) via `ffmpeg.wasm` on the client. Not in v1.

---

## 7. Data model (Supabase / Postgres)

Use UUID primary keys and `created_at`/`updated_at` on every table. Enable **RLS on every table**.
The default policy is: *the user is a member of the trip*. Write requires the editor role or above.

Exceptions, each with its own explicit policy:
- `profiles`: readable by users who share a trip; writable only by their owner.
- `places`: a geocoding cache shared across trips. Readable by signed-in users, written only
  server-side. Store only geocoding output here, never private notes.
- `documents` with `visibility = private`: owner only.
- Public recap (`/r/[shareSlug]`): read server-side with the service role, limited to that album and
  its media. Never exposed through client RLS.

```
profiles(id → auth.users, display_name, avatar_url, locale)
trips(id, owner_id, title, destination, start_date, end_date, timezone /*default*/, cover_media_id, palette jsonb, archived_at)
trip_members(trip_id, user_id, role: owner|editor|viewer, color)
trip_invites(id, trip_id, token_hash, role, expires_at, revoked_at)
days(id, trip_id, date, index, title, color, notes, timezone /*null = trip default*/)
places(id, name, address, lat, lng, google_maps_url, google_place_id?, source)      -- cached geocoding
stops(id, day_id, position, title, category, start_time, duration_min, place_id, phone_e164, website,
      notes_md, opening_hours, is_optional, tags text[])
legs(id, from_stop_id, to_stop_id, mode, distance_m, duration_s, geometry geojson, computed_at)
bookings(id, trip_id, type: flight|stay|car|tour|other, provider, confirmation_code, starts_at, ends_at,
         details jsonb, price, currency, stop_id?, document_id?)
checklist_items(id, trip_id, title, scope: shared|per_person, due_date, assignee_id, link, position)
checklist_ticks(item_id, user_id, done_at)
contacts(id, trip_id, label, phone_e164, email, notes, category)
documents(id, trip_id, owner_id, title, storage_key, mime, visibility: private|trip)
media(id, trip_id, uploader_id, type: photo|video, storage_key, thumb_key, width, height, taken_at,
      lat, lng, day_id?, stop_id?, phash, caption)
media_votes(media_id, user_id, value)
media_picks(media_id, picked_by)
albums(id, trip_id, format, template, title, slides jsonb, share_slug?, created_by)
```

---

## 8. Import

### 8.1 Import format
The app supports **Settings → Import** with a JSON file that follows `docs/import-schema.json`. Write
this file as a JSON Schema and validate it with Zod. The import must be **idempotent**: the same
`external_id` updates an existing record instead of creating a duplicate.

```json
{
  "version": 1,
  "trip": { "external_id": "japan-2025", "title": "Japan 2025", "destination": "Japan",
            "start_date": "2025-04-03", "end_date": "2025-04-17", "timezone": "Asia/Tokyo" },
  "days": [
    { "date": "2025-04-04", "title": "Tokyo – Shibuya & Harajuku",
      "stops": [
        { "external_id": "d2-s1", "title": "Meiji Jingu", "category": "sight", "start_time": "09:00",
          "google_maps_url": "https://maps.app.goo.gl/...", "phone": "+81 3-3379-5511",
          "website": "https://...", "notes": "Free entry. Go early.",
          "leg_mode_from_previous": "walk" }
      ] }
  ],
  "bookings": [ { "type": "flight", "provider": "...", "confirmation_code": "REDACTED",
                  "starts_at": "2025-04-03T10:05:00+02:00", "details": { "flight_no": "..." } } ],
  "checklist": [ { "title": "Passport valid ≥ 6 months", "scope": "per_person" } ],
  "contacts": [ { "label": "Hotel Gracery", "phone": "+81 ..." } ]
}
```

On import, the app resolves each `google_maps_url` to coordinates (§6.2), computes the legs, and shows
a **preview with warnings** (unresolved places, invalid phones) before anything is saved.

### 8.2 Converting the 2 existing trips
- **Trip A** is already done (we will test Memories on it). **Trip B** is upcoming (we will test
  Plan, Prep and Today on it).
- The source is the current shared documents (Word/Google Doc exports, `.docx`, `.pdf` or `.txt`).
  The user will put them in `import/raw/`, which is **git-ignored** because it contains personal data
  and booking codes.
- **Claude Code converts them once, offline,** into `import/trip-a.json` and `import/trip-b.json`
  following the schema. Keep all links, phones and notes. Never invent missing data: leave fields
  empty and list them in `import/REPORT.md`. This uses no paid API.
- Then import both through the app UI and check the result on the map.
- For past-trip photos, upload them in bulk from the device. The Google Photos Library API can no
  longer read a user's library. The Picker API (the user picks photos) still works, but it is out of
  scope for v1.

---

## 9. Security & privacy
- Use RLS on all tables and private storage buckets. Media and documents are served only through
  short-lived signed URLs.
- Never commit secrets. Provide a `.env.example` with placeholders only. Keep secrets in
  Vercel/Supabase env settings.
- Server-side link resolution must accept **only Google Maps hosts** (allowlist) and use a timeout,
  to prevent SSRF. Follow redirects manually, check **every hop** against the allowlist, and cap the
  number of hops.
- Validate uploads: allowlisted MIME types and size caps. Strip EXIF GPS from images exported for
  public recaps unless the owner opts in.
- Personal documents (passport, ID) are visible only to their owner unless shared explicitly.
- Public recap links are opt-in, use unguessable slugs, can be revoked, and are `noindex`.

---

## 10. Non-functional requirements
- **Performance:** Lighthouse mobile ≥ 90. Trip home is interactive in under 2.5 s on 4G.
  Lazy-load the map and the media.
- **Offline:** the Today, Plan and Prep views and contacts work with no connection once a trip has
  been opened.
- **Responsive:** 360px to 1440px+. Mobile is the primary target.
- **Timezones:** store UTC and show times in the day's timezone (default: the trip timezone), with a
  hint of local device time if it differs.
- **Free-tier guardrails:** cache geocoding and routing results, compress media on the client, and
  show storage usage per trip in Settings.

---

## 11. Delivery plan (milestones)

| # | Milestone | Done when |
|---|---|---|
| M0 | **Design** in Claude Design: system + key screens + 5 templates | Tokens exported, screens approved by the user |
| M1 | Scaffold, auth, trips/members/invites, RLS, CI, deploy to Vercel | A friend can join via link on the deployed URL |
| M2 | Itinerary CRUD + Google Maps link resolution + **JSON import** | Trip B is imported and editable |
| M3 | Map + route rendering (per day colors, modes, animation) | Trip B route looks great on mobile and desktop |
| M4 | Today mode + deep links + **PWA offline** | Works in airplane mode after first open |
| M5 | Prep: checklist, bookings, documents vault, key info | Trip B checklist is usable by all members |
| M6 | Media upload (EXIF, HEIC, compression, R2), gallery, votes, Best of | Trip A photos from 2+ people are auto-placed |
| M7 | Album studio + exports + web recap | Instagram carousel from Trip A posted from a phone |
| M8 | Polish: motion, empty states, i18n IT/EN, a11y, Lighthouse | Acceptance checklist passes |

Each milestone ends with: a short demo note in `docs/CHANGELOG.md`, passing CI, and an updated
deployed preview.

---

## 12. Acceptance checklist (v1)
- [ ] Pasting a `maps.app.goo.gl` link creates a stop with the correct name and position.
- [ ] Each day has a distinct, consistent color across map, chips and timeline.
- [ ] Walk and car routes follow real roads, and flights draw as arcs.
- [ ] From Today, one tap opens navigation to the next stop in Google Maps.
- [ ] All phone numbers can be tapped to call.
- [ ] The app works offline for an opened trip.
- [ ] Members can tick their own per-person checklist items.
- [ ] Photos from different phones (including iPhone HEIC) land on the right day and stop.
- [ ] An Instagram carousel of 10 slides exports at 1080×1350 and shares from mobile.
- [ ] Both existing trips are imported, with a report listing any missing data.
- [ ] Monthly running cost is €0.

---

## 13. Open questions (ask the user before the related milestone)
1. What format are the two existing trip documents in (Google Doc, `.docx`, PDF, or a mix)? (M2)
2. Default UI language: Italian or English? (M1)
3. How many people and roughly how many photos/videos per trip? This decides whether to keep originals. (M6)
4. Final app name and any preferred colors or mood references? (M0)
