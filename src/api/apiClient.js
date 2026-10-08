import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL || "/api",
  timeout: 15000,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = document.cookie.split("; ").find((item) => item.startsWith("cc_csrf="))?.split("=")[1];
  if (token && !["get", "head", "options"].includes(config.method?.toLowerCase())) {
    config.headers["X-CSRF-Token"] = decodeURIComponent(token);
  }
  return config;
});

apiClient.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && !["/auth/login", "/auth/google"].includes(error.config?.url)) {
    window.dispatchEvent(new Event("auth:expired"));
  }
  return Promise.reject(error);
});

export async function callApi(method, endpoint, data = null, params = null, config = {}) {
  try {
    return (await apiClient({ method, url: endpoint, data, params, ...config })).data;
  } catch (error) {
    const payload = error.response?.data;
    const fields = Array.isArray(payload?.errors) ? payload.errors.slice(0, 3).map((e) => e.field + ": " + e.message).join(" ") : "";
    throw new Error(fields || payload?.message || (error.response ? "Request failed. Please try again." : navigator.onLine === false ? "You are offline. Connect to the internet and try again." : "Cannot reach the server. Please check your connection and try again."));
  }
}
