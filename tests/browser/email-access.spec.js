import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/me", (route) => route.fulfill({ status: 401, json: { message: "Please sign in." } }));
});

test("verification waits for confirmation and keeps token out of the URL", async ({ page }) => {
  let submitted = null;
  await page.route("**/api/auth/verify-email", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ json: { message: "Email verified. You can now sign in." } });
  });
  await page.goto("/verify-email#token=test-token");
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
  await expect(page).toHaveURL(/\/verify-email$/);
  expect(submitted).toBeNull();
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Email verified. You can now sign in.");
  expect(submitted).toEqual({ token: "test-token" });
});

test("forgot password submits email and displays the generic response", async ({ page }) => {
  await page.route("**/api/auth/forgot-password", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ email: "patient@example.com" });
    await route.fulfill({ json: { message: "If an eligible account exists, an email will arrive shortly." } });
  });
  await page.goto("/forgot-password");
  await page.getByLabel("Email address", { exact: true }).fill("patient@example.com");
  await page.getByRole("button", { name: "Send email" }).click();
  await expect(page.getByRole("status")).toContainText("If an eligible account exists");
});

test("reset validates confirmation and submits the new password", async ({ page }) => {
  let submitted = null;
  await page.route("**/api/auth/reset-password", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ json: { message: "Password updated. Please sign in with your new password." } });
  });
  await page.goto("/reset-password#token=test-token");
  await page.getByLabel("New password", { exact: true }).fill("New-password-2026");
  await page.getByLabel("Confirm password", { exact: true }).fill("Other-password-2026");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("alert")).toContainText("passwords do not match");
  expect(submitted).toBeNull();
  await page.getByLabel("Confirm password", { exact: true }).fill("New-password-2026");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("status")).toContainText("Password updated");
  expect(submitted).toEqual({ token: "test-token", password: "New-password-2026" });
});
