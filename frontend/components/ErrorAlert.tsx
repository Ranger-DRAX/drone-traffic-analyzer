"use client";

type ErrorAlertProps = {
  message: string;
};

export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div
      className="animate-fade-in"
      role="alert"
      aria-live="polite"
      style={{
        borderRadius: "var(--r-lg)",
        border: "1px solid rgba(248,113,113,.2)",
        background: "rgba(248,113,113,.06)",
        padding: "1rem 1.25rem",
        display: "flex",
        gap: ".75rem",
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: "rgba(248,113,113,.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <ErrorIcon />
      </span>
      <div>
        <p style={{ margin: 0, fontSize: ".7rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#f87171", marginBottom: ".3rem" }}>
          Error
        </p>
        <p style={{ margin: 0, fontSize: ".85rem", color: "#fca5a5", lineHeight: 1.6 }}>{message}</p>
      </div>
    </div>
  );
}

function ErrorIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
