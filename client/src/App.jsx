import { Routes, Route } from "react-router-dom";
import RootRedirect from "./pages/RootRedirect.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import TwoFactorSetup from "./pages/TwoFactorSetup.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import OrganizerDashboard from "./pages/OrganizerDashboard.jsx";
import NotFound from "./pages/NotFound.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PublicOnlyRoute from "./components/PublicOnlyRoute.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />
      {/* Not wrapped in ProtectedRoute: during enrollment there is no
          session yet -- login() only ever hands an unenrolled organizer
          an enrollmentToken, never a full session. TwoFactorSetup guards
          itself by checking for that token in router state and showing
          its own "session expired" state if it's missing. */}
      <Route path="/2fa-setup" element={<TwoFactorSetup />} />
      <Route
        path="/dashboard/student"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/organizer"
        element={
          <ProtectedRoute allowedRoles={["organizer"]}>
            <OrganizerDashboard />
          </ProtectedRoute>
        }
      />
      {/* Catch-all: must stay last so it doesn't shadow real routes above it. */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;