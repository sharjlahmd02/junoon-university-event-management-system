// Centralized so the same rule can't silently drift between the Mongoose
// schema, the controller, and (conceptually) the client's mirrored copy.
// Every helper here operates on already-trimmed input unless noted.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX_LENGTH = 254; // RFC 5321

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 100;
// Letters (incl. accented/unicode), spaces, hyphens, apostrophes, periods.
// Blocks digits/symbols/emoji being used as a "name".
const NAME_RE = /^[\p{L}][\p{L}\s'.-]*$/u;

export const DEPARTMENT_MIN_LENGTH = 2;
export const DEPARTMENT_MAX_LENGTH = 100;

export const ENROLMENT_MIN_LENGTH = 3;
export const ENROLMENT_MAX_LENGTH = 40;
// Alphanumeric + hyphens/slashes, the common shape of a student ID.
const ENROLMENT_RE = /^[A-Z0-9][A-Z0-9/-]*$/;

export const PHONE_MAX_LENGTH = 20;
const PHONE_RE = /^[0-9+()\-.\s]{7,20}$/;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt silently ignores bytes beyond 72
const LEADING_TRAILING_WHITESPACE_RE = /^\s|\s$/;

export const TOKEN_MAX_LENGTH = 256;
export const CODE_MAX_LENGTH = 32;

// Event-related constants (spec.md §3, §4.4, §7). Centralized here so the
// Event schema, event controller, and (conceptually) the client's mirrored
// copy all reference the same source of truth instead of drifting.
export const EVENT_TYPES = ["audience", "participation"];
export const FEE_TYPES = ["free", "paid"];
// spec.md §4.4 lists these four as the browse/filter categories.
export const EVENT_CATEGORIES = ["technical", "cultural", "sports", "audience-notice"];
// Mirrors the Event.status virtual (Event.js) -- kept here so the list
// filter and the model's own getter can't drift apart.
export const EVENT_STATUSES = ["upcoming", "live", "completed", "cancelled"];

export const EVENT_TITLE_MAX_LENGTH = 150;
export const EVENT_DESCRIPTION_MAX_LENGTH = 5000;
export const EVENT_VENUE_MAX_LENGTH = 200;
export const EVENT_DEPARTMENT_MAX_LENGTH = 100;
export const EVENT_CHANGE_REASON_MAX_LENGTH = 500;

// Registration-related constants (spec.md §3.2, §7).
export const REGISTRATION_PAYMENT_STATUSES = ["n/a", "pending", "paid"];

// Generic bounded free-text check shared by several Event fields (title,
// venue, cancelReason) that don't need their own character-class rules the
// way name/enrolment/etc. do. `collapseWhitespace` is off for multi-line
// fields (e.g. description) so authored newlines/paragraphs survive.
export function validateBoundedString(raw, { min = 1, max, label, collapseWhitespace = true }) {
  if (typeof raw !== "string") return { valid: false, error: `${label} is required` };
  let trimmed = raw.trim();
  if (collapseWhitespace) trimmed = trimmed.replace(/[ \t]+/g, " ");
  if (trimmed.length < min) {
    return { valid: false, error: `${label} must be at least ${min} character${min === 1 ? "" : "s"}` };
  }
  if (trimmed.length > max) {
    return { valid: false, error: `${label} must be at most ${max} characters` };
  }
  return { valid: true, trimmed };
}

// Optional-aware date parser. Returns { valid: true, date: undefined } for
// an absent/empty value so callers can distinguish "not provided" from
// "provided but invalid" without duplicating that check everywhere.
export function parseOptionalDate(raw, label) {
  if (raw === undefined || raw === null || raw === "") return { valid: true, date: undefined };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return { valid: false, error: `${label} is not a valid date` };
  }
  return { valid: true, date };
}

export function isValidEmail(value) {
  return typeof value === "string" && value.length <= EMAIL_MAX_LENGTH && EMAIL_RE.test(value);
}

// Returns { valid, trimmed, error }. Rejects whitespace-padded near-empty
// values (e.g. "       A") that a bare `.trim()` truthiness check misses.
export function validateName(raw) {
  if (typeof raw !== "string") return { valid: false, error: "Name is required" };
  const trimmed = raw.trim().replace(/\s+/g, " "); // collapse internal runs of whitespace
  if (trimmed.length < NAME_MIN_LENGTH) {
    return { valid: false, error: `Name must be at least ${NAME_MIN_LENGTH} characters` };
  }
  if (trimmed.length > NAME_MAX_LENGTH) {
    return { valid: false, error: `Name must be at most ${NAME_MAX_LENGTH} characters` };
  }
  if (!NAME_RE.test(trimmed)) {
    return { valid: false, error: "Name can only contain letters, spaces, hyphens, and apostrophes" };
  }
  return { valid: true, trimmed };
}

export function validateDepartment(raw) {
  if (typeof raw !== "string") return { valid: false, error: "Department is required" };
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (trimmed.length < DEPARTMENT_MIN_LENGTH) {
    return { valid: false, error: `Department must be at least ${DEPARTMENT_MIN_LENGTH} characters` };
  }
  if (trimmed.length > DEPARTMENT_MAX_LENGTH) {
    return { valid: false, error: `Department must be at most ${DEPARTMENT_MAX_LENGTH} characters` };
  }
  return { valid: true, trimmed };
}

// Normalizes to uppercase so "bbsul-1" and "BBSUL-1" can't register as two
// "different" enrolment numbers — mirrors how email is lowercased.
export function validateEnrolmentNumber(raw) {
  if (typeof raw !== "string") return { valid: false, error: "Enrolment number is required" };
  const trimmed = raw.trim().toUpperCase();
  if (trimmed.length < ENROLMENT_MIN_LENGTH || trimmed.length > ENROLMENT_MAX_LENGTH) {
    return {
      valid: false,
      error: `Enrolment number must be ${ENROLMENT_MIN_LENGTH}-${ENROLMENT_MAX_LENGTH} characters`,
    };
  }
  if (!ENROLMENT_RE.test(trimmed)) {
    return { valid: false, error: "Enrolment number can only contain letters, numbers, and hyphens" };
  }
  return { valid: true, trimmed };
}

// Optional field -- empty string/undefined is valid (means "not provided").
export function validatePhone(raw) {
  if (raw === undefined || raw === null || raw === "") return { valid: true, trimmed: "" };
  if (typeof raw !== "string") return { valid: false, error: "Invalid phone number" };
  const trimmed = raw.trim();
  if (trimmed === "") return { valid: true, trimmed: "" };
  if (trimmed.length > PHONE_MAX_LENGTH || !PHONE_RE.test(trimmed)) {
    return { valid: false, error: "Invalid phone number" };
  }
  return { valid: true, trimmed };
}

// Deliberately does NOT trim the password itself before checking length/
// complexity (a password is allowed to contain internal spaces as part of
// a passphrase) -- but leading/trailing whitespace is rejected outright,
// since that's virtually always an accidental copy-paste artifact, not an
// intentional character, and it silently makes "       A" pass an
// unaware length-only check.
export function validatePassword(raw) {
  if (typeof raw !== "string" || raw.length === 0) {
    return { valid: false, error: "Password is required" };
  }
  if (LEADING_TRAILING_WHITESPACE_RE.test(raw)) {
    return { valid: false, error: "Password cannot start or end with a space" };
  }
  if (raw.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }
  if (raw.length > PASSWORD_MAX_LENGTH) {
    return { valid: false, error: `Password must be at most ${PASSWORD_MAX_LENGTH} characters` };
  }
  if (!/[a-z]/.test(raw)) {
    return { valid: false, error: "Password must include at least one lowercase letter" };
  }
  if (!/[A-Z]/.test(raw)) {
    return { valid: false, error: "Password must include at least one uppercase letter" };
  }
  if (!/[0-9]/.test(raw)) {
    return { valid: false, error: "Password must include at least one number" };
  }
  if (!/[^A-Za-z0-9]/.test(raw)) {
    return { valid: false, error: "Password must include at least one special character" };
  }
  return { valid: true };
}