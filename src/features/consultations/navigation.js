// Resolve old and new notification links to their relevant visible workspace tab.
// This only selects presentation; route and API authorization still apply.
export function notificationDestination(item, role) {
  if (!item.link?.startsWith("/app/")) return "/app/notifications";
  const url = new URL(item.link, "https://consultcare.invalid");
  if (url.searchParams.has("tab")) return url.pathname + url.search + url.hash;
  const kind = item.kind || "";
  let tab;
  if (kind.startsWith("session.transfer.")) {
    if (url.pathname === "/app/transfers") tab = "history";
    else if (["/app/queue", "/app/history"].includes(url.pathname)) tab = "handovers";
  }
  if (/^\/app\/booking\/[^/]+$/.test(url.pathname)) {
    tab = kind === "prescription.sent" ? "prescription" : kind.startsWith("document.") ? "documents" : "summary";
  } else if (/^\/app\/room\/[^/]+$/.test(url.pathname)) {
    tab = kind.startsWith("document.") ? "documents" : kind === "prescription.sent" ? "prescription" : role === "user" ? "chat" : "patient";
  } else if (/^\/app\/clinics\/[^/]+$/.test(url.pathname)) {
    tab = role === "admin" ? "payments" : ["doctor", "lawyer"].includes(role) ? "manage" : "registration";
  } else if (url.pathname === "/app/payments") {
    tab = kind.includes("refund") ? "refunds" : "payments";
  } else if (url.pathname === "/app/profile") {
    tab = kind.startsWith("account.") && role !== "user" ? "verification" : "details";
  } else if (url.pathname === "/app/bookings") {
    tab = kind.startsWith("clinic.") ? "clinics" : "consultations";
  } else if (url.pathname === "/app/queue" && !tab) {
    tab = kind.startsWith("clinic.") ? "clinics" : kind.startsWith("appointment.") ? "appointments" : "weekly";
  } else if (/^\/app\/admin\/person\//.test(url.pathname)) {
    tab = "account";
  }
  if (tab) url.searchParams.set("tab", tab);
  return url.pathname + url.search + url.hash;
}
