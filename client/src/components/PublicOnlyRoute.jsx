import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

// Inverse of ProtectedRoute: blocks already-authenticated users from
// seeing auth pages (login/register). Mirrors whatever role->route
// mapping RootRedirect uses, so keep them in sync.
function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    const target =
      user.role === "organizer" ? "/dashboard/organizer" : "/dashboard/student";
    return <Navigate to={target} replace />;
  }

  return children;
}

export default PublicOnlyRoute;