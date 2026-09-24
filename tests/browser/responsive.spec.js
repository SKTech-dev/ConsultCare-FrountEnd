import { test, expect } from "@playwright/test";

const longName = "Dr. Alexandra Jayawardene Wickramasinghe";
async function account(page, role) {
  await page.clock.setFixedTime(new Date("2026-09-22T10:30:00+05:30"));
  const professional = { id: "professional", name: longName, role: role === "lawyer" ? "lawyer" : "doctor", status: "verified", speciality: "General practice and family consultations", registration: "REG-12345", qualifications: "Postgraduate qualifications in professional practice", languages: ["English", "Sinhala", "Tamil"], fee: 5000 };
  const patient = { id: "patient", name: "Alexandra Jayawardene Wickramasinghe", email: "long.patient.email.address@example.com", status: "active", dob: "1990-01-01", phone: "0711111111" };
  const sessions = ["2026-09-21", "2026-09-23"].map((date, index) => ({ id: "session" + index, professionalId: professional.id, date, start: "10:00", end: "11:00", capacity: 10, remaining: 9, online: true }));
  const bookings = sessions.map((s, index) => ({ id: "booking" + index, sessionId: s.id, professionalId: professional.id, patientId: patient.id, patientName: patient.name, status: index ? "NEXT" : "COMPLETED", payment: "paid (mock)", position: 3, queueSize: 5, fee: 5000, files: [], messages: [], notes: "", privateNotes: "", followUp: "" }));
  const state = { role, professionalId: ["doctor", "lawyer"].includes(role) ? professional.id : null, professionals: [professional], patient, patients: [patient], sessions, bookings, weeklyAvailability: [{ weekday: 0, start: "10:00", end: "11:00", capacity: 10 }], familyProfessionalIds: [], onboarding: null, mockPayments: true };
  const clinic = { id: "clinic", title: "Understanding your health and long-term wellbeing", description: "Shared educational discussion.", professionalName: longName, professionalId: professional.id, profession: professional.role, date: "2026-09-23", start: "12:00", end: "13:00", startsAt: "2026-09-23T12:00:00+05:30", endsAt: "2026-09-23T13:00:00+05:30", fee: 5000, remaining: 10, capacity: 20, status: "scheduled", registrations: [], mockPayments: true };
  const person = { ...professional, count: 5, total: 250000, payout: { status: "unpaid" } };
  const month = { month: "2026-09", count: 5, total: 250000, groups: { doctor: { count: 5, total: 250000, professionals: [person] }, lawyer: { count: 0, total: 0, professionals: [] } } };
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ status: role ? 200 : 401, json: role ? { data: { id: role === "user" ? patient.id : professional.id, name: longName, role } } : { message: "Sign in" } });
    if (path === "/api/workspace") return route.fulfill({ json: { data: state } });
    if (path === "/api/settlements") return route.fulfill({ json: { data: { months: [month], testPayments: true } } });
    if (path === "/api/clinics/clinic") return route.fulfill({ json: { data: clinic } });
    if (path === "/api/clinics") return route.fulfill({ json: { data: { items: [clinic], count: 1, pageSize: 30 } } });
    if (path === "/api/scheduled-consultations") return route.fulfill({ json: { data: { items: [{ ...bookings[1], date: "2026-09-23", start: "10:00", end: "11:00", professionalName: longName, scheduledBy: longName }], count: 1, pageSize: 30 } } });
    if (["/api/clinics", "/api/session-transfers", "/api/transferable-sessions", "/api/scheduled-consultations"].includes(path)) return route.fulfill({ json: { data: { items: [], count: 0, pageSize: 30 } } });
    return route.fulfill({ status: 404, json: { message: "Unavailable in this preview" } });
  });
  await page.routeWebSocket("**/api/workspace/live", (socket) => socket.send(JSON.stringify(state)));
}

async function fits(page) {
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth <= width + 1) return [];
    return [...document.querySelectorAll("body *")].filter((el) => {
      if (el.closest(".ws-table-wrap, .ws-sidebar")) return false;
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.right > width + 1;
    }).slice(0, 8).map((el) => `${el.tagName}.${el.className}`);
  });
  expect(overflow).toEqual([]);
}

for (const width of [320, 390, 768, 1024, 1280]) {
  for (const role of ["user", "doctor", "admin"]) {
    test(`${role} pages fit at ${width}px with populated records`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await account(page, role);
      const paths = role === "user" ? ["/app", "/consult/doctors", "/consult/lawyers", "/app/bookings", "/app/history", "/app/profile", "/app/booking/booking0"] : role === "doctor" ? ["/app", "/app/sessions", "/app/queue", "/app/history", "/app/profile", "/app/earnings", "/app/room/booking1"] : ["/app", "/app/admin", "/app/appointments", "/app/transfers", "/app/clinics", "/app/payments", "/app/settlements"];
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const path of paths) {
        await page.goto(path);
        await expect(page.locator(".ws-main")).toBeVisible();
        await fits(page);
        if (path === "/app/history") {
          for (const selector of [".history-month", ".history-week", ".history-day"]) {
            const summary = page.locator(`${selector} > summary`).first();
            if (await summary.count()) await summary.click();
          }
          await fits(page);
        }
        if (path === "/app/settlements") {
          await page.locator(".earnings-month > summary").click();
          await page.locator(".earnings-group > summary").first().click();
          await fits(page);
        }
      }
      expect(errors).toEqual([]);
    });
  }
}

test("tablet drawer traps focus, closes with Escape and restores navigation focus", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 600 });
  await account(page, "doctor");
  await page.goto("/app/sessions");
  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  await toggle.click();
  await expect(page.getByRole("dialog", { name: "Workspace navigation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close navigation" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Hide sidebar" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await page.getByRole("link", { name: "Consultation queue", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/queue$/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("mobile navigation remains usable in landscape and table overflow stays contained", async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await account(page, "admin");
  await page.goto("/app/admin");
  const table = page.locator(".ws-table-wrap").first();
  await expect(table).toBeVisible();
  expect(await table.evaluate((el) => el.scrollWidth >= el.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("link", { name: "Monthly settlements", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/settlements$/);
  await fits(page);
});

test("responsive previews", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await account(page, "doctor");
  await page.goto("/app/sessions");
  await expect(page.getByRole("heading", { name: "Repeat every week" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("mobile-schedule.png"), fullPage: true });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.screenshot({ path: testInfo.outputPath("mobile-navigation.png") });
});

test("public home and authentication fit narrow phones and tablets", async ({ page }) => {
  await account(page, null);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 700 });
    for (const path of ["/", "/login", "/signup"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await fits(page);
    }
  }
});
