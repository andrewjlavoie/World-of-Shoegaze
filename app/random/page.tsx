import { redirect } from "next/navigation";
import { getAllSlugs } from "@/lib/atlas-queries";

// Re-roll on every request — never cache. Each visit picks a different band.
export const dynamic = "force-dynamic";

export default async function Page() {
  const slugs = await getAllSlugs();
  if (!slugs.length) redirect("/");
  const slug = slugs[Math.floor(Math.random() * slugs.length)];
  redirect(`/band/${slug}`);
}
