import { test, expect } from "@playwright/test";

const currentTime = "2026-09-22T10:30:00+05:30";
const professional = { id: "professional", name: "Test Professional", role: "doctor", status: "verified", speciality: "General practice", qualifications: "Test qualification", registration: "REG-1", languages: ["English"], fee: 2500 };

function snapshot(role = "doctor") {
  return { role, professionalId: role === "doctor" || role === "lawyer" ? professional.id : null,
    patient: { id: "patient", name: "Test Patient" }, patients: [],
    professionals: [{ ...professional, role: role === "lawyer" ? "lawyer" : "doctor" }],
    sessions: [], bookings: [], weeklyAvailability: [], familyProfessionalIds: [],
    onboarding: null, mockPayments: true };
}

function session(id, date, start = "10:00", end = "11:00") {
  return { id, professionalId: professional.id, date, start, end, online: true, capacity: 10 };
}

function booking(id, sessionId, status = "NEXT") {
  return { id, sessionId, professionalId: professional.id, patientId: "patient",
    patientName: "Test Patient", status, position: 1, fee: 2500,
    payment: "paid (mock)", files: [], messages: [], notes: "", privateNotes: "", followUp: "" };
}

async function mockAccount(page, state) {
  await page.clock.setFixedTime(new Date(currentTime));
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ status: state ? 200 : 401, json: state
      ? { data: { id: state.role === "user" ? "patient" : professional.id, role: state.role, name: "Test Account" } }
      : { message: "Please sign in." } });
    if (path === "/api/workspace") return route.fulfill({ json: { data: state } });
    if (path === "/api/admin/users/professional") return route.fulfill({ status: 409, json: { message: "The professional must complete their credentials first." } });
    return route.fulfill({ status: 404, json: { message: "Unexpected test request: " + path } });
  });
  // These tests exercise rendering/routing with deterministic data; backend tests
  // independently exercise real authenticated WebSocket queue updates.
  await page.routeWebSocket("**/api/workspace/live", (socket) => socket.send(JSON.stringify(state)));
}

test("protected routes redirect signed-out visitors to login", async ({ page }) => {
  await mockAccount(page, null);
  await page.goto("/app/queue");
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

for (const role of ["user", "doctor", "lawyer", "admin"]) {
  test(`${role} workspace and sidebar navigation work after the router upgrade`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await mockAccount(page, snapshot(role));
    await page.goto("/app");
    await expect(page.locator("main h1")).toBeVisible();
    const target = role === "admin" ? "People & verification" : role === "user" ? "My profile" : "My sessions";
    await page.getByRole("navigation", { name: "Workspace" }).getByRole("link", { name: target, exact: true }).click();
    await expect(page).toHaveURL(role === "admin" ? /\/app\/admin$/ : role === "user" ? /\/app\/profile$/ : /\/app\/sessions$/);
    await expect(page.locator("main h1")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("future sessions disable both call-next and no-show", async ({ page }) => {
  const state = snapshot();
  state.sessions = [session("future", "2026-09-23")];
  state.bookings = [booking("waiting", "future")];
  await mockAccount(page, state);
  await page.goto("/app/queue");
  await expect(page.getByRole("button", { name: "Call next", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "No-show", exact: true })).toBeDisabled();
});

test("a live session enables call-next and no-show when the professional is free", async ({ page }) => {
  const state = snapshot();
  state.sessions = [session("current", "2026-09-22")];
  state.bookings = [booking("waiting", "current")];
  await mockAccount(page, state);
  await page.goto("/app/queue");
  await expect(page.getByRole("button", { name: "Call next", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "No-show", exact: true })).toBeEnabled();
});

test("an overrun remains reachable and blocks starting another consultation", async ({ page }) => {
  const state = snapshot();
  state.sessions = [session("old", "2026-09-21"), session("current", "2026-09-22")];
  state.bookings = [booking("ongoing", "old", "IN CONSULTATION"), booking("waiting", "current")];
  await mockAccount(page, state);
  await page.goto("/app/queue");
  await expect(page.getByRole("heading", { name: "Consultation still in progress" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Call next", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "Return to consultation" }).click();
  await expect(page).toHaveURL(/\/app\/room\/ongoing$/);
  await expect(page.getByRole("heading", { name: "Reports, images & documents" })).toBeVisible();
});

test("failed professional approval shows one error popup", async ({ page }) => {
  const state = snapshot("admin");
  state.professionals[0].status = "pending";
  await mockAccount(page, state);
  await page.goto("/app/admin/person/professional/professional");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cannot approve professional" })).toHaveCount(1);
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.getByRole("button", { name: "OK", exact: true })).toHaveCount(0);
});
