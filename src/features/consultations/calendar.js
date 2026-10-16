export const historyTabs = [
  { id: "sessions", category: "weekly", label: "Weekly sessions", metrics: [["sessions", "Sessions"], ["consultations", "Consultations"], ["completed", "Completed"], ["cancelled", "Cancelled"]] },
  { id: "appointments", category: "appointments", label: "Individual appointments", metrics: [["appointments", "Appointments"], ["completed", "Completed"], ["cancelled", "Cancelled"], ["invitations", "Unselected invitations"]] },
  { id: "clinics", category: "clinics", label: "Group clinics", metrics: [["clinics", "Clinics"], ["registrations", "Confirmed registrations"], ["attended", "Attended"], ["cancelled", "Cancelled"]] },
  { id: "handovers", category: "handovers", label: "Handovers", metrics: [["handovers", "Past handovers"], ["accepted", "Accepted"], ["rejected", "Rejected"], ["expired", "Expired"]] },
];
export const dateLabel = (date, options = {}) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric", ...options }).format(new Date(date + "T12:00:00Z"));
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(value + "T12:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export const validMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "") && Number(value.slice(0, 4)) >= 1900 && Number(value.slice(0, 4)) <= 9998;
export function shiftMonth(month, amount) {
  const date = new Date(month + "-01T12:00:00Z");
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}
export function calendarWeeks(month, days) {
  const firstWeekday = (new Date(month + "-01T12:00:00Z").getUTCDay() + 6) % 7;
  const cells = [...Array(firstWeekday).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
}
export function daySummary(category, summary) {
  if (!summary.records) return "No records";
  const units = category === "weekly" ? [["sessions", "session"], ["consultations", "consultation"]] : category === "appointments" ? [["appointments", "appointment"], ["invitations", "unselected invitation"]] : category === "clinics" ? [["clinics", "clinic"], ["attended", "attendee"]] : [["handovers", "past handover"]];
  const counts = units.filter(([key]) => summary[key]).map(([key, label]) => summary[key] + " " + label + (summary[key] === 1 ? "" : "s"));
  for (const [key, label] of [["completed", "completed"], ["cancelled", "cancelled"], ["noShow", "no-show"], ["accepted", "accepted"], ["rejected", "rejected"], ["expired", "expired"]]) {
    if (summary[key]) counts.push(summary[key] + " " + label);
  }
  return counts.join(" · ");
}
export function historyCalendarUrl(category, month, date) {
  const tab = historyTabs.find((item) => item.category === category)?.id || "sessions";
  const params = new URLSearchParams({ tab, month });
  if (date) params.set("date", date);
  return "/app/history?" + params;
}
export function historyContext(params) {
  const category = params.get("history"), date = params.get("date");
  if (!historyTabs.some((tab) => tab.category === category) || !validDate(date)) return null;
  const month = validMonth(params.get("month")) ? params.get("month") : date.slice(0, 7);
  return { category, date, month, dayUrl: "/app/history/" + category + "/" + date + "?month=" + month };
}
