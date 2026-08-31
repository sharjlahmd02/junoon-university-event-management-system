import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import PasswordField from "../components/PasswordField.jsx";
import PasswordRequirements from "../components/PasswordRequirements.jsx";
import { checkPasswordRules } from "../utils/passwordRules.js";
import "../styles/auth.css";

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "",
    enrolmentNumber: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const passwordRules = checkPasswordRules(form.password);
  const passwordsMatch = form.password.length > 0 && form.password === form.confirmPassword;
  const confirmMismatch = confirmTouched && form.confirmPassword.length > 0 && !passwordsMatch;

  const canSubmit =
    form.name.trim() &&
    form.email.trim() &&
    form.department.trim() &&
    form.enrolmentNumber.trim() &&
    passwordRules.allMet &&
    passwordsMatch;

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!canSubmit) {
      setError("Please complete all required fields and make sure your passwords match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        department: form.department.trim(),
        enrolmentNumber: form.enrolmentNumber.trim(),
        phone: form.phone.trim(),
      });
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <p className="auth-eyebrow">Junoon</p>
        <h1 className="auth-heading">Create your account</h1>
        <p className="auth-subheading">Register with your BBSUL student email to start registering for events.</p>

        {error && <p className="form-error">{error}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" type="text" autoComplete="name" value={form.name} onChange={update("name")} />
            </div>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={update("email")}
                placeholder="you@bbsul.edu.pk"
              />
            </div>
          </div>

          <div className="field-row">
            <div>
              <PasswordField
                id="password"
                label="Password"
                autoComplete="new-password"
                value={form.password}
                onChange={update("password")}
                placeholder="Create a password"
              />
              <PasswordRequirements password={form.password} />
            </div>

            <div>
              <PasswordField
                id="confirmPassword"
                label="Confirm password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={update("confirmPassword")}
                onBlur={() => setConfirmTouched(true)}
                placeholder="Re-enter your password"
              />
              {confirmMismatch && (
                <p style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--status-urgent-text)", margin: "4px 0 0" }}>
                  Passwords don&apos;t match.
                </p>
              )}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="department">Department</label>
              <input id="department" type="text" value={form.department} onChange={update("department")} />
            </div>

            <div className="field">
              <label htmlFor="enrolmentNumber">Enrolment number</label>
              <input id="enrolmentNumber" type="text" value={form.enrolmentNumber} onChange={update("enrolmentNumber")} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="phone">Phone (optional)</label>
            <input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={update("phone")} />
          </div>

          <button type="submit" className="btn-primary" disabled={isSubmitting || !canSubmit}>
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;