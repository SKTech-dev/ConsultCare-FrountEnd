import { test, expect } from "@playwright/test";

const cashout = { id: "cashout", patientId: "patient", environment: "sandbox", amount: "7000", status: "pending", bank: "Test Bank", branch: "Test Branch", accountName: "Test Patient", accountNumber: "123456789", reason: "", hasProof: false };

async function account(page, role = "user") {
  const workspace = { role, professionalId: null, patient: { id: "patient", name: "Test Patient", email: "patient@example.test", dob: "2000-01-01", phone: "0771234567", status: "active" }, professionals: [], patients: [], sessions: [], bookings: [], weeklyAvailability: [], onboarding: null };
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { data: { id: role === "admin" ? "admin" : "patient", role, name: "Test Patient" } } });
    if (path === "/api/workspace") return route.fulfill({ json: { data: workspace } });
    if (path === "/api/wallet") return route.fulfill({ json: { data: { balance: "7000", environment: "sandbox", frozen: false, cashouts: [], entries: [] } } });
    if (path === "/api/admin/wallet/cashouts") return route.fulfill({ json: { data: [cashout] } });
    if (path === "/api/notifications") return route.fulfill({ json: { data: { items: [], count: 0, pageSize: 30, unread: 0 } } });
    return route.fulfill({ status: 404, json: { message: "Offline test endpoint unavailable." } });
  });
  await page.routeWebSocket("**/api/workspace/live", (socket) => socket.send(JSON.stringify(workspace)));
}

test("patient wallet tab shows available credit and an explicit sandbox notice", async ({ page }) => {
  await account(page);
  await page.goto("/app/profile?tab=wallet");
  await expect(page.getByRole("tab", { name: "Refund wallet" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Available credit: LKR 7,000" })).toBeVisible();
  await expect(page.getByText("Sandbox wallet:", { exact: false })).toBeVisible();
});

test("cash-out request sends bank details, not a client-selected amount", async ({ page }) => {
  await account(page);
  let submitted;
  await page.route("**/api/wallet/cashouts", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ json: { data: cashout, message: "Your entire available balance is reserved." } });
  });
  await page.goto("/app/profile?tab=wallet");
  await page.getByLabel("Bank *", { exact: true }).fill("Test Bank");
  await page.getByLabel("Branch *", { exact: true }).fill("Test Branch");
  await page.getByLabel("Account holder *", { exact: true }).fill("Test Patient");
  await page.getByLabel("Account number *", { exact: true }).fill("123456789");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Request full-balance cash-out" }).click();
  await expect.poll(() => submitted).toEqual({ bank: "Test Bank", branch: "Test Branch", accountName: "Test Patient", accountNumber: "123456789", reason: "" });
  await expect(page.getByRole("dialog")).toContainText("entire available balance is reserved");
});

test("administrator records a reference and proof, not a payment-provider transfer", async ({ page }) => {
  await account(page, "admin");
  let submitted;
  await page.route("**/api/admin/wallet/cashouts/cashout/paid", (route) => {
    submitted = route.request().postData();
    return route.fulfill({ json: { message: "Manual bank payment recorded. The app has not transferred money." } });
  });
  await page.goto("/app/payments?tab=cashouts");
  await page.getByRole("button", { name: "Review cash-out" }).click();
  await page.getByLabel("Bank transfer reference *", { exact: true }).fill("BANK-TEST-001");
  await page.getByLabel("Payment proof", { exact: false }).setInputFiles({ name: "proof.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 offline-test") });
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Record manual payment" }).click();
  await expect.poll(() => submitted).toContain("BANK-TEST-001");
  expect(submitted).toContain("proof.pdf");
  await expect(page.getByRole("dialog")).toContainText("has not transferred money");
});
