import test from "node:test";
import assert from "node:assert/strict";
import { ageLabel, matchesLanguage, validPhone } from "../src/features/consultations/presentation.js";

test("language matching tolerates saved capitalization and whitespace", () => {
  assert.equal(matchesLanguage([" sinhala ", "ENGLISH"], "Sinhala"), true);
  assert.equal(matchesLanguage(["English"], "Tamil"), false);
  assert.equal(matchesLanguage([], ""), true);
});
test("age includes completed months for infants and adults", () => {
  assert.equal(ageLabel("2026-03-04", "2026-10-04"), "0 years, 7 months");
  assert.equal(ageLabel("2026-03-05", "2026-10-04"), "0 years, 6 months");
  assert.equal(ageLabel("2000-10-05", "2026-10-04"), "25 years, 11 months");
  assert.equal(ageLabel("2027-01-01", "2026-10-04"), "Not provided");
});
test("phone validation accepts formatted local/international numbers but rejects incomplete values", () => {
  for (const value of ["0771234567", "+94 77 123 4567", "011-2345678", "+1 (212) 555-1234"]) assert.equal(validPhone(value), true, value);
  for (const value of ["123", "abc0771234567", "07712345678", "+00 123456789", "0771234567 ext 3"]) assert.equal(validPhone(value), false, value);
});
