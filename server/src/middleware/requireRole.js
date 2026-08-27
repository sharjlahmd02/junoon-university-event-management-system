
import AppError from "../utils/AppError.js";

// Must run after requireAuth (needs req.user already set).
// Usage: router.post('/events', requireAuth, requireRole('organizer'), handler)
export default function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError("You do not have permission to perform this action", 403);
    }
    next();
  };
}