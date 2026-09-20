import axios from "axios";
import { store } from "../store/store";
import { clearAuthUser } from "../features/auth/authSlice";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Create axios instance
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || "";

    if (status === 401 && !["/auth/login", "/auth/register"].includes(requestUrl)) {
      store.dispatch(clearAuthUser());

    }

    return Promise.reject(error);
  }
);

/**
 * Common API function
 * @param {string} method - GET | POST | PUT | DELETE
 * @param {string} endpoint - API endpoint (ex: /users)
 * @param {object} data - request body (optional)
 * @param {object} params - query params (optional)
 */
export const callApi = async (
  method,
  endpoint,
  data = null,
  params = null,
  config = {}
) => {
  try {
    const response = await axiosInstance({
      method,
      url: endpoint,
      data,
      params,
      ...config,
    });

    return response.data;
  } catch (error) {
    console.error("API Error:", error);

    // Optional: return backend error message if exists
    throw error?.response?.data || error.message;
  }
};
