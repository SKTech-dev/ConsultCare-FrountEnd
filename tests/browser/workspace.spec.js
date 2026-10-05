import { test, expect } from "@playwright/test";

const currentTime = "2026-09-22T10:30:00+05:30";
const professional = { id: "professional", name: "Test Professional", role: "doctor", status: "verified", speciality: "General practice", qualifications: "Test qualification", registration: "REG-1", languages: ["English"], fee: 2500 };

async function expectNamedControls(page) {
  const controls = page.locator('input:not([type="hidden"]):visible, select:visible, textarea:visible');
  expect(await controls.count()).toBeGreaterThan(0);
  for (const control of await controls.all()) {
    await expect(control).toHaveAccessibleName(/\S/);
  }
  const duplicates = await page.locator('[id]').evaluateAll((elements) => {
    const ids = elements.map((element) => element.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  });
  expect(duplicates).toEqual([]);
}

test("patient email lookup works before appointment details and clears stale matches", async ({ page }) => {
  await mockAccount(page, snapshot());
  let searches = 0;
  await page.route("**/api/scheduled-consultations/patient-search", (route) => {
    searches++;
    const { email } = route.request().postDataJSON();
    return email === "patient@example.com"
      ? route.fulfill({ json: { data: { name: "Matching Patient", email } } })
      : route.fulfill({ status: 404, json: { message: "No active patient/client account matches that email." } });
  });
  await page.goto("/app/sessions");
  await page.getByRole("tab", { name: "Patient consultation", exact: true }).click();
  const email = page.getByLabel("Patient / client email", { exact: true });
  await page.getByRole("button", { name: "Find patient", exact: true }).click();
  expect(searches).toBe(0);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await email.fill("patient@example.com");
  await page.getByRole("button", { name: "Find patient", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Matching Patient" })).toBeVisible();
  expect(searches).toBe(1);
  await email.fill("missing@example.com");
  await expect(page.getByText("Matching Patient", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Find patient", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("No active patient/client account matches that email.");
});

test("auth form controls have accessible names and clickable labels", async ({ page }) => {
  await page.route("**/api/**", (route) => route.fulfill({ status: 401, json: { message: "Sign in" } }));
  for (const path of ["/login", "/signup"]) {
    await page.goto(path);
    await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
    await expectNamedControls(page);
    await page.locator('label[for="email"]').click();
    await expect(page.getByLabel("Email address", { exact: true })).toBeFocused();
    await page.locator('label[for="password"]').click();
    await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
  }
});

for (const role of ["user", "doctor", "lawyer", "admin"]) {
  test(`${role} workspace form controls have accessible names`, async ({ page }) => {
    await mockAccount(page, snapshot(role));
    const paths = role === "admin"
      ? ["/app/appointments", "/app/clinics", "/app/transfers"]
      : role === "user"
        ? ["/app/profile", "/consult/doctors", "/consult/lawyers"]
        : ["/app/profile", "/app/sessions"];
    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator(".ws-main")).toBeVisible();
      await expectNamedControls(page);
    }
  });
}

test("queue and history use consistent empty states in tabs", async ({ page }) => {
  await mockAccount(page, snapshot());
  await page.goto("/app/queue");
  await expect(page.getByRole("tab")).toHaveCount(4);
  for (const tab of await page.getByRole("tab").all()) { await tab.click(); await expect(page.locator(".ws-empty:visible")).toHaveCount(1); }
  await page.goto("/app/history");
  await expect(page.getByRole("tab")).toHaveCount(3);
  for (const tab of await page.getByRole("tab").all()) { await tab.click(); await expect(page.locator(".ws-empty:visible")).toHaveCount(1); }
});

test("history expand labels follow each independent disclosure state", async ({ page }) => {
  const state = snapshot();
  state.sessions = [session("past", "2026-09-21")];
  state.bookings = [booking("record", "past", "COMPLETED")];
  await mockAccount(page, state);
  await page.goto("/app/history");
  await page.getByRole("tab", { name: "Consultation sessions", exact: true }).click();
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
    await expect(page.getByRole("tab")).toHaveCount(path === "/app/bookings" ? 3 : 2);
    for (const tab of await page.getByRole("tab").all()) { await tab.click(); await expect(page.locator(".ws-empty:visible")).toHaveCount(1); }
    await expect(page.locator(".ws-sidebar").getByRole("link", { name: "Group clinics", exact: true })).toHaveCount(0);

  }
  await page.goto("/app/clinics");
  await expect(page).toHaveURL(/\/app\/bookings(?:\?tab=(?:clinics|consultations))?$/);
});

test("professional verification has its own profile tab", async ({ page }) => {
  await mockAccount(page, snapshot());
  await page.goto("/app/profile");
  await expect(page.getByRole("tab", { name: "Your details" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Professional verification" }).click();
  await expect(page.getByRole("heading", { name: "Professional verification", exact: true })).toBeVisible();
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
    if (label === "Filter booked sessions") await page.getByRole("tab", { name: "Hand over a booked session", exact: true }).click();
    if (label === "Filter handover history") await page.getByRole("tab", { name: "Requests & handover history", exact: true }).click();
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
  // These browser fixtures must never contact deployed APIs or providers.
  await page.route("**/*", (route) => {
    const hostname = new URL(route.request().url()).hostname;
    return ["127.0.0.1", "localhost"].includes(hostname) ? route.continue() : route.abort();
  });
  await page.clock.setFixedTime(new Date(currentTime));
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ status: state ? 200 : 401, json: state
      ? { data: { id: state.role === "user" ? "patient" : professional.id, role: state.role, name: "Test Account" } }
      : { message: "Please sign in." } });
    if (path === "/api/workspace") return route.fulfill({ json: { data: state } });
    if (path === "/api/appointment-offers") return route.fulfill({ json: { data: [] } });
    if (path === "/api/wallet") return route.fulfill({ json: { data: { balance: "0", environment: "sandbox", frozen: false, entries: [], cashouts: [] } } });
    if (path === "/api/clinics" || path === "/api/transferable-sessions" || path === "/api/session-transfers" || path === "/api/scheduled-consultations") return route.fulfill({ json: { data: { items: [], count: 0, pageSize: 30 } } });
    if (path === "/api/admin/users/professional") return route.fulfill({ status: 409, json: { message: "The professional must complete their credentials first." } });
    if (path === "/api/bookings/room/messages" && options.messageFailure) return route.fulfill({ status: 503, json: { message: "Message service is temporarily unavailable." } });
    if (path === "/api/documents/image" && options.imageFailure) { await new Promise((resolve) => setTimeout(resolve, 500)); return route.fulfill({ status: 503, json: { message: "Preview unavailable." } }); }
    return route.fulfill({ status: 404, json: { message: "Unexpected test request: " + path } });
  });
  // These tests exercise rendering/routing with deterministic data; backend tests
  // independently exercise real authenticated WebSocket queue updates.
  let stream;
  await page.routeWebSocket("**/api/workspace/live", (socket) => {
    stream = socket;
    socket.send(JSON.stringify(state));
  });
  return { push: () => stream.send(JSON.stringify(state)) };
}

test("switching incoming consultation rooms discards the previous patient's chat draft", async ({ page }) => {
  const state = snapshot("user");
  state.professionals.push({ ...professional, id: "replacement", name: "Second Professional" });
  state.sessions = [session("first", "2026-09-22"), { ...session("second", "2026-09-22"), professionalId: "replacement" }];
  state.bookings = [booking("first", "first", "IN CONSULTATION"), { ...booking("second", "second"), professionalId: "replacement" }];
  const live = await mockAccount(page, state);
  await page.goto("/app/room/first");
  const message = page.getByRole("textbox", { name: "Message", exact: true });
  await message.fill("Private draft for the first professional only");
  state.bookings[1].status = "IN CONSULTATION";
  live.push();
  await expect(page.getByRole("dialog", { name: "Leave without saving?" })).toBeVisible();
  await page.getByRole("button", { name: "Leave without saving", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/room\/second$/);
  await expect(page.getByRole("heading", { name: "Second Professional", exact: true })).toBeVisible();
  await expect(message).toHaveValue("");
  await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeDisabled();
  await page.getByRole("navigation").getByRole("link", { name: "My consultations" }).click();
  await expect(page).toHaveURL(/\/app\/bookings(?:\?tab=(?:clinics|consultations))?$/);
  await expect(page.getByRole("dialog", { name: "Leave without saving?" })).toHaveCount(0);
});

test("admin records an external settlement with evidence instead of simulating a transfer", async ({ page }) => {
  await mockAccount(page, snapshot("admin"));
  const data = { month: "2024-04", professional: { id: "professional", name: "Test Professional", role: "doctor" }, total: "5000.00", consultationTotal: "5000.00", clinicTotal: "0.00", count: 1, pageSize: 50, closed: true, canPay: true, adjustment: "0.00", payout: { status: "unpaid" }, payments: [] };
  await page.route("**/api/settlements/2024-04/professional*", (route) => route.fulfill({ json: { data } }));
  let submitted;
  await page.route("**/api/admin/settlements/2024-04/professional/record-payment", (route) => {
    submitted = route.request().postDataJSON();
    data.canPay = false;
    data.payout = { status: "paid", reference: submitted.reference, paidAt: submitted.paidAt };
    return route.fulfill({ json: { message: "Recorded." } });
  });
  await page.goto("/app/settlements/2024-04/professional");
  await page.getByRole("button", { name: "Record external payment", exact: true }).click();
  await page.getByLabel("Bank / provider reference").fill("BANK-TEST-1");
  await page.getByLabel("Actual payment date and time (your local time)").fill("2024-05-01T10:00");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Record completed payment" }).click();
  await expect(page.getByRole("dialog")).toContainText("No money was transferred");
  expect(submitted).toMatchObject({ amount: "5000.00", reference: "BANK-TEST-1", confirmed: true });
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.getByRole("button", { name: "Record external payment", exact: true })).toBeDisabled();
});

test("admin records an external refund and the evidence remains visible", async ({ page }) => {
  await mockAccount(page, snapshot("admin"));
  const row = { id: "OLD-ORDER", patientName: "Test Patient", amount: "2500.00", environment: "live", status: "refund requested" };
  await page.route("**/api/admin/refunds?*", (route) => route.fulfill({ json: { data: { items: [row], count: 1, pageSize: 30 } } }));
  await page.route("**/api/admin/refunds/OLD-ORDER/record", (route) => {
    row.status = "refunded"; row.reference = route.request().postDataJSON().reference;
    return route.fulfill({ json: { message: "Recorded." } });
  });
  await page.goto("/app/payments");
  await page.getByRole("tab", { name: "Refunds", exact: true }).click();
  await page.getByRole("button", { name: "Record external refund" }).click();
  await page.getByLabel("Bank / provider reference").fill("REFUND-TEST-1");
  await page.getByLabel("Actual payment date and time (your local time)").fill("2024-05-01T10:00");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Record completed payment" }).click();
  await expect(page.getByRole("dialog")).toContainText("Refund recorded");
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.getByText("Reference: REFUND-TEST-1")).toBeVisible();
  await expect(page.getByRole("button", { name: "Record external refund" })).toHaveCount(0);
});

test("an ended weekly consultation can be resolved without blaming the patient", async ({ page }) => {
  const state = snapshot();
  state.sessions = [session("past", "2026-09-21")];
  state.bookings = [booking("unfinished", "past")];
  await mockAccount(page, state);
  let submitted;
  await page.route("**/api/bookings/unfinished/resolve", (route) => {
    submitted = route.request().postDataJSON();
    state.bookings[0].status = submitted.outcome;
    state.bookings[0].payment = "refund requested";
    return route.fulfill({ json: { message: "Resolved." } });
  });
  await page.goto("/app/booking/unfinished");
  await page.getByRole("button", { name: "Consultation not provided" }).click();
  await page.getByLabel(/reason/i).fill("Professional was unavailable");
  await page.getByRole("dialog").getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Consultation resolved");
  expect(submitted).toEqual({ outcome: "CANCELLED", reason: "Professional was unavailable" });
});

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
  await expect(page).toHaveURL(/\/app\/bookings(?:\?tab=(?:clinics|consultations))?$/);
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
  await page.getByRole("tab", { name: "Weekly queues", exact: true }).click();
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
  await expect(page).toHaveURL(/\/app\/bookings\?tab=consultations$/, { timeout: 12000 });
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
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
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

test("handover starts from a queue button rather than a My sessions card", async ({ page }) => {
  await mockAccount(page, snapshot());
  await page.goto("/app/sessions");
  await page.getByRole("tab", { name: "Patient consultation", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Upcoming generated sessions" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Hand over a booked session" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Requests & handover history" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Patient consultation", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Schedule a patient consultation" })).toBeVisible();
  await page.goto("/app/queue");
  await page.getByRole("tab", { name: "Handovers", exact: true }).click();
  await page.getByRole("button", { name: "Hand over a booked session" }).click();
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
  await page.goto("/app/queue");
  await page.getByRole("tab", { name: "Handovers", exact: true }).click();
  await page.getByRole("button", { name: "Hand over a booked session" }).click();
  await page.getByRole("button", { name: "Request handover", exact: true }).click();
  await page.getByLabel("Search by name or email").fill("Cover");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("radio", { name: /Cover Doctor/ }).check();
  await expect(page.getByRole("radio", { name: /Cover Doctor/ })).toBeChecked();
  const inputBox = await page.getByLabel("Search by name or email").boundingBox();
  const searchBox = await page.getByRole("button", { name: "Search", exact: true }).boundingBox();
  expect(Math.abs(inputBox.y + inputBox.height - searchBox.y - searchBox.height)).toBeLessThan(2);
  await page.getByLabel("Reason for handover").fill("Unavoidable absence");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Handover requested.", { exact: true })).toBeVisible();
  expect(submitted).toEqual({ professionalId: "receiver", reason: "Unavoidable absence" });
});

test("paid private appointment allows date and time editing without changing fee", async ({ page }) => {
  await mockAccount(page, snapshot());
  const item = { id: "private", patientName: "Patient", professionalName: "Doctor", date: "2026-09-23", start: "10:00", end: "11:00", fee: 5000, payment: "paid", status: "NEXT", canUpdate: true, canCancel: false };
  await page.route("**/api/scheduled-consultations?*", (route) => route.fulfill({ json: { data: { items: [item], count: 1, pageSize: 30 } } }));
  let saved;
  await page.route("**/api/scheduled-consultations/private", (route) => {
    saved = route.request().postDataJSON();
    return route.fulfill({ json: { message: "Time updated." } });
  });
  await page.goto("/app/queue");
  await page.getByRole("tab", { name: "One-off consultations", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cancel appointment" })).toHaveCount(0);
  await page.getByRole("button", { name: "Update date & time", exact: true }).click();
  await page.getByLabel("Date *", { exact: true }).fill("2026-09-25");
  await page.getByLabel("Start time", { exact: true }).fill("14:00");
  await page.getByLabel("End time", { exact: true }).fill("15:00");
  await page.getByLabel("Reason for change").fill("Unavoidable schedule change");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(() => saved).toEqual({ date: "2026-09-25", start: "14:00", end: "15:00", reason: "Unavoidable schedule change" });
  await expect(page.getByText("Time updated.", { exact: true })).toBeVisible();
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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Handovers", exact: true }).click();
  const card = page.locator(".transfer-card");
  await expect(card.getByText("Incoming handover", { exact: true })).toBeVisible();
  await expect(card.getByText("Original professional", { exact: true })).toBeVisible();
  await expect(card.getByText("Replacement professional", { exact: true })).toBeVisible();
  expect(await card.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  expect(submitted).toBeUndefined();
  await expect(page.getByRole("heading", { name: "Accept this session?" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm accept" }).click();
  await expect(page.getByText("Handover accepted.", { exact: true })).toBeVisible();
  expect(submitted.action).toBe("accept");
});

test("patient upcoming excludes ended queues but preserves running calls and history", async ({ page }) => {
  const state = snapshot("user");
  state.sessions = [session("ended", "2026-09-21"), session("running", "2026-09-21"), session("future", "2026-09-23")];
  state.bookings = [booking("expired", "ended", "WAITING"), booking("ongoing", "running", "IN CONSULTATION"), booking("upcoming", "future", "NEXT")];
  await mockAccount(page, state);
  await page.goto("/app/bookings");
  // Incoming calls redirect once; return through the SPA to inspect the queue.
  await expect(page).toHaveURL(/\/app\/room\/ongoing/);
  await page.getByRole("navigation", { name: "Workspace" }).getByRole("link", { name: "My consultations" }).click();
  await page.getByRole("tab", { name: "Your private consultations", exact: true }).click();
  await expect(page.locator('a[href="/app/booking/expired"]')).toHaveCount(0);
  await expect(page.locator('a[href="/app/room/ongoing"]').first()).toBeVisible();
  await expect(page.locator('a[href="/app/booking/upcoming"]')).toBeVisible();
  await page.getByRole("navigation", { name: "Workspace" }).getByRole("link", { name: "My history" }).click();
  await page.getByRole("tab", { name: "Past private consultations", exact: true }).click();
  await expect(page.locator('a[href="/app/booking/expired"]')).toBeVisible();
  await expect(page.locator('a[href="/app/booking/upcoming"]')).toHaveCount(0);
});

test("handover queue and history request separate server-filtered views", async ({ page }) => {
  await mockAccount(page, snapshot());
  const scopes = [];
  await page.route("**/api/session-transfers?*", (route) => {
    scopes.push(new URL(route.request().url()).searchParams.get("scope"));
    return route.fulfill({ json: { data: { items: [], count: 0, pageSize: 30 } } });
  });
  await page.goto("/app/queue");
  await page.getByRole("tab", { name: "Handovers", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Upcoming handovers" })).toBeVisible();
  await page.getByRole("navigation", { name: "Workspace" }).getByRole("link", { name: "Consultation history" }).click();
  await page.getByRole("tab", { name: "Handover history", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Handover history" })).toBeVisible();
  await expect.poll(() => scopes).toContain("history");
  expect(scopes).toContain("upcoming");
});

test("professional schedules a private consultation using an exact patient email", async ({ page }) => {
  await mockAccount(page, snapshot());
  let submitted;
  await page.route("**/api/appointment-offers", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { message: "Consultation scheduled. Patient payment is required." } });
  });
  await page.goto("/app/sessions");
  await page.getByRole("tab", { name: "Patient consultation", exact: true }).click();
  await expect(page.getByRole("button", { name: "Schedule consultation", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Find patient" })).toBeVisible();
  await page.getByLabel("Patient / client email").fill("patient@example.com");
  await page.getByLabel("Date", { exact: true }).fill("2026-09-23");
  await page.getByLabel("Start time", { exact: true }).fill("14:00");
  await page.getByLabel("End time", { exact: true }).fill("14:30");
  await page.getByLabel("Individual consultation fee (LKR)", { exact: true }).fill("7500.50");
  await page.getByRole("button", { name: "Schedule consultation", exact: true }).click();
  await expect(page.getByText("Consultation scheduled. Patient payment is required.", { exact: true })).toBeVisible();
  expect(submitted).toEqual({ email: "patient@example.com", options: [{ date: "2026-09-23", start: "14:00", end: "14:30" }], fee: 7500.50, reason: "" });
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
    await page.getByRole("tab", { name: "Patient consultation", exact: true }).click();
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
    expect(route.request().postDataJSON()).toEqual({ frontendOrigin: new URL(page.url()).origin });
    return route.fulfill({ json: { data: { checkoutUrl: "https://sandbox.payhere.lk/pay/checkout", fields: { order_id: "invited", amount: "2500.00" } } } });
  });
  await page.route("https://sandbox.payhere.lk/pay/checkout", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Sandbox checkout</h1>" }));
  await page.goto("/app/bookings");
  await page.getByRole("tab", { name: "Your private consultations", exact: true }).click();
  await expect(page.getByLabel("Billing address")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /pay with PayHere/i })).toHaveCount(0);
  await page.getByRole("link", { name: "Continue to payment" }).click();
  const posted = page.waitForRequest("https://sandbox.payhere.lk/pay/checkout");
  await page.getByRole("button", { name: /Accept & pay/ }).click();
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
  await page.getByRole("tab", { name: "Your private consultations", exact: true }).click();
  await page.getByRole("link", { name: "Continue to payment" }).click();
  await expect(page.getByRole("button", { name: /Accept & pay/ })).toBeDisabled();
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
  await expect(page).toHaveURL(/\/app\/queue\?tab=clinics$/);
  await expect(page.locator(".ws-sidebar").getByRole("link", { name: "Group clinics" })).toHaveCount(0);
  await expect(page.getByRole("tab")).toHaveText(["Weekly queues", "One-off consultations", "Group clinics", "Handovers"]);
  await page.getByRole("tab", { name: "Weekly queues", exact: true }).click();
  const weekly = page.locator("section.ws-panel").filter({ has: page.getByRole("heading", { name: "Weekly queues", exact: true }) });
  await expect(weekly.getByText("Offline", { exact: true })).toBeVisible();
  await expect(weekly.getByText("Test Patient", { exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "One-off consultations", exact: true }).click();
  await expect(page.getByRole("button", { name: "Call next", exact: true })).toBeEnabled();
  await page.goto("/app/history");
  await page.getByRole("tab", { name: "Consultation sessions", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Past consultation sessions", exact: true })).toBeVisible();
  await expect(page.getByText("September 2026", { exact: true })).toBeVisible();
});

test("professional profile previews and removes a selected photo on mobile", async ({ page }) => {
  await mockAccount(page, snapshot());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/profile");
  await page.getByLabel("Choose or replace photo").setInputFiles({ name: "portrait.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") });
  await expect(page.getByAltText("Profile preview")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Professional verification", exact: true })).toBeVisible();
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
  await page.getByRole("tab", { name: "Weekly queues", exact: true }).click();
  await expect(page.getByRole("button", { name: "Call next", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "No-show", exact: true })).toBeDisabled();
});

test("a live session enables call-next and no-show when the professional is free", async ({ page }) => {
  const state = snapshot();
  state.sessions = [session("current", "2026-09-22")];
  state.bookings = [booking("waiting", "current")];
  await mockAccount(page, state);
  await page.goto("/app/queue");
  await page.getByRole("tab", { name: "Weekly queues", exact: true }).click();
  await expect(page.getByRole("button", { name: "Call next", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "No-show", exact: true })).toBeEnabled();
});

test("an overrun remains reachable and blocks starting another consultation", async ({ page }) => {
  const state = snapshot();
  state.sessions = [session("old", "2026-09-21"), session("current", "2026-09-22")];
  state.bookings = [booking("ongoing", "old", "IN CONSULTATION"), booking("waiting", "current")];
  await mockAccount(page, state);
  await page.goto("/app/queue");
  await page.getByRole("tab", { name: "Consultation still in progress", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Consultation still in progress" })).toBeVisible();
  await page.getByRole("tab", { name: "Weekly queues", exact: true }).click();
  await expect(page.getByRole("button", { name: "Call next", exact: true })).toBeDisabled();
  await page.getByRole("tab", { name: "Consultation still in progress", exact: true }).click();
  await page.getByRole("link", { name: "Return to consultation" }).click();
  await expect(page).toHaveURL(/\/app\/room\/ongoing$/);
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reports, images & documents" })).toBeVisible();
});

test("failed professional approval shows one error popup", async ({ page }) => {
  const state = snapshot("admin");
  state.professionals[0].status = "pending";
  await mockAccount(page, state);
  await page.goto("/app/admin/person/professional/professional");
  await page.getByRole("tab", { name: "Professional introduction", exact: true }).click();
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
  await page.getByRole("tab", { name: "Professional introduction", exact: true }).click();
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
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  await expect(page.getByRole("status", { name: "Loading preview for report.png" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Preview unavailable for report.png" })).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("group", { name: "Preview unavailable for report.png" })).toBeVisible();
  await page.getByRole("tab", { name: "Chat", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Message", exact: true });
  await input.fill("Can you hear me?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("dialog")).toContainText("Message service is temporarily unavailable.");
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(input).toHaveValue("Can you hear me?");
  await expect(page.getByText("Saving changes...")).toHaveCount(0);
});
