# World of Shoegaze

A hand-maintained atlas of shoegaze. No accounts, no tracking. A love letter, written slowly.

Built with **Next.js 15 (App Router) + TypeScript**. Deployed on **Vercel**; band data lives in **MongoDB Atlas** (`lib/db.ts`, `lib/atlas-queries.ts`).

---

## Stack

- Next.js 15 / React 19 / TypeScript
- `next/font` for JetBrains Mono + Instrument Serif
- MongoDB Atlas (`lib/db.ts`, `lib/atlas-queries.ts`)
- Zero CSS framework — the ink-and-paper aesthetic lives in `app/globals.css`

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project layout

```
app/                  # App Router pages (Server Components by default)
  page.tsx            # / → feed (poster grid)
  graph/page.tsx      # /graph — force-directed band graph
  timeline/page.tsx   # /timeline
  random/page.tsx     # /random — redirects to a random band page
  band/[slug]/        # /band/<slug>  — generateStaticParams pre-renders all bands
  layout.tsx          # fonts, settings provider, nav, shelf
  globals.css         # the design system

components/
  views/              # view components (Client Components)
  SettingsProvider.tsx  # tone / density / motion / cards, persisted to localStorage
  SiteNav.tsx           # top nav
  Shelf.tsx             # floating ⚙ tweaks panel
  AlbumArt.tsx          # typographic mock cover

lib/
  db.ts               # MongoDB Atlas client
  atlas-queries.ts    # query helpers (bands, scenes, etc.)
  atlas-types.ts      # Atlas-specific types
  data.ts             # static seed / fallback data
  helpers.ts          # palette, similarity, slugify, mock discography
  types.ts

_legacy/              # original HTML/JSX-via-Babel prototype (kept for reference)
```

## Design tweaks

A floating ⚙ in the bottom-right opens a settings shelf with:

- **tone** — paper / terminal / magenta (three full color systems)
- **density** — tight / normal / loose
- **motion** — snap / fast / slow (transition durations)
- **cards** — poster / mini

Settings persist to `localStorage` as `wos.settings.v1`.

## Deploy to Vercel

```bash
# from the project root
vercel
```

Or push to GitHub and import the repo at https://vercel.com/new — Vercel auto-detects Next.js.

Set the MongoDB Atlas connection string in `.env.local`:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/world_of_shoegaze
```

Add the same `MONGODB_URI` var in the Vercel project's Environment Variables for production deploys.

## Notes

- The original HTML/JSX-via-Babel prototype is in `_legacy/`. Safe to delete once you're sure the Next.js port covers everything you need.
- All band pages are statically generated at build time via `generateStaticParams`.
