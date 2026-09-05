import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { eventsApi } from "../api/eventsApi.js";
import EventStub from "../components/EventStub.jsx";
import EventStubSkeleton from "../components/EventStubSkelton.jsx";
import { EVENT_CATEGORIES, EVENT_STATUSES, formatCategoryLabel } from "../utils/eventConstants.js";
import "../styles/browse.css";

const PAGE_LIMIT = 12;
const SKELETON_COUNT = 6;

function Browse() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);

  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error
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

  const hasActiveFilters = Boolean(category || status || department || search);

  function toggleCategory(value) {
    setCategory((prev) => (prev === value ? "" : value));
    setPage(1);
  }

  function toggleStatus(value) {
    setStatus((prev) => (prev === value ? "" : value));
    setPage(1);
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setCategory("");
    setStatus("");
    setDepartment("");
    setPage(1);
  }

  const resultsSummary = useMemo(() => {
    if (loadState !== "ready") return null;
    if (pagination.total === 0) return null;
    const start = (pagination.page - 1) * PAGE_LIMIT + 1;
    const end = Math.min(pagination.page * PAGE_LIMIT, pagination.total);
    return `Showing ${start}–${end} of ${pagination.total} event${pagination.total === 1 ? "" : "s"}`;
  }, [loadState, pagination]);

  return (
    <div className="browse-page">
      <header className="browse-hero">
        <svg className="browse-hero-mark" viewBox="0 0 100 108" aria-hidden="true">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10,54 A40,40 0 1,0 90,54 A40,40 0 1,0 10,54 Z
               M30,40 A36,36 0 1,0 102,40 A36,36 0 1,0 30,40 Z"
          />
        </svg>
        <div className="browse-hero-content">
          <p className="browse-eyebrow">Junoon</p>
          <h1 className="browse-heading">Where BBSUL comes alive.</h1>
          <p className="browse-subheading">
            Fests, workshops, competitions, and notices happening across campus — browse everything in
            one place.
          </p>
        </div>
        <Link to="/login" className="browse-login-link">
          Log in
        </Link>
      </header>

      <div className="browse-filter-panel">
        <input
          type="search"
          className="browse-search"
          placeholder="Search events, venues, departments…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Search events"
        />

        <div className="browse-chip-row">
          <span className="browse-chip-label">Category</span>
          {EVENT_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`browse-chip ${category === c ? "browse-chip--active" : ""}`}
              onClick={() => toggleCategory(c)}
              aria-pressed={category === c}
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
              aria-pressed={status === s}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="browse-department-row">
          <input
            type="text"
            className="browse-department-input"
            placeholder="Filter by department…"
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by department"
          />
          {hasActiveFilters && (
            <button type="button" className="browse-clear-filters" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {resultsSummary && <p className="browse-results-summary">{resultsSummary}</p>}

      {loadState === "loading" && (
        <div className="browse-grid">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <EventStubSkeleton key={i} />
          ))}
        </div>
      )}

      {loadState === "error" && (
        <div className="browse-message-panel browse-message-panel--error">
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={fetchEvents}>
            Try again
          </button>
        </div>
      )}

      {loadState === "ready" && events.length === 0 && (
        <div className="browse-message-panel">
          <p>
            {hasActiveFilters
              ? "No events match these filters."
              : "Nothing's on the calendar yet — check back soon."}
          </p>
          {hasActiveFilters && (
            <button type="button" className="browse-clear-filters" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
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