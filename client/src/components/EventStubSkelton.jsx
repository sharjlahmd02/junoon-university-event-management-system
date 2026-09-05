import "../styles/eventStub.css";

// Loading placeholder shaped exactly like EventStub, so the grid doesn't
// jump when real data arrives. Rendered a fixed number of times by
// Browse.jsx while a request is in flight, instead of a plain "Loading…"
// line.
function EventStubSkeleton() {
  return (
    <div className="event-stub event-stub--skeleton" aria-hidden="true">
      <div className="event-stub-main">
        <div className="event-stub-top">
          <span className="skeleton-bar skeleton-bar--eyebrow" />
        </div>
        <span className="skeleton-bar skeleton-bar--title" />
        <span className="skeleton-bar skeleton-bar--venue" />
      </div>
      <div className="event-stub-perforation">
        <span className="event-stub-dot event-stub-dot--top" />
        <span className="event-stub-dot event-stub-dot--bottom" />
      </div>
      <div className="event-stub-date event-stub-date--skeleton" />
    </div>
  );
}

export default EventStubSkeleton;