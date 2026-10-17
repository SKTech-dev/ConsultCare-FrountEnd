import { test, expect } from "@playwright/test";

async function account(page, role = "doctor") {
  let live;
  await page.routeWebSocket("**/api/workspace/live", (socket) => { live = socket; });
  const professional = { id: "pro", name: role === "lawyer" ? "Lawyer Test" : "Dr Test", role: role === "lawyer" ? "lawyer" : "doctor", status: "verified", speciality: "General", qualifications: "Qualified", registration: "123", languages: ["English"], fee: 2500 };
  const patient = { id: "patient", name: "Test Patient", email: "patient@example.test", dob: "1990-01-01", phone: "0771234567" };
  const booking = { id: "room", professionalId: "pro", patientId: "patient", patientName: patient.name, sessionId: "session", status: "IN CONSULTATION", payment: "paid", files: [], messages: [], notes: "", privateNotes: "", followUp: "", notesRevision: 0, prescription: "", prescriptionHistory: [], patientContext: { profession: professional.role, name: patient.name, dob: patient.dob } };
  const state = { role, professionalId: role === "user" ? null : "pro", patient, patients: [patient], professionals: [professional], sessions: [{ id: "session", professionalId: "pro", date: "2026-10-16", start: "10:00", end: "11:00", online: true }], bookings: [booking], weeklyAvailability: [], familyProfessionalIds: [], onboarding: null };
  const items = [{ id: "old", date: "2026-10-12", start: "15:00", end: "16:00", completedAt: "2026-10-12T15:30:00+05:30" }, { id: "morning", date: "2026-10-12", start: "10:00", end: "11:00" }];
  let reads = 0;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/me") return route.fulfill({ json: { data: { id: role === "user" ? "patient" : "pro", role, name: "Test account" } } });
    if (url.pathname === "/api/workspace") return route.fulfill({ json: { data: state } });
    if (url.pathname.endsWith("/room-presence")) return route.fulfill({ json: { data: { status: "IN CONSULTATION" } } });
    if (url.pathname === "/api/bookings/room/history") { reads++; return route.fulfill({ json: { data: { items, count: items.length, pageSize: 20 } } }); }
    if (url.pathname === "/api/bookings/room/history/old") return route.fulfill({ json: { data: { ...booking, ...items[0], status: "COMPLETED", notes: "Previous shared advice", followUp: "Review in two weeks", privateNotes: role === "user" ? undefined : "Professional private observation", messages: [{ id: "msg", sender: patient.name, senderId: patient.id, text: "Earlier symptoms", time: "2026-10-12T15:00:00+05:30" }], files: [{ id: "report", name: "Earlier report.pdf", type: "application/pdf", size: 1024, uploaderId: "patient", uploaderName: patient.name }], prescription: professional.role === "doctor" ? "Previous medicine instructions" : "", prescribedAt: "2026-10-12T15:30:00+05:30", prescriptionRevision: 1 } } });
    return route.fulfill({ json: { data: { items: [], count: 0 } } });
  });
  return { state, items, reads: () => reads, push: (snapshot) => live.send(JSON.stringify(snapshot)) };
}

for (const role of ["doctor", "lawyer", "user"]) {
  test(role + " reviews previous consultation inside the room without losing video or drafts", async ({ page }) => {
    const fixture = await account(page, role);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/app/room/room");
    await expect(page.locator(".room-video-panel")).toBeVisible();
    expect(fixture.reads()).toBe(0);
    await page.locator(".room-video-panel").evaluate((panel) => { window.originalVideo = panel; });
    if (role !== "user") { await page.getByRole("tab", { name: "Notes", exact: true }).click(); await page.getByLabel("Private notes (professional workspace only)").fill("Current draft"); }
    await page.getByRole("tab", { name: "History", exact: true }).click();
    await expect(page.getByText("2 previous consultations")).toBeVisible();
    await expect(page.getByText("Session: 15:00–16:00", { exact: true })).toBeVisible();
    await expect(page.getByText("Session: 10:00–11:00", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "View record", exact: true }).first().click();
    await expect(page.getByText("Previous shared advice")).toBeVisible();
    await expect(page.getByText("Review in two weeks")).toBeVisible();
    await expect(page.locator(".room-history-record .ws-message").filter({ hasText: "Earlier symptoms" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Earlier report.pdf", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Update prescription", exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Upload consultation document")).toHaveCount(0);
    if (role === "user") await expect(page.getByText("Professional private observation")).toHaveCount(0);
    else await expect(page.getByText("Professional private observation")).toBeVisible();
    expect(await page.locator(".room-video-panel").evaluate((panel) => panel === window.originalVideo)).toBe(true);
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe("/app/room/room?tab=history");
    if (role === "doctor") {
      await page.screenshot({ path: "test-results/room-history-desktop.png", fullPage: true });
      await page.setViewportSize({ width: 320, height: 780 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const bounds = await page.getByRole("tab").evaluateAll((tabs) => tabs.map((tab) => { const box = tab.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height }; }));
      expect(bounds.every((box) => box.width >= 80 && box.height >= 44)).toBe(true);
      expect(new Set(bounds.map((box) => box.y)).size).toBe(2);
      await page.screenshot({ path: "test-results/room-history-mobile.png", fullPage: true });
    }
    await page.getByRole("button", { name: "Back to history", exact: true }).click();
    await expect(page.getByRole("button", { name: "View record", exact: true }).first()).toBeFocused();
    if (role !== "user") { await page.getByRole("tab", { name: "Notes", exact: true }).click(); await expect(page.getByLabel("Private notes (professional workspace only)")).toHaveValue("Current draft"); }
  });
}

test("room history supports loading, retry, empty results and pagination", async ({ page }) => {
  await account(page);
  let attempt = 0;
  await page.route("**/api/bookings/room/history?*", async (route) => {
    attempt++;
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (attempt === 1) return route.fulfill({ status: 503, json: { message: "History temporarily unavailable" } });
    if (attempt === 2) return route.fulfill({ json: { data: { items: [], count: 0, pageSize: 20 } } });
    const second = new URL(route.request().url()).searchParams.get("page") === "2";
    return route.fulfill({ json: { data: { items: [{ id: second ? "second" : "first", date: second ? "2026-10-10" : "2026-10-12", start: "10:00", end: "11:00" }], count: 21, pageSize: 20 } } });
  });
  await page.goto("/app/room/room?tab=history");
  await expect(page.getByText("Loading consultation history", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("History temporarily unavailable");
  await page.getByRole("button", { name: "Retry history", exact: true }).click();
  await expect(page.getByText("No previous consultations", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
});

test("failed historical detail remains in the room and can be retried", async ({ page }) => {
  await account(page, "user");
  let fail = true;
  await page.route("**/api/bookings/room/history/old?*", async (route) => {
    if (fail) { fail = false; return route.fulfill({ status: 404, json: { message: "Previous consultation not found." } }); }
    await route.fallback();
  });
  await page.goto("/app/room/room");
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await page.getByRole("button", { name: "View record", exact: true }).first().click();
  await expect(page.getByRole("alert")).toContainText("Previous consultation not found.");
  await page.getByRole("button", { name: "Retry history", exact: true }).click();
  await expect(page.getByText("Previous shared advice")).toBeVisible();
  await expect(page.getByRole("button", { name: "Join video call", exact: true })).toBeVisible();
});


test("a corrected prescription replaces cached room history without remounting video", async ({ page }) => {
  const fixture = await account(page);
  let revision = 1, release;
  await page.route("**/api/bookings/room/history/old?*", async (route) => {
    if (revision === 2) await new Promise((resolve) => { release = resolve; });
    return route.fulfill({ json: { data: { ...fixture.state.bookings[0], id: "old", status: "COMPLETED", date: "2026-10-12", start: "15:00", end: "16:00", prescription: revision === 1 ? "Old prescription text" : "Corrected prescription text", prescriptionRevision: revision, prescribedAt: "2026-10-16T12:00:00+05:30" } } });
  });
  await page.goto("/app/room/room");
  await page.locator(".room-video-panel").evaluate((panel) => { window.originalPanel = panel; });
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await page.getByRole("button", { name: "View record", exact: true }).first().click();
  await expect(page.getByText("Old prescription text", { exact: true })).toBeVisible();
  revision = 2;
  fixture.push({ ...fixture.state, snapshotAt: "2026-10-16T10:00:02.000000+00:00", bookings: [...fixture.state.bookings, { ...fixture.state.bookings[0], id: "old", status: "COMPLETED", updatedAt: "2026-10-16T10:00:01+00:00", prescriptionRevision: 2 }] });
  await expect(page.getByText("Loading consultation history", { exact: true })).toBeVisible();
  await expect(page.getByText("Old prescription text", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download current PDF", exact: true })).toHaveCount(0);
  await expect.poll(() => Boolean(release)).toBe(true);
  release();
  await expect(page.getByText("Corrected prescription text", { exact: true })).toBeVisible();
  expect(await page.locator(".room-video-panel").evaluate((panel) => panel === window.originalPanel)).toBe(true);
});
