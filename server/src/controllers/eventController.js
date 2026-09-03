import Event from "../models/Event.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  EVENT_TYPES,
  FEE_TYPES,
  EVENT_CATEGORIES,
  EVENT_STATUSES,
  EVENT_TITLE_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_VENUE_MAX_LENGTH,
  validateBoundedString,
  validateDepartment,
  parseOptionalDate,
} from "../utils/validators.js";

// Organizer-only (enforced by requireRole in the route, and re-checked
// nowhere else here since organizerId is deliberately never read from the
// request body — see below).
export const createEvent = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    type,
    feeType,
    amount,
    dateTime,
    endDateTime,
    venue,
    category,
    department,
    capacity,
  } = req.body;

  const titleCheck = validateBoundedString(title, { max: EVENT_TITLE_MAX_LENGTH, label: "Title" });
  if (!titleCheck.valid) throw new AppError(titleCheck.error, 400);

  const descriptionCheck = validateBoundedString(description, {
    max: EVENT_DESCRIPTION_MAX_LENGTH,
    label: "Description",
    collapseWhitespace: false,
  });
  if (!descriptionCheck.valid) throw new AppError(descriptionCheck.error, 400);

  if (!EVENT_TYPES.includes(type)) {
    throw new AppError(`Event type must be one of: ${EVENT_TYPES.join(", ")}`, 400);
  }

  if (!EVENT_CATEGORIES.includes(category)) {
    throw new AppError(`Category must be one of: ${EVENT_CATEGORIES.join(", ")}`, 400);
  }

  const departmentCheck = validateDepartment(department);
  if (!departmentCheck.valid) throw new AppError(departmentCheck.error, 400);

  const venueCheck = validateBoundedString(venue, { max: EVENT_VENUE_MAX_LENGTH, label: "Venue" });
  if (!venueCheck.valid) throw new AppError(venueCheck.error, 400);

  const dateCheck = parseOptionalDate(dateTime, "Date/time");
  if (!dateCheck.valid) throw new AppError(dateCheck.error, 400);
  if (dateCheck.date === undefined) throw new AppError("Date/time is required", 400);

  const endDateCheck = parseOptionalDate(endDateTime, "End date/time");
  if (!endDateCheck.valid) throw new AppError(endDateCheck.error, 400);
  if (endDateCheck.date !== undefined && endDateCheck.date <= dateCheck.date) {
    throw new AppError("End date/time must be after the start date/time", 400);
  }

  // --- type/fee validation rules (spec.md §3.1, §3.2) ---
  // Checked here, at the request layer, so a bad request gets a specific,
  // actionable 400 instead of a generic Mongoose ValidationError -- the
  // Event schema's own guards (Event.js) still enforce the same rules as
  // defense in depth for any other write path (seed/admin scripts, etc.)
  // that doesn't go through this controller.
  let normalizedFeeType;
  let normalizedAmount;
  let normalizedCapacity;

  if (type === "audience") {
    if (feeType !== undefined || amount !== undefined || capacity !== undefined) {
      throw new AppError("Audience-only events cannot have a fee type, amount, or capacity", 400);
    }
  } else {
    // type === "participation"
    if (!FEE_TYPES.includes(feeType)) {
      throw new AppError(`Fee type must be one of: ${FEE_TYPES.join(", ")}`, 400);
    }
    normalizedFeeType = feeType;

    if (feeType === "paid") {
      const amountNum = Number(amount);
      if (amount === undefined || amount === null || amount === "" || Number.isNaN(amountNum) || amountNum <= 0) {
        throw new AppError("A positive amount is required for paid events", 400);
      }
      normalizedAmount = amountNum;
    } else if (amount !== undefined) {
      throw new AppError("Free events cannot have an amount", 400);
    }

    const capacityNum = Number(capacity);
    if (
      capacity === undefined ||
      capacity === null ||
      capacity === "" ||
      !Number.isInteger(capacityNum) ||
      capacityNum < 1
    ) {
      throw new AppError("A capacity of at least 1 is required for participation events", 400);
    }
    normalizedCapacity = capacityNum;
  }

  // banner/guidelinesDoc are deliberately not accepted here -- file upload
  // (MIME/size validation, disk storage outside the web-executable path
  // per CLAUDE.md §3) is its own security surface and its own task; this
  // endpoint creates the event record, uploads attach after.
  const event = await Event.create({
    title: titleCheck.trimmed,
    description: descriptionCheck.trimmed,
    type,
    feeType: normalizedFeeType,
    amount: normalizedAmount,
    dateTime: dateCheck.date,
    endDateTime: endDateCheck.date,
    venue: venueCheck.trimmed,
    category,
    department: departmentCheck.trimmed,
    capacity: normalizedCapacity,
    organizerId: req.user._id,
  });

  res.status(201).json({ event: event.toJSON() });
});

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;
const MAX_SEARCH_LENGTH = 100;

// Escapes regex metacharacters in user-supplied search/department strings
// before they're interpolated into a RegExp -- not just a ReDoS guard
// (search length is already capped), but what stops a value like ".*"
// from being treated as a wildcard instead of a literal string.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Expects "YYYY-MM-DD" specifically -- rejected outright if not, rather
// than handed to `new Date()`, which silently accepts a wide range of
// ambiguous formats (e.g. "10/9/2026") that don't mean the same day to
// every client.
function parseDateOnly(raw) {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const start = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

// Mirrors Event.js's `status` virtual exactly, as a Mongo query instead of
// a JS getter, so filtering by status agrees with what a fetched
// document's own `.status` would say. $expr is usable in a plain find()
// (not just aggregation) -- the tradeoff is it can't use the dateTime
// index, which is fine at this project's scale.
function statusFilter(status, now) {
  const effectiveEnd = { $ifNull: ["$endDateTime", "$dateTime"] };
  switch (status) {
    case "cancelled":
      return { cancelled: true };
    case "upcoming":
      return { cancelled: false, $expr: { $gt: ["$dateTime", now] } };
    case "live":
      return {
        cancelled: false,
        $expr: { $and: [{ $lte: ["$dateTime", now] }, { $gte: [effectiveEnd, now] }] },
      };
    case "completed":
      return { cancelled: false, $expr: { $lt: [effectiveEnd, now] } };
    default:
      return null;
  }
}

// Public route -- no auth required (spec.md §4.4: browsing/discovery is
// open). Only "newest" sort is implemented here; "most popular" and
// "you're eligible for" (spec.md §4.4) both depend on Registration data
// that doesn't exist until Phase 3, so they're deferred rather than faked
// with a meaningless placeholder ordering.
export const listEvents = asyncHandler(async (req, res) => {
  const { category, department, date, status, search, sort } = req.query;
  const filter = {};

  if (category !== undefined) {
    if (!EVENT_CATEGORIES.includes(category)) {
      throw new AppError(`Category must be one of: ${EVENT_CATEGORIES.join(", ")}`, 400);
    }
    filter.category = category;
  }

  if (department !== undefined) {
    if (typeof department !== "string" || department.trim() === "") {
      throw new AppError("Department filter cannot be empty", 400);
    }
    filter.department = { $regex: `^${escapeRegex(department.trim())}$`, $options: "i" };
  }

  if (date !== undefined) {
    const range = parseDateOnly(date);
    if (!range) throw new AppError("Date filter must be in YYYY-MM-DD format", 400);
    filter.dateTime = { $gte: range.start, $lt: range.end };
  }

  if (status !== undefined) {
    if (!EVENT_STATUSES.includes(status)) {
      throw new AppError(`Status must be one of: ${EVENT_STATUSES.join(", ")}`, 400);
    }
    Object.assign(filter, statusFilter(status, new Date()));
  }

  if (search !== undefined) {
    if (typeof search !== "string" || search.trim() === "") {
      throw new AppError("Search query cannot be empty", 400);
    }
    const pattern = escapeRegex(search.trim().slice(0, MAX_SEARCH_LENGTH));
    // Substring, case-insensitive match across the fields a student would
    // plausibly search by. This covers "autosuggest"-style partial typing
    // well; it is NOT typo-tolerant fuzzy matching (e.g. "roobtics" won't
    // find "Robotics") -- true fuzzy search needs a dedicated search
    // engine/library and is flagged as a deferred gap, not silently
    // claimed as done.
    filter.$or = [
      { title: { $regex: pattern, $options: "i" } },
      { description: { $regex: pattern, $options: "i" } },
      { venue: { $regex: pattern, $options: "i" } },
      { department: { $regex: pattern, $options: "i" } },
    ];
  }

  let page = Number.parseInt(req.query.page, 10);
  if (!Number.isInteger(page) || page < 1) page = 1;

  let limit = Number.parseInt(req.query.limit, 10);
  if (!Number.isInteger(limit) || limit < 1) limit = DEFAULT_PAGE_LIMIT;
  limit = Math.min(limit, MAX_PAGE_LIMIT);

  const SORTS = { newest: { createdAt: -1 } };
  const sortKey = typeof sort === "string" && SORTS[sort] ? sort : "newest";

  const [events, total] = await Promise.all([
    Event.find(filter)
      .sort(SORTS[sortKey])
      .skip((page - 1) * limit)
      .limit(limit),
    Event.countDocuments(filter),
  ]);

  res.status(200).json({
    events: events.map((e) => e.toJSON()),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  });
});