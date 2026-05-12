-- World of Shoegaze — initial schema.
-- Run from the Supabase SQL editor, or via `supabase db push` if you wire up the CLI.
-- After this runs, seed with `npm run seed:supabase` (script lives in scripts/seed.ts).

create extension if not exists "pgcrypto";

create type era_key as enum (
  'proto', 'first_wave', 'transitional', 'second_wave', 'current'
);

create table if not exists bands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  subgenre text not null,
  country text not null,
  era era_key not null,
  album text not null,
  year int not null check (year between 1980 and 2100),
  intensity int not null check (intensity between 0 and 10),
  lat double precision not null,
  lng double precision not null,
  description text not null default '',
  moods text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bands_era_idx on bands (era);
create index bands_year_idx on bands (year);
create index bands_country_idx on bands (country);

create table if not exists scenes (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  country text not null,
  era era_key not null,
  lat double precision not null,
  lng double precision not null,
  note text not null
);

-- Public read; writes restricted to authenticated maintainers.
-- Adjust the auth check (jwt claim, role, etc) to match your Supabase setup.
alter table bands enable row level security;
alter table scenes enable row level security;

create policy "bands are world-readable" on bands
  for select using (true);

create policy "scenes are world-readable" on scenes
  for select using (true);
