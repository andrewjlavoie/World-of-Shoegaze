# World of Shoegaze

A hand-maintained atlas of shoegaze. No accounts, no tracking. A love letter, written slowly.

Built with **Next.js 15 (App Router) + TypeScript**. Designed for **Vercel + Supabase** deployment. Band data currently lives in a TypeScript module; the Supabase wiring is scaffolded so you can move it to a database when you're ready.

---

## Stack

- Next.js 15 / React 19 / TypeScript
- `next/font` for JetBrains Mono + Instrument Serif
- `@supabase/supabase-js` + `@supabase/ssr` (scaffolded, not yet active)
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
  page.tsx            # / → poster grid
  list/page.tsx       # /list
  globe/page.tsx      # /globe
  timeline/page.tsx   # /timeline
  tonight/page.tsx    # /tonight
  band/[slug]/        # /band/<slug>  — generateStaticParams pre-renders all bands
  drift/[slug]/       # /drift/<slug> — full-bleed playback view
  layout.tsx          # fonts, settings provider, nav, shelf
  globals.css         # the design system

components/
  views/              # the seven views (Client Components)
  SettingsProvider.tsx  # tone / density / motion / cards, persisted to localStorage
  SiteNav.tsx           # top nav (hidden in /drift/*)
  Shelf.tsx             # floating ⚙ tweaks panel
  AlbumArt.tsx          # typographic mock cover

lib/
  data.ts             # bands, moods, eras, scenes
  helpers.ts          # palette, similarity, slugify, mock discography
  supabase.ts         # client scaffolding (browser + server)
  types.ts

supabase/
  migrations/0001_init.sql

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

No environment variables are required for the basic site to work. The Supabase env vars below only matter once you wire data to Supabase.

## Connect Supabase (optional)

1. Create a project at https://supabase.com/dashboard.
2. Copy `.env.local.example` → `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your project's API settings.
3. Run `supabase/migrations/0001_init.sql` in the SQL editor (creates `bands` + `scenes` tables with public-read RLS policies).
4. Seed: import `lib/data.ts` from a one-shot script, or paste an `INSERT` statement built from it. (No automated seed script ships yet — band data is editable in `lib/data.ts` until you flip the switch.)
5. To migrate a view off the static module: replace `import { BANDS } from "@/lib/data"` with `await fetchBands()` from `@/lib/supabase`, and turn the page into an async Server Component.

For Vercel deploys, add the same `NEXT_PUBLIC_SUPABASE_*` vars in the Vercel project's Environment Variables.

## Notes

- The original HTML/JSX-via-Babel prototype is in `_legacy/`. Safe to delete once you're sure the Next.js port covers everything you need.
- Drift mode (`/drift/<slug>`) is intentionally chrome-less. Press <kbd>Esc</kbd> to exit.
- All band pages are statically generated at build time via `generateStaticParams`.
