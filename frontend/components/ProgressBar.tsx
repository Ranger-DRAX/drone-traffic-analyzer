"use client";

type ProgressBarProps = {
  progress: number;
  message: string;
  status: string;
};

const STATUS_META: Record<string, { label: string; badgeClass: string; icon: React.ReactNode }> = {
  idle: {
    label: "Idle",
    badgeClass: "badge-violet",
    icon: <IdleIcon />,
  },
  queued: {
    label: "Queued",
    badgeClass: "badge-amber",
    icon: <QueueIcon />,
  },
  processing: {
    label: "Processing",
    badgeClass: "badge-cyan",
    icon: <SpinnerIcon />,
  },
  completed: {
    label: "Completed",
    badgeClass: "badge-green",
    icon: <CheckIcon />,
  },
  failed: {
    label: "Failed",
    badgeClass: "badge-rose",
    icon: <ErrorIcon />,
  },
};

const PIPELINE_STEPS = [
  { key: "upload",    label: "Upload",    desc: "Video received by server" },
  { key: "detection", label: "Detection", desc: "YOLO detects vehicle classes" },
  { key: "tracking",  label: "Tracking",  desc: "ByteTrack assigns unique IDs" },
  { key: "report",    label: "Report",    desc: "CSV & annotated video exported" },
];

function getActiveStep(status: string, progress: number): number {
  if (status === "completed") return 4;
  if (status === "failed")    return -1;
  if (status === "processing") {
    if (progress < 20) return 0;
    if (progress < 60) return 1;
    if (progress < 90) return 2;
    return 3;
  }
  return -1;
}

export function ProgressBar({ progress, message, status }: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const meta = STATUS_META[status] ?? STATUS_META.idle;
  const activeStep = getActiveStep(status, clampedProgress);
  const isActive = status === "processing" || status === "queued";

  return (
    <section
      className="glass rounded-2xl p-6"
      style={{ border: "1px solid var(--border-accent)" }}
      aria-label="Processing status"
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <span className={`badge ${meta.badgeClass}`} style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
            <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              {meta.icon}
            </span>
            {meta.label}
          </span>
          <span style={{ fontSize: ".8rem", color: "var(--text-secondary)", fontWeight: 500 }}>
            Step 2 · Processing
          </span>
        </div>
        <span
          style={{
            fontSize: "1.7rem",
            fontWeight: 800,
            letterSpacing: "-.03em",
            background: "linear-gradient(135deg,#38bdf8,#34d399)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {clampedProgress}%
        </span>
      </div>

      {/* Progress track */}
      <div className="progress-track" style={{ marginTop: "1rem" }}>
        <div className="progress-fill" style={{ width: `${clampedProgress}%` }} />
      </div>

      {/* Message */}
      <p style={{ marginTop: ".75rem", fontSize: ".82rem", color: "var(--text-secondary)", minHeight: "1.2em" }}>
        {message}
      </p>

      {/* Pipeline steps */}
      {isActive || status === "completed" ? (
        <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: ".6rem" }}>
          <hr className="divider" style={{ marginBottom: ".4rem" }} />
          {PIPELINE_STEPS.map((step, idx) => {
            const done    = activeStep > idx || status === "completed";
            const current = activeStep === idx && status !== "completed";
            const pending = !done && !current;
            return (
              <div key={step.key} style={{ display: "flex", alignItems: "center", gap: ".85rem" }}>
                <span
                  className={`step-dot ${done ? "step-dot-done" : current ? "step-dot-active" : "step-dot-pending"}`}
                >
                  {done ? <CheckSmIcon /> : idx + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{
                    margin: 0,
                    fontSize: ".82rem",
                    fontWeight: 600,
                    color: done ? "var(--brand-green)" : current ? "var(--brand-cyan)" : "var(--text-muted)",
                  }}>
                    {step.label}
                    {current && (
                      <span style={{ marginLeft: ".5rem", display: "inline-flex", gap: 3 }}>
                        <span className="dot" style={{ width: 5, height: 5, color: "var(--brand-cyan)" }} />
                        <span className="dot" style={{ width: 5, height: 5, color: "var(--brand-cyan)" }} />
                        <span className="dot" style={{ width: 5, height: 5, color: "var(--brand-cyan)" }} />
                      </span>
                    )}
                  </p>
                  <p style={{ margin: 0, fontSize: ".72rem", color: "var(--text-muted)" }}>{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────── */
function SpinnerIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function CheckSmIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function ErrorIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
function IdleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function QueueIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
