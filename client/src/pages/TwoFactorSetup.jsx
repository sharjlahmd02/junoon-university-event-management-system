import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { authApi } from "../api/authApi.js";
import { useAuth } from "../hooks/useAuth.js";
import { dashboardPathFor } from "../utils/routing.js";
import "../styles/auth.css";
import { useLocation, useNavigate } from "react-router-dom";

function CopyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

// Organizer-only, forced on first login (tasks.md "Added feature —
// Organizer 2FA"). If a student or an already-enrolled organizer lands
// here, enroll() only ever acts on req.user server-side, and an
// already-enabled account gets a clean 409 surfaced as an error rather
// than a silent redirect.
function TwoFactorSetup() {
  const { completeTwoFactorEnrollment } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const enrollmentToken = location.state?.enrollmentToken;
  const pendingUser = location.state?.pendingUser;

  const [status, setStatus] = useState(enrollmentToken ? "loading" : "error");
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrUri, setQrUri] = useState(null);
  const [backupCodes, setBackupCodes] = useState([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(
    enrollmentToken ? "" : "Your session has expired. Please log in again.",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy all");

  const hasEnrolled = useRef(false);

  useEffect(() => {
    if (!enrollmentToken || hasEnrolled.current) return;
    hasEnrolled.current = true;

    (async () => {
      try {
        const res = await authApi.enrollTwoFactor(enrollmentToken);
        const dataUrl = await QRCode.toDataURL(res.qrUri, {
          margin: 1,
          width: 200,
        });
        setQrDataUrl(dataUrl);
        setQrUri(res.qrUri);
        setBackupCodes(res.backupCodes);
        setStatus("ready");
      } catch (err) {
        setError(
          err.message ||
            "Could not start two-factor setup. Please try logging in again.",
        );
        setStatus("error");
      }
    })();
  }, [enrollmentToken]);

  const manualSecret = useMemo(() => {
    if (!qrUri) return null;
    try {
      return new URL(qrUri).searchParams.get("secret");
    } catch {
      return null;
    }
  }, [qrUri]);

  async function handleCopyAll() {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy all"), 2000);
    } catch {
      setCopyLabel("Couldn't copy");
      setTimeout(() => setCopyLabel("Copy all"), 2000);
    }
  }

  function handleDownload() {
    const content = `Junoon — two-factor backup codes\nAccount: ${pendingUser?.email}\nGenerated: ${new Date().toISOString()}\n\n${backupCodes.join("\n")}\n\nEach code works once. Keep this file somewhere safe.\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "junoon-backup-codes.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleConfirm(e) {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setIsSubmitting(true);
    setIsSubmitting(true);
    try {
      const { user } = await completeTwoFactorEnrollment({
        enrollmentToken,
        code: code.trim(),
      });
      navigate(dashboardPathFor(user.role));
    } catch (err) {
      setError(err.message || "Invalid code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="auth-subheading" style={{ margin: 0 }}>
            Setting up two-factor authentication…
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="auth-eyebrow">Two-factor setup</p>
          <h1 className="auth-heading">Something went wrong</h1>
          <p className="form-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <p className="auth-eyebrow">Required — one-time setup</p>
        <h1 className="auth-heading">Secure your organizer account</h1>
        <p className="auth-subheading">
          Junoon requires two-factor authentication for every organizer account,
          since organizers can confirm payments and issue certificates. This
          takes about a minute.
        </p>

        <div className="tfa-step">
          <div className="tfa-step-header">
            <span className="tfa-step-number">1</span>
            <h2 className="tfa-step-title">Scan with your authenticator app</h2>
          </div>
          <div className="tfa-step-body">
            <div className="tfa-qr-panel">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="Scan this QR code with your authenticator app"
                />
              )}
              <details className="tfa-manual-entry">
                <summary>Can&apos;t scan? Enter this code manually</summary>
                {manualSecret && (
                  <div className="tfa-secret-key">{manualSecret}</div>
                )}
              </details>
            </div>
          </div>
        </div>

        <div className="tfa-step">
          <div className="tfa-step-header">
            <span className="tfa-step-number">2</span>
            <h2 className="tfa-step-title">Save your backup codes</h2>
          </div>
          <div className="tfa-step-body">
            <div className="tfa-backup-panel">
              <p className="tfa-backup-intro">
                If you ever lose access to your authenticator app, one of these
                codes is the only way back into your account — there&apos;s no
                admin who can reset it for you. Each code works once.
              </p>
              <div className="tfa-backup-codes">
                {backupCodes.map((c, i) => (
                  <span className="tfa-backup-code" key={c}>
                    <span className="tfa-backup-code-index">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {c}
                  </span>
                ))}
              </div>
              <div className="tfa-backup-actions">
                <button type="button" onClick={handleCopyAll}>
                  <CopyIcon /> {copyLabel}
                </button>
                <button type="button" onClick={handleDownload}>
                  <DownloadIcon /> Download as .txt
                </button>
              </div>
            </div>

            <label className="tfa-acknowledge">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>I have saved these backup codes somewhere secure.</span>
            </label>
          </div>
        </div>

        <div className="tfa-step">
          <div className="tfa-step-header">
            <span className="tfa-step-number">3</span>
            <h2 className="tfa-step-title">Confirm it worked</h2>
          </div>
          <div className="tfa-step-body">
            {error && (
              <p className="form-error" style={{ marginBottom: 14 }}>
                {error}
              </p>
            )}

            <form className="auth-form" onSubmit={handleConfirm}>
              <div className="field">
                <label htmlFor="confirm-code">
                  6-digit code from your authenticator app
                </label>
                <input
                  id="confirm-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  disabled={!acknowledged}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={!acknowledged || isSubmitting}
              >
                {isSubmitting ? "Confirming…" : "Confirm and continue"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TwoFactorSetup;
