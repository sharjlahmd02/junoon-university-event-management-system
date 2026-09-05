import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { eventsApi } from "../api/eventsApi.js";
import { useAuth } from "../hooks/useAuth.js";
import EventForm from "../components/EventForm.jsx";
import CancelEventCard from "../components/CancelEventCard.jsx";
import "../styles/eventForm.css";

function EditEvent() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error

  useEffect(() => {
    let cancelled = false;
    eventsApi
      .getById(id)
      .then((res) => {
        if (!cancelled) {
          setEvent(res.event);
          setLoadState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(payload) {
    const res = await eventsApi.update(id, payload, token);
    setEvent(res.event);
    navigate(`/events/${id}`);
  }

  async function handleCancel(reason) {
    const res = await eventsApi.update(id, { cancelled: true, reason }, token);
    setEvent(res.event);
    navigate(`/events/${id}`);
  }

  if (loadState === "loading") {
    return (
      <div className="event-form-page">
        <p className="event-form-status-text">Loading event…</p>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="event-form-page">
        <p className="form-error">Could not load this event. It may not exist, or you may not have access.</p>
      </div>
    );
  }

  return (
    <div className="event-form-page">
      <h1 className="event-form-page-title">Edit event</h1>
      <p className="event-form-page-subtitle">Editing is only available until the event starts.</p>
      <EventForm
        mode="edit"
        initialEvent={event}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
        cancelHref={`/events/${id}`}
      />

      {!event.cancelled && (
        <>
          <hr className="event-form-divider" />
          <CancelEventCard onCancel={handleCancel} />
        </>
      )}
    </div>
  );
}

export default EditEvent;