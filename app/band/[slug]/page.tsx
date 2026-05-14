import { notFound } from "next/navigation";
import { BandDetail } from "@/components/views/BandDetail";
import { getAllSlugs, getArtistBySlug, getArtists } from "@/lib/atlas-queries";
import { similarArtists } from "@/lib/atlas-similarity";

// Match the homepage: re-fetch from Atlas every 5 minutes.
export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [artist, all] = await Promise.all([getArtistBySlug(slug), getArtists()]);
  if (!artist) notFound();
  const similar = similarArtists(artist, all, 6);
  return <BandDetail artist={artist} similar={similar} />;
}
