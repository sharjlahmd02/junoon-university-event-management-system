// Mirrors server/src/utils/validators.js's EVENT_CATEGORIES/EVENT_STATUSES.
// Client and server are separate packages with no shared module, so this
// has to be kept in sync by hand -- if the server's list ever changes,
// this needs updating too.
export const EVENT_CATEGORIES = ["technical", "cultural", "sports", "audience-notice"];
export const EVENT_STATUSES = ["upcoming", "live", "completed", "cancelled"];

export function formatCategoryLabel(category) {
  return category
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}