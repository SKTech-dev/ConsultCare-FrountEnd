import test from "node:test";
import assert from "node:assert/strict";
import { calendarWeeks, daySummary, historyCalendarUrl, historyContext, shiftMonth, validDate, validMonth } from "../src/features/consultations/calendar.js";

test("calendar grids include every day, with Monday alignment and leap years", () => {
  const days = Array.from({ length: 29 }, (_, index) => ({ date: "2024-02-" + String(index + 1).padStart(2, "0") }));
  const weeks = calendarWeeks("2024-02", days);
  assert.equal(weeks[0][3].date, "2024-02-01");
  assert.equal(weeks.flat().filter(Boolean).length, 29);
  assert.equal(weeks.at(-1)[3].date, "2024-02-29");
  assert.equal(weeks.flat().length % 7, 0);
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
});

test("history navigation restores tab, month and date and rejects unsafe context", () => {
  assert.equal(historyCalendarUrl("appointments", "2026-09", "2026-09-12"), "/app/history?tab=appointments&month=2026-09&date=2026-09-12");
  assert.equal(historyContext(new URLSearchParams("history=weekly&date=2026-09-12&month=2026-09")).dayUrl, "/app/history/weekly/2026-09-12?month=2026-09");
  assert.equal(historyContext(new URLSearchParams("history=https://example.com&date=2026-09-12")), null);
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validMonth("2026-13"), false);
  assert.equal(validMonth("0000-01"), false);
  assert.equal(daySummary("weekly", { records: 0 }), "No records");
  assert.equal(daySummary("appointments", { records: 1, invitations: 1 }), "1 unselected invitation");
});
