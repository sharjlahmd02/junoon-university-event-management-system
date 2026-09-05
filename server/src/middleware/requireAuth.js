import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { verifyToken } from "../utils/jwtUtils.js";

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

  // Defense in depth: any pending/scoped token (2FA-verify, 2FA-enrollment,
  // and anything added later) is signed with the same secret as a real
  // session token, distinguished only by a `purpose` claim that real
  // session tokens never carry. Rejecting on the presence of *any*
  // `purpose` claim -- rather than checking for one specific pending-token
  // type -- means a new pending-token type added later is safe by default
  // instead of silently bypassing this check the way the enrollment token
  // would have if this only checked isPendingTwoFactorToken.
  if (payload?.purpose) {
    throw new AppError("Complete verification before continuing", 401);
  }

  const user = await User.findById(payload.id);
  if (!user) {
    throw new AppError("Invalid or expired token", 401);
  }

  req.user = user;
  next();
});

export default requireAuth;