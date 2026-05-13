import { Timeline } from "@/components/views/Timeline";
import { getArtists } from "@/lib/atlas-queries";

export const revalidate = 300;

export default async function Page() {
  const artists = await getArtists();
  return <Timeline artists={artists} />;
}
