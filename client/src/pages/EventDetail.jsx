import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { eventsApi } from "../api/eventsApi.js";
import StatusPill from "../components/StatusPill.jsx";
import { formatCategoryLabel } from "../utils/eventConstants.js";
import "../styles/eventDetail.css";

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function dateParts(iso) {
  const d = new Date(iso);
  return {
    weekday: WEEKDAYS[d.getDay()],
    day: d.getDate(),
    month: MONTHS[d.getMonth()],
    year: d.getFullYear(),
    time: d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

// spec.md §4.4's detail-page requirements not yet fully buildable, handled
// as deliberate placeholders rather than faked:
//   - banner/guidelines: only rendered if present -- upload isn't wired
//     up yet (deferred out of task 2.2), so these are always absent today,
//     shown as simply not there rather than a broken image/link.
//   - register button: Registration doesn't exist until Phase 3, so
//     Participation events get a disabled "Registration opens soon" state
//     instead of a dead button. Audience-only events get an explanatory
//     note instead, per spec.md §3.1 (nothing to register for).
function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | notfound | error
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    setError("");

    eventsApi
      .getById(id)
      .then((res) => {
        if (cancelled) return;
        setEvent(res.event);
        setLoadState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 404 || err.status === 400) {
          setLoadState("notfound");
        } else {
          setError(
            err.message || "Could not load this event. Please try again.",
          );
          setLoadState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loadState === "loading") {
    return (
      <div className="event-detail-page">
        <div className="event-detail-skeleton-ticket" aria-hidden="true">
          <div className="event-detail-skeleton-main">
            <span className="skeleton-bar skeleton-bar--eyebrow" />
            <span className="skeleton-bar skeleton-bar--title" />
            <span className="skeleton-bar skeleton-bar--venue" />
          </div>
          <div className="event-detail-ticket-date event-detail-ticket-date--skeleton" />
        </div>
      </div>
    );
  }

  if (loadState === "notfound") {
    return (
      <div className="event-detail-page">
        <div className="event-detail-message-panel">
          <p>This event doesn't exist, or the link may be out of date.</p>
          <Link to="/events" className="btn-primary">
            Back to browse
          </Link>
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="event-detail-page">
        <div className="event-detail-message-panel event-detail-message-panel--error">
          <p>{error}</p>
          <Link to="/events" className="btn-primary">
            Back to browse
          </Link>
        </div>
      </div>
    );
  }

  const organizer =
    event.organizerId && typeof event.organizerId === "object"
      ? event.organizerId
      : null;
  const start = dateParts(event.dateTime);
  const end = event.endDateTime ? dateParts(event.endDateTime) : null;

  return (
    <div className="event-detail-page">
      <Link to="/events" className="event-detail-back">
        ← Back to browse
      </Link>

      {event.cancelled && (
        <div className="event-detail-banner event-detail-banner--cancelled">
          <p>
            <strong>This event has been cancelled.</strong>
            {event.lastChangeReason ? ` ${event.lastChangeReason}` : ""}
          </p>
        </div>
      )}

      {/* Scaled-up ticket stub, per design.md §5: "This same visual
          language extends to the digital pass... at a larger scale." */}
      <div className="event-detail-ticket">
        <div className="event-detail-ticket-main">
          <div className="event-detail-header-top">
            <p className="event-detail-eyebrow">
              {formatCategoryLabel(event.category)}
            </p>
            <StatusPill status={event.status} />
          </div>
          <h1 className="event-detail-title">{event.title}</h1>
          <p className="event-detail-venue">{event.venue}</p>
          <span className="event-detail-department-tag">
            {event.department}
          </span>
        </div>
        <div className="event-detail-ticket-perforation" aria-hidden="true">
          <span className="event-detail-ticket-dot event-detail-ticket-dot--top" />
          <span className="event-detail-ticket-dot event-detail-ticket-dot--bottom" />
        </div>
        <div className="event-detail-ticket-date">
          <span className="event-detail-ticket-weekday">{start.weekday}</span>
          <span className="event-detail-ticket-day">{start.day}</span>
          <span className="event-detail-ticket-month">
            {start.month} {start.year}
          </span>
          <span className="event-detail-ticket-time">{start.time}</span>
          {end && (
            <span className="event-detail-ticket-end">
              until {end.day !== start.day ? `${end.month} ${end.day}, ` : ""}
              {end.time}
            </span>
          )}
        </div>
      </div>

      {event.banner && (
        <div className="event-detail-banner-image">
          <img src={event.banner} alt="" />
        </div>
      )}

      <div className="event-detail-body">
        <div className="event-detail-main">
          <section>
            <h2 className="event-detail-section-title">About this event</h2>
            <p className="event-detail-description">{event.description}</p>
          </section>

          {event.guidelinesDoc && (
            <section>
              <h2 className="event-detail-section-title">Guidelines</h2>

              <a
                href={event.guidelinesDoc}
                target="_blank"
                rel="noreferrer"
                className="event-detail-guidelines-link"
              >
                View guidelines document
              </a>
            </section>
          )}

          {organizer && (
            <section>
              <h2 className="event-detail-section-title">Organized by</h2>
              <div className="event-detail-organizer-card">
                <p className="event-detail-organizer-name">{organizer.name}</p>
                <a
                  className="event-detail-organizer-contact"
                  href={`mailto:${organizer.email}`}
                >
                  {organizer.email}
                </a>
                {organizer.phone && (
                  <a
                    className="event-detail-organizer-contact"
                    href={`tel:${organizer.phone}`}
                  >
                    {organizer.phone}
                  </a>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="event-detail-sidebar">
          {event.type === "participation" ? (
            <div className="event-detail-action-card">
              <p className="event-detail-fee-label">
                {event.feeType === "paid" ? "Registration fee" : "Entry"}
              </p>
              <p className="event-detail-fee">
                {event.feeType === "paid" ? `Rs. ${event.amount}` : "Free"}
              </p>
              <div className="event-detail-capacity-row">
                <span>Capacity</span>
                <span>{event.capacity} seats</span>
              </div>
              <button
                type="button"
                className="event-detail-register-btn"
                disabled
              >
                Registration opens soon
              </button>
              <p className="event-detail-register-note">
                Registration isn't open yet — check back closer to the event.
              </p>
            </div>
          ) : (
            <div className="event-detail-action-card">
              <p className="event-detail-notice-text">
                This is an announcement. No registration is required.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default EventDetail;
