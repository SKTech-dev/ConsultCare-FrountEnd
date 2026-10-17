import { test, expect } from "@playwright/test";

const counsellor = { id: "counsellor", name: "Counsellor Alex", role: "counsellor", status: "verified", speciality: "Relationships", registration: "MEM-1", qualifications: "Diploma in counselling", languages: ["English"], fee: 2500 };
async function account(page, role) {
  const state = { role, professionalId: role === "counsellor" ? counsellor.id : null, professionals: [counsellor], patient: { id: "client", name: "Client" }, patients: [], sessions: [], bookings: [], weeklyAvailability: [], onboarding: null, familyProfessionalIds: [] };
  await page.routeWebSocket("**/api/workspace/live", () => {});
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { data: { id: role, name: role, role } } });
    if (path === "/api/workspace") return route.fulfill({ json: { data: state } });
    return route.fulfill({ json: { data: { items: [], count: 0, pageSize: 30 } } });
  });
}

test("signup has a counsellor role dropdown and landing page has counselling guidance", async ({ page }) => {
  await page.route("**/api/auth/me", route => route.fulfill({ status: 401, json: { message: "Sign in" } }));
  await page.route("**/api/auth/providers", route => route.fulfill({ json: { data: { googleEnabled: false } } }));
  await page.goto("/signup");
  await page.getByRole("combobox", { name: "I am joining as" }).selectOption("counsellor");
  await expect(page.getByRole("combobox", { name: "I am joining as" })).toHaveValue("counsellor");
  await expect(page.getByText("Your professional credentials must be verified", { exact: false })).toBeVisible();
  await page.goto("/");
  await page.getByRole("button", { name: "Counselling consultation", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Before you speak with a counsellor" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore counselling consultations" })).toHaveAttribute("href", "/consult/counsellors");
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("clients have a dedicated counsellor directory", async ({ page }) => {
  await account(page, "user");
  await page.goto("/consult/counsellors");
  await expect(page.getByRole("heading", { name: "Find your counsellor." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Counsellor Alex" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Find a counsellor", exact: true })).toBeVisible();
});

test("admin has a separate counsellor verification tab", async ({ page }) => {
  await account(page, "admin");
  await page.goto("/app/admin");
  await page.getByRole("tab", { name: "Counsellor verification", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Counsellor verification" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Counsellor Alex" })).toBeVisible();
});
