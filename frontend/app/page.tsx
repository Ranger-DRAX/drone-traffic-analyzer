"use client";

import { useEffect, useRef, useState } from "react";
import { ErrorAlert } from "../components/ErrorAlert";
import { ProgressBar } from "../components/ProgressBar";
import { SummaryCard } from "../components/SummaryCard";
import { UploadBox } from "../components/UploadBox";
import { VideoResult } from "../components/VideoResult";
import {
  getJobReportUrl,
  getJobStatus,
  getJobSummary,
  getJobVideoUrl,
  uploadVideo,
  type JobStatusResponse,
  type JobSummaryResponse,
} from "../lib/api";

/* ─── Helpers ────────────────────────────────────────────────────── */
function isMp4(file: File | null): boolean {
  if (!file) return false;
  return file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4");
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

/* ─── Navbar ─────────────────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        transition: "background .3s ease, border-color .3s ease, backdrop-filter .3s ease",
        background: scrolled ? "rgba(4,13,24,.85)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid var(--border-subtle)" : "1px solid transparent",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: ".9rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: ".65rem" }}>
          <div
            aria-hidden="true"
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "linear-gradient(135deg,#0ea5e9 0%,#34d399 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 18px rgba(56,189,248,.4)",
            }}
          >
            <DroneIcon />
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: ".72rem",
                fontWeight: 700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--brand-cyan)",
              }}
            >
              ANTS
            </p>
            <p style={{ margin: 0, fontSize: ".82rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.1 }}>
              Drone Traffic Analyzer
            </p>
          </div>
        </div>

        {/* Nav tags */}
        <nav
          style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}
          aria-label="Tech stack"
        >
          {["YOLO v2", "ByteTrack", "FastAPI", "Next.js"].map((tag) => (
            <span key={tag} className="badge badge-cyan" style={{ fontSize: ".65rem" }}>
              {tag}
            </span>
          ))}
        </nav>
      </div>
    </header>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section
      style={{ maxWidth: 1280, margin: "0 auto", padding: "3.5rem 1.5rem 2rem" }}
      aria-labelledby="hero-heading"
    >
      <div className="animate-fade-in-up">
        <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <span className="badge badge-green">
            <span
              style={{
                position: "relative",
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--brand-green)",
                display: "inline-block",
              }}
            />
            Live System
          </span>
          <span className="badge badge-violet">CV Assessment · ANTS Engineering</span>
        </div>

        <h1
          id="hero-heading"
          style={{
            margin: 0,
            fontSize: "clamp(2rem, 5vw, 3.6rem)",
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: "-.04em",
            color: "var(--text-primary)",
            maxWidth: 820,
          }}
        >
          Smart{" "}
          <span className="gradient-text-cyan">Drone Traffic</span>
          <br />
          Analyzer
        </h1>

        <p
          style={{
            marginTop: "1.1rem",
            fontSize: "clamp(.9rem, 2vw, 1.1rem)",
            color: "var(--text-secondary)",
            maxWidth: 620,
            lineHeight: 1.75,
          }}
        >
          Upload aerial MP4 footage. The system detects and tracks every vehicle
          frame-by-frame using YOLO&nbsp;+&nbsp;ByteTrack, prevents double-counting,
          and exports an annotated video with a full CSV report — automatically.
        </p>
      </div>

      {/* Stats strip */}
      <div
        className="animate-fade-in-up delay-200"
        style={{
          marginTop: "2.25rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1px",
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
          border: "1px solid var(--border-accent)",
          background: "var(--border-accent)",
        }}
      >
        {[
          { label: "Detection Model",  value: "YOLO v2-6m",   accent: "var(--brand-cyan)" },
          { label: "Tracker",          value: "ByteTrack",    accent: "var(--brand-green)" },
          { label: "Backend",          value: "FastAPI",       accent: "var(--brand-violet)" },
          { label: "Anti-Dbl Count",   value: "Enabled",      accent: "var(--brand-orange)" },
          { label: "Output Formats",   value: "MP4 + CSV",    accent: "var(--brand-cyan)" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: "1 1 140px",
              padding: ".9rem 1.25rem",
              background: "var(--bg-card)",
              display: "flex",
              flexDirection: "column",
              gap: ".25rem",
            }}
          >
            <p style={{ margin: 0, fontSize: ".65rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              {stat.label}
            </p>
            <p style={{ margin: 0, fontSize: ".95rem", fontWeight: 700, color: stat.accent }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Empty Results Placeholder ──────────────────────────────────── */
function ResultsPlaceholder() {
  return (
    <div
      style={{
        borderRadius: "var(--r-xl)",
        border: "1px dashed var(--border-accent)",
        padding: "3rem 2rem",
        textAlign: "center",
        background: "rgba(12,26,46,.3)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1rem",
      }}
    >
      <div style={{ opacity: .35 }}>
        <WaitingIcon />
      </div>
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "var(--text-secondary)" }}>
          Results will appear here
        </p>
        <p style={{ margin: ".5rem 0 0", fontSize: ".82rem", color: "var(--text-muted)", maxWidth: 340, lineHeight: 1.6 }}>
          Once processing completes, you&rsquo;ll see the annotated video playback,
          vehicle count summary, and CSV download button.
        </p>
      </div>

      {/* Workflow preview */}
      <div
        style={{
          marginTop: ".75rem",
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          gap: ".5rem",
          textAlign: "left",
        }}
      >
        {[
          { step: "01", text: "Upload MP4 drone footage" },
          { step: "02", text: "YOLO detects vehicles per frame" },
          { step: "03", text: "ByteTrack assigns persistent IDs" },
          { step: "04", text: "Review annotated video + CSV report" },
        ].map(({ step, text }) => (
          <div key={step} style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
            <span
              className="mono"
              style={{
                fontSize: ".68rem",
                fontWeight: 700,
                color: "var(--brand-cyan)",
                background: "rgba(56,189,248,.08)",
                padding: ".15rem .5rem",
                borderRadius: 4,
                border: "1px solid rgba(56,189,248,.15)",
                minWidth: 32,
                textAlign: "center",
              }}
            >
              {step}
            </span>
            <span style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "2rem 1.5rem",
        borderTop: "1px solid var(--border-subtle)",
        marginTop: "4rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: ".75rem",
      }}
    >
      <p style={{ margin: 0, fontSize: ".75rem", color: "var(--text-muted)" }}>
        © 2025 ANTS · Smart Drone Traffic Analyzer · Technical Assessment
      </p>
      <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
        {["Computer Vision", "Automation", "Full-Stack"].map((t) => (
          <span key={t} className="badge badge-violet" style={{ fontSize: ".62rem" }}>{t}</span>
        ))}
      </div>
    </footer>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function Home() {
  const [selectedFile, setSelectedFile]   = useState<File | null>(null);
  const [jobId, setJobId]                 = useState<string | null>(null);
  const [jobStatus, setJobStatus]         = useState<JobStatusResponse | null>(null);
  const [jobSummary, setJobSummary]       = useState<JobSummaryResponse | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [isUploading, setIsUploading]     = useState(false);
  const [isPolling, setIsPolling]         = useState(false);
  const pollRef = useRef<number | null>(null);

  /* Polling */
  useEffect(() => {
    if (!jobId) return undefined;

    let active = true;

    const stopPolling = () => {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setIsPolling(false);
    };

    const poll = async () => {
      try {
        const currentStatus = await getJobStatus(jobId);
        if (!active) return;
        setJobStatus(currentStatus);

        if (currentStatus.status === "completed") {
          const summary = await getJobSummary(jobId);
          if (!active) return;
          setJobSummary(summary);
          stopPolling();
        }

        if (currentStatus.status === "failed") {
          setError(currentStatus.error || currentStatus.message || "Processing failed.");
          stopPolling();
        }
      } catch (pollError) {
        if (active) {
          setError(extractMessage(pollError));
          stopPolling();
        }
      }
    };

    poll();
    pollRef.current = window.setInterval(poll, 2000);

    return () => {
      active = false;
      stopPolling();
    };
  }, [jobId]);

  /* Upload handler */
  const handleSubmit = async () => {
    if (!selectedFile) {
      setError("Select an MP4 file before uploading.");
      return;
    }
    if (!isMp4(selectedFile)) {
      setError("Only MP4 videos are supported.");
      return;
    }

    setError(null);
    setJobSummary(null);
    setJobStatus(null);
    setIsUploading(true);

    try {
      const response = await uploadVideo(selectedFile);
      setJobId(response.job_id);
      setIsPolling(true);
      setJobStatus({
        job_id: response.job_id,
        status: response.status,
        progress: 0,
        message: response.message,
        error: null,
        input_video_path: null,
        output_video_path: null,
        csv_report_path: null,
        summary_json_path: null,
        created_at: null,
        updated_at: null,
      });
    } catch (uploadError) {
      setError(extractMessage(uploadError));
    } finally {
      setIsUploading(false);
    }
  };

  const progress    = jobStatus?.progress ?? 0;
  const message     = jobStatus?.message  ?? "Upload a drone footage clip to begin analysis.";
  const statusLabel = jobStatus?.status   ?? "idle";
  const busy        = isUploading || isPolling || jobStatus?.status === "processing";
  const done        = jobId != null && jobStatus?.status === "completed";

  return (
    <>
      <Navbar />

      <main>
        <Hero />

        {/* ── Workflow Section ── */}
        <section
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 1.5rem 2rem",
          }}
          aria-label="Analysis workflow"
        >
          {/* Section label */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.75rem" }}>
            <hr style={{ flex: 1, border: "none", height: 1, background: "linear-gradient(90deg, transparent, var(--border-accent))" }} />
            <p style={{ margin: 0, fontSize: ".7rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              Analysis Workflow
            </p>
            <hr style={{ flex: 1, border: "none", height: 1, background: "linear-gradient(90deg, var(--border-accent), transparent)" }} />
          </div>

          {/* Responsive 2-column layout */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 440px), 1fr))",
              gap: "1.25rem",
              alignItems: "start",
            }}
          >
            {/* ── Left column: Upload + Progress + Error ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className="animate-fade-in-up delay-100">
                <UploadBox
                  file={selectedFile}
                  busy={busy}
                  onFileChange={(file) => {
                    setSelectedFile(file);
                    setError(null);
                  }}
                  onSubmit={handleSubmit}
                />
              </div>

              <div className="animate-fade-in-up delay-200">
                <ProgressBar progress={progress} message={message} status={statusLabel} />
              </div>

              {error && (
                <div className="animate-fade-in-up delay-300">
                  <ErrorAlert message={error} />
                </div>
              )}

              {/* Tech stack card */}
              <div
                className="glass animate-fade-in-up delay-400"
                style={{
                  borderRadius: "var(--r-xl)",
                  border: "1px solid var(--border-subtle)",
                  padding: "1.25rem",
                }}
              >
                <p style={{ margin: "0 0 .85rem", fontSize: ".68rem", fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                  Pipeline Stack
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                  {[
                    { label: "Detection",  value: "YOLOv2-6m · conf ≥ 0.25",   color: "var(--brand-cyan)" },
                    { label: "Tracking",   value: "ByteTrack (bytetrack.yaml)", color: "var(--brand-green)" },
                    { label: "Processing", value: "OpenCV · frame-by-frame",    color: "var(--brand-violet)" },
                    { label: "Report",     value: "Pandas CSV + JSON summary",  color: "var(--brand-orange)" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: "flex", alignItems: "baseline", gap: ".5rem" }}>
                      <span style={{ fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color, minWidth: 80 }}>
                        {label}
                      </span>
                      <span className="mono" style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right column: Results ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {jobSummary ? (
                <div className="animate-fade-in-up">
                  <SummaryCard summary={jobSummary.summary} />
                </div>
              ) : (
                <div className="animate-fade-in-up delay-200">
                  <ResultsPlaceholder />
                </div>
              )}

              {done && (
                <div className="animate-fade-in-up delay-100">
                  <VideoResult
                    videoUrl={getJobVideoUrl(jobId!)}
                    reportUrl={getJobReportUrl(jobId!)}
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

/* ─── Icons ──────────────────────────────────────────────────────── */
function DroneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#040d18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
      <path d="M4.5 4.5L8 8M19.5 4.5L16 8M4.5 19.5L8 16M19.5 19.5L16 16" />
      <circle cx="4" cy="4" r="1.5" /><circle cx="20" cy="4" r="1.5" />
      <circle cx="4" cy="20" r="1.5" /><circle cx="20" cy="20" r="1.5" />
    </svg>
  );
}

function WaitingIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--brand-cyan)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
