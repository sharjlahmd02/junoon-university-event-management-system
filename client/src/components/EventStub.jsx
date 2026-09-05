import { Link } from "react-router-dom";
import StatusPill from "./StatusPill.jsx";
import "../styles/eventStub.css";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// The signature "ticket stub" card (design.md §5): main content on the
// left, a torn-edge date block on the right, joined by a dashed
// perforation. design.md reserves this motif for things that behave like
// a ticket -- actual events -- so this component should only ever wrap
// Event data, not generic list items elsewhere in the app.
function EventStub({ event }) {
  const date = new Date(event.dateTime);
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];

  return (
    <Link to={`/events/${event._id}`} className="event-stub">
      <div className="event-stub-main">
        <p className="event-stub-eyebrow">{event.category.replace("-", " ")}</p>
        <h3 className="event-stub-title">{event.title}</h3>
        <p className="event-stub-meta">
          {event.venue} · {event.department}
        </p>
        <StatusPill status={event.status} />
      </div>
      <div className="event-stub-perforation" aria-hidden="true">
        <span className="event-stub-dot event-stub-dot--top" />
        <span className="event-stub-dot event-stub-dot--bottom" />
      </div>
      <div className="event-stub-date">
        <span className="event-stub-day">{day}</span>
        <span className="event-stub-month">{month}</span>
      </div>
    </Link>
  );
}

export default EventStub;