// src/features/bots/botsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { callApi } from '../../api/apiClient';
import { logoutUser } from '../auth/authSlice';

// Async thunk to fetch bots
export const fetchBots = createAsyncThunk(
  'bots/fetchBots',
  async (_, { rejectWithValue }) => {
    try {
      const response = await callApi('GET', '/bots/');
      // return only the array inside data
      return response.data; // <-- if callApi already returns response.data
      // OR
      // return response?.data?.data; // if callApi returns the raw axios response
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to fetch bots');
    }
  }
);

const initialState = {
  bots: [],
  loading: false,
  error: null,
};

const botsSlice = createSlice({
  name: 'bots',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBots.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBots.fulfilled, (state, action) => {
        state.loading = false;
        state.bots = action.payload; // ✅ must be the array, not the full object
      })
      .addCase(fetchBots.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch bots';
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.bots = [];
        state.loading = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.bots = [];
        state.loading = false;
        state.error = null;
      });
  },
});

export default botsSlice.reducer;
