import mongoose from "mongoose";

const { Schema } = mongoose;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
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
    // for undefined non-required paths).
    enrolmentNumber: {
      type: String,
      trim: true,
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
  },
  { timestamps: true }
);

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
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

export default User;