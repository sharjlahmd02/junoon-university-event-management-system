import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { hashPassword, comparePassword } from "../utils/passwordUtils.js";
import { signToken, signPendingTwoFactorToken } from "../utils/jwtUtils.js";
import { createResetToken, hashResetToken } from "../utils/resetTokenUtils.js";
import {
  isValidEmail,
  validateName,
  validateDepartment,
  validateEnrolmentNumber,
  validatePhone,
  validatePassword,
  EMAIL_MAX_LENGTH,
  TOKEN_MAX_LENGTH,
} from "../utils/validators.js";

// A syntactically valid bcrypt hash of an arbitrary fixed value, compared
// against when no user is found at login. Without this, a nonexistent
// email returns instantly (no hash to compare) while a wrong password on a
// real account takes bcrypt's compare time -- an attacker can tell the two
// apart purely from response time, which defeats the point of the generic
// "Invalid email or password" message below. Comparing against this dummy
// hash keeps both paths taking comparable time.
const DUMMY_PASSWORD_HASH = "$2b$12$R98bpmjZk4hXQbaOAou6seyczPcyFd.pbtKo.Ausp5sDzPJyok.BO";

// Self-registration only ever creates Students. Organizer accounts are
// seeded manually (spec.md §2.3) — this route intentionally never reads
// a `role` field from the request body.
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, department, enrolmentNumber, phone } = req.body;

  const nameCheck = validateName(name);
  if (!nameCheck.valid) throw new AppError(nameCheck.error, 400);

  if (typeof email !== "string" || !isValidEmail(email.trim())) {
    throw new AppError("A valid email is required", 400);
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) throw new AppError(passwordCheck.error, 400);

  const departmentCheck = validateDepartment(department);
  if (!departmentCheck.valid) throw new AppError(departmentCheck.error, 400);

  const enrolmentCheck = validateEnrolmentNumber(enrolmentNumber);
  if (!enrolmentCheck.valid) throw new AppError(enrolmentCheck.error, 400);

  const phoneCheck = validatePhone(phone);
  if (!phoneCheck.valid) throw new AppError(phoneCheck.error, 400);

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await User.findOne({
    $or: [{ email: normalizedEmail }, { enrolmentNumber: enrolmentCheck.trimmed }],
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
      name: nameCheck.trimmed,
      email: normalizedEmail,
      phone: phoneCheck.trimmed,
      department: departmentCheck.trimmed,
      enrolmentNumber: enrolmentCheck.trimmed,
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

  if (
    typeof email !== "string" ||
    email.length === 0 ||
    email.length > EMAIL_MAX_LENGTH ||
    typeof password !== "string" ||
    password.length === 0
  ) {
    throw new AppError("Email and password are required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  // passwordHash is select:false on the schema, so it must be explicitly
  // requested here to compare against.
  const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");

  // Same generic message whether the email doesn't exist or the password
  // is wrong — distinguishing the two lets an attacker enumerate valid
  // accounts. Comparing against a dummy hash even when there's no user
  // keeps the timing of both paths comparable (see DUMMY_PASSWORD_HASH).
  const isMatch = await comparePassword(password, user ? user.passwordHash : DUMMY_PASSWORD_HASH);

  if (!user || !isMatch) {
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

  // Always return the same generic response whether the input is
  // malformed, the account doesn't exist, or the email really was sent —
  // any variation here (including a different error for "bad format") is
  // a small crack an attacker can use to enumerate registered emails.
  const genericResponse = {
    message: "If an account with that email exists, a reset link has been sent.",
  };

  if (typeof email !== "string" || !isValidEmail(email.trim())) {
    return res.status(200).json(genericResponse);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

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

  // Cheap sanity checks before touching the DB or hashing anything --
  // rejects obviously-malformed input (e.g. someone sending a huge string)
  // without spending CPU on it.
  if (typeof token !== "string" || token.length === 0 || token.length > TOKEN_MAX_LENGTH) {
    throw new AppError("Reset token is required", 400);
  }

  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.valid) throw new AppError(passwordCheck.error, 400);

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