import { api } from "./apiClient.js";

export const registrationsApi = {
  register: (eventId, token) => api.post(`/events/${eventId}/register`, {}, token),
  mine: (token) => api.get("/registrations/mine", token),
  getPass: (id, token) => api.get(`/registrations/${id}/pass`, token),
  confirmPayment: (id, token) => api.patch(`/registrations/${id}/confirm-payment`, {}, token),
  getEventRegistrations: (eventId, token, status) =>
    api.get(`/events/${eventId}/registrations${status ? `?status=${status}` : ""}`, token),
};