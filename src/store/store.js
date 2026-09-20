// app/store.js
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import themeReducer from "../features/theme/themeSlice";
import botsReducer from "../features/bots/botsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    bots: botsReducer,
  },
});
