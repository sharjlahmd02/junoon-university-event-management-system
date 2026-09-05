import { generateSecret, buildUri, generateBackupCodes, verifyTotpWithDelta, verifyBackupCode } from "2fa-kit";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getVault, getMasterKey } from "../utils/twoFactorUtils.js";
import { verifyToken, isPendingTwoFactorToken, isPendingEnrollmentToken, signToken } from "../utils/jwtUtils.js";
import { TOKEN_MAX_LENGTH, CODE_MAX_LENGTH } from "../utils/validators.js";

const TOTP_CODE_RE = /^\d{6}$/;

// Shared by enroll/verifyEnrollment -- both run before any real session
// exists (see authController.login and requireAuth.js), authenticated only
// by the short-lived enrollment token login() issues to a not-yet-enrolled
// organizer. Mirrors how verify() below authenticates off the pending-2FA
// token instead of requireAuth, for the same reason.
async function resolveEnrollingOrganizer(req) {
  const { enrollmentToken } = req.body;

  if (
    !enrollmentToken ||
    typeof enrollmentToken !== "string" ||
    enrollmentToken.length > TOKEN_MAX_LENGTH
  ) {
    throw new AppError("An enrollment token is required", 400);
  }

  let payload;
  try {
    payload = verifyToken(enrollmentToken);
  } catch (err) {
    throw new AppError("Invalid or expired session — please log in again", 401);
  }

  if (!isPendingEnrollmentToken(payload)) {
    throw new AppError("Invalid session token", 401);
  }

  const user = await User.findById(payload.id);
  if (!user || user.role !== "organizer") {
    throw new AppError("Invalid or expired session — please log in again", 401);
  }

  return user;
}

// Authenticated by the enrollment token (see resolveEnrollingOrganizer),
// not requireAuth -- there is no full session until enrollment finishes.
// Generates a fresh secret + QR URI + backup codes and stores them, but
// does NOT flip twoFactorEnabled -- that only happens once
// verify-enrollment (task 1.14) confirms the organizer actually scanned it
// and can produce a valid code. Safe to call again before that
// confirmation (e.g. an abandoned first attempt); each call regenerates
// and overwrites the pending secret/codes.
export const enroll = asyncHandler(async (req, res) => {
  const user = await resolveEnrollingOrganizer(req);

  if (user.twoFactorEnabled) {
    throw new AppError(
      "Two-factor authentication is already enabled on this account",
      409
    );
  }

  const secret = await generateSecret();
  const qrUri = buildUri({ label: user.email, secret, issuer: "Junoon" });

  const vault = await getVault();
  const { encrypted, salt } = await vault.encrypt(secret);

  const { codes, hashed } = await generateBackupCodes({ key: getMasterKey() });

  user.totpSecretEncrypted = encrypted;
  user.totpSalt = salt;
  user.totpLastStep = undefined;
  user.backupCodeHashes = hashed;
  await user.save();

  // Raw secret/codes are returned exactly once, here, and never again --
  // only the encrypted/hashed forms persist server-side.
  res.status(200).json({ qrUri, backupCodes: codes });
});

// Confirms the organizer actually scanned the QR and can produce a valid
// code before 2FA is considered "on". This is what flips twoFactorEnabled
// -- and, since that's also the moment a real session becomes available,
// issues the first real session token here too (the enrollment token that
// got them this far is not a session token and can't be reused as one).
export const verifyEnrollment = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code || typeof code !== "string" || code.length > CODE_MAX_LENGTH) {
    throw new AppError("A 6-digit code is required", 400);
  }

  const organizer = await resolveEnrollingOrganizer(req);

  if (organizer.twoFactorEnabled) {
    throw new AppError(
      "Two-factor authentication is already enabled on this account",
      409
    );
  }

  const user = await User.findById(organizer._id).select(
    "+totpSecretEncrypted +totpSalt +totpLastStep"
  );

  if (!user.totpSecretEncrypted || !user.totpSalt) {
    throw new AppError("No pending enrollment found — call /enroll first", 400);
  }

  const vault = await getVault();
  const secret = await vault.decrypt(user.totpSecretEncrypted, user.totpSalt);

  const result = await verifyTotpWithDelta(secret, code);

  // Defensive replay check, even though totpLastStep is normally unset at
  // this point (first-ever verification for this enrollment attempt).
  if (!result.valid || (user.totpLastStep != null && result.step <= user.totpLastStep)) {
    throw new AppError("Invalid or expired code", 400);
  }

  user.twoFactorEnabled = true;
  user.totpLastStep = result.step;
  await user.save();

  const token = signToken({ id: user._id.toString(), role: user.role });

  res.status(200).json({
    message: "Two-factor authentication enabled.",
    token,
    user: user.toJSON(),
  });
});

// Second step of organizer login. Not behind requireAuth -- there is no
// full session yet, only the short-lived pending token from login(). Takes
// either a 6-digit TOTP code or a backup code in the same `code` field,
// distinguished by shape (2fa-kit's backup codes are never 6 plain digits).
export const verify = asyncHandler(async (req, res) => {
  const { pendingToken, code } = req.body;

  if (!pendingToken || typeof pendingToken !== "string" || pendingToken.length > TOKEN_MAX_LENGTH) {
    throw new AppError("A pending session token is required", 400);
  }
  if (!code || typeof code !== "string" || code.length > CODE_MAX_LENGTH) {
    throw new AppError("A code is required", 400);
  }

  let payload;
  try {
    payload = verifyToken(pendingToken);
  } catch (err) {
    throw new AppError("Invalid or expired session — please log in again", 401);
  }

  if (!isPendingTwoFactorToken(payload)) {
    throw new AppError("Invalid session token", 401);
  }

  const user = await User.findById(payload.id).select(
    "+totpSecretEncrypted +totpSalt +totpLastStep +backupCodeHashes"
  );

  if (!user || !user.twoFactorEnabled) {
    throw new AppError("Invalid or expired session — please log in again", 401);
  }

  let remainingBackupCodes;

  if (TOTP_CODE_RE.test(code)) {
    const vault = await getVault();
    const secret = await vault.decrypt(user.totpSecretEncrypted, user.totpSalt);
    const result = await verifyTotpWithDelta(secret, code);

    if (!result.valid || (user.totpLastStep != null && result.step <= user.totpLastStep)) {
      throw new AppError("Invalid or expired code", 401);
    }

    user.totpLastStep = result.step;
    await user.save();
  } else {
    const { valid, remaining } = await verifyBackupCode(code, user.backupCodeHashes || [], {
      key: getMasterKey(),
    });

    if (!valid) {
      throw new AppError("Invalid or expired code", 401);
    }

    user.backupCodeHashes = remaining;
    await user.save();
    remainingBackupCodes = remaining.length;
  }

  const token = signToken({ id: user._id.toString(), role: user.role });

  const response = { token, user: user.toJSON() };
  if (remainingBackupCodes !== undefined) {
    response.remainingBackupCodes = remainingBackupCodes;
  }

  res.status(200).json(response);
});