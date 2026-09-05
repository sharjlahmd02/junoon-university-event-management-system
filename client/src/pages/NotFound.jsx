import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { dashboardPathFor } from "../utils/routing.js";

// Inverse of ProtectedRoute: keeps an already-logged-in user off pages
// that only make sense while logged out (login, register). Without this,
// a logged-in student/organizer could navigate to /login and just see the
// login form again -- confusing UI, not a security hole on its own (the
// server never grants anything extra here), but worth guarding directly.
function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={dashboardPathFor(user.role)} replace />;
  }

  return children;
}

export default PublicOnlyRoute;