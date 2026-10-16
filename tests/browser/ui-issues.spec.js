import { test, expect } from "@playwright/test";

async function account(page, signedIn = true) {
  await page.clock.setFixedTime(new Date("2026-10-15T10:00:00+05:30"));
  const patient = { id: "patient", name: "Test Patient", email: "patient@example.test", dob: "1990-01-01", phone: "0771234567" };
  const professional = { id: "doctor", name: "Dr Test", role: "doctor", status: "verified", speciality: "General practice", languages: ["English"] };
  const state = { role: "user", patient, professionals: [professional], patients: [], sessions: [{ id: "session", professionalId: "doctor", date: "2026-10-16", start: "10:00", end: "11:00", capacity: 10 }], bookings: ["CANCELLED", "COMPLETED", "NO-SHOW", "WAITING", "WAITING", "WAITING", "WAITING"].map((status, index) => ({ id: "booking" + index, patientId: patient.id, professionalId: "doctor", sessionId: "session", status, payment: "paid", fee: 2500, files: [], messages: [] })), weeklyAvailability: [], onboarding: null };
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/me") return route.fulfill({ status: signedIn ? 200 : 401, json: signedIn ? { data: { ...patient, role: "user" } } : { message: "Sign in" } });
    if (url.pathname === "/api/workspace") return route.fulfill({ json: { data: state } });
    if (url.pathname === "/api/appointment-offers") return route.fulfill({ json: { data: [{ id: "offer", professionalName: "Dr Invitation", status: "open", fee: 3000, reason: "Follow up", options: [{ id: "choice", date: "2026-10-16", start: "14:00", end: "14:30", available: true }] }], pagination: { hasMore: false } } });
    if (url.pathname === "/api/clinics") return route.fulfill({ json: { data: { items: [], count: 0, pageSize: 30 } } });
    if (url.pathname === "/api/notifications") return route.fulfill({ json: { data: { items: [], count: 0, pageSize: 30 } } });
    return route.fulfill({ status: 404, json: { message: "Unavailable in this preview" } });
  });
  await page.routeWebSocket("**/api/workspace/live", () => {});
}

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  for (const list of await page.getByRole("tablist").all()) {
    expect(await list.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  }
}

test("mobile home menu holds account links and policy pages are public", async ({ page }, testInfo) => {
  await account(page, false);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  await expect(page.locator(".cc-header-account")).toBeHidden();
  expect(await page.locator(".cc-hero h1").evaluate((el) => getComputedStyle(el).textAlign)).toBe("center");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Log in", exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("mobile-home.png"), fullPage: true });
  for (const [url, title] of [["/privacy-policy", "Privacy policy"], ["/refund-policy", "Cancellation & refund policy"], ["/terms", "Terms of use"], ["/return-policy", "Cancellation & refund policy"]]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await noOverflow(page);
  }
  await page.goto("/login");
  await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Doctors", exact: true })).toHaveCount(0);
});

test("recent activity includes older completed and cancelled bookings", async ({ page }) => {
  await account(page);
  await page.goto("/app");
  const activity = page.locator(".ws-panel").filter({ has: page.getByRole("heading", { name: "Recent activity", exact: true }) });
  await activity.getByRole("button", { name: "Show more activity" }).click();
  await expect(activity.locator(".ws-status").filter({ hasText: /^CANCELLED$/ })).toBeVisible();
  await expect(activity.locator(".ws-status").filter({ hasText: /^COMPLETED$/ })).toBeVisible();
  await page.getByLabel("Consultation status").selectOption("CANCELLED");
  await expect(activity.locator(".ws-row")).toHaveCount(1);
  await expect(activity.locator(".ws-status").filter({ hasText: /^CANCELLED$/ })).toBeVisible();
  await page.getByLabel("Consultation status").selectOption("COMPLETED");
  await expect(activity.locator(".ws-row")).toHaveCount(1);
  await expect(activity.locator(".ws-status").filter({ hasText: /^COMPLETED$/ })).toBeVisible();
});

test("private consultations include invitations and mobile drawer has one close button", async ({ page }, testInfo) => {
  await account(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/bookings");
  await expect(page.getByRole("tab", { name: "Choose appointment time" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Dr Invitation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to payment", exact: true })).toBeDisabled();
  await page.getByRole("radio", { name: "2026-10-16, 14:00–14:30" }).check();
  await expect(page.getByRole("button", { name: "Continue to payment", exact: true })).toBeEnabled();
  await noOverflow(page);
  expect(await page.locator(".ws-main").evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft))).toBeLessThanOrEqual(12);
  await page.screenshot({ path: testInfo.outputPath("mobile-consultations.png"), fullPage: true });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  const drawer = page.getByRole("dialog", { name: "Workspace navigation" });
  await expect(drawer.getByRole("button")).toHaveCount(1);
  await expect(drawer.getByRole("button", { name: "Close navigation" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Toggle navigation" })).toBeFocused();
});
