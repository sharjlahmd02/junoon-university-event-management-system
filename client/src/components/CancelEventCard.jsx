import { useState } from "react";

function CancelEventCard({ onCancel }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError("A reason is required to cancel this event.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await onCancel(reason.trim());
    } catch (err) {
      setError(err.message || "Could not cancel this event. Please try again.");
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div className="cancel-event-card">
        <p className="cancel-event-title">Cancel this event</p>
        <p className="cancel-event-hint">
          This notifies registered students and can't be undone from this screen.
        </p>
        <button type="button" className="cancel-event-open-btn" onClick={() => setOpen(true)}>
          Cancel event
        </button>
      </div>
    );
  }

  return (
    <div className="cancel-event-card cancel-event-card--open">
      <p className="cancel-event-title">Cancel this event</p>
      {error && <p className="form-error">{error}</p>}
      <label className="event-form-field">
        <span>Reason (shown to registered students)</span>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} autoFocus />
      </label>
      <div className="cancel-event-actions">
        <button type="button" className="cancel-event-confirm-btn" onClick={handleConfirm} disabled={submitting}>
          {submitting ? "Cancelling…" : "Confirm cancellation"}
        </button>
        <button
          type="button"
          className="cancel-event-back-btn"
          onClick={() => setOpen(false)}
          disabled={submitting}
        >
          Never mind
        </button>
      </div>
    </div>
  );
}

export default CancelEventCard;