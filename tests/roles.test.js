import test from "node:test";
import assert from "node:assert/strict";
import { getRole, getHome, getDestination } from "../src/features/auth/roles.js";

test("only recognised server roles have a dashboard", () => {
  for (const [role, destination] of Object.entries({ user: "/dashboard", doctor: "/doctor/dashboard", lawyer: "/lawyer/dashboard", admin: "/admin/dashboard" })) {
    assert.equal(getHome({ role }), destination);
  }
  for (const role of [undefined, null, {}, "owner", ""]) {
    assert.equal(getRole({ role }), null);
    assert.equal(getHome({ role }), "/access-denied");
  }
});

test("a user's chosen consultation survives authentication", () => {
  for (const path of ["/consult/doctors", "/consult/lawyers"]) {
    assert.equal(getDestination({ role: "user" }, path), path);
  }
});

test("requested destinations cannot grant privileges or redirect externally", () => {
  for (const path of ["/admin/dashboard", "//evil.example", "https://evil.example", "/chatBots"]) {
    assert.equal(getDestination({ role: "user" }, path), "/dashboard");
  }
  assert.equal(getDestination({ role: "doctor" }, "/consult/doctors"), "/doctor/dashboard");
  assert.equal(getDestination({ role: "lawyer" }, "/admin/dashboard"), "/lawyer/dashboard");
});
