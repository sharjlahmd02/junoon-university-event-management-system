import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { registrationsApi } from "../api/registrationsApi.js";

// Every state this card can be in, driven by auth state + role + the
// event's own status + (for students) whether they've already
// registered. Deliberately checked in this order since several
// conditions can be simultaneously true and only one should render.
function EventRegistrationCard({ event }) {
  const { isAuthenticated, user, token } = useAuth();
  const location = useLocation();

  const [myRegistration, setMyRegistration] = useState(undefined); // undefined = loading, null = none
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");

  const isStudent = isAuthenticated && user?.role === "student";

  // Reuses GET /registrations/mine (task 3.5) rather than a dedicated
  // "am I registered for event X" endpoint -- avoids new backend scope
  // for what's a client-only task, at the cost of fetching the student's
  // full registration list on every event detail page view. Fine at
  // BBSUL's scale; worth a dedicated endpoint later if this page ever
  // needs to be fast at much larger scale.
  useEffect(() => {
    if (!isStudent) {
      setMyRegistration(null);
      return;
    }
    let cancelled = false;
    registrationsApi
      .mine(token)
      .then((res) => {
        if (cancelled) return;
        const match = res.registrations.find(
          (r) => r.eventId && String(r.eventId._id) === String(event._id)
        );
        setMyRegistration(match || null);
      })
      .catch(() => {
        if (!cancelled) setMyRegistration(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isStudent, token, event._id]);

  async function handleRegister() {
    setError("");
    setRegistering(true);
    try {
      const res = await registrationsApi.register(event._id, token);
      setMyRegistration(res.registration);
    } catch (err) {
      setError(err.message || "Could not register. Please try again.");
    } finally {
      setRegistering(false);
    }
  }

  const feeLabel = event.feeType === "paid" ? `Rs. ${event.amount}` : "Free";

  // --- Not logged in: browsing is fine, participating requires login
  //     (agreed with the user) -- sends them to /login carrying where to
  //     come back to, so logging in actually returns them here instead of
  //     dumping them on their dashboard. ---
  if (!isAuthenticated) {
    return (
      <div className="event-detail-action-card">
        <p className="event-detail-fee-label">{event.feeType === "paid" ? "Registration fee" : "Entry"}</p>
        <p className="event-detail-fee">{feeLabel}</p>
        <div className="event-detail-capacity-row">
          <span>Capacity</span>
          <span>{event.capacity} seats</span>
        </div>
        <Link
          to="/login"
          state={{ from: location.pathname }}
          className="event-detail-register-btn event-detail-register-btn--link"
        >
          Log in to register
        </Link>
      </div>
    );
  }

  // --- Logged in, but not a student (organizer) -- registration is a
  //     student-only action; nothing useful to show here. ---
  if (!isStudent) {
    return (
      <div className="event-detail-action-card">
        <p className="event-detail-notice-text">Only students can register for events.</p>
      </div>
    );
  }

  // --- Student, registration status not loaded yet ---
  if (myRegistration === undefined) {
    return (
      <div className="event-detail-action-card">
        <p className="event-detail-notice-text">Checking your registration…</p>
      </div>
    );
  }

  // --- Student, already registered: show their actual status regardless
  //     of whether the event is still upcoming -- this is their history,
  //     not a call to action, so it stays accurate even after the event
  //     has started/ended. ---
  if (myRegistration) {
    if (myRegistration.paymentStatus === "pending") {
      return (
        <div className="event-detail-action-card">
          <p className="event-detail-fee-label">Registration fee</p>
          <p className="event-detail-fee">{feeLabel}</p>
          <p className="event-detail-notice-text event-detail-notice-text--pending">
            You're registered — payment pending. Pay Rs. {myRegistration.amountCharged} in person to the event's
            focal person; your pass unlocks once the organizer confirms it.
          </p>
        </div>
      );
    }
    return (
      <div className="event-detail-action-card">
        <p className="event-detail-notice-text event-detail-notice-text--success">
          You're registered — your pass is ready.
        </p>
        <Link to="/dashboard/student" className="event-detail-register-btn event-detail-register-btn--link">
          View my pass
        </Link>
      </div>
    );
  }

  // --- Student, not registered, event no longer accepting registrations
  //     (started, completed, or cancelled) ---
  if (event.status !== "upcoming") {
    const closedMessage =
      event.status === "cancelled"
        ? "This event has been cancelled."
        : event.status === "live"
        ? "This event has already started — registration is closed."
        : "This event has ended.";
    return (
      <div className="event-detail-action-card">
        <p className="event-detail-notice-text">{closedMessage}</p>
      </div>
    );
  }

  // --- Student, not registered, event upcoming: the actual register flow ---
  return (
    <div className="event-detail-action-card">
      <p className="event-detail-fee-label">{event.feeType === "paid" ? "Registration fee" : "Entry"}</p>
      <p className="event-detail-fee">{feeLabel}</p>
      <div className="event-detail-capacity-row">
        <span>Capacity</span>
        <span>{event.capacity} seats</span>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="event-detail-register-btn" onClick={handleRegister} disabled={registering}>
        {registering ? "Registering…" : event.feeType === "paid" ? `Register — ${feeLabel}` : "Register — it's free"}
      </button>
      {event.feeType === "paid" && (
        <p className="event-detail-register-note">
          Pay in person to the event's focal person after registering — your pass unlocks once the organizer
          confirms payment.
        </p>
      )}
    </div>
  );
}

export default EventRegistrationCard;