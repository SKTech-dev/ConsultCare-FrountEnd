import { test, expect } from "@playwright/test";

async function setup(page, { role = "user", appointment = false, pending = false, wallet = 5000 } = {}) {
  await page.clock.setFixedTime(new Date("2026-10-06T10:30:00+05:30"));
  const professional = { id: "doc", name: "Dr Test", role: "doctor", status: "verified", fee: 5000, speciality: "General", languages: ["English"] };
  const patient = { id: "patient", name: "Patient", status: "active", address: "12 Test Road", city: "Colombo" };
  const booking = { id: "booking", professionalId: "doc", patientId: "patient", patientName: "Patient", sessionId: "session", status: pending ? "PAYMENT PENDING" : "IN CONSULTATION", payment: pending ? "unpaid" : "paid", fee: 5000, scheduledById: appointment ? "doc" : null, acceptedAt: pending ? null : "2026-10-06T00:00:00Z", files: [], messages: [], patientContext: { profession: "doctor" }, notesRevision: 0, ringAt: pending ? null : "2026-10-06T05:00:00Z" };
  const state = { role, professionalId: role === "doctor" ? "doc" : null, patient, professionals: [professional], patients: [patient], bookings: [booking], sessions: [{ id: "session", professionalId: "doc", date: "2026-10-06", start: "10:00", end: "11:00", online: true, capacity: 10 }], onboarding: null, weeklyAvailability: [], payhereEnabled: true };
  const calls = [];
  let stream;
  await page.routeWebSocket("**/api/workspace/live", (socket) => { stream = socket; });
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: { data: { id: role === "doctor" ? "doc" : "patient", role, name: "Test" } } });
    if (path === "/api/workspace") return route.fulfill({ json: { data: state } });
    if (path.endsWith("/payhere-checkout")) {
      if (route.request().method() === "GET") return route.fulfill({ json: { data: { total: "5000.00", walletUsed: wallet.toFixed(2), payhereAmount: (5000 - wallet).toFixed(2), balance: wallet.toFixed(2), frozen: false } } });
      calls.push(route.request().postDataJSON());
      return route.fulfill({ json: { data: { paid: true } } });
    }
    if (path.endsWith("/room-presence")) {
      calls.push("presence");
      if (role === "user") { booking.patientJoinedAt = "2026-10-06T05:00:00Z"; booking.ringAt = null; }
      return route.fulfill({ json: { data: { status: "IN CONSULTATION" } } });
    }
    if (path.endsWith("/ring")) { calls.push("ring"); return route.fulfill({ json: { message: "Ringing" } }); }
    return route.fulfill({ json: { data: { items: [], count: 0, pageSize: 30 } } });
  });
  return { calls, state, push: () => stream.send(JSON.stringify(state)) };
}

test("wallet-only payment asks before charging and submits the expected amount", async ({ page }) => {
  const { calls } = await setup(page, { pending: true });
  await page.goto("/app/booking/booking");
  await page.getByRole("button", { name: "Pay from wallet · LKR 5000.00" }).click();
  await expect(page.getByRole("dialog")).toContainText("Pay entirely from your wallet?");
  expect(calls).toHaveLength(0);
  await page.getByRole("button", { name: "Confirm wallet payment" }).click();
  await expect.poll(() => calls.length).toBe(1);
  expect(calls[0].expectedPayhereAmount).toBe("0.00");
  await expect(page.getByRole("dialog")).toContainText("Payment completed using your wallet credit");
});

test("split payment shows only the provider balance on its payment button", async ({ page }) => {
  await setup(page, { pending: true, wallet: 2000 });
  await page.goto("/app/booking/booking");
  await expect(page.getByRole("button", { name: "Pay with PayHere · LKR 3000.00" })).toBeVisible();
  await expect(page.getByText("Total: LKR 5000.00 · Wallet: LKR 2000.00 · PayHere: LKR 3000.00")).toBeVisible();
});

test("individual appointment room excludes queue controls and supports repeated ringing", async ({ page }) => {
  const { calls } = await setup(page, { role: "doctor", appointment: true });
  await page.goto("/app/room/booking");
  await expect(page.getByRole("button", { name: "Complete & call next" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Patient late · move to end" })).toHaveCount(0);
  await page.getByRole("button", { name: "Ring patient again" }).click();
  await expect.poll(() => calls.filter((call) => call === "ring").length).toBe(1);
});

test("queue room offers late attendance handling", async ({ page }) => {
  await setup(page, { role: "doctor" });
  await page.goto("/app/room/booking");
  const actions = page.getByRole("region", { name: "Professional consultation actions" });
  await expect(actions.getByRole("button", { name: "Patient late · move to end" })).toBeVisible();
  await expect(actions.getByRole("button", { name: "Ring patient again" })).toBeVisible();
  await expect(page.getByText("If the patient does not answer within two minutes", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Complete & call next" })).toBeVisible();
});

test("joining the call confirms attendance even if video connection fails", async ({ page }) => {
  const { calls } = await setup(page);
  await page.route("**/api/bookings/booking/video", (route) => {
    calls.push("video");
    return route.fulfill({ status: 503, json: { message: "Video temporarily unavailable" } });
  });
  await page.goto("/app/room/booking");
  await expect(page.getByRole("button", { name: /I'm here/ })).toHaveCount(0);
  expect(calls).not.toContain("presence");
  await page.getByRole("button", { name: "Join video call", exact: true }).click();
  await expect.poll(() => calls).toEqual(["presence", "video"]);
  await expect(page.getByRole("button", { name: "Silence ringtone" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toContainText("Video temporarily unavailable");
});

test("professional can edit each offered time without clearing earlier options", async ({ page }) => {
  await setup(page, { role: "doctor", pending: true });
  await page.goto("/app/sessions?tab=appointment");
  await page.getByLabel("Start time", { exact: true }).fill("12:00");
  await page.getByLabel("End time", { exact: true }).fill("12:30");
  await page.getByRole("button", { name: "+ Add another time option" }).click();
  await expect(page.getByLabel("Start time", { exact: true })).toHaveCount(2);
  await expect(page.getByLabel("Start time", { exact: true }).first()).toHaveValue("12:00");
  await expect(page.getByRole("heading", { name: "Time option 2" })).toBeVisible();
  await page.screenshot({ path: "test-results/appointment-time-editor.png", fullPage: true });
});

test("patient selects an available time card before continuing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, { pending: true });
  await page.route("**/api/appointment-offers", (route) => route.fulfill({ json: { data: [{ id: "offer", professionalName: "Dr Test", fee: "5000", status: "open", options: [{ id: "first", date: "2026-10-07", start: "12:00", end: "12:30", available: true }, { id: "second", date: "2026-10-08", start: "14:00", end: "14:30", available: true }] }] } }));
  await page.goto("/app/bookings?tab=offers");
  const next = page.getByRole("button", { name: "Choose time & continue to payment" });
  await expect(next).toBeDisabled();
  await page.getByRole("radio").last().check();
  await expect(next).toBeEnabled();
  await expect(page.locator(".appointment-choice.selected")).toContainText("8 October 2026");
  await expect(page.locator(".appointment-choice.selected")).toContainText("Selected");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/patient-time-choices.png", fullPage: true });
});

test("patient can find expired invitations instead of losing them from the list", async ({ page }) => {
  await setup(page, { pending: true });
  await page.route("**/api/appointment-offers", (route) => route.fulfill({ json: { data: [{ id: "expired", professionalName: "Dr Test", fee: "5000", status: "expired", options: [{ id: "old", date: "2026-10-08", start: "00:00", end: "00:05", available: false }] }] } }));
  await page.goto("/app/bookings?tab=offers");
  await page.getByLabel("Invitation view").selectOption("history");
  await expect(page.getByText("These times passed before a selection was made.", { exact: false })).toBeVisible();
  await expect(page.getByText("2026-10-08 · 00:00–00:05")).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose time & continue to payment" })).toHaveCount(0);
});

test("professional queue has no view filter and invitations remain accessible in history", async ({ page }) => {
  await setup(page, { role: "doctor" });
  await page.route("**/api/appointment-offers", (route) => route.fulfill({ json: { data: [{ id: "expired", professionalName: "Dr Test", patientName: "Patient", fee: "5000", status: "expired", options: [{ id: "old", date: "2026-10-08", start: "00:00", end: "00:05", available: false }] }] } }));
  await page.goto("/app/queue?tab=appointments");
  await expect(page.getByLabel("Appointment view")).toHaveCount(0);
  await page.goto("/app/history?tab=sessions");
  await expect(page.getByRole("heading", { name: "Past appointment invitations" })).toBeVisible();
  await expect(page.getByText("2026-10-08 · 00:00–00:05")).toBeVisible();
});

test("video module failure offers a reload without exposing an import URL", async ({ page }) => {
  await setup(page);
  await page.route("**/api/bookings/booking/video", (route) => route.fulfill({ json: { data: { url: "https://example.daily.co/test", token: "test" } } }));
  await page.route(/\/assets\/daily-esm[^/]*\.js/, (route) => route.abort());
  await page.goto("/app/room/booking");
  await page.getByRole("button", { name: "Join video call", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("The video module could not load.");
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reload room" })).toBeVisible();
});

test("ringtone expires after two minutes and stops immediately on rescheduling", async ({ page }) => {
  await page.addInitScript(() => {
    window.toneCount = 0;
    window.ringtoneGesture = false;
    document.addEventListener("pointerdown", () => { window.ringtoneGesture = true; }, true);
    window.AudioContext = class {
      state = "suspended"; currentTime = 0; destination = {};
      resume() { if (window.ringtoneGesture) this.state = "running"; return Promise.resolve(); }
      close() { return Promise.resolve(); }
      createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
      createOscillator() { return { frequency: {}, connect() {}, disconnect() {}, start() { window.toneCount++; }, stop() {} }; }
    };
  });
  const { state, push } = await setup(page);
  await page.goto("/app/room/booking");
  await page.getByRole("button", { name: "Enable ringtone" }).click();
  await expect.poll(() => page.evaluate(() => window.toneCount)).toBeGreaterThan(0);
  await page.clock.setFixedTime(new Date("2026-10-06T10:32:01+05:30"));
  const before = await page.evaluate(() => window.toneCount);
  await page.waitForTimeout(2700);
  expect(await page.evaluate(() => window.toneCount)).toBe(before);
  state.bookings[0].ringAt = "2026-10-06T05:02:01Z";
  push();
  await expect.poll(() => page.evaluate(() => window.toneCount)).toBeGreaterThan(before);
  state.bookings[0].status = "WAITING";
  push();
  await expect(page.getByRole("button", { name: "Silence ringtone" })).toHaveCount(0);
  const stopped = await page.evaluate(() => window.toneCount);
  await page.waitForTimeout(2700);
  expect(await page.evaluate(() => window.toneCount)).toBe(stopped);
});

test("Chrome generates an audio signal when an enabled patient receives a call", async ({ page }) => {
  await page.addInitScript(() => {
    const Audio = window.AudioContext;
    window.AudioContext = class extends Audio {
      constructor(...args) {
        super(...args);
        window.ringtoneContext = this;
        window.ringtoneAnalyser = this.createAnalyser();
      }
      createGain() {
        const gain = super.createGain();
        gain.connect(window.ringtoneAnalyser);
        return gain;
      }
    };
    window.ringtoneLevel = () => {
      const samples = new Float32Array(window.ringtoneAnalyser.fftSize);
      window.ringtoneAnalyser.getFloatTimeDomainData(samples);
      return Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
    };
  });
  const { state, push } = await setup(page, { pending: true });
  await page.goto("/app/bookings");
  // A real gesture unlocks Chrome audio before the professional rings.
  await page.getByRole("heading", { name: "Your consultations." }).click();
  await expect.poll(() => page.evaluate(() => window.ringtoneContext.state)).toBe("running");
  state.bookings[0].status = "IN CONSULTATION";
  state.bookings[0].ringAt = "2026-10-06T05:00:00Z";
  push();
  await expect.poll(() => page.evaluate(() => window.ringtoneLevel()), { intervals: [50, 100, 100, 100], timeout: 5000 }).toBeGreaterThan(0.03);
  await page.getByRole("button", { name: "Silence ringtone" }).click();
  await expect.poll(() => page.evaluate(() => window.ringtoneLevel())).toBeLessThan(0.001);
  state.bookings[0].ringAt = "2026-10-06T05:00:01Z";
  push();
  await expect.poll(() => page.evaluate(() => window.ringtoneLevel()), { intervals: [50, 100, 100], timeout: 5000 }).toBeGreaterThan(0.03);
  state.bookings[0].status = "COMPLETED";
  push();
  await expect.poll(() => page.evaluate(() => window.ringtoneLevel())).toBeLessThan(0.001);
});
