import { notFound } from "next/navigation";
import { DriftMode } from "@/components/views/DriftMode";
import { getAllSlugs, getArtistBySlug } from "@/lib/atlas-queries";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) notFound();
  return <DriftMode artist={artist} />;
}
