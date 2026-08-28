import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { verifyToken, isPendingTwoFactorToken } from "../utils/jwtUtils.js";

// Re-fetches the user on every request instead of trusting the JWT
// payload alone, so a deleted/deactivated account is rejected immediately
// rather than staying "valid" until the token naturally expires.
const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AppError("Authentication required", 401);
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    throw new AppError("Invalid or expired token", 401);
  }

  // Defense in depth: pending-2FA tokens are signed with the same secret
  // as real session tokens, so this is rejected explicitly rather than
  // relying only on the /2fa/verify endpoint being the sole place that
  // reads them.
  if (isPendingTwoFactorToken(payload)) {
    throw new AppError("Complete two-factor verification before continuing", 401);
  }

  const user = await User.findById(payload.id);
  if (!user) {
    throw new AppError("Invalid or expired token", 401);
  }

  req.user = user;
  next();
});

export default requireAuth;