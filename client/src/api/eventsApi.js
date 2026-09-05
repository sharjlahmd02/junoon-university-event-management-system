import { api } from "./apiClient.js";

export const eventsApi = {
  // Public route -- no token needed. Undefined/empty params are dropped
  // before building the query string so we don't send e.g. "category="
  // for a filter the user hasn't touched.
  list: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null)
    ).toString();
    return api.get(`/events${query ? `?${query}` : ""}`);
  },

  getById: (id) => api.get(`/events/${id}`),

  create: (payload, token) => api.post("/events", payload, token),
  update: (id, payload, token) => api.patch(`/events/${id}`, payload, token),
};