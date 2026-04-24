"use client";

type SummaryCardProps = {
  summary: Record<string, unknown>;
};

function toText(value: unknown): string {
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "—";
  return JSON.stringify(value);
}

function toFixed(value: unknown, decimals = 1): string {
  if (typeof value === "number") return value.toFixed(decimals);
  return toText(value);
}

export function SummaryCard({ summary }: SummaryCardProps) {
  const totalCount = toText(summary.total_vehicle_count);
  const duration   = toFixed(summary.processing_duration_seconds) + " s";
  const frames     = toText(summary.total_frames);
  const fps        = toFixed(summary.fps) + " fps";
  const model      = toText(summary.model);
  const device     = toText(summary.device);
  const breakdown  = (summary.vehicle_type_breakdown as Record<string, unknown> | undefined) ?? {};

  const primaryStats = [
    { label: "Unique Vehicles",   value: totalCount, accent: "var(--brand-green)",  icon: <CarIcon /> },
    { label: "Processing Time",   value: duration,   accent: "var(--brand-cyan)",   icon: <TimerIcon /> },
    { label: "Total Frames",      value: frames,     accent: "var(--brand-violet)", icon: <FilmIcon /> },
    { label: "Frame Rate",        value: fps,        accent: "var(--brand-orange)", icon: <SpeedIcon /> },
  ];

  const MODEL_COLORS: Record<string, string> = {
    car: "var(--brand-cyan)",
    truck: "var(--brand-orange)",
    bus: "var(--brand-violet)",
    motorcycle: "var(--brand-green)",
    bicycle: "#e879f9",
    person: "#f87171",
  };

  return (
    <section
      className="glass rounded-2xl p-6 animate-fade-in"
      style={{ border: "1px solid var(--border-accent)" }}
      aria-label="Processing summary"
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: "1.25rem" }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: "var(--r-md)", flexShrink: 0,
            background: "linear-gradient(135deg,#34d399,#0ea5e9)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <ChartIcon />
        </div>
        <div>
          <p className="badge badge-green" style={{ marginBottom: 4 }}>Completed</p>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Analysis Results
          </h2>
        </div>
      </div>

      <hr className="divider" style={{ marginBottom: "1.25rem" }} />

      {/* Primary stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem", marginBottom: "1.25rem" }}>
        {primaryStats.map((stat) => (
          <div key={stat.label} className="stat-tile" style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
              <span style={{ color: stat.accent, display: "flex" }}>{stat.icon}</span>
              <span style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                {stat.label}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: stat.accent, letterSpacing: "-.02em" }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Model / Device row */}
      <div
        style={{
          display: "flex", gap: ".75rem", flexWrap: "wrap",
          padding: ".75rem 1rem",
          background: "rgba(255,255,255,.03)",
          borderRadius: "var(--r-md)",
          border: "1px solid var(--border-subtle)",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <p style={{ fontSize: ".65rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", margin: 0 }}>Model</p>
          <p className="mono" style={{ margin: 0, fontSize: ".82rem", color: "var(--brand-cyan)", fontWeight: 600 }}>{model}</p>
        </div>
        <div style={{ width: 1, background: "var(--border-subtle)", margin: "0 .25rem" }} />
        <div>
          <p style={{ fontSize: ".65rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", margin: 0 }}>Device</p>
          <p className="mono" style={{ margin: 0, fontSize: ".82rem", color: "var(--brand-green)", fontWeight: 600 }}>{device}</p>
        </div>
      </div>

      {/* Vehicle breakdown */}
      <div>
        <p style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: ".75rem" }}>
          Vehicle Type Breakdown
        </p>
        {Object.entries(breakdown).length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
            {Object.entries(breakdown).map(([key, value]) => {
              const count  = typeof value === "number" ? value : 0;
              const total  = typeof summary.total_vehicle_count === "number" ? summary.total_vehicle_count : 1;
              const pct    = total > 0 ? Math.round((count / total) * 100) : 0;
              const color  = MODEL_COLORS[key.toLowerCase()] ?? "var(--brand-cyan)";
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".3rem" }}>
                    <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "capitalize" }}>
                      {key}
                    </span>
                    <span style={{ fontSize: ".8rem", fontWeight: 700, color: color }}>
                      {toText(value)} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        borderRadius: 99,
                        background: color,
                        boxShadow: `0 0 8px ${color}55`,
                        transition: "width .8s cubic-bezier(.4,0,.2,1)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: ".82rem", color: "var(--text-muted)", margin: 0 }}>No vehicle breakdown available.</p>
        )}
      </div>
    </section>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────── */
function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#040d18" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function CarIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>;
}
function TimerIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
}
function FilmIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /></svg>;
}
function SpeedIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /><path d="M12 6v6l4 2" /></svg>;
}
