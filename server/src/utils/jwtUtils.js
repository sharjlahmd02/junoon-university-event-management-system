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

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Check your .env file (see .env.example).");
  }
  return jwt.verify(token, secret);
}