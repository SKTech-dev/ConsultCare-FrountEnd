import { test, expect } from "@playwright/test";

const clinic = {
  id: "clinic", title: "Healthy living lecture", description: "A group education session.",
  professionalId: "professional", professionalName: "Test Doctor", profession: "doctor",
  date: "2026-09-23", start: "12:00", end: "13:00", startsAt: "2026-09-23T12:00:00+05:30",
  endsAt: "2026-09-23T13:00:00+05:30", capacity: 20, remaining: 20, fee: "900.50",
  status: "scheduled", professionalAvailable: true, payhereEnabled: true, registration: null,
};

async function account(page, role, currentClinic = { ...clinic }) {
  await page.clock.setFixedTime(new Date("2026-09-22T10:00:00+05:30"));
  const workspace = { role, professionalId: role === "doctor" || role === "lawyer" ? "professional" : null,
    professionals: [{ id: "professional", role: "doctor", name: "Test Doctor", status: "verified", fee: 5000, languages: ["English"] }],
    payhereEnabled: true, patient: { id: "patient", name: "Test Patient", status: "active", address: "12 Test Road", city: "Colombo" }, patients: [], sessions: [], bookings: [], weeklyAvailability: [], onboarding: null };
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { data: { id: role === "user" ? "patient" : "professional", role, name: "Test Account" } } });
    if (path === "/api/workspace") return route.fulfill({ json: { data: workspace } });
    if (path === "/api/clinics/clinic") return route.fulfill({ json: { data: currentClinic } });
    if (path === "/api/clinics") return route.fulfill({ json: { data: { items: [currentClinic], count: 1, pageSize: 30 } } });
    if (["/api/session-transfers", "/api/transferable-sessions", "/api/scheduled-consultations"].includes(path)) return route.fulfill({ json: { data: { items: [], count: 0, pageSize: 30 } } });
    return route.fulfill({ status: 404, json: { message: "Unexpected test request: " + path } });
  });
  await page.routeWebSocket("**/api/workspace/live", (socket) => socket.send(JSON.stringify(workspace)));
}

async function fillClinic(page) {
  await page.getByLabel("Clinic title", { exact: true }).fill("Healthy living lecture");
  await page.getByLabel("Clinic date", { exact: true }).fill("2026-09-23");
  await page.getByLabel("Clinic start time", { exact: true }).fill("12:00");
  await page.getByLabel("Clinic end time", { exact: true }).fill("13:00");
  await page.getByLabel("Clinic consultation fee (LKR)", { exact: true }).fill("900.50");
  await page.getByLabel("Clinic places", { exact: true }).fill("20");
}

for (const role of ["doctor", "lawyer"]) {
  test(`${role} schedules a clinic with its own date, time, places and fee`, async ({ page }) => {
    await account(page, role);
    let submitted;
    await page.route("**/api/clinics", (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      submitted = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { data: { id: "clinic" }, message: "Clinic scheduled." } });
    });
    await page.goto("/app/sessions");
    await fillClinic(page);
    await page.getByRole("button", { name: "Schedule clinic", exact: true }).click();
    await expect(page.getByText("Clinic scheduled.", { exact: true })).toBeVisible();
    expect(submitted).toEqual({ title: "Healthy living lecture", description: "", date: "2026-09-23", start: "12:00", end: "13:00", capacity: 20, fee: 900.5 });
    await page.getByRole("dialog").getByRole("button", { name: "OK" }).click();
    await expect(page).toHaveURL(/\/app\/clinics\/clinic$/);
    await expect(page.getByRole("button", { name: "Start clinic", exact: true })).toBeDisabled();
  });
}

test("patient reserves and is redirected to PayHere sandbox without local confirmation", async ({ page }) => {
  const current = { ...clinic };
  await account(page, "user", current);
  await page.route("**/api/clinics/clinic/register", (route) => {
    expect(route.request().postDataJSON()).toEqual({ consent: true });
    current.registration = { id: "registration", status: "pending", payment: "unpaid", fee: "900.50", paymentDueAt: "2026-09-22T11:00:00+05:30" };
    return route.fulfill({ status: 201, json: { message: "Clinic place reserved." } });
  });
  await page.route("**/api/clinics/clinic/payhere-checkout", (route) => {
    expect(route.request().postDataJSON()).toEqual({});
    return route.fulfill({ json: { data: { checkoutUrl: "https://sandbox.payhere.lk/pay/checkout", fields: { order_id: "clinic", amount: "900.50" } } } });
  });
  await page.route("https://sandbox.payhere.lk/pay/checkout", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Sandbox checkout</h1>" }));
  await page.goto("/app/clinics/clinic");
  await expect(page.getByRole("button", { name: "Reserve clinic place" })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Reserve clinic place" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "OK" }).click();
  const posted = page.waitForRequest("https://sandbox.payhere.lk/pay/checkout");
  await page.getByRole("button", { name: /Pay with PayHere/ }).click();
  expect((await posted).method()).toBe("POST");
  expect(current.registration.payment).toBe("unpaid");
  await expect(page.getByRole("button", { name: "Join video call" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Clinic registrations & payments" })).toHaveCount(0);
});

test("patient directories and My consultations show separate clinic cards", async ({ page }) => {
  await account(page, "user");
  await page.goto("/consult/doctors");
  await expect(page.getByRole("heading", { name: "Available doctor clinics" })).toBeVisible();
  await page.getByRole("link", { name: "Healthy living lecture", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Healthy living lecture", exact: true })).toBeVisible();
  await page.goto("/app/bookings");
  await expect(page.getByRole("heading", { name: "Your upcoming group clinics" })).toBeVisible();
});

test("admin reviews clinic payments without simulated refund controls", async ({ page }) => {
  const current = { ...clinic, status: "cancelled", cancellationReason: "Host unavailable", registrationCount: 1, pageSize: 50,
    registrations: [{ id: "reg", patientName: "Test Patient", status: "cancelled", payment: "refund requested", fee: "900.50" }], paymentTotals: { "refund requested": "900.50" } };
  await account(page, "admin", current);

  await page.goto("/app/clinics/clinic");
  await expect(page.getByRole("cell", { name: "Test Patient" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Simulate refund" })).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "refund requested" })).toBeVisible();
});

test("clinic schedule conflict shows an error and mobile form does not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await account(page, "doctor");
  await page.route("**/api/clinics", (route) => route.fulfill({ status: 409, json: { message: "This date already has booked consultations." } }));
  await page.goto("/app/sessions");
  await fillClinic(page);
  await page.getByRole("button", { name: "Schedule clinic", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("This date already has booked consultations.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
