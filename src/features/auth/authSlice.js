import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { callApi } from "../../api/apiClient";

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await callApi("GET", "/auth/me");
      return response.data;
    } catch (error) {
      return rejectWithValue(error?.message || error?.error || "Not authenticated");
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      await callApi("POST", "/auth/logout");
      return true;
    } catch (error) {
      return rejectWithValue(error?.message || error?.error || "Logout failed");
    }
  }
);

const initialState = {
  user: null,
  loading: true,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = Boolean(action.payload);
      state.loading = false;
    },
    clearAuthUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = Boolean(action.payload);
        state.loading = false;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
      })
      .addCase(logoutUser.rejected, (state) => {
        // Keep the current session visible so the user can retry logout.
        state.loading = false;
      });
  },
});

export const { setAuthUser, clearAuthUser } = authSlice.actions;
export default authSlice.reducer;
