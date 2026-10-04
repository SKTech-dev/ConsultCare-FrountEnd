import { test, expect } from "@playwright/test";

function notice(id, extra = {}) {
  return { id, kind: "clinic.schedule_updated", title: "Clinic time changed", body: "Previous time: 10:00–11:00. New time: 12:00–13:00. Reason: Professional unavailable. Your payment remains valid.", link: "/app/bookings", urgent: true, createdAt: "2026-09-27T10:00:00Z", readAt: null, actorId: "someone-else", ...extra };
}

async function account(page, role = "user", initial = [notice("n1")]) {
  const items = [...initial];
  let socket;
  const state = { role, professionalId: ["doctor", "lawyer"].includes(role) ? "professional" : null,
    patient: { id: "patient", name: "Test Patient", status: "active", dob: "1990-01-01", phone: "0711111111" },
    professionals: [{ id: "professional", name: "Test Professional", role: role === "lawyer" ? "lawyer" : "doctor", status: "verified", speciality: "General", fee: 5000, languages: ["English"] }],
    patients: [], sessions: [], bookings: [], weeklyAvailability: [], familyProfessionalIds: [], onboarding: null, payhereEnabled: true };
  const snapshot = () => ({ ...state, notificationSummary: { unreadCount: items.filter((item) => !item.readAt).length, latest: items.slice(0, 5) } });
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { data: { id: role === "user" ? "patient" : "professional", role, name: "Test Account" } } });
    if (path === "/api/workspace") return route.fulfill({ json: { data: snapshot() } });
    if (path === "/api/notifications" && route.request().method() === "GET") {
      const rows = url.searchParams.get("unread") === "true" ? items.filter((item) => !item.readAt) : items;
      const pageNumber = Number(url.searchParams.get("page") || 1);
      return route.fulfill({ json: { data: { items: rows.slice((pageNumber - 1) * 30, pageNumber * 30), count: rows.length, pageSize: 30 } } });
    }
    if (path === "/api/notifications/read-all") {
      items.forEach((item) => { item.readAt = "2026-09-27T11:00:00Z"; });
      return route.fulfill({ json: { message: "Notifications marked as read." } });
    }
    if (/\/api\/notifications\/[^/]+\/read$/.test(path)) {
      const item = items.find((entry) => entry.id === path.split("/")[3]);
      if (!item) return route.fulfill({ status: 404, json: { message: "Notification not found." } });
      item.readAt = "2026-09-27T11:00:00Z";
      return route.fulfill({ json: { message: "Read." } });
    }
    if (["/api/clinics", "/api/session-transfers", "/api/transferable-sessions", "/api/scheduled-consultations"].includes(path)) return route.fulfill({ json: { data: { items: [], count: 0, pageSize: 30 } } });
    return route.fulfill({ status: 404, json: { message: "Unexpected test request: " + path } });
  });
  await page.routeWebSocket("**/api/workspace/live", (connection) => { socket = connection; socket.send(JSON.stringify(snapshot())); });
  return { items, state, send: (item) => { items.unshift(item); socket.send(JSON.stringify(snapshot())); }, resend: () => socket.send(JSON.stringify(snapshot())) };
}

for (const role of ["user", "doctor", "lawyer", "admin"]) {
  test(`${role} has a durable inbox, unread count and mark-read controls`, async ({ page }) => {
    await account(page, role);
    await page.goto("/app/notifications");
    await expect(page.getByRole("button", { name: "Notifications, 1 unread", exact: true })).toBeVisible();
    await expect(page.locator(".notification-card")).toContainText("Professional unavailable");
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.locator(".notification-card")).toHaveCount(1);
    await page.getByRole("button", { name: "Mark as read", exact: true }).click();
    await expect(page.getByRole("button", { name: "Notifications, 0 unread", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Unread (0)", exact: true }).click();
    await expect(page.getByRole("heading", { name: "You're all caught up" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Notifications, 0 unread", exact: true })).toBeVisible();
    await expect(page.locator(".notification-card")).toHaveCount(1);
  });
}

test("WebSocket notifications alert once, update the inbox and open the relevant page", async ({ page }) => {
  const live = await account(page, "user", []);
  await page.goto("/app/notifications");
  await expect(page.getByRole("heading", { name: "No notifications yet" })).toBeVisible();
  live.send(notice("live", { title: "Session handover accepted", kind: "session.transfer.accepted" }));
  await expect(page.locator(".notification-toast")).toHaveCount(1);
  await expect(page.locator(".notification-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Dismiss Session handover accepted" }).click();
  live.resend();
  await expect(page.locator(".notification-toast")).toHaveCount(0);
  await page.getByRole("button", { name: "View details", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/bookings\?tab=consultations$/);
  expect(live.items[0].readAt).not.toBeNull();
});

test("notification preview is usable on mobile and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await account(page);
  await page.goto("/app/notifications");
  const bell = page.getByRole("button", { name: "Notifications, 1 unread", exact: true });
  await bell.click();
  const preview = page.getByRole("region", { name: "Recent notifications" });
  await expect(preview).toBeVisible();
  const box = await preview.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await expect(bell).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("mark all works across pages and read errors keep the notification unread", async ({ page }) => {
  await account(page, "user", Array.from({ length: 31 }, (_, i) => notice(`n${i}`)));
  await page.goto("/app/notifications");
  await expect(page.locator(".notification-card")).toHaveCount(30);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".notification-card")).toHaveCount(1);
  await page.route("**/api/notifications/n30/read", (route) => route.fulfill({ status: 503, json: { message: "Please retry later." } }));
  await page.getByRole("button", { name: "Mark as read", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Please retry later.");
  await page.getByRole("dialog").getByRole("button", { name: "OK" }).click();
  await expect(page.getByRole("button", { name: "Notifications, 31 unread" })).toBeVisible();
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(page.getByRole("button", { name: "Notifications, 0 unread" })).toBeVisible();
  await expect(page.locator(".notification-card")).toHaveCount(30);
});

test("onboarding does not prevent reading account notifications", async ({ page }) => {
  const live = await account(page, "doctor", [notice("verification", { kind: "account.rejected", title: "Professional verification needs changes", link: "/app/profile" })]);
  live.state.onboarding = "profile";
  await page.goto("/app/notifications");
  await expect(page.getByRole("heading", { name: "Your notifications." })).toBeVisible();
  await page.getByRole("button", { name: "View details" }).click();
  await expect(page).toHaveURL(/\/app\/profile\?tab=verification$/);
});
