// Express 5 makes `req.query` a getter with no setter, so middleware that
// does `req.query = newObject` (as express-mongo-sanitize does) throws.
// This sanitizes recursively in place instead — deleting/renaming any key
// that starts with "$" or contains "." — which works safely on body,
// params, and query alike, on any Express version.

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeInPlace(target) {
  if (Array.isArray(target)) {
    target.forEach(sanitizeInPlace);
    return target;
  }
  if (!isPlainObject(target)) return target;

  for (const key of Object.keys(target)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete target[key];
      continue;
    }
    sanitizeInPlace(target[key]);
  }
  return target;
}

export default function mongoSanitize() {
  return function (req, res, next) {
    if (req.body) sanitizeInPlace(req.body);
    if (req.params) sanitizeInPlace(req.params);
    if (req.query) sanitizeInPlace(req.query);
    next();
  };
}