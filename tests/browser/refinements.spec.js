import { test, expect } from "@playwright/test";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aTlcAAAAASUVORK5CYII=";
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
  await page.getByRole("tab", { name: "Patient consultation", exact: true }).click();
  await expect(page.getByLabel("Patient / client email", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Weekly availability", exact: true }).click();
  await expect(page.locator(".weekly-fee input")).toHaveValue("6200");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Patient consultation", exact: true })).toBeFocused();
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
