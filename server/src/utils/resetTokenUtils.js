import crypto from "crypto";

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Returns the raw token (goes in the email link, never stored) and its
// hash + expiry (what actually gets saved on the user document).
export function createResetToken() {
  const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  return { rawToken, tokenHash, expires };
}

export function hashResetToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}