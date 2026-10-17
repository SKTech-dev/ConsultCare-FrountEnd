import test from "node:test";
import assert from "node:assert/strict";
import { apiClient } from "../src/api/apiClient.js";
import { DEFAULT_DOCUMENT_MAX_BYTES, FILE_TRANSFER_TIMEOUT, saveFile, validateFileSize } from "../src/features/consultations/files.js";

globalThis.document = { cookie: "cc_csrf=test-csrf" };
globalThis.window = { dispatchEvent() {} };

test("empty and oversized attachments are rejected before a request", async () => {
  let requested = false;
  apiClient.defaults.adapter = async () => { requested = true; throw new Error("Unexpected network request"); };
  for (const size of [0, DEFAULT_DOCUMENT_MAX_BYTES + 1]) {
    assert.throws(() => validateFileSize({ size }), /non-empty file/);
    await assert.rejects(saveFile("booking", { size }), /non-empty file/);
  }
  assert.equal(requested, false);
  assert.doesNotThrow(() => validateFileSize({ size: DEFAULT_DOCUMENT_MAX_BYTES }));
  assert.throws(() => validateFileSize({ size: 2048 }, 1024));
});

test("uploads use a longer timeout, keep their retry identifier and report progress", async () => {
  let progress = 0;
  apiClient.defaults.adapter = async (config) => {
    assert.equal(config.timeout, FILE_TRANSFER_TIMEOUT);
    assert.equal(config.data.get("upload_id"), "retry-id");
    assert.equal(config.data.get("private"), "true");
    config.onUploadProgress({ loaded: 5, total: 10 });
    return { data: { data: { id: "saved" } }, status: 201, statusText: "Created", headers: {}, config };
  };
  const result = await saveFile("booking", new File(["bytes"], "report.pdf", { type: "application/pdf" }), true, "retry-id", { onProgress: (value) => { progress = value; } });
  assert.equal(result.id, "saved");
  assert.equal(progress, 50);
});
