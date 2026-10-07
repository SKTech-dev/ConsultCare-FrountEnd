import { test, expect } from "@playwright/test";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aTlcAAAAASUVORK5CYII=";

test("video-only fullscreen retains the panel and exits cleanly", async ({ page }) => {
  await account(page);
  await page.goto("/app/room/record");
  await page.locator(".room-video-panel").evaluate((panel) => { window.originalVideoPanel = panel; });
  await page.getByRole("button", { name: "Video full screen", exact: true }).click();
  await expect(page.getByRole("button", { name: "Exit video full screen", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement === window.originalVideoPanel || window.originalVideoPanel.classList.contains("video-expanded"))).toBe(true);
  await page.getByRole("button", { name: "Exit video full screen", exact: true }).click();
  await expect(page.getByRole("button", { name: "Video full screen", exact: true })).toBeVisible();
  expect(await page.locator(".room-video-panel").evaluate((panel) => panel === window.originalVideoPanel)).toBe(true);
});

test("video fullscreen falls back when browser fullscreen is unavailable", async ({ page }) => {
  await page.addInitScript(() => { HTMLElement.prototype.requestFullscreen = undefined; });
  await account(page, "user");
  await page.goto("/app/room/record");
  await page.getByRole("button", { name: "Video full screen", exact: true }).click();
  await expect(page.locator(".room-video-panel")).toHaveClass(/video-expanded/);
  await page.keyboard.press("Escape");
  await expect(page.locator(".room-video-panel")).not.toHaveClass(/video-expanded/);
});

test("tab deep links survive reload and browser history and preserve other query parameters", async ({ page }) => {
  await account(page);
  await page.goto("/app/queue?tab=clinics&source=notification");
  await expect(page.getByRole("tab", { name: "Group clinics", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Individual appointments", exact: true }).click();
  await expect(page).toHaveURL(/tab=appointments&source=notification/);
  await page.goBack();
  await expect(page.getByRole("tab", { name: "Group clinics", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.goForward();
  await page.reload();
  await expect(page.getByRole("tab", { name: "Individual appointments", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.goto("/app/queue?tab=obsolete");
  await expect(page.getByRole("tab").first()).toHaveText("Weekly queues");
  await expect(page.getByRole("tab").first()).toHaveAttribute("aria-selected", "true");
});
async function account(page, role = "doctor") {
  await page.routeWebSocket("**/api/workspace/live", () => {});
  const professional = { id: "doc", name: "Dr Test", role: "doctor", status: "verified", speciality: "General", qualifications: "MBBS", registration: "123", languages: [" sinhala ", "ENGLISH"], fee: 5000, phone: "0771234567", image: png };
  const patient = { id: "patient", name: "Test Patient", email: "patient@example.com", status: "active", dob: "2026-03-04", phone: "0771234567", image: png };
  const booking = { id: "record", professionalId: "doc", patientId: "patient", patientName: "Test Patient", sessionId: "session", status: "IN CONSULTATION", payment: "paid", files: [], messages: [], notes: "", privateNotes: "", followUp: "", notesRevision: 0, prescription: "", prescriptionRevision: 0, prescriptionHistory: [], patientContext: { profession: "doctor", name: "Test Patient", dob: "2026-03-04" } };
  const state = { role, professionalId: role === "doctor" ? "doc" : null, patient, patients: [patient], professionals: [professional], sessions: [{ id: "session", professionalId: "doc", date: "2026-10-04", start: "10:00", end: "11:00", online: true, capacity: 10, remaining: 9 }], bookings: [booking], weeklyAvailability: [], familyProfessionalIds: [], onboarding: null, notificationSummary: { unreadCount: 1, latest: [{ id: "note", title: "Consultation updated", body: "Your consultation time has changed.", createdAt: "2026-10-04T00:00:00Z" }] } };
  await page.clock.setFixedTime(new Date("2026-10-04T10:30:00+05:30"));
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { data: { id: role === "doctor" ? "doc" : "patient", role, name: role === "doctor" ? "Dr Test" : "Test Patient", email: "tester@example.com" } } });
    if (path.endsWith("/room-presence")) return route.fulfill({ json: { data: { status: "IN CONSULTATION" } } });
    if (path === "/api/workspace") return route.fulfill({ json: { data: state } });
    return route.fulfill({ json: { data: { items: [], count: 0, pageSize: 20 } } });
  });
  return state;
}

test("mobile notification and photo menu stay within the viewport", async ({ page }) => {
  await account(page, "user");
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/app");
  await page.getByRole("button", { name: "Your account" }).click();
  await expect(page.locator(".account-trigger img")).toBeVisible();
  await expect(page.locator(".account-popover")).toContainText("tester@example.com");
  await expect(page.locator(".account-popover").getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Notifications, 1 unread/ }).click();
  const bounds = await page.locator(".notification-preview").boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(360);
  await expect(page.getByText("Back to home", { exact: false })).toHaveCount(0);
});

test("schedule tabs retain drafts and support keyboard navigation", async ({ page }) => {
  await account(page);
  await page.goto("/app/sessions");
  await page.locator(".weekly-fee input").fill("6200");
  await page.getByRole("tab", { name: "Individual appointment", exact: true }).click();
  await expect(page.getByLabel("Patient / client email", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Weekly availability", exact: true }).click();
  await expect(page.locator(".weekly-fee input")).toHaveValue("6200");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Individual appointment", exact: true })).toBeFocused();
});

test("directory language filter handles existing mixed-case values", async ({ page }) => {
  const state = await account(page, "user");
  state.bookings = [];
  await page.goto("/consult/doctors");
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("Sinhala");
  await expect(page.locator(".ws-professional")).toHaveCount(1);
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("Tamil");
  await expect(page.getByText("No matching professionals")).toBeVisible();
});

test("room keeps video mounted while tools change and shows infant age", async ({ page }) => {
  await account(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/app/room/record");
  await expect(page.getByRole("tab", { name: "Chat", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Patient information", exact: true }).click();
  await expect(page.getByText("0 years, 7 months")).toBeVisible();
  await expect(page.getByRole("button", { name: "Join video call" })).toBeVisible();
  await page.getByRole("tab", { name: "Notes", exact: true }).click();
  await page.getByLabel("Private notes (professional workspace only)").fill("Unsaved note");
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  await page.getByRole("tab", { name: "Notes", exact: true }).click();
  await expect(page.getByLabel("Private notes (professional workspace only)")).toHaveValue("Unsaved note");
  await page.screenshot({ path: "test-results/room-refinements.png", fullPage: true });
});

test("uploads show progress, failure reason, and retry with the same identifier", async ({ page }) => {
  await account(page);
  let requests = [];
  await page.route("**/api/bookings/record/documents", async (route) => {
    requests.push(route.request().postDataBuffer().toString());
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (requests.length === 1) return route.fulfill({ status: 503, json: { message: "Temporary storage failure" } });
    return route.fulfill({ json: { data: { id: "file", name: "report.pdf", size: 16, type: "application/pdf", uploaderId: "doc", uploaderName: "Dr Test", private: false } } });
  });
  await page.goto("/app/room/record");
  await page.getByRole("tab", { name: "Documents", exact: true }).click();
  await page.getByLabel("Upload consultation document").setInputFiles({ name: "report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
  await expect(page.getByLabel("Uploading", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Temporary storage failure", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("Sent by Dr Test")).toBeVisible();
  const key = (body) => body.match(/name="upload_id"\r\n\r\n([^\r]+)/)?.[1];
  expect(key(requests[0])).toBeTruthy();
  expect(key(requests[1])).toBe(key(requests[0]));
});

test("room video and tools match heights and actions remain visible outside Notes", async ({ page }) => {
  await account(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/app/room/record");
  const video = await page.locator(".room-video-panel").boundingBox();
  const tools = await page.locator(".room-tools").boundingBox();
  expect(video.x + video.width).toBeLessThan(tools.x);
  expect(Math.abs(video.height - tools.height)).toBeLessThan(2);
  expect(Math.abs(video.y - tools.y)).toBeLessThan(2);
  const actions = page.getByRole("region", { name: "Professional consultation actions" });
  await expect(actions.getByRole("button", { name: "Save notes", exact: true })).toBeVisible();
  await expect(actions.getByRole("button", { name: "Complete consultation", exact: true })).toBeVisible();
  await expect(actions.getByRole("button", { name: "Complete & call next", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/room-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("tab", { name: "Chat", exact: true }).click();
  await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/room-mobile.png", fullPage: true });
});

test("completing saves notes first and calls only the server-promoted patient in this session", async ({ page }) => {
  const state = await account(page);
  state.bookings.push({ ...state.bookings[0], id: "next", status: "WAITING", patientName: "Next Patient", position: 2 });
  state.bookings.push({ ...state.bookings[0], id: "other-session", status: "NEXT", sessionId: "another-session", patientName: "Other Session" });
  const operations = [];
  await page.route("**/api/bookings/*/notes", async (route) => {
    operations.push("notes");
    const body = route.request().postDataJSON();
    state.bookings[0].notes = body.notes;
    state.bookings[0].notesRevision = 1;
    await route.fulfill({ json: { data: { revision: 1 } } });
  });
  await page.route("**/api/bookings/*/status", async (route) => {
    const id = new URL(route.request().url()).pathname.split("/")[3];
    const body = route.request().postDataJSON();
    operations.push(`${id}:${body.status}`);
    state.bookings.find((booking) => booking.id === id).status = body.status;
    if (body.status === "COMPLETED") {
      expect(body.notesRevision).toBe(1);
      state.bookings.find((booking) => booking.id === "next").status = "NEXT";
    }
    await route.fulfill({ json: { message: "Updated" } });
  });
  await page.goto("/app/room/record");
  await page.getByRole("tab", { name: "Notes", exact: true }).click();
  await page.getByLabel("Notes shared with the patient / client").fill("Shared advice");
  await page.getByRole("tab", { name: "Chat", exact: true }).click();
  await page.getByRole("button", { name: "Complete & call next", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Complete & call next", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/room\/next$/);
  expect(operations).toEqual(["notes", "record:COMPLETED", "next:IN CONSULTATION"]);
  expect(state.bookings[0].notes).toBe("Shared advice");
});

test("failed notes save keeps the consultation open and never calls the next patient", async ({ page }) => {
  await account(page);
  let statusWrites = 0;
  await page.route("**/api/bookings/record/notes", (route) => route.fulfill({ status: 409, json: { message: "Notes changed in another tab. Reload before saving." } }));
  await page.route("**/api/bookings/*/status", (route) => { statusWrites++; return route.fulfill({ json: {} }); });
  await page.goto("/app/room/record");
  await page.getByRole("button", { name: "Complete consultation", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Complete", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Notes changed in another tab");
  await expect(page).toHaveURL(/\/app\/room\/record$/);
  expect(statusWrites).toBe(0);
});

test("patients cannot see professional completion actions", async ({ page }) => {
  await account(page, "user");
  await page.goto("/app/room/record");
  await expect(page.getByRole("button", { name: "Complete consultation", exact: true })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Notes", exact: true })).toHaveCount(0);
});

test("booking details show loading feedback while refreshing their server state", async ({ page }) => {
  const state = await account(page, "user");
  state.bookings[0].status = "PAYMENT PENDING";
  state.bookings[0].payment = "pending";
  let reads = 0;
  await page.route("**/api/workspace", async (route) => {
    reads++;
    if (reads > 1) await new Promise((resolve) => setTimeout(resolve, 800));
    return route.fulfill({ json: { data: state } });
  });
  await page.goto("/app/booking/record?payment=return");
  await expect(page.locator(".booking-loading")).toBeVisible();
  await expect(page.getByLabel("Checking payment confirmation")).toBeVisible();
  await expect(page.locator(".booking-loading")).toHaveCount(0);
  await expect(page.getByText(/Waiting for PayHere to confirm/)).toBeVisible();
});
