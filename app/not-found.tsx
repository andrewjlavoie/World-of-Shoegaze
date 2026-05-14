import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wos paper wos-paper-pad" style={{ padding: 32, maxWidth: 640 }}>
      <h1 className="feed-h1">
        Not found<span className="italic" style={{ color: "var(--accent)" }}>.</span>
      </h1>
      <p className="serif italic" style={{ marginTop: 12 }}>
        Nothing lives at that URL.
      </p>
      <Link href="/" className="btn" style={{ marginTop: 16, display: "inline-block" }}>
        back to the feed
      </Link>
    </div>
  );
}
