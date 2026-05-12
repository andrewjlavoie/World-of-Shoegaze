import { notFound } from "next/navigation";
import { BandDetail } from "@/components/views/BandDetail";
import { BANDS } from "@/lib/data";
import { findBand, slugify } from "@/lib/helpers";

export function generateStaticParams() {
  return BANDS.map((b) => ({ slug: slugify(b.name) }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const band = findBand(slug);
  if (!band) notFound();
  return <BandDetail band={band} />;
}
