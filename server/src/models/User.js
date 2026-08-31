import mongoose from "mongoose";
import { EMAIL_RE, EMAIL_MAX_LENGTH, NAME_MAX_LENGTH } from "../utils/validators.js";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    role: {
      type: String,
      enum: ["student", "organizer"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: NAME_MAX_LENGTH,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: EMAIL_MAX_LENGTH,
      validate: {
        validator: (v) => EMAIL_RE.test(v),
        message: "Invalid email address",
      },
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    department: {
      type: String,
      trim: true,
      default: "",
    },
    profilePhoto: {
      type: String,
      default: "",
    },
    // Excluded from query results by default (`select: false`) so it can
    // never leak through an accidental `User.find()` without an explicit
    // `.select('+passwordHash')`. Never returned in API responses regardless.
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    // Student-only. `required` as a function so it's enforced only for students —
    // a plain boolean `required: true` would apply to organizers too, and a custom
    // `validate()` alone won't fire on an undefined value (Mongoose skips validators
    // for undefined non-required paths). Uppercased via `set` at the schema level
    // (not just in the controller) so ANY code path that creates/edits a user gets
    // the same normalization -- prevents "bbsul-1" and "BBSUL-1" registering as
    // two different students.
    enrolmentNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      unique: true,
      required: function () {
        return this.role === "student";
      },
    },
    // Bookmarked events, either role. Populated once the Event model exists (Phase 2).
    savedEvents: [
      {
        type: Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    // Password reset. The raw token is emailed to the user and never
    // stored — only its SHA-256 hash lives here, same reasoning as
    // passwordHash: if the DB is ever compromised, no one can produce a
    // valid reset link from what's stored.
    resetPasswordTokenHash: {
      type: String,
      select: false,
      default: undefined,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
      default: undefined,
    },
    // Organizer-only 2FA (tasks.md "Added feature — Organizer 2FA").
    // twoFactorEnabled stays false until enrollment is confirmed with a
    // verified code (task 1.14) — generating a secret alone doesn't count.
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    // Encrypted via 2fa-kit's vault (AES-256-GCM, keyed by MASTER_KEY +
    // this per-user salt). Never store the raw TOTP secret.
    totpSecretEncrypted: {
      type: String,
      select: false,
      default: undefined,
    },
    totpSalt: {
      type: String,
      select: false,
      default: undefined,
    },
    // Replay protection per RFC 6238 (see 2fa-kit's verifyTotpWithDelta) —
    // a code is only accepted if its step is strictly greater than this.
    totpLastStep: {
      type: Number,
      select: false,
      default: undefined,
    },
    // HMAC-SHA-256 digests (keyed by MASTER_KEY) of one-time backup codes,
    // never the raw codes. Entries are removed as codes get consumed.
    backupCodeHashes: {
      type: [String],
      select: false,
      default: undefined,
    },
  },
  { timestamps: true }
);

// 2FA fields are organizer-only, mirroring the enrolmentNumber pattern:
// a student document must never carry them.
["twoFactorEnabled", "totpSecretEncrypted", "totpSalt", "totpLastStep", "backupCodeHashes"].forEach((field) => {
  userSchema.path(field).validate(function (value) {
    if (this.role !== "student") return true;
    if (field === "twoFactorEnabled") return value === false || value === undefined;
    return value === undefined || (Array.isArray(value) && value.length === 0);
  }, `${field} is not applicable for students`);
});

// Blocks the opposite direction: an organizer document must NOT carry an
// enrolmentNumber. (The "required for students" direction is handled by
// the conditional `required` function above.)
userSchema.path("enrolmentNumber").validate(function (value) {
  if (this.role === "organizer") return !value;
  return true;
}, "enrolmentNumber is not applicable for organizers");

// Second safety net beyond `select: false` — if passwordHash is ever
// explicitly selected in a query, it still never survives serialization.
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.resetPasswordTokenHash;
    delete ret.resetPasswordExpires;
    delete ret.totpSecretEncrypted;
    delete ret.totpSalt;
    delete ret.totpLastStep;
    delete ret.backupCodeHashes;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

export default User;