import test from "node:test";
import assert from "node:assert/strict";
import { apiClient } from "../src/api/apiClient.js";
import { profileImageSrc } from "../src/features/auth/profileImages.js";

test("stored profile photos use the configured API origin while previews keep their data URL", () => {
  const original = apiClient.defaults.baseURL;
  try {
    const reference = "/profile-images/person?v=checksum";
    apiClient.defaults.baseURL = "/api";
    assert.equal(profileImageSrc(reference), "/api" + reference);
    apiClient.defaults.baseURL = "https://api.example.test/api/";
    assert.equal(profileImageSrc(reference), "https://api.example.test/api" + reference);
    assert.equal(profileImageSrc("data:image/png;base64,preview"), "data:image/png;base64,preview");
    assert.equal(profileImageSrc(null), "");
  } finally {
    apiClient.defaults.baseURL = original;
  }
});
