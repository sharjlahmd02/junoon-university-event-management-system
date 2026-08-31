import { useAuth } from "../hooks/useAuth.js";

// Shell only -- task 1.11. Real dashboard content (event stats, payment
// queue, "needs your action") is spec.md §4.3, built across later phases.
function OrganizerDashboard() {
  const { user, logout } = useAuth();

  return (
    <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "var(--side-padding)" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-eyebrow)", color: "var(--brass)" }}>
        Organizer dashboard
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-section-title)" }}>
        Welcome, {user?.name}
      </h1>
      <p style={{ fontFamily: "var(--font-body)", color: "var(--stone)" }}>{user?.email}</p>
      <button type="button" className="btn-secondary" onClick={logout} style={{ marginTop: 24 }}>
        Log out
      </button>
    </main>
  );
}

export default OrganizerDashboard;