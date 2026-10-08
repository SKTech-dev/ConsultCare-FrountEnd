import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

const fixture = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE, "utf8"));

async function externalGoogleFixture(context) {
  // Only Google's external UI is replaced. All ConsultCare API requests are real.
  // The API verifies a signed token against the local provider's test certificate.
  await context.route("https://accounts.google.com/gsi/client", async (route) => {
    const response = await context.request.get(fixture.providerUrl + "/google/script");
    await route.fulfill({ response });
  });
}

async function login(page, email) {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/app/);
  await expect(page.locator(".ws-main")).toBeVisible();
}

async function csrf(context) {
  const cookie = (await context.cookies()).find((item) => item.name === "cc_csrf");
  return { "x-csrf-token": cookie?.value || "", origin: process.env.E2E_UI_ORIGIN };
}

async function createPatient(page, suffix) {
  const email = `patient.${suffix}@e2e.example`;
  await page.goto("/signup");
  await page.getByLabel("Full name", { exact: true }).fill(`E2E Patient ${suffix}`);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByLabel("Confirm password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("link", { name: "Continue to login" })).toBeVisible();
  await login(page, email);
  // Onboarding redirects to the real profile form.
  await expect(page).toHaveURL(/\/app\/profile/);
  if (await page.getByRole("dialog").count()) await page.getByRole("dialog").getByRole("button").last().click();
  await page.getByLabel("Date of birth", { exact: true }).fill("1990-01-01");
  await page.getByLabel("Contact number", { exact: true }).fill("0711111111");
  await page.getByLabel("Billing address", { exact: true }).fill("12 Test Road");
  await page.getByLabel("City", { exact: true }).fill("Colombo");
  const saved = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/profile" && response.request().method() === "PUT");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button").last().click();
}

async function reserve(page) {
  await page.goto(`/app/professionals/${fixture.doctorId}?tab=book`);
  await page.getByRole("combobox", { name: "Available sessions", exact: true }).selectOption(fixture.sessionId);
  await page.getByRole("button", { name: "Confirm booking & continue", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/booking\//);
  await page.getByRole("dialog").getByRole("button", { name: "OK", exact: true }).click();
  return new URL(page.url()).pathname.split("/").at(-1);
}

test("real registration, booking, signed payment, consultation, correction, PDF and Uber link", async ({ page, context, browser }) => {
  await externalGoogleFixture(context);
  await createPatient(page, "consultation");
  const bid = await reserve(page);
  await page.getByRole("button", { name: /Pay with PayHere/ }).click();
  await expect(page.getByRole("heading", { name: "Local payment-provider fixture" })).toBeVisible();
  await page.getByRole("link", { name: "Complete test payment", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/bookings/);

  const doctor = await browser.newContext({ baseURL: process.env.E2E_UI_ORIGIN });
  await externalGoogleFixture(doctor);
  try {
    const doctorPage = await doctor.newPage();
    await login(doctorPage, "doctor@e2e.example");
    await doctorPage.goto("/app/queue");
    await doctorPage.getByRole("button", { name: "Call next", exact: true }).first().click();
    await expect(doctorPage).toHaveURL(new RegExp(`/app/room/${bid}`));
    await doctorPage.getByRole("dialog").getByRole("button", { name: "OK", exact: true }).click();
    await doctorPage.getByRole("tab", { name: "Prescription", exact: true }).click();
    await doctorPage.getByRole("textbox", { name: "Prescription", exact: true }).fill("Original E2E medicine instructions");
    await doctorPage.getByRole("button", { name: "Send prescription", exact: true }).click();
    await expect(doctorPage.getByText("Original E2E medicine instructions", { exact: true })).toBeVisible();
    await doctorPage.getByRole("button", { name: "Complete consultation", exact: true }).click();
    await doctorPage.getByRole("dialog").getByRole("button", { name: "Complete", exact: true }).click();
    await expect(doctorPage).toHaveURL(new RegExp(`/app/booking/${bid}`));
    await doctorPage.goto(`/app/booking/${bid}?tab=prescription`);
    await doctorPage.getByRole("button", { name: "Update prescription", exact: true }).click();
    await doctorPage.getByRole("textbox", { name: "Prescription", exact: true }).fill("Corrected E2E medicine instructions");
    await doctorPage.getByLabel("Correction reason", { exact: true }).fill("Correct the medicine instructions");
    await doctorPage.getByRole("button", { name: "Send updated prescription", exact: true }).click();
    await expect(doctorPage.getByText("Corrected E2E medicine instructions", { exact: true })).toBeVisible();
    await page.goto(`/app/booking/${bid}?tab=prescription`);
    await expect(page.getByText("Corrected E2E medicine instructions", { exact: true })).toBeVisible();
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download current PDF", exact: true }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe(`prescription-${bid}.pdf`);
    const bytes = readFileSync(await download.path());
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    await expect(page.getByRole("link", { name: "Open Uber", exact: true })).toHaveAttribute("href", "https://m.uber.com/looking");
    await expect(page.getByRole("link", { name: "Open Uber", exact: true })).toHaveAttribute("referrerpolicy", "no-referrer");
  } finally { await doctor.close(); }
});

test("missing callback is recovered against the provider and cannot duplicate payment", async ({ page, context }) => {
  await externalGoogleFixture(context);
  await createPatient(page, "recovery");
  const bid = await reserve(page);
  await page.getByRole("button", { name: /Pay with PayHere/ }).click();
  await page.getByRole("link", { name: "Complete without callback", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/app/booking/${bid}`));
  await page.getByRole("button", { name: "Check payment with PayHere", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/bookings/);
  const repeated = await context.request.post(`/api/bookings/${bid}/reconcile-payment`, { headers: await csrf(context) });
  expect(repeated.status()).toBe(200);
  const state = (await (await context.request.get("/api/workspace")).json()).data;
  const booking = state.bookings.find((row) => row.id === bid);
  expect(booking.payment).toBe("paid");
  expect(["WAITING", "NEXT"]).toContain(booking.status);
  const wallet = (await (await context.request.get("/api/wallet")).json()).data;
  expect(Number(wallet.balance)).toBe(0);
});

test("Google signup verifies a signed provider token and leaves the doctor pending approval", async ({ page, context }) => {
  await externalGoogleFixture(context);
  await page.goto("/signup");
  await page.getByRole("radio", { name: "Doctor", exact: true }).check();
  await page.getByRole("button", { name: "Sign in with Google", exact: true }).click();
  await expect(page).toHaveURL(/\/app/);
  const session = await context.request.get("/api/auth/me");
  expect(session.status()).toBe(200);
  const user = (await session.json()).data;
  expect(user.email).toBe("google.doctor@gmail.com");
  expect(user.role).toBe("doctor");
  expect(user.verificationStatus).toBe("pending");
  const unauthorized = await context.request.post("/api/sessions", { headers: await csrf(context), data: { date: "2026-11-01", start: "10:00", end: "11:00", capacity: 1 } });
  expect(unauthorized.status()).toBe(403);
  // Sign-in must reuse the same account and its server-owned role without
  // requiring the password fields or asking the user to select a role again.
  const logout = await context.request.post("/api/auth/logout", { headers: await csrf(context) });
  expect(logout.status()).toBe(200);
  await page.goto("/login");
  await page.setViewportSize({ width: 320, height: 800 });
  const google = page.getByRole("button", { name: "Sign in with Google", exact: true });
  await expect(google).toBeVisible();
  await expect(page.getByText("or sign in with email", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  expect((await google.boundingBox()).y).toBeLessThan((await page.getByLabel("Email address", { exact: true }).boundingBox()).y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await google.click();
  await expect(page).toHaveURL(/\/app/);
  const signedIn = (await (await context.request.get("/api/auth/me")).json()).data;
  expect(signedIn.id).toBe(user.id);
  expect(signedIn.role).toBe("doctor");
  expect(signedIn.verificationStatus).toBe("pending");
});
