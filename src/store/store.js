// app/store.js
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import themeReducer from "../features/theme/themeSlice";
import botsReducer from "../features/bots/botsSlice";
import consultationReducer from "../features/consultations/consultationSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    bots: botsReducer,
    consultations: consultationReducer,
  },
});

store.subscribe(() => {
  try { localStorage.setItem("consultcare.workspace.v1", JSON.stringify(store.getState().consultations)); }
  catch { /* The current in-memory workspace remains usable if storage is full. */ }
});
