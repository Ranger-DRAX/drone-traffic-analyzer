"use client";

type VideoResultProps = {
  videoUrl: string;
  reportUrl: string;
};

export function VideoResult({ videoUrl, reportUrl }: VideoResultProps) {
  return (
    <section
      className="glass rounded-2xl p-6 animate-fade-in"
      style={{ border: "1px solid var(--border-accent)" }}
      aria-label="Processed video output"
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: "1.25rem" }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: "var(--r-md)", flexShrink: 0,
            background: "linear-gradient(135deg,#818cf8,#38bdf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <VideoIcon />
        </div>
        <div>
          <p className="badge badge-violet" style={{ marginBottom: 4 }}>Step 3</p>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Annotated Output Video
          </h2>
        </div>
      </div>

      <hr className="divider" style={{ marginBottom: "1.25rem" }} />

      {/* Video player */}
      <div
        style={{
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
          background: "#000",
          boxShadow: "0 0 40px rgba(56,189,248,.12), 0 8px 40px rgba(0,0,0,.5)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <video
          id="annotated-video-player"
          controls
          preload="metadata"
          crossOrigin="anonymous"
          style={{ width: "100%", display: "block", aspectRatio: "16/9" }}
          src={videoUrl}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Info strip */}
      <div
        style={{
          marginTop: ".75rem",
          padding: ".6rem 1rem",
          borderRadius: "var(--r-md)",
          background: "rgba(56,189,248,.05)",
          border: "1px solid rgba(56,189,248,.1)",
          display: "flex",
          alignItems: "center",
          gap: ".5rem",
        }}
      >
        <InfoIcon />
        <p style={{ margin: 0, fontSize: ".75rem", color: "var(--text-secondary)" }}>
          Bounding boxes and unique tracking IDs are rendered directly into the video stream by the backend.
        </p>
      </div>

      {/* Action buttons */}
      <div style={{ marginTop: "1.25rem", display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
        <a
          id="download-csv-btn"
          href={reportUrl}
          download
          className="btn-primary"
          style={{ flex: 1, minWidth: 160 }}
        >
          <DownloadIcon />
          Download CSV Report
        </a>
        <a
          id="open-video-btn"
          href={videoUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost"
          style={{ flex: 1, minWidth: 140 }}
        >
          <ExternalLinkIcon />
          Open Full Video
        </a>
      </div>

      {/* Footnote */}
      <p style={{ marginTop: ".75rem", fontSize: ".7rem", color: "var(--text-muted)", textAlign: "center" }}>
        CSV includes per-frame timestamp, vehicle ID, class, and confidence score
      </p>
    </section>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────── */
function VideoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#040d18" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--brand-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
