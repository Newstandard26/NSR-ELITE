# NSR Field Canvassing App

A full-stack field canvassing / door-knocking PWA for **New Standard Restoration**
(roofing & exterior restoration, Roscoe, IL). Map-first interface for storm
canvassing, territory management, and lead tracking, with a native **AccuLynx**
CRM integration.

## Tech Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** (dark-first, NSR brand colors, Mulish font)
- **Mapbox GL JS** — satellite-streets hybrid (dark)
- **PostgreSQL** via **Prisma ORM**
- **NextAuth.js** — role-based access (ADMIN / MANAGER / REP)
- **next-pwa** — offline caching + installable
- Serverless API routes

## Getting Started

```bash
# 1. Install deps
npm install

# 2. Configure environment
cp .env.example .env
#   Fill in DATABASE_URL, NEXTAUTH_SECRET, MAPBOX tokens, ACCULYNX_API_KEY, etc.

# 3. Set up the database
npx prisma migrate dev --name init
npm run db:seed      # seeds 7 default disposition pins + NSR users

# 4. Run
npm run dev          # http://localhost:3000
```

### Seeded accounts

The seed creates an admin, a manager (Matt), and reps (Juan, Aiden, Skylar,
Branden, Andy, Mitch, Blake). Default password for all: `ChangeMe123!`
(override via `SEED_PASSWORD`). **Change these in production.**

## Required Environment Variables

See `.env.example`. The browser needs `NEXT_PUBLIC_MAPBOX_TOKEN`; photo upload
needs `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` + `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
(unsigned preset). The AccuLynx key is **server-side only**.

## Key Concepts

### Disposition pins are data, not code
Every map pin and the rep disposition dropdown are driven by the
`DispositionStatus` table. Colors are user-defined hex values applied via inline
styles — never hardcoded Tailwind classes. Managers/admins manage pins under
**Settings → Disposition Pins** (create, edit, drag-to-reorder, deactivate).
Deactivating preserves historical leads; a pin with leads attached cannot be
hard-deleted.

### AccuLynx integration
All AccuLynx calls run server-side through `lib/acculynx.ts`. Creating a lead
from a Lead Card pushes to AccuLynx, stores the job id, and auto-flips the
disposition to "Converted". A 15-minute sync (`GET /api/acculynx/sync`, callable
by cron with `x-cron-secret`) refreshes milestone status, and
`POST /api/webhooks/acculynx` receives real-time updates.

## Build Status

**Implemented:** schema + seed, auth + role guards, AccuLynx service layer, full
API surface (leads, dispositions, territories, appointments, reps, dashboard,
leaderboard, sync, webhook), map dashboard with dynamic pins + filters + heatmap
+ GPS, Lead Card drawer, disposition pin manager, CSV import, manual lead entry
with **Google Places address autocomplete** (proxied server-side so the key
stays private), leads/appointments/leaderboard/dashboard/territories/profile/
settings pages, PWA config, Dockerfile.

**Scaffolded / follow-up:** in-map Mapbox-Draw polygon drawing UI, manager
rep-location live layer, offline write queue, browser push for appointment
reminders, PDF export, user CRUD UI. See inline `TODO`/notes.

### Address autocomplete

Manual lead entry (`Leads → Add Lead`) suggests real addresses as you type and
auto-fills city/state/zip and map coordinates. It calls Google through our own
`/api/places/*` routes, so only `GOOGLE_PLACES_API_KEY` (server-side) is needed —
no browser-exposed key. Enable the **Places API** on that key in Google Cloud.

## Docker

```bash
docker build -t nsr-canvassing .
docker run -p 3000:3000 --env-file .env nsr-canvassing
```
