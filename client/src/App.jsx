import { Routes, Route } from "react-router-dom";
import RootRedirect from "./pages/RootRedirect.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import TwoFactorSetup from "./pages/TwoFactorSetup.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import OrganizerDashboard from "./pages/OrganizerDashboard.jsx";
import NotFound from "./pages/NotFound.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/2fa-setup"
        element={
          <ProtectedRoute allowedRoles={["organizer"]}>
            <TwoFactorSetup />
          </ProtectedRoute>
        }
      />
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