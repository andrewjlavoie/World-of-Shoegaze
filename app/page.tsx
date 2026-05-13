import { Feed } from "@/components/views/Feed";
import { getArtists } from "@/lib/atlas-queries";

// Re-fetch from Atlas at most every 5 minutes (ISR). Adjust if curation
// pace changes.
export const revalidate = 300;

export default async function Page() {
  const artists = await getArtists();
  return <Feed artists={artists} />;
}
