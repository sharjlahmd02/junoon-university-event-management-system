import { Link } from "react-router-dom";
import StatusPill from "./StatusPill.jsx";
import "../styles/eventStub.css";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// The signature "ticket stub" card (design.md §5): main content on the
// left, a torn-edge date block on the right, joined by a dashed
// perforation. Reserved for actual events per design.md's own rule.
function EventStub({ event }) {
  const date = new Date(event.dateTime);
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];

  return (
    <Link to={`/events/${event._id}`} className="event-stub">
      <div className="event-stub-main">
        <div className="event-stub-top">
          <p className="event-stub-eyebrow">{event.category.replace("-", " ")}</p>
          <StatusPill status={event.status} />
        </div>
        <h3 className="event-stub-title">{event.title}</h3>
        <p className="event-stub-venue">{event.venue}</p>
        <span className="event-stub-department">{event.department}</span>
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