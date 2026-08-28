import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { hashPassword, comparePassword } from "../utils/passwordUtils.js";
import { signToken, signPendingTwoFactorToken } from "../utils/jwtUtils.js";
import { createResetToken, hashResetToken } from "../utils/resetTokenUtils.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Self-registration only ever creates Students. Organizer accounts are
// seeded manually (spec.md §2.3) — this route intentionally never reads
// a `role` field from the request body.
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, department, enrolmentNumber, phone } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    throw new AppError("Name is required", 400);
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    throw new AppError("A valid email is required", 400);
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400);
  }
  if (!department || typeof department !== "string" || !department.trim()) {
    throw new AppError("Department is required", 400);
  }
  if (!enrolmentNumber || typeof enrolmentNumber !== "string" || !enrolmentNumber.trim()) {
    throw new AppError("Enrolment number is required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedEnrolment = enrolmentNumber.trim();

  const existing = await User.findOne({
    $or: [{ email: normalizedEmail }, { enrolmentNumber: trimmedEnrolment }],
  });
  if (existing) {
    if (existing.email === normalizedEmail) {
      throw new AppError("An account with this email already exists", 409);
    }
    throw new AppError("An account with this enrolment number already exists", 409);
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await User.create({
      role: "student",
      name: name.trim(),
      email: normalizedEmail,
      phone: typeof phone === "string" ? phone.trim() : "",
      department: department.trim(),
      enrolmentNumber: trimmedEnrolment,
      passwordHash,
    });
  } catch (err) {
    // Defensive fallback for the race where two requests both pass the
    // pre-check above before either commits (E11000 = Mongo duplicate key).
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      throw new AppError(
        field === "enrolmentNumber"
          ? "An account with this enrolment number already exists"
          : "An account with this email already exists",
        409
      );
    }
    throw err;
  }

  res.status(201).json({ user: user.toJSON() });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    throw new AppError("Email and password are required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  // passwordHash is select:false on the schema, so it must be explicitly
  // requested here to compare against.
  const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");

  // Same generic message whether the email doesn't exist or the password
  // is wrong — distinguishing the two lets an attacker enumerate valid
  // accounts.
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  // Organizers with 2FA enabled don't get a full session token from a
  // password match alone — a short-lived pending token instead, exchanged
  // for the real one at /api/auth/2fa/verify (task 1.16). Students, and
  // organizers who haven't finished enrollment yet, are unaffected.
  if (user.role === "organizer" && user.twoFactorEnabled) {
    const pendingToken = signPendingTwoFactorToken({ id: user._id.toString() });
    return res.status(200).json({
      twoFactorRequired: true,
      pendingToken,
      user: { name: user.name, email: user.email },
    });
  }

  const token = signToken({ id: user._id.toString(), role: user.role });

  res.status(200).json({ token, user: user.toJSON() });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    throw new AppError("Email is required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  // Always return the same generic response whether or not the account
  // exists — a different response here would let an attacker enumerate
  // registered emails.
  const genericResponse = {
    message: "If an account with that email exists, a reset link has been sent.",
  };

  if (!user) {
    return res.status(200).json(genericResponse);
  }

  const { rawToken, tokenHash, expires } = createResetToken();
  user.resetPasswordTokenHash = tokenHash;
  user.resetPasswordExpires = expires;
  await user.save();

  // STOPGAP: no email service is wired up yet (see CLAUDE.md §1 — not a
  // decided stack piece). Logging the reset link server-side so the flow
  // is fully testable now; swap this for a real email send later without
  // touching the token logic above.
  console.log(`[password reset] link for ${normalizedEmail}: /reset-password?token=${rawToken}`);

  res.status(200).json(genericResponse);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || typeof token !== "string") {
    throw new AppError("Reset token is required", 400);
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    throw new AppError("New password must be at least 8 characters", 400);
  }

  const tokenHash = hashResetToken(token);

  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  }).select("+resetPasswordTokenHash +resetPasswordExpires");

  if (!user) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  user.passwordHash = await hashPassword(newPassword);
  // Single-use: clear immediately so the same token can't be replayed.
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.status(200).json({ message: "Password has been reset. You can now log in." });
});