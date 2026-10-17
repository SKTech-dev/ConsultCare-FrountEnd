import { test, expect } from "@playwright/test";

async function pendingLogin(page, google = false) {
  if (google) await page.addInitScript(() => {
    let callback;
    window.google = { accounts: { id: {
      initialize: (options) => { callback = options.callback; },
      renderButton: (holder) => { const button = document.createElement("button"); button.type = "button"; button.textContent = "Sign in with Google"; button.onclick = () => callback({ credential: "signed-test-token" }); holder.append(button); },
    } } };
  });
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/me") return route.fulfill({ status: 401, json: { message: "Sign in" } });
    if (pathname === "/api/auth/providers") return route.fulfill({ json: { data: { google } } });
    if (pathname === "/api/auth/google/challenge") return route.fulfill({ json: { data: { clientId: "test-client", nonce: "nonce" } } });
    if (["/api/auth/login", "/api/auth/google"].includes(pathname)) return route.fulfill({ json: { requiresSessionReplacement: true, confirmationToken: "opaque-proof" } });
    if (pathname === "/api/auth/cancel-login") return route.fulfill({ json: { message: "Cancelled" } });
    return route.fulfill({ status: 404, json: { message: "Unexpected request" } });
  });
  await page.goto("/login");
  if (google) await page.getByRole("button", { name: "Sign in with Google", exact: true }).click();
  else {
    await page.getByLabel("Email address", { exact: true }).fill("patient@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Valid-password-123");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
  }
  await expect(page.getByRole("dialog", { name: "Already signed in" })).toBeVisible();
}

for (const google of [false, true]) test((google ? "Google" : "password") + " login asks before replacement and supports cancellation", async ({ page }) => {
  await pendingLogin(page, google);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  const cancel = page.waitForRequest("**/api/auth/cancel-login");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await cancel).postDataJSON()).toEqual({ token: "opaque-proof" });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeEnabled();
  if (google) await expect(page.getByRole("button", { name: "Sign in with Google", exact: true })).toBeVisible();
});

for (const status of [401, 409]) test("replacement error " + status + " returns to a usable login form", async ({ page }) => {
  await pendingLogin(page);
  await page.route("**/api/auth/replace-session", (route) => route.fulfill({ status, json: { message: "Please sign in again to review the current session." } }));
  await page.getByRole("button", { name: "Sign out there & continue", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Please sign in again");
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
