import { apiClient, callApi } from "../../api/apiClient.js";

export const DEFAULT_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const PROOF_MAX_BYTES = 5 * 1024 * 1024;
export const FILE_TRANSFER_TIMEOUT = 120000;

export function validateFileSize(file, maxBytes = DEFAULT_DOCUMENT_MAX_BYTES) {
  if (!file?.size || file.size > maxBytes) throw new Error(`Choose a non-empty file up to ${Math.floor(maxBytes / (1024 * 1024))} MB.`);
}

export async function saveFile(bookingId, file, privateNote = false, uploadId, { maxBytes, onProgress } = {}) {
  validateFileSize(file, maxBytes);
  const data = new FormData();
  data.append("file", file);
  data.append("private", String(privateNote));
  if (uploadId) data.append("upload_id", uploadId);
  return (await callApi("POST", "/bookings/" + bookingId + "/documents", data, null, {
    timeout: FILE_TRANSFER_TIMEOUT,
    onUploadProgress: (event) => { if (event.total) onProgress?.(Math.min(100, Math.round(event.loaded * 100 / event.total))); },
  })).data;
}

export async function downloadFile(id, name) {
  let response;
  try { response = await apiClient.get("/documents/" + id, { responseType: "blob", timeout: FILE_TRANSFER_TIMEOUT }); }
  catch { throw new Error("Could not download this document. Check your session and try again."); }
  const url = URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
