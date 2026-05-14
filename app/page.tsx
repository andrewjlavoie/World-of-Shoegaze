import { Suspense } from "react";
import { Feed } from "@/components/views/Feed";
import { getArtists } from "@/lib/atlas-queries";

export const revalidate = 300;

export default async function Page() {
  const artists = await getArtists();
  return (
    <Suspense>
      <Feed artists={artists} />
    </Suspense>
  );
}
