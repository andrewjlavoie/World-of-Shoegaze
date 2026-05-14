import { Graph } from "@/components/views/Graph";
import { getArtists } from "@/lib/atlas-queries";

// ISR — match the other Atlas-backed pages.
export const revalidate = 300;

export default async function Page() {
  const artists = await getArtists();
  return <Graph artists={artists} />;
}
