import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { callApi } from "../../api/apiClient.js";

const empty = {
  role: null, professionalId: null, patient: {}, patients: [], professionals: [],
  sessions: [], weeklyAvailability: [], bookings: [], loaded: false, loading: false,
  pending: 0, error: "", requestId: null, mockPayments: false,
};

export const fetchWorkspace = createAsyncThunk("consultations/fetch", async (_, { rejectWithValue }) => {
  try { return (await callApi("GET", "/workspace")).data; }
  catch (e) { return rejectWithValue(e.message); }
});

function command(name, request) {
  return createAsyncThunk("consultations/" + name, async (payload, context) => {
    try {
      const [method, url, body] = request(payload, context.getState().consultations);
      const response = await callApi(method, url, body);
      await context.dispatch(fetchWorkspace()).unwrap();
      return response.data || response;
    } catch (e) { return context.rejectWithValue(e.message || e); }
  });
}

export const saveProfile = command("saveProfile", (p) => ["PUT", "/profile", p]);
export const addSession = command("addSession", ({ id, ...p }) => ["POST", "/sessions", p]);
export const toggleSession = command("toggleSession", (id, state) => ["PATCH", "/sessions/" + id, { online: !state.sessions.find((s) => s.id === id)?.online }]);
export const saveWeeklyAvailability = command("saveWeeklyAvailability", (days) => ["PUT", "/weekly-availability", { days }]);
export const book = command("book", (p) => ["POST", "/bookings", { sessionId: p.sessionId, reason: p.reason || "" }]);
export const pay = command("pay", (p) => ["POST", "/bookings/" + p.id + "/payment-simulation", { success: p.success }]);
export const transition = command("transition", (p) => ["PATCH", "/bookings/" + p.id + "/status", { status: p.status }]);
export const message = command("message", (p) => ["POST", "/bookings/" + p.id + "/messages", { text: p.text }]);
export const saveNotes = command("saveNotes", ({ id, ...p }) => ["PUT", "/bookings/" + id + "/notes", p]);
export const sendPrescription = command("sendPrescription", ({ id, text }) => ["PUT", "/bookings/" + id + "/prescription", { text }]);
export const moderate = command("moderate", (p) => ["PATCH", "/admin/users/" + p.id, { status: p.status }]);
export const refund = command("refund", (id) => ["POST", "/admin/bookings/" + id + "/refund-simulation"]);

const slice = createSlice({
  name: "consultations", initialState: empty,
  reducers: { clearWorkspaceError: (state) => { state.error = ""; } },
  extraReducers: (builder) => {
    builder.addCase("auth/clearAuthUser", () => ({ ...empty }))
      .addCase("auth/logoutUser/fulfilled", () => ({ ...empty }))
      .addCase("auth/setAuthUser", () => ({ ...empty }))
      .addCase(fetchWorkspace.pending, (state, action) => { state.loading = true; state.requestId = action.meta.requestId; })
      .addCase(fetchWorkspace.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        Object.assign(state, action.payload, { loaded: true, loading: false });
      })
      .addCase(fetchWorkspace.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.loading = false; state.error = action.payload || "Could not load workspace.";
      })
      .addMatcher((action) => action.type.startsWith("consultations/") && !action.type.startsWith("consultations/fetch") && action.type.endsWith("/pending"), (state) => { state.pending += 1; state.error = ""; })
      .addMatcher((action) => action.type.startsWith("consultations/") && !action.type.startsWith("consultations/fetch") && /\/(fulfilled|rejected)$/.test(action.type), (state, action) => {
        state.pending = Math.max(0, state.pending - 1);
        if (action.type.endsWith("/rejected")) state.error = action.payload || "Could not save changes.";
      });
  },
});
export const { clearWorkspaceError } = slice.actions;
export default slice.reducer;
