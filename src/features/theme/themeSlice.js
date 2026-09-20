import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  colors : {

    primary: '#EA580C',
    secondary: '#181E4B', 

    accent: '#F97316',
    secondAccent: '#d3d006ff',

    background: '#FAFBFB',
    outerBackground: '#FFFFFF',

    textPrimary:'#14183E',
    textSecondary:'#5E6282',
    textMuted: '#64748B',
    border: '#9CA3AF',
    gradientStart: '#FED7AA',
    gradientMid: '#DBEAFE',
    gradientEnd: '#E9D5FF',
    appBg: '#FFF7ED',
    footerText: '#64748B',
    sectionBg: 'rgba(255, 255, 255, 0.8)',
    footerBg: '#FFFFFF',

    error: "#DC2626",
    success: "#16A34A", 

    cardBg: "#FFFFFF",
    overlay: "rgba(0,0,0,0.40)",
    textMain: "#1F2937",
    textMuted: "#64748B", // tailwind: slate-500
    textInverse: "#FFFFFF",
    primaryHover: "#166534",
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
