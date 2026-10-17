import { apiClient } from "../../api/apiClient.js";

// Stored photo references are API-relative. Data URL previews/legacy photos stay intact.
export function profileImageSrc(value) {
  if (!value?.startsWith("/profile-images/")) return value || "";
  return String(apiClient.defaults.baseURL || "/api").replace(/\/+$/, "") + value;
}
