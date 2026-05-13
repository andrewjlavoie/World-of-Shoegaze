import { Globe } from "@/components/views/Globe";
import { getArtists } from "@/lib/atlas-queries";

export const revalidate = 300;

export default async function Page() {
  const artists = await getArtists();
  return <Globe artists={artists} />;
}
