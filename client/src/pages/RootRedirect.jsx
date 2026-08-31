import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { dashboardPathFor } from "../utils/routing.js";

// The real public landing page (spec.md's browse/discovery page) comes in
// Phase 2. Until then, "/" just routes people to where they actually need
// to be instead of showing the Phase 0 token-showcase placeholder.
function RootRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={dashboardPathFor(user.role)} replace />;
  }
  return <Navigate to="/login" replace />;
}

export default RootRedirect;