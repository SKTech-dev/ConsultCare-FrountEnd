import { test, expect } from "@playwright/test";

async function account(page, role = "admin") {
  let live;
  await page.routeWebSocket("**/api/workspace/live", (socket) => { live = socket; });
  const person = { id: "patient", name: "Test Patient", email: "patient@example.test", balance: "1500", frozen: true, environment: "sandbox" };
  const details = { person, disputes: [{ orderId: "dispute-1", amount: "1000", providerPaymentId: "TEST-PAYMENT", resolved: false }], resolutions: [], entries: [{ id: "credit", amount: "1500", kind: "refund_credit", source: "refund:booking:source", createdAt: "2026-10-16T10:00:00+05:30" }], pendingCashouts: "0", reservedPayments: "0", hasMoreEntries: false };
  const requests = [];
  const state = { role, patient: { id: "patient", name: person.name }, professionalId: null, professionals: [], patients: [], bookings: [], sessions: [], weeklyAvailability: [], onboarding: null };
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/me") return route.fulfill({ json: { data: { id: role === "admin" ? "admin" : "patient", name: "Test Account", role } } });
    if (url.pathname === "/api/workspace") return route.fulfill({ json: { data: state } });
    if (url.pathname === "/api/admin/wallet/reviews") return route.fulfill({ json: { data: { items: person.frozen || url.searchParams.get("view") === "all" ? [person] : [], count: 1, pageSize: 30 } } });
    if (url.pathname === "/api/admin/wallet/reviews/patient") return route.fulfill({ json: { data: details } });
    if (url.pathname.endsWith("/dispute-1/resolve")) {
      const body = route.request().postDataJSON(); requests.push(body);
      details.disputes[0].resolved = true; person.frozen = false;
      person.balance = String(1500 - Number(body.debit));
      details.resolutions.push({ orderId: "dispute-1", outcome: body.outcome, disputedAmount: "1000", debitedAmount: body.debit, writtenOffAmount: body.outcome === "write_off" ? String(1000 - Number(body.debit)) : "0", balanceBefore: "1500", balanceAfter: person.balance, reference: body.reference, reason: body.reason, resolvedBy: "admin", resolvedAt: "2026-10-16T11:00:00+05:30" });
      return route.fulfill({ json: { data: { frozen: false }, message: "Resolution recorded. The wallet is available again." } });
    }
    return route.fulfill({ json: { data: [] } });
  });
  return { details, requests, state, push: (snapshot) => live.send(JSON.stringify(snapshot)) };
}

for (const outcome of ["recovered", "wallet_debit", "write_off"]) {
  test("administrator records " + outcome + " resolution with evidence and confirmation", async ({ page }) => {
    const fixture = await account(page);
    await page.goto("/app/payments?tab=wallet-reviews");
    await page.getByRole("button", { name: "Review wallet", exact: true }).click();
    await expect(page.getByText("refund:booking:source", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Resolve dispute", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Resolve payment dispute", exact: true });
    await dialog.getByRole("combobox", { name: "Resolution outcome", exact: true }).selectOption(outcome);
    if (outcome === "write_off") await dialog.getByLabel("Debit from available wallet credit", { exact: true }).fill("250");
    await dialog.getByLabel("Evidence reference", { exact: true }).fill("BANK-REVIEW-001");
    await dialog.getByLabel("Reconciliation explanation", { exact: true }).fill("Reviewed provider evidence and wallet movements.");
    if (outcome === "write_off") {
      await page.setViewportSize({ width: 320, height: 780 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: "test-results/wallet-resolution-mobile.png", fullPage: true });
    }
    await dialog.getByRole("button", { name: "Review resolution", exact: true }).click();
    const confirm = page.getByRole("dialog", { name: "Record this resolution?", exact: true });
    await expect(confirm).toContainText("BANK-REVIEW-001");
    expect(fixture.requests).toHaveLength(0);
    await confirm.getByRole("button", { name: "Record resolution", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Success", exact: true })).toContainText("available again");
    await page.getByRole("button", { name: "OK", exact: true }).click();
    expect(fixture.requests).toEqual([{ outcome, debit: outcome === "wallet_debit" ? "1000" : outcome === "write_off" ? "250" : "0", expectedBalance: "1500", reference: "BANK-REVIEW-001", reason: "Reviewed provider evidence and wallet movements." }]);
    await expect(page.getByText("Resolution recorded", { exact: true })).toBeVisible();
    await expect(page.getByText("Evidence: BANK-REVIEW-001", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Resolve dispute", exact: true })).toHaveCount(0);
    if (outcome === "recovered") await page.screenshot({ path: "test-results/wallet-review-desktop.png", fullPage: true });
  });
}

test("stale wallet review retains evidence and shows the server conflict", async ({ page }) => {
  await account(page);
  await page.route("**/api/admin/wallet/reviews/patient/dispute-1/resolve", (route) => route.fulfill({ status: 409, json: { message: "The wallet changed. Refresh and review its current balance before continuing." } }));
  await page.goto("/app/payments?tab=wallet-reviews");
  await page.getByRole("button", { name: "Review wallet", exact: true }).click();
  await page.getByRole("button", { name: "Resolve dispute", exact: true }).click();
  await page.getByLabel("Evidence reference", { exact: true }).fill("BANK-001");
  await page.getByLabel("Reconciliation explanation", { exact: true }).fill("Reviewed the provider evidence.");
  await page.getByRole("button", { name: "Review resolution", exact: true }).click();
  await page.getByRole("button", { name: "Record resolution", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("The wallet changed");
  await expect(page.getByLabel("Evidence reference", { exact: true })).toHaveValue("BANK-001");
});

test("patients cannot open wallet reconciliation records", async ({ page }) => {
  await account(page, "user");
  const fetched = [];
  page.on("request", (request) => { if (request.url().includes("/admin/wallet/reviews")) fetched.push(request.url()); });
  await page.goto("/app/payments?tab=wallet-reviews");
  await expect(page.getByRole("button", { name: "Review wallet", exact: true })).toHaveCount(0);
  expect(fetched).toHaveLength(0);
});


test("an open patient wallet reflects reconciliation notifications without polling", async ({ page }) => {
  const fixture = await account(page, "user");
  let frozen = true, reads = 0;
  await page.route("**/api/wallet", (route) => { reads++; return route.fulfill({ json: { data: { balance: "1500", frozen, environment: "sandbox", entries: [], cashouts: [], hasPendingCashout: false, hasMoreCashouts: false, hasMoreEntries: false } } }); });
  await page.goto("/app/profile?tab=wallet");
  await expect(page.getByRole("alert")).toContainText("paused for administrator review");
  frozen = false;
  fixture.push({ ...fixture.state, notificationSummary: { unreadCount: 1, latest: [{ id: "resolved", kind: "wallet.review_resolved", title: "Wallet review updated", body: "Wallet spending is available again.", createdAt: "2026-10-16T11:00:00+05:30", link: "/app/profile?tab=wallet" }] } });
  await expect(page.getByText("Wallet spending and cash-out are paused for administrator review.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Request full-balance cash-out", exact: true })).toBeVisible();
  expect(reads).toBe(2);
});
