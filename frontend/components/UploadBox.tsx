"use client";

import { type ChangeEvent, type DragEvent, useRef, useState } from "react";

type UploadBoxProps = {
  file: File | null;
  busy: boolean;
  onFileChange: (file: File | null) => void;
  onSubmit: () => void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadBox({ file, busy, onFileChange, onSubmit }: UploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFileChange(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    const dropped = e.dataTransfer.files?.[0] ?? null;
    if (dropped) onFileChange(dropped);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!busy) setDragging(true);
  };

  return (
    <section
      className="glass rounded-2xl p-6"
      style={{ border: "1px solid var(--border-accent)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--r-md)",
            background: "linear-gradient(135deg,#0ea5e9,#34d399)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <UploadIcon />
        </div>
        <div>
          <p className="badge badge-cyan mb-1">Step 1</p>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Upload Drone Footage
          </h2>
        </div>
      </div>

      <hr className="divider mb-5" />

      {/* Drop zone */}
      <div
        className={`drop-zone${dragging ? " drag-over" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onClick={() => !busy && inputRef.current?.click()}
        role="button"
        aria-label="Upload MP4 video file"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        id="upload-drop-zone"
      >
        {file ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: ".75rem" }}>
            <VideoFileIcon />
            <div>
              <p style={{ fontWeight: 600, color: "var(--brand-green)", fontSize: ".95rem", margin: 0 }}>
                {file.name}
              </p>
              <p style={{ fontSize: ".78rem", color: "var(--text-secondary)", marginTop: ".2rem", textAlign: "center" }}>
                {formatBytes(file.size)} · MP4 Video
              </p>
            </div>
            {!busy && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onFileChange(null); }}
                style={{
                  fontSize: ".75rem",
                  color: "var(--text-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                Remove
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: ".6rem" }}>
            <div className="animate-float">
              <CloudUploadIcon />
            </div>
            <p style={{ fontWeight: 600, color: "var(--text-secondary)", margin: 0, fontSize: ".95rem" }}>
              Drop your MP4 here or{" "}
              <span style={{ color: "var(--brand-cyan)" }}>browse</span>
            </p>
            <p style={{ fontSize: ".78rem", color: "var(--text-muted)", margin: 0 }}>
              Supports MP4 drone footage · Max recommended 500 MB
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,.mp4"
          className="hidden"
          onChange={handleChange}
          disabled={busy}
          id="video-file-input"
        />
      </div>

      {/* Analyze button */}
      <button
        id="analyze-btn"
        type="button"
        onClick={onSubmit}
        disabled={busy || !file}
        className="btn-primary"
        style={{ width: "100%", marginTop: "1.25rem" }}
      >
        {busy ? (
          <>
            <span style={{ display: "flex", gap: 4, color: "#040d18" }}>
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </span>
            Processing…
          </>
        ) : (
          <>
            <PlayIcon />
            Analyze Video
          </>
        )}
      </button>

      <p style={{ fontSize: ".72rem", color: "var(--text-muted)", textAlign: "center", marginTop: ".6rem" }}>
        Backend runs YOLO + ByteTrack in a background worker
      </p>
    </section>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────── */
function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#040d18" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CloudUploadIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--brand-cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function VideoFileIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--brand-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <path d="m16 8-4-3-4 3v6l4 3 4-3z" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
