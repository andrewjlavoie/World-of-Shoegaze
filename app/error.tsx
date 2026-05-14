"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="wos paper wos-paper-pad" style={{ padding: 32, maxWidth: 640 }}>
      <h1 className="feed-h1">
        Something broke<span className="italic" style={{ color: "var(--accent)" }}>.</span>
      </h1>
      <p className="serif italic" style={{ marginTop: 12 }}>
        The page hit an error. Try reloading; if it persists, the data store may be down.
      </p>
      <button type="button" className="btn" onClick={() => reset()} style={{ marginTop: 16 }}>
        try again
      </button>
    </div>
  );
}
