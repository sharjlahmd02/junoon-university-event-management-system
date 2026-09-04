import jwt from "jsonwebtoken";

// 7 days: no refresh-token flow exists in this app's plan, so this is the
// full session lifetime. Matches actual usage (infrequent, event-driven
// visits) while staying well short of "no expiry." See CLAUDE.md §3.
const TOKEN_EXPIRY = "7d";

export function signToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Check your .env file (see .env.example).");
  }
  return jwt.sign(payload, secret, { expiresIn: TOKEN_EXPIRY });
}

// 2 minutes: just long enough to type a 6-digit code, short enough that a
// leaked pending token isn't useful for long. Carries a `purpose` claim so
// it's structurally distinguishable from a real session token even though
// both are signed with the same secret (see requireAuth.js, which rejects
// any token carrying this claim).
const PENDING_2FA_EXPIRY = "2m";
const PENDING_2FA_PURPOSE = "2fa_pending";

export function signPendingTwoFactorToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Check your .env file (see .env.example).");
  }
  return jwt.sign({ ...payload, purpose: PENDING_2FA_PURPOSE }, secret, {
    expiresIn: PENDING_2FA_EXPIRY,
  });
}

// 10 minutes: enrollment involves scanning a QR code with an authenticator
// app and typing back the code it shows -- longer than the 2-minute
// pending-2FA-login window (which is just re-typing a code you already
// have), short enough that a leaked enrollment token isn't useful for long.
const PENDING_ENROLLMENT_EXPIRY = "10m";
const PENDING_ENROLLMENT_PURPOSE = "2fa_enroll_pending";

export function signPendingEnrollmentToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Check your .env file (see .env.example).");
  }
  return jwt.sign({ ...payload, purpose: PENDING_ENROLLMENT_PURPOSE }, secret, {
    expiresIn: PENDING_ENROLLMENT_EXPIRY,
  });
}

export function isPendingEnrollmentToken(payload) {
  return payload?.purpose === PENDING_ENROLLMENT_PURPOSE;
}

export function isPendingTwoFactorToken(payload) {
  return payload?.purpose === PENDING_2FA_PURPOSE;
}

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Check your .env file (see .env.example).");
  }
  return jwt.verify(token, secret);
}