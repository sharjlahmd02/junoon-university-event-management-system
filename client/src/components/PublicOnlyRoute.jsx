import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
<<<<<<< HEAD

// Inverse of ProtectedRoute: blocks already-authenticated users from
// seeing auth pages (login/register). Mirrors whatever role->route
// mapping RootRedirect uses, so keep them in sync.
=======
import { dashboardPathFor } from "../utils/routing.js";

// Inverse of ProtectedRoute: keeps an already-logged-in user off pages
// that only make sense while logged out (login, register). Without this,
// a logged-in student/organizer could navigate to /login and just see the
// login form again -- confusing UI, not a security hole on its own (the
// server never grants anything extra here), but worth guarding directly.
>>>>>>> fix-routing-issues
function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
<<<<<<< HEAD
    const target =
      user.role === "organizer" ? "/dashboard/organizer" : "/dashboard/student";
    return <Navigate to={target} replace />;
=======
    return <Navigate to={dashboardPathFor(user.role)} replace />;
>>>>>>> fix-routing-issues
  }

  return children;
}

export default PublicOnlyRoute;