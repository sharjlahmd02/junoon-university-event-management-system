import mongoose from "mongoose";
import {
  EVENT_TYPES,
  FEE_TYPES,
  EVENT_CATEGORIES,
  EVENT_TITLE_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_VENUE_MAX_LENGTH,
  EVENT_DEPARTMENT_MAX_LENGTH,
  EVENT_CHANGE_REASON_MAX_LENGTH,
} from "../utils/validators.js";

const { Schema } = mongoose;

const eventSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: EVENT_TITLE_MAX_LENGTH,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: EVENT_DESCRIPTION_MAX_LENGTH,
    },
    // Drives most of the conditional-field logic below (spec.md §3.1).
    type: {
      type: String,
      enum: EVENT_TYPES,
      required: true,
    },
    // Participation-only. `required` as a function (not a plain boolean)
    // so it's enforced conditionally, mirroring User.enrolmentNumber —
    // a bare `validate()` never fires on an undefined value for a
    // non-required path, so this has to be the actual `required` rule.
    feeType: {
      type: String,
      enum: FEE_TYPES,
      required: function () {
        return this.type === "participation";
      },
    },
    // Only meaningful for Paid participation events.
    amount: {
      type: Number,
      min: 0,
      required: function () {
        return this.type === "participation" && this.feeType === "paid";
      },
    },
    dateTime: {
      type: Date,
      required: true,
    },
    // Optional end of the event window. Decision (Phase 2 kickoff): added
    // beyond spec.md §7's literal field list so `status` (see the virtual
    // below) can distinguish "live" from "completed" for anything longer
    // than an instant — without it, "live" would need an arbitrary
    // made-up duration, which is worse than an explicit optional field.
    // Documented as an intentional deviation in the Phase 2 summary.
    endDateTime: {
      type: Date,
      validate: {
        validator: function (value) {
          if (value == null) return true;
          return value > this.dateTime;
        },
        message: "endDateTime must be after dateTime",
      },
    },
    venue: {
      type: String,
      required: true,
      trim: true,
      maxlength: EVENT_VENUE_MAX_LENGTH,
    },
    category: {
      type: String,
      enum: EVENT_CATEGORIES,
      required: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      maxlength: EVENT_DEPARTMENT_MAX_LENGTH,
    },
    // Storage decision (Phase 2 kickoff): local disk, not a bucket —
    // matches spec.md §6 "single deployable web app" at BBSUL's scale.
    // These fields hold server-relative paths (e.g. "/uploads/banners/..");
    // the actual upload handling (MIME/size validation, disk write, and
    // serving outside any web-executable path per CLAUDE.md §3) is task
    // 2.2/2.5, not this model.
    banner: {
      type: String,
      default: "",
    },
    guidelinesDoc: {
      type: String,
      default: "",
    },
    // Participation-only registration limit (spec.md §4.5). Slot
    // availability is enforced by counting Registration documents against
    // this at request time (Phase 2 kickoff decision) rather than a
    // denormalized counter, to avoid drift.
    capacity: {
      type: Number,
      min: 1,
      required: function () {
        return this.type === "participation";
      },
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The only *stored* status-affecting field — everything else
    // (upcoming/live/completed) is derived from dateTime/endDateTime on
    // read via the `status` virtual below, so it can never go stale
    // waiting on a cron job that didn't run.
    cancelled: {
      type: Boolean,
      default: false,
    },
    lastChangeReason: {
      type: String,
      trim: true,
      maxlength: EVENT_CHANGE_REASON_MAX_LENGTH,
      default: "",
    },
    lastChangeAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// --- Conditional-field guards (mirrors the User model's role-based guards) ---
// Each of these blocks the "wrong side" of a conditional field from ever
// being set, not just enforcing presence on the "right side" (handled by
// `required` above). E.g. an Audience-only event must not be able to carry
// a feeType even though feeType is only *required* for Participation.

eventSchema.path("feeType").validate(function (value) {
  if (this.type === "audience") return value === undefined;
  return true;
}, "feeType is not applicable to audience-only events");

eventSchema.path("amount").validate(function (value) {
  if (this.type === "audience") return value === undefined;
  if (this.type === "participation" && this.feeType === "free")
    return value === undefined;
  return true;
}, "amount is only applicable to paid participation events");

eventSchema.path("capacity").validate(function (value) {
  if (this.type === "audience") return value === undefined;
  return true;
}, "capacity is not applicable to audience-only events");

// Required reason on cancellation (spec.md §4.5: "cancel/reschedule
// allowed with a required reason logged").
eventSchema.path("lastChangeReason").validate(function (value) {
  if (this.isNew) return true;
  const requiresReason =
    (this.isModified("cancelled") && this.cancelled === true) ||
    this.isModified("dateTime");
  if (!requiresReason) return true;
  return typeof value === "string" && value.trim().length > 0;
}, "A reason is required when cancelling or rescheduling an event");
// --- Derived status (Phase 2 kickoff decision: computed, not stored) ---
// upcoming -> live -> completed based on dateTime/endDateTime, with
// cancelled as the only override. If endDateTime is absent, the event is
// treated as "live" only at the single instant of dateTime (falls
// straight from upcoming to completed in practice, since real requests
// essentially never land in that exact millisecond) -- Organizers who
// want a real "live" window should set endDateTime.
eventSchema.virtual("status").get(function () {
  if (this.cancelled) return "cancelled";

  const now = Date.now();
  const start = this.dateTime?.getTime();
  const end = (this.endDateTime ?? this.dateTime)?.getTime();

  if (start == null) return "upcoming"; // defensive; dateTime is required
  if (now < start) return "upcoming";
  if (now <= end) return "live";
  return "completed";
});

// Indexes supporting the query patterns from spec.md §4.4 (filter by
// category/department/date/status, plus organizer's own-event lookups).
eventSchema.index({ category: 1 });
eventSchema.index({ department: 1 });
eventSchema.index({ dateTime: 1 });
eventSchema.index({ organizerId: 1 });
// Text index for the fuzzy/autosuggest search bar (spec.md §4.4, §4.12).
eventSchema.index({ title: "text", description: "text" });

const Event = mongoose.model("Event", eventSchema);

export default Event;
