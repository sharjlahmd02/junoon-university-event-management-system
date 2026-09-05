import "../styles/statusPill.css";

const STATUS_LABELS = {
  upcoming: "Upcoming",
  live: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
};

// Mapping agreed with the user: upcoming -> pending/amber, live ->
// free/green, completed -> neutral/grey, cancelled -> urgent/red (design.md
// §2 doesn't define a dedicated "cancelled" color -- urgent is the only
// "something's wrong" tone in the palette, so it's reused here).
const STATUS_CLASS = {
  upcoming: "status-pill--pending",
  live: "status-pill--free",
  completed: "status-pill--neutral",
  cancelled: "status-pill--urgent",
};

function StatusPill({ status }) {
  const cls = STATUS_CLASS[status] ?? STATUS_CLASS.upcoming;
  const label = STATUS_LABELS[status] ?? status;
  return <span className={`status-pill ${cls}`}>{label}</span>;
}

export default StatusPill;