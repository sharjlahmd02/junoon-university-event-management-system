// Temporary token showcase for Task 0.7 — confirms design.md §2-4 tokens
// load correctly. Will be replaced by the real landing page in Phase 2.

const coreColors = [
  ["ink", "var(--ink)"],
  ["paper", "var(--paper)"],
  ["paper-raised", "var(--paper-raised)"],
  ["green-deep", "var(--green-deep)"],
  ["brass", "var(--brass)"],
  ["brass-soft", "var(--brass-soft)"],
  ["stone", "var(--stone)"],
  ["line", "var(--line)"],
];

const statusColors = [
  ["free / ready / live", "var(--status-free-bg)", "var(--status-free-text)"],
  ["pending / upcoming", "var(--status-pending-bg)", "var(--status-pending-text)"],
  ["notice / neutral", "var(--status-neutral-bg)", "var(--status-neutral-text)"],
  ["live-now urgent", "var(--status-urgent-bg)", "var(--status-urgent-text)"],
];

function Home() {
  return (
    <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "var(--side-padding)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-hero)" }}>
        Junoon
      </h1>
      <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-card-title)" }}>
        Where BBSUL comes alive.
      </p>

      <section style={{ marginTop: "40px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-section-title)" }}>
          Core colors
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--card-gap)" }}>
          {coreColors.map(([name, color]) => (
            <div key={name} style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  background: color,
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-card)",
                }}
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-meta)" }}>{name}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: "40px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-section-title)" }}>
          Status pills
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--card-gap)" }}>
          {statusColors.map(([label, bg, text]) => (
            <span
              key={label}
              style={{
                background: bg,
                color: text,
                borderRadius: "var(--radius-pill)",
                padding: "6px 14px",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-eyebrow)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </section>

      <section style={{ marginTop: "40px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-section-title)" }}>
          Type scale
        </h2>
        <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-hero)", margin: "8px 0" }}>Hero H1</p>
        <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-section-title)", margin: "8px 0" }}>
          Section title
        </p>
        <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-card-title)", margin: "8px 0" }}>
          Card / stub title
        </p>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-body)", margin: "8px 0" }}>
          Body text in Inter — this is what most of the app's copy will look like.
        </p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-meta)", margin: "8px 0" }}>
          Metadata / timestamp in Plex Mono
        </p>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-eyebrow)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            margin: "8px 0",
          }}
        >
          Eyebrow label
        </p>
      </section>
    </main>
  );
}

export default Home;