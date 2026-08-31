import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import PasswordField from "../components/PasswordField.jsx";
import { dashboardPathFor } from "../utils/routing.js";
import "../styles/auth.css";

function Login() {
  const { login, completeTwoFactorLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showRegisteredBanner, setShowRegisteredBanner] = useState(Boolean(location.state?.registered));

  useEffect(() => {
    if (!showRegisteredBanner) return;
    const timer = setTimeout(() => setShowRegisteredBanner(false), 2000);
    return () => clearTimeout(timer);
  }, [showRegisteredBanner]);

  // "credentials" -> email/password form. "2fa" -> code entry, shown only
  // when login() reports twoFactorRequired.
  const [step, setStep] = useState("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingToken, setPendingToken] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function routeAfterLogin(user) {
    if (user.role === "organizer" && !user.twoFactorEnabled) {
      navigate("/2fa-setup");
      return;
    }
    navigate(dashboardPathFor(user.role));
  }

  async function handleCredentialsSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login({ email: email.trim(), password });
      if (result.twoFactorRequired) {
        setPendingToken(result.pendingToken);
        setPendingUser(result.user);
        setStep("2fa");
      } else {
        routeAfterLogin(result.user);
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCodeSubmit(e) {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("Enter your 6-digit code or a backup code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { user } = await completeTwoFactorLogin({ pendingToken, code: code.trim() });
      routeAfterLogin(user);
    } catch (err) {
      setError(err.message || "Invalid code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function backToCredentials() {
    setStep("credentials");
    setCode("");
    setError("");
    setPendingToken(null);
    setPendingUser(null);
  }

  if (step === "2fa") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="auth-eyebrow">Two-factor verification</p>
          <h1 className="auth-heading">Almost there{pendingUser?.name ? `, ${pendingUser.name.split(" ")[0]}` : ""}</h1>
          <p className="auth-subheading">
            Enter the 6-digit code from your authenticator app. Lost your device? You can use one of your backup
            codes instead.
          </p>

          {error && <p className="form-error">{error}</p>}

          <form className="auth-form" onSubmit={handleCodeSubmit}>
            <div className="field">
              <label htmlFor="code">Authentication code</label>
              <input
                id="code"
                type="text"
                inputMode="text"
                autoComplete="one-time-code"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456 or ABCDE-FGHIJ"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Verifying…" : "Verify"}
            </button>
          </form>

          <div className="auth-footer">
            <button type="button" className="btn-link" onClick={backToCredentials}>
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-eyebrow">Junoon</p>
        <h1 className="auth-heading">Welcome back</h1>
        <p className="auth-subheading">Log in to register for events, check your pass, or manage what you organize.</p>

        {showRegisteredBanner && <p className="form-success">Account created — log in to continue.</p>}
        {error && <p className="form-error">{error}</p>}

        <form className="auth-form" onSubmit={handleCredentialsSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@bbsul.edu.pk"
            />
          </div>

          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;