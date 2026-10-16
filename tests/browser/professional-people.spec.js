import { test, expect } from "@playwright/test";

const longName = "Alexandra Jayawardene Wickramasinghe";
async function setup(page, role = "doctor") {
  const professional = { id: "professional", name: "Test Professional", role, status: "verified", speciality: role === "lawyer" ? "Family law" : "General practice", registration: "REG-1", qualifications: "Test qualification", languages: ["English"] };
  const people = Array.from({ length: 32 }, (_, index) => ({ id: "person" + index, name: index ? "Patient " + String(index).padStart(2, "0") : longName, email: index ? "patient" + index + "@example.test" : "alexandra.long.email.address@example.test", latestDate: "2026-10-16", consultationCount: index ? 1 : 35 }));
  const records = Array.from({ length: 35 }, (_, index) => ({ id: "record" + index, patientId: "person0", professionalId: "professional", sessionId: "session" + index, patientName: longName, status: index === 1 ? "CANCELLED" : index === 2 ? "NO-SHOW" : "COMPLETED", date: index ? "2026-10-15" : "2026-10-16", start: "10:00", end: "11:00", type: index % 2 ? "appointment" : "weekly", fee: 2500, payment: "paid", files: [], messages: [], notes: "Shared consultation note", privateNotes: "Professional note", followUp: "Review if needed" }));
  const sessions = records.map((booking) => ({ id: booking.sessionId, professionalId: "professional", date: booking.date, start: booking.start, end: booking.end, capacity: 10 }));
  const state = { role, professionalId: role === "doctor" || role === "lawyer" ? "professional" : null, professionals: [professional], patient: { id: "patient", name: "Patient" }, patients: [], bookings: records, sessions, weeklyAvailability: [], onboarding: null };
  await page.routeWebSocket("**/api/workspace/live", () => {});
  const requests = [];
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/me") return route.fulfill({ json: { data: { ...professional, role } } });
    if (url.pathname === "/api/workspace") return route.fulfill({ json: { data: state } });
    if (url.pathname === "/api/professional/people") {
      requests.push(Object.fromEntries(url.searchParams));
      const q = (url.searchParams.get("q") || "").trim().toLowerCase(), pageNumber = Number(url.searchParams.get("page") || 1);
      const matches = people.filter((person) => person.name.toLowerCase().includes(q) || person.email.toLowerCase().includes(q));
      return route.fulfill({ json: { data: { items: matches.slice((pageNumber - 1) * 30, pageNumber * 30), count: matches.length, page: pageNumber, pageSize: 30 } } });
    }
    if (url.pathname.startsWith("/api/professional/people/") && url.pathname.endsWith("/consultations")) {
      const personId = url.pathname.split("/")[4], person = people.find((item) => item.id === personId);
      if (!person) return route.fulfill({ status: 404, json: { message: "Patient or client records not found." } });
      const pageNumber = Number(url.searchParams.get("page") || 1);
      return route.fulfill({ json: { data: { person, items: records.slice((pageNumber - 1) * 30, pageNumber * 30), count: records.length, page: pageNumber, pageSize: 30 } } });
    }
    return route.fulfill({ status: 404, json: { message: "Unavailable in this test" } });
  });
  return { requests };
}

for (const role of ["doctor", "lawyer"]) {
  test(role + " can browse all people, search and open consultation records with return context", async ({ page }, testInfo) => {
    const { requests } = await setup(page, role);
    const noun = role === "lawyer" ? "clients" : "patients";
    await page.goto("/app/people");
    await expect(page.getByRole("heading", { name: "My " + noun + ".", exact: true })).toBeVisible();
    await expect(page.getByRole("table", { name: "Your " + noun }).getByRole("row")).toHaveCount(31);
    await page.getByRole("navigation", { name: "Your " + noun + " pages" }).getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(3);
    await page.getByLabel("Search " + noun + " by name or email").fill("Alexandra");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect.poll(() => requests.at(-1)).toEqual({ page: "1", q: "Alexandra" });
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
    await page.getByRole("link", { name: "View consultations for " + longName }).click();
    await expect(page.getByRole("heading", { name: longName, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "My " + noun, exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".ws-status").filter({ hasText: /^CANCELLED$/ })).toBeVisible();
    await expect(page.locator(".ws-status").filter({ hasText: /^NO-SHOW$/ })).toBeVisible();
    await page.getByRole("navigation", { name: "Consultation record pages" }).getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("link", { name: "View details", exact: true })).toHaveCount(5);
    await page.getByRole("link", { name: "View details", exact: true }).first().click();
    await expect(page.getByText("YOUR CONSULTATION SPACE", { exact: true })).toBeVisible();
    const back = page.getByRole("link", { name: role === "lawyer" ? "Back to client records" : "Back to patient records", exact: false });
    await expect(back).toBeVisible();
    await page.reload();
    await back.click();
    await expect(page).toHaveURL((url) => url.pathname === "/app/people/person0" && url.searchParams.get("page") === "2" && url.searchParams.get("q") === "Alexandra");
    await expect(page.getByRole("link", { name: "View details", exact: true })).toHaveCount(5);
    await page.getByRole("link", { name: "Back to my " + noun, exact: false }).click();
    await expect(page.getByLabel("Search " + noun + " by name or email")).toHaveValue("Alexandra");
    await page.getByLabel("Search " + noun + " by name or email").fill("ALEXANDRA.LONG.EMAIL.ADDRESS@EXAMPLE.TEST");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(31);
    await page.setViewportSize({ width: 320, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("my-" + noun + "-mobile.png"), fullPage: true });
  });
}

test("patient table handles no matches, denied records and failed requests", async ({ page }) => {
  await setup(page);
  await page.goto("/app/people?q=missing");
  await expect(page.getByRole("heading", { name: "No matching patients", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(31);
  let failed = true;
  await page.route("**/api/professional/people?*", (route) => failed ? route.fulfill({ status: 503, json: { message: "Records temporarily unavailable" } }) : route.fallback());
  await page.reload();
  await expect(page.getByRole("dialog")).toContainText("Records temporarily unavailable");
  await page.getByRole("button", { name: "OK", exact: true }).click();
  failed = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(31);
  await page.goto("/app/people/unrelated");
  await expect(page.getByRole("dialog")).toContainText("Patient or client records not found.");
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("non-professional accounts do not show or fetch the patient directory", async ({ page }) => {
  const { requests } = await setup(page, "user");
  await page.goto("/app/people");
  await expect(page.getByRole("heading", { name: "Professional records", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "My patients", exact: true })).toHaveCount(0);
  expect(requests).toHaveLength(0);
});
