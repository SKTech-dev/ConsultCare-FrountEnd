import { test, expect } from "@playwright/test";

const currentTime = "2026-09-22T10:30:00+05:30";
const professional = { id: "professional", name: "Test Professional", role: "doctor", status: "verified", speciality: "General practice", qualifications: "Test qualification", registration: "REG-1", languages: ["English"], fee: 2500 };

test("queue and history use consistent empty states and section gaps", async ({ page }) => {
  await mockAccount(page, snapshot());
  await page.goto("/app/queue");
  await expect(page.locator(".professional-sections .ws-empty")).toHaveCount(4);
  expect(await page.locator(".professional-sections").evaluate((el) => getComputedStyle(el).gap)).toBe("32px");
  await page.goto("/app/history");
  await expect(page.locator(".professional-sections .ws-empty")).toHaveCount(3);
});

test("history expand labels follow each independent disclosure state", async ({ page }) => {
  const state = snapshot();
  state.sessions = [session("past", "2026-09-21")];
  state.bookings = [booking("record", "past", "COMPLETED")];
  await mockAccount(page, state);
  await page.goto("/app/history");
  const month = page.locator(".history-month > summary");
  await expect(month.getByText("Expand", { exact: true })).toBeVisible();
  await month.click();
  await expect(month.getByText("Collapse", { exact: true })).toBeVisible();
  const week = page.locator(".history-week > summary");
  await week.click();
  await expect(week.getByText("Collapse", { exact: true })).toBeVisible();
  const day = page.locator(".history-day > summary");
  await day.click();
  await expect(day.getByText("Collapse", { exact: true })).toBeVisible();
  await month.click();
  await expect(month.getByText("Expand", { exact: true })).toBeVisible();
});

test("patient pages embed clinics with matching empty sections and remove the clinic menu", async ({ page }) => {
  const state = snapshot("user");
  state.professionals = [];
  await mockAccount(page, state);
  for (const path of ["/app/bookings", "/app/history", "/consult/doctors", "/consult/lawyers"]) {
    await page.goto(path);
    await expect(page.locator(".workspace-sections .ws-empty")).toHaveCount(2);
    await expect(page.locator(".ws-sidebar").getByRole("link", { name: "Group clinics", exact: true })).toHaveCount(0);
    expect(await page.locator(".workspace-sections").evaluate((el) => getComputedStyle(el).gap)).toBe("32px");
  }
  await page.goto("/app/clinics");
  await expect(page).toHaveURL(/\/app\/bookings$/);
});

test("professional verification sits below personal details on desktop", async ({ page }) => {
  await mockAccount(page, snapshot());
  await page.goto("/app/profile");
  const panels = page.locator(".professional-profile-layout > .ws-panel");
  const details = await panels.nth(0).boundingBox();
  const verification = await panels.nth(1).boundingBox();
  expect(verification.y).toBeGreaterThanOrEqual(details.y + details.height + 30);
  expect(verification.x).toBe(details.x);
});

test("patient profile photo is submitted and remains after reload", async ({ page }) => {
  const state = snapshot("user");
  Object.assign(state.patient, { dob: "1990-01-01", phone: "0711111111", email: "patient@example.com" });
  await mockAccount(page, state);
  let saved;
  await page.route("**/api/profile", (route) => {
    saved = route.request().postDataJSON();
    Object.assign(state.patient, saved);
    return route.fulfill({ json: { message: "Saved." } });
  });
  await page.goto("/app/profile");
  await page.getByLabel("Choose or replace photo").setInputFiles({ name: "portrait.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") });
  await expect(page.getByAltText("Profile preview")).toBeVisible();
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect.poll(() => saved?.image).toMatch(/^data:image\/png;base64,/);
  await page.reload();
  await expect(page.getByAltText("Profile preview")).toBeVisible();
});

test("admin list filters send search criteria and reset pagination", async ({ page }) => {
  await mockAccount(page, snapshot("admin"));
  for (const [path, label, endpoint] of [
    ["/app/clinics", "Filter group clinics", "/api/clinics"],
    ["/app/appointments", "Filter scheduled consultations", "/api/scheduled-consultations"],
    ["/app/transfers", "Filter booked sessions", "/api/transferable-sessions"],
    ["/app/transfers", "Filter handover history", "/api/session-transfers"],
  ]) {
    await page.goto(path);
    const form = page.getByRole("form", { name: label });
    await form.getByLabel("Professional name or email").fill("  Receiver  ");
    await form.getByRole("combobox", { name: "Profession", exact: true }).selectOption("doctor");
    await form.getByLabel("From date").fill("2026-09-23");
    const request = page.waitForRequest((r) => {
      const url = new URL(r.url());
      return url.pathname === endpoint && url.searchParams.get("q") === "Receiver";
    });
    await form.getByRole("button", { name: "Apply filters" }).click();
    const params = new URL((await request).url()).searchParams;
    expect(params.get("profession")).toBe("doctor");
    expect(params.get("date_from")).toBe("2026-09-23");
    expect(params.get("page")).toBe("1");
    await form.getByRole("button", { name: "Clear filters" }).click();
    await expect(form.getByLabel("Professional name or email")).toHaveValue("");
  }
});

function snapshot(role = "doctor") {
  return { role, professionalId: role === "doctor" || role === "lawyer" ? professional.id : null,
    patient: { id: "patient", name: "Test Patient", status: "active", address: "12 Test Road", city: "Colombo" }, patients: [],
    professionals: [{ ...professional, role: role === "lawyer" ? "lawyer" : "doctor" }],
    sessions: [], bookings: [], weeklyAvailability: [], familyProfessionalIds: [],
    onboarding: null, payhereEnabled: true };
}

function session(id, date, start = "10:00", end = "11:00") {
  return { id, professionalId: professional.id, date, start, end, online: true, capacity: 10 };
}

function booking(id, sessionId, status = "NEXT") {
  return { id, sessionId, professionalId: professional.id, patientId: "patient",
    patientName: "Test Patient", status, position: 1, fee: 2500,
    payment: "paid", files: [], messages: [], notes: "", privateNotes: "", followUp: "" };
}

async function mockAccount(page, state, options = {}) {
  await page.clock.setFixedTime(new Date(currentTime));
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ status: state ? 200 : 401, json: state
      ? { data: { id: state.role === "user" ? "patient" : professional.id, role: state.role, name: "Test Account" } }
      : { message: "Please sign in." } });
    if (path === "/api/workspace") return route.fulfill({ json: { data: state } });
    if (path === "/api/clinics" || path === "/api/transferable-sessions" || path === "/api/session-transfers" || path === "/api/scheduled-consultations") return route.fulfill({ json: { data: { items: [], count: 0, pageSize: 30 } } });
    if (path === "/api/admin/users/professional") return route.fulfill({ status: 409, json: { message: "The professional must complete their credentials first." } });
    if (path === "/api/bookings/room/messages" && options.messageFailure) return route.fulfill({ status: 503, json: { message: "Message service is temporarily unavailable." } });
    if (path === "/api/documents/image" && options.imageFailure) return route.fulfill({ status: 503, json: { message: "Preview unavailable." } });
    return route.fulfill({ status: 404, json: { message: "Unexpected test request: " + path } });
  });
  // These tests exercise rendering/routing with deterministic data; backend tests
  // independently exercise real authenticated WebSocket queue updates.
  await page.routeWebSocket("**/api/workspace/live", (socket) => socket.send(JSON.stringify(state)));
}

test("unsaved profile blocks navigation and successful save clears the warning", async ({ page }) => {
  const state = snapshot("user");
  Object.assign(state.patient, { dob: "1990-01-01", phone: "0771234567", address: "12 Main Road", city: "Colombo" });
  await mockAccount(page, state);
  await page.route("**/api/profile", (route) => {
    Object.assign(state.patient, route.request().postDataJSON());
    return route.fulfill({ json: { message: "Saved." } });
  });
  await page.goto("/app/profile");
  await page.getByLabel("Full name", { exact: true }).fill("Updated Patient");
  await page.getByRole("navigation").getByRole("link", { name: "My consultations" }).click();
  await expect(page.getByRole("dialog", { name: "Leave without saving?" })).toBeVisible();
  await page.getByRole("button", { name: "Stay and save" }).click();
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await page.getByRole("navigation").getByRole("link", { name: "My consultations" }).click();
  await expect(page).toHaveURL(/\/app\/bookings$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("call next opens the consultation room immediately", async ({ page }) => {
  const state = snapshot();
  state.sessions = [session("current", "2026-09-22")];
  state.bookings = [booking("called", "current")];
  await mockAccount(page, state);
  await page.route("**/api/bookings/called/status", (route) => {
    state.bookings[0].status = "IN CONSULTATION";
    return route.fulfill({ json: { message: "Saved." } });
  });
  await page.goto("/app/queue");
  await expect(page.getByRole("link", { name: "Manage weekly schedule" })).toHaveCount(0);
  await page.getByRole("button", { name: "Call next", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/room\/called$/);
});

test("payment return waits for verified payment then opens patient queues", async ({ page }) => {
  const state = snapshot("user");
  state.sessions = [session("current", "2026-09-22")];
  state.bookings = [{ ...booking("paid", "current", "PAYMENT PENDING"), payment: "pending" }];
  await mockAccount(page, state);
  await page.goto("/app/booking/paid?payment=return");
  await expect(page.getByText(/Waiting for PayHere to confirm/)).toBeVisible();
  await expect(page).toHaveURL(/payment=return/);
  state.bookings[0].payment = "paid";
  state.bookings[0].status = "NEXT";
  await expect(page).toHaveURL(/\/app\/bookings$/, { timeout: 12000 });
});

test("weekly overlap errors use the error popup", async ({ page }) => {
  await mockAccount(page, snapshot());
  await page.goto("/app/sessions");
  await expect(page.getByRole("heading", { name: "My sessions.", exact: true })).toBeVisible();
  const day = page.locator(".weekly-day").first();
  await day.getByRole("button", { name: "Add time" }).click();
  await day.getByRole("button", { name: "Add time" }).click();
  await page.getByRole("button", { name: "Save weekly schedule" }).click();
  await expect(page.getByRole("dialog")).toContainText("Slots on the same day cannot overlap.");
});

test("report names open an in-page image preview", async ({ page }) => {
  const state = snapshot();
  state.sessions = [session("current", "2026-09-22")];
  state.bookings = [{ ...booking("preview", "current", "IN CONSULTATION"), files: [{ id: "report", name: "report.png", type: "image/png", size: 100, kind: "image", private: false }] }];
  await mockAccount(page, state);
  await page.route("**/api/documents/report", (route) => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") }));
  await page.goto("/app/room/preview");
  await page.getByRole("button", { name: "report.png", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "report.png" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("img")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

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
  let submitted;
  await page.route("**/api/scheduled-consultations", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { message: "Consultation scheduled. Patient payment is required." } });
  });
  await page.goto("/app/sessions");
  await expect(page.getByRole("button", { name: "Schedule consultation", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Find patient" })).toHaveCount(0);
  await page.getByLabel("Patient / client email").fill("patient@example.com");
  await page.getByLabel("Date", { exact: true }).fill("2026-09-23");
  await page.getByLabel("Start time", { exact: true }).fill("14:00");
  await page.getByLabel("End time", { exact: true }).fill("14:30");
  await page.getByLabel("Individual consultation fee (LKR)", { exact: true }).fill("7500.50");
  await page.getByRole("button", { name: "Schedule consultation", exact: true }).click();
  await expect(page.getByText("Consultation scheduled. Patient payment is required.", { exact: true })).toBeVisible();
  expect(submitted).toEqual({ email: "patient@example.com", date: "2026-09-23", start: "14:00", end: "14:30", fee: 7500.50, reason: "" });
});

for (const role of ["doctor", "lawyer"]) {
  test(`${role} edits weekly fees in My sessions, not their profile`, async ({ page }) => {
    const state = snapshot(role);
    await mockAccount(page, state);
    let submitted;
    await page.route("**/api/weekly-availability", (route) => {
      submitted = route.request().postDataJSON();
      state.professionals[0].fee = submitted.fee;
      return route.fulfill({ json: { message: "Saved." } });
    });
    await page.goto("/app/profile");
    await expect(page.getByLabel("Consultation fee (LKR)", { exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "My sessions", exact: true }).click();
    const fee = page.getByLabel("Consultation fee (LKR)", { exact: true });
    await expect(fee).toHaveValue("2500");
    for (const amount of ["5000", "5000.50"]) {
      await fee.fill(amount);
      await page.getByRole("button", { name: "Save weekly schedule", exact: true }).click();
      await expect.poll(() => submitted?.fee).toBe(Number(amount));
      expect(submitted.days).toHaveLength(7);
      await expect(page.getByText("Your weekly sessions have been saved.", { exact: true })).toBeVisible();
      await page.getByRole("dialog").getByRole("button", { name: "OK", exact: true }).click();
    }
    await page.reload();
    await expect(fee).toHaveValue("5000.5");
    await expect(page.getByLabel("Individual consultation fee (LKR)", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Date", { exact: true })).toBeVisible();
  });
}

test("patient can accept and pay for an invitation from My consultations", async ({ page }) => {
  const state = snapshot("user");
  state.sessions = [session("private", "2026-09-23")];
  state.bookings = [{ ...booking("invited", "private", "PAYMENT PENDING"), payment: "unpaid", scheduledById: professional.id, paymentDueAt: "2026-09-23T10:00:00+05:30" }];
  await mockAccount(page, state);
  await page.route("**/api/bookings/invited/payhere-checkout", (route) => {
    expect(route.request().postDataJSON()).toEqual({});
    return route.fulfill({ json: { data: { checkoutUrl: "https://sandbox.payhere.lk/pay/checkout", fields: { order_id: "invited", amount: "2500.00" } } } });
  });
  await page.route("https://sandbox.payhere.lk/pay/checkout", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Sandbox checkout</h1>" }));
  await page.goto("/app/bookings");
  await expect(page.getByLabel("Billing address")).toHaveCount(0);
  const posted = page.waitForRequest("https://sandbox.payhere.lk/pay/checkout");
  await page.getByRole("button", { name: /Accept & pay with PayHere/ }).click();
  const request = await posted;
  expect(request.method()).toBe("POST");
  expect(new URLSearchParams(request.postData()).get("order_id")).toBe("invited");
  expect(state.bookings[0].status).toBe("PAYMENT PENDING");
});

test("expired invitations cannot be paid and admins can inspect scheduled appointments", async ({ page }) => {
  const state = snapshot("user");
  state.sessions = [session("private", "2026-09-22")];
  state.bookings = [{ ...booking("expired", "private", "PAYMENT PENDING"), scheduledById: professional.id, paymentDueAt: "2026-09-22T10:00:00+05:30" }];
  await mockAccount(page, state);
  await page.goto("/app/bookings");
  await expect(page.getByRole("button", { name: /Accept & pay with PayHere/ })).toBeDisabled();
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

test("professional queue separates one-off appointments and includes future offline weekly sessions", async ({ page }) => {
  const state = snapshot();
  state.sessions = [session("past", "2026-09-21"), { ...session("private", "2026-09-22"), privateAppointment: true }, { ...session("later", "2026-10-05"), online: false }];
  state.bookings = [booking("one-off", "private"), booking("past-record", "past")];
  await mockAccount(page, state);
  await page.route("**/api/scheduled-consultations?*", (route) => route.fulfill({ json: { data: { items: [{ ...state.bookings[0], date: "2026-09-22", start: "10:00", end: "11:00", acceptedAt: currentTime }], count: 1, pageSize: 30 } } }));
  await page.goto("/app/clinics");
  await expect(page).toHaveURL(/\/app\/queue$/);
  await expect(page.locator(".ws-sidebar").getByRole("link", { name: "Group clinics" })).toHaveCount(0);
  await expect(page.locator(".professional-sections > section > h2, .professional-sections > section > section > h2")).toHaveText(["Upcoming handovers", "One-off scheduled consultations", "Upcoming group clinics", "Weekly queues"]);
  const weekly = page.locator("section.ws-panel").filter({ has: page.getByRole("heading", { name: "Weekly queues", exact: true }) });
  await expect(weekly.getByText("Offline", { exact: true })).toBeVisible();
  await expect(weekly.getByText("Test Patient", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Call next", exact: true })).toBeEnabled();
  await page.goto("/app/history");
  await expect(page.getByRole("heading", { name: "Past consultation sessions", exact: true })).toBeVisible();
  await expect(page.getByText("September 2026", { exact: true })).toBeVisible();
});

test("professional profile previews and removes a selected photo on mobile", async ({ page }) => {
  await mockAccount(page, snapshot());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/profile");
  await page.getByLabel("Choose or replace photo").setInputFiles({ name: "portrait.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") });
  await expect(page.getByAltText("Profile preview")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Professional verification", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Remove photo", exact: true }).click();
  await expect(page.getByAltText("Profile preview")).toHaveCount(0);
});

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
