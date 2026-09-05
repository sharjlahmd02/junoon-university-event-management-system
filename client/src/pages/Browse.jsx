import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { eventsApi } from "../api/eventsApi.js";
import EventStub from "../components/EventStub.jsx";
import { EVENT_CATEGORIES, EVENT_STATUSES, formatCategoryLabel } from "../utils/eventConstants.js";
import "../styles/browse.css";

const PAGE_LIMIT = 12;

function Browse() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);

  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loadState, setLoadState] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchEvents = useCallback(async () => {
    setLoadState("loading");
    setError("");
    try {
      const res = await eventsApi.list({
        category: category || undefined,
        department: department || undefined,
        status: status || undefined,
        search: search || undefined,
        page,
        limit: PAGE_LIMIT,
      });
      setEvents(res.events);
      setPagination(res.pagination);
      setLoadState("ready");
    } catch (err) {
      setError(err.message || "Could not load events. Please try again.");
      setLoadState("error");
    }
  }, [category, department, status, search, page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  function toggleCategory(value) {
    setCategory((prev) => (prev === value ? "" : value));
    setPage(1);
  }

  function toggleStatus(value) {
    setStatus((prev) => (prev === value ? "" : value));
    setPage(1);
  }

  return (
    <div className="browse-page">
      <header className="browse-header">
        <p className="browse-eyebrow">Junoon</p>
        <h1 className="browse-heading">Where BBSUL comes alive.</h1>
        <p className="browse-subheading">
          Discover fests, workshops, competitions, and notices happening across campus.
        </p>
        <Link to="/login" className="browse-login-link">
          Log in
        </Link>
      </header>

      <div className="browse-controls">
        <input
          type="search"
          className="browse-search"
          placeholder="Search events, venues, departments…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />

        <div className="browse-chip-row">
          <span className="browse-chip-label">Category</span>
          {EVENT_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`browse-chip ${category === c ? "browse-chip--active" : ""}`}
              onClick={() => toggleCategory(c)}
            >
              {formatCategoryLabel(c)}
            </button>
          ))}
        </div>

        <div className="browse-chip-row">
          <span className="browse-chip-label">Status</span>
          {EVENT_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`browse-chip ${status === s ? "browse-chip--active" : ""}`}
              onClick={() => toggleStatus(s)}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <input
          type="text"
          className="browse-department-input"
          placeholder="Filter by department…"
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {loadState === "loading" && <p className="browse-status-text">Loading events…</p>}

      {loadState === "error" && (
        <div className="browse-status-text">
          <p className="form-error">{error}</p>
          <button type="button" className="btn-primary" onClick={fetchEvents}>
            Try again
          </button>
        </div>
      )}

      {loadState === "ready" && events.length === 0 && (
        <p className="browse-status-text">No events match these filters yet.</p>
      )}

      {loadState === "ready" && events.length > 0 && (
        <>
          <div className="browse-grid">
            {events.map((event) => (
              <EventStub key={event._id} event={event} />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="browse-pagination">
              <button type="button" disabled={pagination.page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span className="browse-pagination-label">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Browse;