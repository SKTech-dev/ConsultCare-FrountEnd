import { test, expect } from "@playwright/test";

async function setup(page) {
  await page.clock.setFixedTime(new Date("2026-10-16T10:00:00+05:30"));
  const professional = { id: "doctor", name: "Dr Test", role: "doctor", status: "verified", speciality: "General practice", languages: ["English"] };
  const sessions = [
    { id: "weekly", professionalId: "doctor", date: "2026-10-12", start: "09:00", end: "10:00", capacity: 10 },
    { id: "individual", professionalId: "doctor", date: "2026-10-12", start: "12:00", end: "12:30", privateAppointment: true, capacity: 1 },
  ];
  const bookings = ["COMPLETED", "CANCELLED", "NO-SHOW", "PAYMENT PENDING", "WAITING"].map((status, index) => ({ id: "booking" + index, professionalId: "doctor", patientId: "patient" + index, patientName: index ? "A longer patient name " + index : "Alex", sessionId: index === 1 ? "individual" : "weekly", scheduledById: index === 1 ? "doctor" : null, status, payment: index === 3 ? "unpaid" : "paid", fee: 2500, files: [], messages: [] }));
  const state = { role: "doctor", professionalId: "doctor", professionals: [professional], patient: {}, patients: [], sessions, bookings, weeklyAvailability: [], onboarding: null };
  await page.routeWebSocket("**/api/workspace/live", () => {});
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/me") return route.fulfill({ json: { data: professional } });
    if (url.pathname === "/api/workspace") return route.fulfill({ json: { data: state } });
    if (url.pathname === "/api/appointment-offers") return route.fulfill({ json: { data: [{ id: "expired", professionalName: "Dr Test", patientName: "Expired invitation patient", status: "expired", fee: 3000, options: [{ id: "choice1", date: "2026-09-30", start: "14:00", end: "14:30" }, { id: "choice2", date: "2026-10-01", start: "14:00", end: "14:30" }] }], pagination: { hasMore: false } } });
    if (url.pathname === "/api/clinics") return route.fulfill({ json: { data: { items: [{ id: "clinic", title: "Past health clinic", professionalName: "Dr Test", profession: "doctor", date: "2026-09-23", start: "14:00", end: "15:00", status: "completed", fee: 2000, remaining: 0, capacity: 10 }], count: 1, pageSize: 30 } } });
    if (url.pathname === "/api/session-transfers") return route.fulfill({ json: { data: { items: [{ id: "handover", date: "2026-09-24", start: "10:00", end: "11:00", toId: "doctor", fromId: "other", fromName: "Dr Cover", toName: "Dr Test", status: "accepted", reason: "Cover arranged", queueCount: 2, expectedAmount: 5000, earnedAmount: 5000, createdAt: "2026-09-23T03:00:00Z", initiatedBy: "Dr Cover" }], count: 1, pageSize: 30 } } });
    return route.fulfill({ status: 404, json: { message: "Not available in this preview" } });
  });
  await mockCalendarApi(page);
}

const sum = (values = {}) => ({ records: 0, sessions: 0, consultations: 0, completed: 0, cancelled: 0, noShow: 0, unfinished: 0, appointments: 0, invitations: 0, clinics: 0, registrations: 0, attended: 0, handovers: 0, accepted: 0, rejected: 0, expired: 0, ...values });
const summaries = {
  weekly: sum({ records: 2, sessions: 2, consultations: 3, completed: 2, cancelled: 1 }),
  appointments: sum({ records: 1, appointments: 1, consultations: 1, completed: 1 }),
  clinics: sum({ records: 1, clinics: 1, registrations: 8, attended: 7, completed: 1 }),
  handovers: sum({ records: 1, handovers: 1, accepted: 1 }),
};
async function mockCalendarApi(page) {
  await page.route("**/api/history/**", async (route) => {
    const url = new URL(route.request().url()), category = url.searchParams.get("category") || "weekly";
    if (url.pathname.endsWith("/calendar")) {
      const month = url.searchParams.get("month");
      const count = new Date(month + "-01T12:00:00Z"); count.setUTCMonth(count.getUTCMonth() + 1); count.setUTCDate(0);
      const days = Array.from({ length: count.getUTCDate() }, (_, index) => {
        const date = month + "-" + String(index + 1).padStart(2, "0");
        const summary = month === "2026-10" && index === 11 ? summaries[category] : category === "appointments" && date === "2026-10-03" ? sum({ records: 1, invitations: 1 }) : sum();
        return { date, summary, hasRecords: summary.records > 0 };
      });
      const summary = sum(); for (const day of days) for (const key of Object.keys(summary)) summary[key] += day.summary[key];
      return route.fulfill({ json: { data: { category, month, days, summary } } });
    }
    if (url.pathname.includes("/sessions/")) return route.fulfill({ json: { data: { id: "weekly", date: "2026-10-12", start: "09:00", end: "10:00", summary: sum({ consultations: 2, completed: 1, cancelled: 1 }), items: [{ id: "booking0", patientName: "Alex", status: "COMPLETED", payment: "paid", fee: 2500, canViewRecord: true }, { id: "booking1", patientName: "A longer patient name", status: "CANCELLED", payment: "paid", fee: 2500, canViewRecord: true }], count: 2, pageSize: 30 } } });
    const date = url.searchParams.get("date");
    let items = [];
    if (date === "2026-10-12") {
      if (category === "weekly") items = [{ id: "weekly", type: "session", date, start: "09:00", end: "10:00", summary: sum({ records: 1, sessions: 1, consultations: 2, completed: 1, cancelled: 1 }) }, { id: "afternoon", type: "session", date, start: "14:00", end: "15:00", summary: sum({ records: 1, sessions: 1, consultations: 1, completed: 1 }) }];
      if (category === "appointments") items = [{ id: "booking0", type: "appointment", date, start: "12:00", end: "12:30", patientName: "Alex", status: "COMPLETED", payment: "paid", fee: 2500, canViewRecord: true, summary: summaries.appointments }];
      if (category === "clinics") items = [{ id: "clinic", type: "clinic", date, start: "15:00", end: "16:00", title: "Past health clinic", description: "Healthy living", status: "completed", fee: 1000, summary: summaries.clinics }];
      if (category === "handovers") items = [{ id: "handover", type: "handover", sessionId: "weekly", date, start: "09:00", end: "10:00", status: "accepted", fromName: "Dr Cover", toName: "Dr Test", reason: "Cover arranged", queueCount: 2, expectedAmount: 5000, canViewRecords: true, summary: summaries.handovers }];
    }
    if (category === "appointments" && date === "2026-10-03") items = [{ id: "offer", type: "invitation", date, start: "", end: "", patientName: "Expired invitation patient", status: "expired", reason: "Follow up", fee: 3000, options: [{ id: "option1", date: "2026-09-30", start: "14:00", end: "14:30" }, { id: "option2", date: "2026-10-03", start: "14:00", end: "14:30" }], summary: sum({ records: 1, invitations: 1 }) }];
    return route.fulfill({ json: { data: { category, date, items, summary: items[0]?.type === "invitation" ? sum({ records: 1, invitations: 1 }) : summaries[category], count: items.length, pageSize: 30 } } });
  });
}

for (const width of [320, 390, 1280]) {
  test("history calendar and day/session navigation work at " + width + "px", async ({ page }, testInfo) => {
    await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/app/history?tab=sessions&month=2026-10");
    await expect(page.getByRole("tab")).toHaveCount(4);
    await expect(page.locator(".history-calendar-day:visible")).toHaveCount(31);
    const date = page.getByRole("link", { name: /^12 October 2026:/ });
    await date.focus();
    await expect(page.getByRole("tooltip")).toContainText("2 sessions · 3 consultations");
    await page.getByRole("button", { name: "1 October 2026: No records", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "No records for 1 October 2026." })).toBeVisible();
    await date.click();
    await expect(page).toHaveURL((url) => url.pathname === "/app/history/weekly/2026-10-12" && url.searchParams.get("month") === "2026-10");
    await expect(page.getByRole("heading", { name: "09:00–10:00", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "14:00–15:00", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "View records", exact: true })).toHaveCount(2);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("history-day-" + width + ".png"), fullPage: true });
    await page.getByRole("link", { name: "View records", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Patients & consultation records", exact: true })).toBeVisible();
    await expect(page.getByText("Alex", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "View record", exact: true }).first().click();
    await expect(page.getByRole("link", { name: "Back to session records" })).toBeVisible();
    await page.getByRole("link", { name: "Back to session records" }).click();
    await page.getByRole("link", { name: "Back to day details" }).click();
    await page.getByRole("link", { name: "Back to calendar" }).click();
    await expect(page).toHaveURL(/tab=sessions&month=2026-10&date=2026-10-12/);
    await expect(page.getByRole("link", { name: /^12 October 2026:/ })).toHaveClass(/is-selected/);
    for (const tab of ["Individual appointments", "Group clinics", "Handovers"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await expect(page.getByLabel("History month")).toHaveValue("2026-10");
      await expect(page.locator(".history-calendar-day:visible")).toHaveCount(31);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath("history-calendar-" + width + ".png"), fullPage: true });
  });
}

test("individual invitations have their own day summary and past handovers have no decisions", async ({ page }) => {
  await setup(page);
  await page.goto("/app/history?tab=appointments&month=2026-10");
  await page.getByRole("link", { name: /^3 October 2026:/ }).click();
  await expect(page.getByRole("heading", { name: "Expired invitation patient", exact: true })).toBeVisible();
  await expect(page.getByText("No consultation was booked.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "View consultation record" })).toHaveCount(0);
  await expect(page.getByText("30 September 2026 · 14:00–14:30")).toBeVisible();
  await page.goto("/app/history/handovers/2026-10-12?month=2026-10");
  await expect(page.getByText("Cover arranged", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Accept|Reject|Cancel request/ })).toHaveCount(0);
});

test("calendar changes months without retaining stale counts and can retry a failed request", async ({ page }) => {
  await setup(page);
  await page.goto("/app/history?tab=clinics&month=2026-10");
  await expect(page.getByRole("link", { name: /^12 October 2026:/ })).toBeVisible();
  await page.getByRole("button", { name: "Previous month", exact: true }).click();
  await expect(page.getByLabel("History month")).toHaveValue("2026-09");
  await expect(page.locator(".history-calendar-day:visible")).toHaveCount(30);
  await expect(page.getByText("No history records for this month.", { exact: false })).toBeVisible();
  let fail = true;
  await page.route("**/api/history/calendar?category=clinics&month=2026-10", (route) => fail ? route.fulfill({ status: 503, json: { message: "History temporarily unavailable" } }) : route.fallback());
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("History temporarily unavailable");
  await page.getByRole("button", { name: "OK", exact: true }).click();
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("link", { name: /^12 October 2026:/ })).toBeVisible();
});

test("doctor overview aligns every activity status on desktop and mobile", async ({ page }, testInfo) => {
  await setup(page);
  await page.goto("/app");
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const badges = page.locator(".activity-row > .ws-status");
    await expect(badges).toHaveCount(5);
    const positions = await badges.evaluateAll((elements) => elements.map((el) => el.getBoundingClientRect().left));
    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(1);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("doctor-overview-" + width + ".png"), fullPage: true });
  }
});
