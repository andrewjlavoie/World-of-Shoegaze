import Link from "next/link";

export default function BandNotFound() {
  return (
    <div className="wos paper wos-paper-pad" style={{ padding: 32, maxWidth: 640 }}>
      <h1 className="feed-h1">
        Unknown band
        <span className="italic" style={{ color: "var(--accent)" }}>
          .
        </span>
      </h1>
      <p className="serif italic" style={{ marginTop: 12 }}>
        That slug doesn&rsquo;t exist in the catalog.
      </p>
      <Link href="/" className="btn" style={{ marginTop: 16, display: "inline-block" }}>
        back to the feed
      </Link>
    </div>
  );
}
