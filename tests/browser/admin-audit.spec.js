import { test, expect } from "@playwright/test";

test("admin payments and settlements omit redundant clinic card and test banners", async ({ page }) => {
  await admin(page);
  await page.route("**/api/settlements", (route) => route.fulfill({ json: { data: { months: [], testPayments: true, accountingNotice: "Showing sandbox payments only. Completed consultations and clinics use the full paid amount. Other environments and unclassified legacy payments are excluded." } } }));
  await page.goto("/app/payments");
  await expect(page.getByRole("heading", { name: "Private consultation payments", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Clinic payments", exact: true })).toHaveCount(0);
  await page.goto("/app/settlements");
  await expect(page.getByRole("heading", { name: "No completed paid consultations yet", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "View handovers", exact: true })).toHaveCount(0);
  await expect(page.getByText(/These totals contain test patient payments/)).toHaveCount(0);
  await expect(page.getByText(/Showing sandbox payments only/)).toHaveCount(0);
});

async function admin(page) {
  await page.clock.setFixedTime(new Date("2026-10-04T10:30:00+05:30"));
  await page.routeWebSocket("**/api/workspace/live", () => {});
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/me") return route.fulfill({ json: { data: { id: "admin", role: "admin", name: "Administrator" } } });
    if (url.pathname === "/api/workspace") return route.fulfill({ json: { data: { role: "admin", patient: {}, professionals: [], patients: [], sessions: [], bookings: [], weeklyAvailability: [], familyProfessionalIds: [], onboarding: null } } });
    if (url.pathname === "/api/appointment-offers") return route.fulfill({ json: { data: [] } });
    return route.fulfill({ json: { data: { items: [], count: 0, pageSize: 30 } } });
  });
}

test("admin can filter ongoing one-off, clinic and handed-over sessions", async ({ page }) => {
  await admin(page);
  for (const [path, tab, selector, endpoint, param] of [
    ["/app/appointments", null, "Appointment view", "/api/scheduled-consultations", "scope"],
    ["/app/clinics", null, "Clinic view", "/api/clinics", "view"],
    ["/app/transfers", "Requests & handover history", "Handover view", "/api/session-transfers", "scope"],
  ]) {
    await page.goto(path);
    if (tab) await page.getByRole("tab", { name: tab, exact: true }).click();
    const request = page.waitForRequest((request) => { const url = new URL(request.url()); return url.pathname === endpoint && url.searchParams.get(param) === "ongoing"; });
    await page.getByRole("combobox", { name: selector, exact: true }).selectOption("ongoing");
    await request;
    await expect(page.locator(".ws-empty:visible")).toHaveCount(1);
  }
});

test("admin audits weekly occurrences and queue and views recurring weekday templates", async ({ page }) => {
  await admin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/admin/weekly-sessions?*", (route) => route.fulfill({ json: { data: { items: [{ id: "session", professionalName: "Dr Weekly", profession: "doctor", date: "2026-10-04", start: "10:00", end: "11:00", status: "ongoing", capacity: 10, booked: 2, queued: 1, completed: 1 }], count: 1, pageSize: 30 } } }));
  await page.route("**/api/admin/weekly-sessions/session?*", (route) => route.fulfill({ json: { data: { items: [{ id: "booking", patientName: "Queued Patient", status: "NEXT", payment: "paid", fee: "5000" }], count: 1, pageSize: 30 } } }));
  await page.route("**/api/admin/weekly-availability?*", (route) => route.fulfill({ json: { data: { items: [{ id: "slot", professionalName: "Dr Weekly", profession: "doctor", weekday: 0, start: "10:00", end: "11:00", capacity: 10, fee: 5000 }], count: 1, pageSize: 30 } } }));
  await page.goto("/app/weekly-schedules");
  await page.getByRole("combobox", { name: "Session view", exact: true }).selectOption("ongoing");
  await page.getByRole("button", { name: "View queue audit", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Queued Patient", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Recurring availability", exact: true }).click();
  await expect(page.getByText(/Monday · 10:00/)).toBeVisible();
  await expect(page.getByLabel("From date", { exact: true })).toHaveCount(1); // Retained hidden occurrence panel only.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("settlement categories filter before pagination and handovers retain the full payout total", async ({ page }) => {
  await admin(page);
  const payments = [
    { id: "weekly", patientName: "Weekly Patient", serviceType: "weekly", amount: "1000" },
    { id: "appointment", patientName: "One-off Patient", serviceType: "appointment", amount: "1100" },
    { id: "handover", patientName: "Handover Patient", serviceType: "weekly", amount: "1200", transfer: { fromName: "Original Doctor", reason: "Unavoidable absence", acceptedAt: "2026-09-01T00:00:00Z" } },
    { id: "clinic", patientName: "Clinic Patient", serviceType: "clinic", amount: "500", clinicId: "clinic", clinicTitle: "Lecture" },
  ].map((p) => ({ ...p, paidAt: "2026-09-01T00:00:00Z", completedAt: "2026-09-15T00:00:00Z", sessionDate: "2026-09-15", sessionStart: "10:00", sessionEnd: "11:00" }));
  const reads = [];
  await page.route("**/api/settlements/2026-09/doctor?*", (route) => {
    const service = new URL(route.request().url()).searchParams.get("service");
    reads.push(service);
    const rows = payments.filter((p) => !service || (service === "handover" ? p.transfer : p.serviceType === service));
    return route.fulfill({ json: { data: { month: "2026-09", professional: { id: "doctor", name: "Conducting Doctor", role: "doctor" }, total: "3800", weeklyTotal: "2200", appointmentTotal: "1100", clinicTotal: "500", handoverTotal: "1200", earningsCount: 4, count: rows.length, pageSize: 50, closed: true, canPay: true, payout: { status: "unpaid" }, payments: rows } } });
  });
  await page.goto("/app/settlements/2026-09/doctor");
  await expect(page.getByRole("cell", { name: "Weekly Patient", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "One-off consultations", exact: true }).click();
  await expect(page.getByRole("cell", { name: "One-off Patient", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Weekly Patient", exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "Handovers", exact: true }).click();
  await expect(page.getByText("Reason: Unavoidable absence", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Monthly earnings", exact: true }).locator("..")).toContainText(/3,800/);
  expect(reads).toContain("appointment");
  expect(reads).toContain("handover");
  await page.screenshot({ path: "test-results/admin-settlement-audit.png", fullPage: true });
});
