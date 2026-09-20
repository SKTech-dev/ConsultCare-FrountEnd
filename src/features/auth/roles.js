export const ROLE_HOME = {
  user: "/dashboard",
  doctor: "/doctor/dashboard",
  lawyer: "/lawyer/dashboard",
  admin: "/admin/dashboard",
};

export function getRole(user) {
  const role = typeof user?.role === "string" ? user.role.toLowerCase() : null;
  return Object.hasOwn(ROLE_HOME, role || "") ? role : null;
}

export function getHome(user) {
  return ROLE_HOME[getRole(user)] || "/access-denied";
}

// Only known destinations are accepted; never redirect to an arbitrary URL.
export function getDestination(user, requested) {
  const role = getRole(user);
  if (role === "user" && ["/consult/doctors", "/consult/lawyers"].includes(requested)) {
    return requested;
  }
  return getHome(user);
}
