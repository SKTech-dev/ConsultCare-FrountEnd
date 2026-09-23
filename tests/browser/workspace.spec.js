import { test, expect } from "@playwright/test";

const currentTime = "2026-09-22T10:30:00+05:30";
const professional = { id: "professional", name: "Test Professional", role: "doctor", status: "verified", speciality: "General practice", qualifications: "Test qualification", registration: "REG-1", languages: ["English"], fee: 2500 };

function snapshot(role = "doctor") {
  return { role, professionalId: role === "doctor" || role === "lawyer" ? professional.id : null,
    patient: { id: "patient", name: "Test Patient", status: "active" }, patients: [],
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

async function mockAccount(page, state, options = {}) {
  await page.clock.setFixedTime(new Date(currentTime));
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ status: state ? 200 : 401, json: state
      ? { data: { id: state.role === "user" ? "patient" : professional.id, role: state.role, name: "Test Account" } }
      : { message: "Please sign in." } });
    if (path === "/api/workspace") return route.fulfill({ json: { data: state } });
    if (path === "/api/transferable-sessions" || path === "/api/session-transfers" || path === "/api/scheduled-consultations") return route.fulfill({ json: { data: { items: [], count: 0, pageSize: 30 } } });
    if (path === "/api/admin/users/professional") return route.fulfill({ status: 409, json: { message: "The professional must complete their credentials first." } });
    if (path === "/api/bookings/room/messages" && options.messageFailure) return route.fulfill({ status: 503, json: { message: "Message service is temporarily unavailable." } });
    if (path === "/api/documents/image" && options.imageFailure) return route.fulfill({ status: 503, json: { message: "Preview unavailable." } });
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

test("my sessions replaces generated sessions with handover controls", async ({ page }) => {
  await mockAccount(page, snapshot());
  await page.goto("/app/sessions");
  await expect(page.getByRole("heading", { name: "Upcoming generated sessions" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Hand over a booked session" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Requests & handover history" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Schedule a patient consultation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No sessions available for handover" })).toBeVisible();
});

test("a professional searches for a receiver and requests a handover", async ({ page }) => {
  await mockAccount(page, snapshot());
  const future = { id: "cover", date: "2026-09-23", start: "10:00", end: "11:00", professionalName: "Test Professional", queueCount: 2, expectedAmount: 5000 };
  await page.route("**/api/transferable-sessions*", (route) => route.fulfill({ json: { data: { items: [future], count: 1, pageSize: 30 } } }));
  await page.route("**/api/sessions/cover/transfer-candidates*", (route) => route.fulfill({ json: { data: [{ id: "receiver", name: "Cover Doctor", speciality: "General practice", registration: "REG-2", languages: ["English"] }] } }));
  let submitted;
  await page.route("**/api/sessions/cover/transfers", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { message: "Handover requested." } });
  });
  await page.goto("/app/sessions");
  await page.getByRole("button", { name: "Request handover", exact: true }).click();
  await page.getByLabel("Search by name or email").fill("Cover");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("radio", { name: /Cover Doctor/ }).check();
  await page.getByLabel("Reason for handover").fill("Unavoidable absence");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Handover requested.", { exact: true })).toBeVisible();
  expect(submitted).toEqual({ professionalId: "receiver", reason: "Unavoidable absence" });
});

test("receiver confirms acceptance before the request is submitted", async ({ page }) => {
  await mockAccount(page, snapshot());
  const pending = { id: "transfer", fromId: "sender", toId: professional.id, fromName: "Original Doctor", toName: "Test Professional", initiatedBy: "Administrator", status: "pending", date: "2026-09-23", start: "10:00", end: "11:00", reason: "Unavoidable absence", createdAt: currentTime, expectedAmount: 2500, queueCount: 1 };
  await page.route("**/api/session-transfers?*", (route) => route.fulfill({ json: { data: { items: [pending], count: 1, pageSize: 30 } } }));
  let submitted;
  await page.route("**/api/session-transfers/transfer/decision", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ json: { message: "Handover accepted." } });
  });
  await page.goto("/app/queue");
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  expect(submitted).toBeUndefined();
  await expect(page.getByRole("heading", { name: "Accept this session?" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm accept" }).click();
  await expect(page.getByText("Handover accepted.", { exact: true })).toBeVisible();
  expect(submitted.action).toBe("accept");
});

test("handover queue and history request separate server-filtered views", async ({ page }) => {
  await mockAccount(page, snapshot());
  const scopes = [];
  await page.route("**/api/session-transfers?*", (route) => {
    scopes.push(new URL(route.request().url()).searchParams.get("scope"));
    return route.fulfill({ json: { data: { items: [], count: 0, pageSize: 30 } } });
  });
  await page.goto("/app/queue");
  await expect(page.getByRole("heading", { name: "Upcoming handovers" })).toBeVisible();
  await page.getByRole("navigation", { name: "Workspace" }).getByRole("link", { name: "Consultation history" }).click();
  await expect(page.getByRole("heading", { name: "Handover history" })).toBeVisible();
  await expect.poll(() => scopes).toContain("history");
  expect(scopes).toContain("upcoming");
});

test("professional schedules a private consultation using an exact patient email", async ({ page }) => {
  await mockAccount(page, snapshot());
  await page.route("**/api/scheduled-consultations/patient-search", (route) => {
    expect(route.request().postDataJSON()).toEqual({ email: "patient@example.com" });
    return route.fulfill({ json: { data: { name: "Test Patient", email: "patient@example.com" } } });
  });
  let submitted;
  await page.route("**/api/scheduled-consultations", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { message: "Consultation scheduled. Patient payment is required." } });
  });
  await page.goto("/app/sessions");
  await page.getByLabel("Patient / client email").fill("patient@example.com");
  await page.getByRole("button", { name: "Find patient" }).click();
  await expect(page.getByText("Test Patient", { exact: true })).toBeVisible();
  await page.getByLabel("Date", { exact: true }).fill("2026-09-23");
  await page.getByLabel("Start time", { exact: true }).fill("14:00");
  await page.getByLabel("End time", { exact: true }).fill("14:30");
  await page.getByRole("button", { name: "Schedule consultation", exact: true }).click();
  await expect(page.getByText("Consultation scheduled. Patient payment is required.", { exact: true })).toBeVisible();
  expect(submitted).toEqual({ email: "patient@example.com", date: "2026-09-23", start: "14:00", end: "14:30", expectedFee: 2500, reason: "" });
});

test("patient can accept and pay for an invitation from My consultations", async ({ page }) => {
  const state = snapshot("user");
  state.sessions = [session("private", "2026-09-23")];
  state.bookings = [{ ...booking("invited", "private", "PAYMENT PENDING"), payment: "unpaid", scheduledById: professional.id, paymentDueAt: "2026-09-23T10:00:00+05:30" }];
  await mockAccount(page, state);
  let paid = false;
  await page.route("**/api/bookings/invited/payment-simulation", (route) => {
    expect(route.request().postDataJSON()).toEqual({ success: true });
    paid = true; state.bookings[0].status = "NEXT";
    return route.fulfill({ json: { message: "Saved." } });
  });
  await page.goto("/app/bookings");
  await page.getByRole("button", { name: /Accept & simulate payment/ }).click();
  expect(paid).toBe(false);
  await page.getByRole("dialog").getByRole("button", { name: "OK", exact: true }).click();
  await expect.poll(() => paid).toBe(true);
  await expect(page.getByText("Payment status updated.", { exact: true })).toBeVisible();
});

test("expired invitations cannot be paid and admins can inspect scheduled appointments", async ({ page }) => {
  const state = snapshot("user");
  state.sessions = [session("private", "2026-09-22")];
  state.bookings = [{ ...booking("expired", "private", "PAYMENT PENDING"), scheduledById: professional.id, paymentDueAt: "2026-09-22T10:00:00+05:30" }];
  await mockAccount(page, state);
  await page.goto("/app/bookings");
  await expect(page.getByRole("button", { name: /Accept & simulate payment/ })).toBeDisabled();
  await mockAccount(page, snapshot("admin"));
  await page.goto("/app/appointments");
  await expect(page.getByRole("heading", { name: "Scheduled consultations." })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Appointment view" })).toBeVisible();
});

for (const role of ["user", "doctor", "lawyer"]) {
  test(`${role} accounts must finish their profile before opening another workspace page`, async ({ page }) => {
    const state = snapshot(role);
    state.onboarding = "profile";
    await mockAccount(page, state);
    await page.goto(role === "user" ? "/consult/doctors" : "/app/queue");
    await expect(page).toHaveURL(/\/app\/profile$/);
    await expect(page.getByRole("heading", { name: role === "user" ? "A profile that's yours." : "Your professional profile." })).toBeVisible();
  });
}

test("profile onboarding does not show an error on first workspace arrival", async ({ page }) => {
  const state = snapshot("user");
  state.onboarding = "profile";
  await mockAccount(page, state);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/profile$/);
  await expect(page.getByRole("alert")).toHaveCount(0);
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

test("popups use dialog semantics, contain focus and close with Escape", async ({ page }) => {
  const state = snapshot("admin");
  state.professionals[0].status = "pending";
  await mockAccount(page, state);
  await page.goto("/app/admin/person/professional/professional");
  const approve = page.getByRole("button", { name: "Approve", exact: true });
  await approve.click();
  const dialog = page.getByRole("dialog", { name: "Update account status?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "OK", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(approve).toBeFocused();
});

test("chat failures remain local and image previews explain failure with retry", async ({ page }) => {
  const state = snapshot("user");
  state.sessions = [session("current", "2026-09-22")];
  state.bookings = [{ ...booking("room", "current", "IN CONSULTATION"), files: [{ id: "image", name: "report.png", type: "image/png", size: 100, kind: "image", private: false }] }];
  await mockAccount(page, state, { messageFailure: true, imageFailure: true });
  await page.goto("/app/room/room");
  await expect(page.getByRole("status", { name: "Loading preview for report.png" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Preview unavailable for report.png" })).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("group", { name: "Preview unavailable for report.png" })).toBeVisible();
  const input = page.getByRole("textbox", { name: "Message", exact: true });
  await input.fill("Can you hear me?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("alert")).toContainText("Message service is temporarily unavailable.");
  await expect(input).toHaveValue("Can you hear me?");
  await expect(page.getByText("Saving changes...")).toHaveCount(0);
});
