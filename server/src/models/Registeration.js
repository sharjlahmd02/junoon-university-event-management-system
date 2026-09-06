import mongoose from "mongoose";
import crypto from "crypto";
import { REGISTRATION_PAYMENT_STATUSES } from "../utils/validators.js";

const { Schema } = mongoose;

// 16 random bytes -> 32 hex chars. Unguessable and not sequential/
// enumerable (unlike an incrementing id), which matters since this code
// is effectively a bearer credential for event entry (spec.md §3.4).
function generatePassCode() {
  return crypto.randomBytes(16).toString("hex");
}

const registrationSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: REGISTRATION_PAYMENT_STATUSES,
      required: true,
    },
    // Snapshot of the fee at the moment of registration (Phase 3 kickoff
    // decision, agreed with the user). Event.amount can still change for
    // *future* registrants up until the first registration exists --
    // updateEvent additionally locks it once any registration exists --
    // but this snapshot keeps each Registration's own record
    // self-contained and historically accurate regardless of that lock.
    // undefined for free events.
    amountCharged: {
      type: Number,
      min: 0,
    },
    // Bearer-credential-like, same treatment as User.passwordHash/
    // resetPasswordTokenHash in this codebase: not returned by default,
    // only explicitly selected where it's actually needed (the student's
    // own pass view, QR generation, manual-entry verification).
    passCode: {
      type: String,
      required: true,
      unique: true,
      default: generatePassCode,
      select: false,
    },
  },
  {
    // registeredOn per spec.md §7, instead of the default createdAt name.
    timestamps: { createdAt: "registeredOn", updatedAt: true },
    toJSON: {
      virtuals: true,
      // select:false only controls whether passCode is fetched from the
      // DB in the first place -- it does NOT stop an in-memory document
      // (e.g. right after construction, before any query) from
      // serializing it via toJSON(). This transform is the actual
      // guarantee, mirroring User.js's belt-and-suspenders treatment of
      // passwordHash. passCode should essentially never appear in an API
      // response body at all: the QR pass endpoint returns a QR *image*,
      // not the raw code, and manual-entry verification takes the code
      // as input, not output -- so this is an unconditional strip, not a
      // conditional one.
      transform: (_doc, ret) => {
        delete ret.passCode;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.passCode;
        return ret;
      },
    },
  }
);

// A student can only register once per event -- enforced at the DB level,
// not just in application logic.
registrationSchema.index({ eventId: 1, studentId: 1 }, { unique: true });
// Supports "my registrations" (student) and "this event's registrations"
// (organizer) queries.
registrationSchema.index({ studentId: 1 });
registrationSchema.index({ eventId: 1 });

// True once the registration's pass is usable: immediately for free
// events (paymentStatus "n/a"), only after payment is confirmed for paid
// ones. Computed, not stored -- mirrors Event.status's approach, so it
// can never go stale relative to paymentStatus.
registrationSchema.virtual("passReady").get(function () {
  return this.paymentStatus === "n/a" || this.paymentStatus === "paid";
});

const Registration = mongoose.model("Registration", registrationSchema);

export default Registration;