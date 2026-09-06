import { useNavigate } from "react-router-dom";
import { eventsApi } from "../api/eventsApi.js";
import { useAuth } from "../hooks/useAuth.js";
import EventForm from "../components/EventForm.jsx";
import "../styles/eventForm.css";

function CreateEvent() {
  const { token } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(payload) {
    const res = await eventsApi.create(payload, token);
    navigate(`/events/${res.event._id}`);
  }

  return (
    <div className="event-form-page">
      <h1 className="event-form-page-title">Create event</h1>
      <EventForm mode="create" onSubmit={handleSubmit} submitLabel="Publish event" />
    </div>
  );
}

export default CreateEvent;