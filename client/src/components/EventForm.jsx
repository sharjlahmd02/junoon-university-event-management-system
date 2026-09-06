import { useState } from "react";
import { Link } from "react-router-dom";
import { EVENT_CATEGORIES } from "../utils/eventConstants.js";

function toDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TITLE_MAX = 150;
const DESCRIPTION_MAX = 5000;

const EMPTY_VALUES = {
  title: "",
  description: "",
  type: "participation",
  category: EVENT_CATEGORIES[0],
  department: "",
  venue: "",
  dateTime: "",
  endDateTime: "",
  feeType: "free",
  amount: "",
  capacity: "",
};

// Shared by CreateEvent and EditEvent (task 2.8) -- same field set and
// validation for both, so the two flows can't silently drift apart.
//
// Layout: Section 1 (title/description -- the fields that actually need
// horizontal room) spans the full page width; Sections 2+3 (short,
// settings-style fields) sit side by side below in a two-column grid, so
// both are visible together without the page height of three fully
// stacked full-width panels (collapses to one column on narrow screens).
//
// Cancelling an event lives elsewhere (see CancelEventCard), a separate,
// explicit action -- more consequential and harder to undo than editing a
// typo in the venue, so it isn't one more checkbox buried in here.
// Rescheduling (changing dateTime) DOES live here, since it's a normal
// field edit that just happens to need a required reason attached
// (spec.md §4.5).
function EventForm({ mode, initialEvent, onSubmit, submitLabel, cancelHref = "/dashboard/organizer" }) {
  const isEdit = mode === "edit";

  const [values, setValues] = useState(() => {
    if (!initialEvent) return EMPTY_VALUES;
    return {
      title: initialEvent.title,
      description: initialEvent.description,
      type: initialEvent.type,
      category: initialEvent.category,
      department: initialEvent.department,
      venue: initialEvent.venue,
      dateTime: toDatetimeLocal(initialEvent.dateTime),
      endDateTime: toDatetimeLocal(initialEvent.endDateTime),
      feeType: initialEvent.feeType || "free",
      amount: initialEvent.amount ?? "",
      capacity: initialEvent.capacity ?? "",
    };
  });
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const originalDateTimeLocal = isEdit ? toDatetimeLocal(initialEvent.dateTime) : null;
  const dateChanged = isEdit && values.dateTime !== originalDateTimeLocal;

  function setField(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function validate() {
    if (!values.title.trim()) return "Title is required";
    if (!values.description.trim()) return "Description is required";
    if (!values.venue.trim()) return "Venue is required";
    if (!values.department.trim()) return "Department is required";
    if (!values.dateTime) return "Date/time is required";
    if (values.endDateTime && new Date(values.endDateTime) <= new Date(values.dateTime)) {
      return "End date/time must be after the start date/time";
    }
    if (values.type === "participation") {
      if (!values.feeType) return "Fee type is required";
      if (values.feeType === "paid") {
        const amt = Number(values.amount);
        if (!values.amount || Number.isNaN(amt) || amt <= 0) {
          return "A positive amount is required for paid events";
        }
      }
      const cap = Number(values.capacity);
      if (!values.capacity || !Number.isInteger(cap) || cap < 1) {
        return "A capacity of at least 1 is required for participation events";
      }
    }
    if (dateChanged && !reason.trim()) {
      return "A reason is required when rescheduling an event";
    }
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setSubmitting(true);

    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      venue: values.venue.trim(),
      category: values.category,
      department: values.department.trim(),
      dateTime: new Date(values.dateTime).toISOString(),
      endDateTime: values.endDateTime ? new Date(values.endDateTime).toISOString() : undefined,
    };

    if (!isEdit) {
      payload.type = values.type;
    }

    if (values.type === "participation") {
      payload.feeType = values.feeType;
      if (values.feeType === "paid") payload.amount = Number(values.amount);
      payload.capacity = Number(values.capacity);
    }

    if (isEdit && dateChanged) {
      payload.reason = reason.trim();
    }

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      {error && (
        <p className="form-error event-form-top-error" role="alert">
          {error}
        </p>
      )}

      <section className="event-form-section event-form-section--full">
        <div className="event-form-section-heading">
          <p className="event-form-section-eyebrow">01 — Event details</p>
          <p className="event-form-section-hint">What is it, and what should people know?</p>
        </div>

        <div className="event-form-row event-form-row--3col">
          <label className="event-form-field event-form-field--wide">
            <span>Title</span>
            <input
              type="text"
              value={values.title}
              onChange={(e) => setField("title", e.target.value)}
              maxLength={TITLE_MAX}
              placeholder="e.g. Robotics Cup 2026"
              required
            />
            <small className="event-form-counter">
              {values.title.length}/{TITLE_MAX}
            </small>
          </label>

          <label className="event-form-field">
            <span>Event type</span>
            <select value={values.type} onChange={(e) => setField("type", e.target.value)} disabled={isEdit}>
              <option value="audience">Audience-only (notice)</option>
              <option value="participation">Participation (registration)</option>
            </select>
            {isEdit && <small className="event-form-hint">Type can't be changed after creation.</small>}
          </label>

          <label className="event-form-field">
            <span>Category</span>
            <select value={values.category} onChange={(e) => setField("category", e.target.value)}>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="event-form-field">
          <span>Description</span>
          <textarea
            value={values.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={5}
            maxLength={DESCRIPTION_MAX}
            placeholder="What's happening, who it's for, and anything students should know before registering."
            required
          />
          <small className="event-form-counter">
            {values.description.length}/{DESCRIPTION_MAX}
          </small>
        </label>
      </section>

      <div className="event-form-columns">
        <section className="event-form-section">
          <div className="event-form-section-heading">
            <p className="event-form-section-eyebrow">02 — Where &amp; when</p>
            <p className="event-form-section-hint">Venue, department, and the schedule.</p>
          </div>

          <div className="event-form-row">
            <label className="event-form-field">
              <span>Venue</span>
              <input
                type="text"
                value={values.venue}
                onChange={(e) => setField("venue", e.target.value)}
                maxLength={200}
                placeholder="e.g. Engineering Block"
                required
              />
            </label>

            <label className="event-form-field">
              <span>Department</span>
              <input
                type="text"
                value={values.department}
                onChange={(e) => setField("department", e.target.value)}
                placeholder="e.g. Computer Science"
                required
              />
            </label>
          </div>

          <div className="event-form-row">
            <label className="event-form-field">
              <span>Date &amp; time</span>
              <input
                type="datetime-local"
                value={values.dateTime}
                onChange={(e) => setField("dateTime", e.target.value)}
                required
              />
            </label>

            <label className="event-form-field">
              <span>End (optional)</span>
              <input
                type="datetime-local"
                value={values.endDateTime}
                onChange={(e) => setField("endDateTime", e.target.value)}
              />
            </label>
          </div>

          {isEdit && dateChanged && (
            <label className="event-form-field event-form-reason-field">
              <span>Reason for reschedule</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Registered students will see this reason."
                required
              />
            </label>
          )}
        </section>

        {values.type === "participation" && (
          <section className="event-form-section">
            <div className="event-form-section-heading">
              <p className="event-form-section-eyebrow">03 — Fees &amp; capacity</p>
              <p className="event-form-section-hint">
                Registration is offline-confirmed (spec.md §3.2) — no payment gateway.
              </p>
            </div>

            <div className="event-form-row">
              <label className="event-form-field">
                <span>Fee type</span>
                <select value={values.feeType} onChange={(e) => setField("feeType", e.target.value)}>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </label>

              <label className="event-form-field">
                <span>Capacity</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={values.capacity}
                  onChange={(e) => setField("capacity", e.target.value)}
                  placeholder="Seats available"
                  required
                />
              </label>
            </div>

            {values.feeType === "paid" && (
              <label className="event-form-field">
                <span>Amount (Rs.)</span>
                <input
                  type="number"
                  min="1"
                  value={values.amount}
                  onChange={(e) => setField("amount", e.target.value)}
                  required
                />
              </label>
            )}
          </section>
        )}
      </div>

      <div className="event-form-actions">
        <button type="submit" className="btn-primary event-form-submit" disabled={submitting}>
          {submitting && <span className="event-form-spinner" aria-hidden="true" />}
          {submitting ? "Saving…" : submitLabel}
        </button>
        <Link to={cancelHref} className="btn-secondary event-form-discard">
          Discard
        </Link>
      </div>
    </form>
  );
}

export default EventForm;