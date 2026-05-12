// Supabase client scaffolding. Not wired into the views yet — band data still
// lives in lib/data.ts. To migrate: run supabase/migrations/0001_init.sql,
// then swap a view's `import { BANDS } from "@/lib/data"` for the query in
// `fetchBands()` below and turn that view's page into an async Server Component.

import { createBrowserClient, createServerClient } from "@supabase/ssr";
import type { Band, Scene } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isConfigured(): boolean {
  return Boolean(url && anon);
}

export function browserClient() {
  if (!isConfigured()) throw new Error("Supabase env vars are missing");
  return createBrowserClient(url!, anon!);
}

// Server-side client. Pass a `cookies()` accessor from a Server Component or
// Route Handler. We deliberately don't import next/headers here so this file
// stays usable in scripts that touch Supabase outside of a request context.
export function serverClient(cookieStore: {
  get: (name: string) => { value: string } | undefined;
  set?: (name: string, value: string, options: Record<string, unknown>) => void;
}) {
  if (!isConfigured()) throw new Error("Supabase env vars are missing");
  return createServerClient(url!, anon!, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options: Record<string, unknown>) =>
        cookieStore.set?.(name, value, options),
      remove: (name: string, options: Record<string, unknown>) =>
        cookieStore.set?.(name, "", { ...options, maxAge: 0 }),
    },
  });
}

export async function fetchBands(): Promise<Band[]> {
  const sb = browserClient();
  const { data, error } = await sb.from("bands").select("*").order("name");
  if (error) throw error;
  return (data || []) as Band[];
}

export async function fetchScenes(): Promise<Scene[]> {
  const sb = browserClient();
  const { data, error } = await sb.from("scenes").select("*");
  if (error) throw error;
  return (data || []) as Scene[];
}
