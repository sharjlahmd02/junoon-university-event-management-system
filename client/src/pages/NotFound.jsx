import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { dashboardPathFor } from "../utils/routing.js";
import "../styles/notFound.css";


// Catch-all for any unmatched route (see the `path="*"` route in App.jsx).
// Sends people somewhere useful instead of the blank screen react-router
// renders by default when nothing matches -- mirroring RootRedirect's
// logic rather than always pointing at /login, since a logged-in student
// or organizer hitting a bad link should go back to their own dashboard,
// not get logged-out-feeling behavior.
function NotFound() {
  const { isAuthenticated, user } = useAuth();
  const homePath = isAuthenticated ? dashboardPathFor(user.role) : "/login";
  const homeLabel = isAuthenticated ? "Back to your dashboard" : "Back to login";

  return (
    <main className="notfound-page">
      <div className="notfound-card">
        <p className="notfound-eyebrow">404</p>
        <h1 className="notfound-heading">This page wandered off.</h1>
        <p className="notfound-subheading">
          The page you're looking for doesn't exist, or the link may be out of date.
        </p>
        <Link to={homePath} className="notfound-button">
          {homeLabel}
        </Link>
      </div>
    </main>
  );
}

export default NotFound;