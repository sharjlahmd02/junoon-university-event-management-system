export function dashboardPathFor(role) {
  return role === "organizer" ? "/dashboard/organizer" : "/dashboard/student";
}