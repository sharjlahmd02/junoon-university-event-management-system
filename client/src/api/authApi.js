import { api } from "./apiClient.js";

export const authApi = {
  register: (payload) => api.post("/auth/register", payload),

  // Response shape varies: { token, user } for students and organizers
  // without 2FA, or { twoFactorRequired: true, pendingToken, user } for
  // organizers with 2FA enabled — caller branches on twoFactorRequired.
  login: (payload) => api.post("/auth/login", payload),

  forgotPassword: (payload) => api.post("/auth/forgot-password", payload),
  resetPassword: (payload) => api.post("/auth/reset-password", payload),

  // Second step of organizer login. `code` is either a 6-digit TOTP code
  // or a backup code — the server tells them apart by shape.
  verifyTwoFactor: ({ pendingToken, code }) =>
    api.post("/auth/2fa/verify", { pendingToken, code }),

  // Enrollment endpoints need a real session token (organizer already has
  // one at this point, even before 2FA is fully set up).
  enrollTwoFactor: (enrollmentToken) =>
    api.post("/auth/2fa/enroll", { enrollmentToken }),
  verifyTwoFactorEnrollment: ({ enrollmentToken, code }) =>
    api.post("/auth/2fa/verify-enrollment", { enrollmentToken, code }),
};
