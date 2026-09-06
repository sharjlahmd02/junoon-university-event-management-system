import mongoose from "mongoose";
import Event from "../models/Event.js";
import Registration from "../models/Registeration.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { generatePassQrDataUrl } from "../utils/QrUtils.js";
import { REGISTRATION_PAYMENT_STATUSES } from "../utils/validators.js";

// Student-only (enforced by requireRole in the route). Handles the full
// registration state transition from spec.md §3.2:
//   Free        -> paymentStatus "n/a", pass usable immediately
//   Paid        -> paymentStatus "pending", pass unlocked later by an
//                  organizer confirming payment (task 3.3)
export const registerForEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid event id", 400);
  }

  const event = await Event.findById(id);
  if (!event) throw new AppError("Event not found", 404);

  if (event.type !== "participation") {
    throw new AppError("This is an announcement-only event and doesn't require registration", 400);
  }

  // Covers "already started," "completed," and "cancelled" in one check --
  // only a genuinely upcoming event accepts new registrations. Read from
  // the already-fetched document's computed virtual; a start-time race of
  // a few milliseconds here isn't a meaningful concern the way the
  // capacity race below is.
  if (event.status !== "upcoming") {
    throw new AppError("Registration is closed for this event", 409);
  }

  // Atomic slot reservation (Phase 3 kickoff decision -- see Event.js's
  // registeredCount comment for why this exists instead of a plain
  // count-then-insert, which is NOT atomic and can overshoot capacity
  // under concurrent requests). $expr reads capacity live from the
  // document at the moment of the update rather than trusting the
  // earlier `event` snapshot, which could be stale if an organizer edited
  // capacity in between.
  const reserved = await Event.findOneAndUpdate(
    { _id: event._id, $expr: { $lt: ["$registeredCount", "$capacity"] } },
    { $inc: { registeredCount: 1 } },
    { new: true }
  );

  if (!reserved) {
    throw new AppError("This event is at full capacity", 409);
  }

  const paymentStatus = event.feeType === "paid" ? "pending" : "n/a";
  const amountCharged = event.feeType === "paid" ? event.amount : undefined;

  let registration;
  try {
    registration = await Registration.create({
      eventId: event._id,
      studentId: req.user._id,
      paymentStatus,
      amountCharged,
    });
  } catch (err) {
    // Roll back the slot just reserved above -- either a genuine write
    // failure, or the unique (eventId, studentId) index catching a
    // duplicate registration (E11000, e.g. a double-click or a retry).
    // Without this rollback, a failed/duplicate attempt would
    // permanently consume a real seat that was never actually filled.
    await Event.updateOne({ _id: event._id }, { $inc: { registeredCount: -1 } });

    if (err.code === 11000) {
      throw new AppError("You're already registered for this event", 409);
    }
    throw err;
  }

  res.status(201).json({ registration: registration.toJSON() });
});

// Organizer, own event only. Flips a Paid registration's paymentStatus
// from "pending" to "paid" once the organizer has confirmed the offline
// payment (spec.md §3.2/§4.7) -- this is what unlocks the student's QR
// pass. No online transaction handling of any kind, per spec.md §3.2.
export const confirmPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid registration id", 400);
  }

  const registration = await Registration.findById(id);
  if (!registration) throw new AppError("Registration not found", 404);

  // Ownership is checked via the registration's event, not the
  // registration itself -- Registration has no organizerId of its own.
  const event = await Event.findById(registration.eventId);
  if (!event) throw new AppError("Associated event not found", 404);

  if (String(event.organizerId) !== String(req.user._id)) {
    throw new AppError("You can only confirm payments for your own events", 403);
  }

  if (registration.paymentStatus === "n/a") {
    throw new AppError("This registration doesn't require payment", 400);
  }

  if (registration.paymentStatus === "paid") {
    throw new AppError("This payment has already been confirmed", 409);
  }

  registration.paymentStatus = "paid";
  await registration.save();

  res.status(200).json({ registration: registration.toJSON() });
});

// Student-only. Own registrations, event details populated in so the
// dashboard doesn't need a second round-trip per registration. Does NOT
// include QR images -- generating one for every row in a list is
// wasteful; that's what the dedicated pass endpoint below is for.
export const getMyRegistrations = asyncHandler(async (req, res) => {
  const registrations = await Registration.find({ studentId: req.user._id })
    .populate("eventId", "title dateTime endDateTime venue department category type feeType amount cancelled")
    .sort({ registeredOn: -1 });

  res.status(200).json({
    registrations: registrations.map((r) => r.toJSON()),
  });
});

// Student-own-registration-only. Not in tasks.md's literal Phase 3 list,
// but added alongside 3.5 since spec.md §4.2's "digital pass view... with
// QR code" needs somewhere to actually call task 3.4's QR utility from --
// without this, that utility has no caller until client work much later.
// Returns the QR image itself, never the raw passCode (select:false on
// the schema is the first guard; explicitly selecting it here is the one
// deliberate exception, and it never leaves this function as raw text).
export const getMyPassQr = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid registration id", 400);
  }

  const registration = await Registration.findById(id).select("+passCode");
  if (!registration) throw new AppError("Registration not found", 404);

  if (String(registration.studentId) !== String(req.user._id)) {
    throw new AppError("You can only view your own pass", 403);
  }

  if (!registration.passReady) {
    throw new AppError("Your pass isn't ready yet — payment hasn't been confirmed", 400);
  }

  const qrDataUrl = await generatePassQrDataUrl(registration.passCode);

  res.status(200).json({ qrDataUrl });
});

// Organizer, own event only. Serves both spec.md §4.7's "pending payment
// confirmation queue" and §4.5's "full participant list view" from one
// endpoint via an optional ?status= filter, rather than building two
// near-duplicate list endpoints. Student details populated in (name,
// email, phone, department, enrolmentNumber) so the organizer can
// actually identify who's who -- User's own toJSON transform still
// strips passwordHash etc. even through the populate.
export const getEventRegistrations = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid event id", 400);
  }

  const event = await Event.findById(id);
  if (!event) throw new AppError("Event not found", 404);

  if (String(event.organizerId) !== String(req.user._id)) {
    throw new AppError("You can only view registrations for your own events", 403);
  }

  const filter = { eventId: event._id };

  const { status } = req.query;
  if (status !== undefined) {
    if (!REGISTRATION_PAYMENT_STATUSES.includes(status)) {
      throw new AppError(`Status must be one of: ${REGISTRATION_PAYMENT_STATUSES.join(", ")}`, 400);
    }
    filter.paymentStatus = status;
  }

  const registrations = await Registration.find(filter)
    .populate("studentId", "name email phone department enrolmentNumber")
    .sort({ registeredOn: 1 });

  res.status(200).json({
    registrations: registrations.map((r) => r.toJSON()),
  });
});