import { TonightsMood } from "@/components/views/TonightsMood";
import { getArtists } from "@/lib/atlas-queries";

export const revalidate = 300;

export default async function Page() {
  const artists = await getArtists();
  return <TonightsMood artists={artists} />;
}
