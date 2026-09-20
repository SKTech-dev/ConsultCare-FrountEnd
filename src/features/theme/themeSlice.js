import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  colors : {

    primary: '#12355B',
    secondary: '#1E293B', 

    accent: '#0F766E',
    secondAccent: '#B7791F',

    background: '#F4F7FB',
    outerBackground: '#FFFFFF',

    textPrimary:'#0F172A',
    textSecondary:'#475569',
    textMuted: '#64748B',
    border: '#CBD5E1',
    gradientStart: '#DBEAFE',
    gradientMid: '#CCFBF1',
    gradientEnd: '#FEF3C7',
    appBg: '#EEF4FA',
    footerText: '#475569',
    sectionBg: 'rgba(255, 255, 255, 0.88)',
    footerBg: '#F8FAFC',

    error: "#B91C1C",
    success: "#15803D", 

    cardBg: "#FFFFFF",
    overlay: "rgba(15, 23, 42, 0.48)",
    textMain: "#0F172A",
    textMuted: "#64748B", // tailwind: slate-500
    textInverse: "#FFFFFF",
    primaryHover: "#0B5E56",
  }
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.colors = { ...state.colors, ...action.payload };
    },
  },
});

export const { setTheme } = themeSlice.actions;
export default themeSlice.reducer;
