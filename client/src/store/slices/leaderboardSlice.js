import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const initialState = {
  globalLeaderboard: [],
  wpmLeaderboard: [],
  winsLeaderboard: [],
  userRank: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 100,
    total: 0,
    pages: 0
  }
};

// Get global leaderboard
export const getGlobalLeaderboard = createAsyncThunk(
  'leaderboard/getGlobal',
  async ({ page = 1, limit = 100 }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/leaderboard/global?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message || 'Failed to fetch leaderboard');
    }
  }
);

// Get WPM leaderboard
export const getWPMLeaderboard = createAsyncThunk(
  'leaderboard/getWPM',
  async (limit = 100, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/leaderboard/wpm?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message || 'Failed to fetch WPM leaderboard');
    }
  }
);

// Get wins leaderboard
export const getWinsLeaderboard = createAsyncThunk(
  'leaderboard/getWins',
  async (limit = 100, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/leaderboard/wins?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message || 'Failed to fetch wins leaderboard');
    }
  }
);

// Get user rank
export const getUserRank = createAsyncThunk(
  'leaderboard/getUserRank',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.get(`${API_URL}/api/leaderboard/rank/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message || 'Failed to fetch rank');
    }
  }
);

const leaderboardSlice = createSlice({
  name: 'leaderboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Global leaderboard
      .addCase(getGlobalLeaderboard.pending, (state) => {
        state.loading = true;
      })
      .addCase(getGlobalLeaderboard.fulfilled, (state, action) => {
        state.loading = false;
        state.globalLeaderboard = action.payload.leaderboard;
        state.pagination = action.payload.pagination;
      })
      .addCase(getGlobalLeaderboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // WPM leaderboard
      .addCase(getWPMLeaderboard.pending, (state) => {
        state.loading = true;
      })
      .addCase(getWPMLeaderboard.fulfilled, (state, action) => {
        state.loading = false;
        state.wpmLeaderboard = action.payload.leaderboard;
      })
      .addCase(getWPMLeaderboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Wins leaderboard
      .addCase(getWinsLeaderboard.pending, (state) => {
        state.loading = true;
      })
      .addCase(getWinsLeaderboard.fulfilled, (state, action) => {
        state.loading = false;
        state.winsLeaderboard = action.payload.leaderboard;
      })
      .addCase(getWinsLeaderboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // User rank
      .addCase(getUserRank.fulfilled, (state, action) => {
        state.userRank = action.payload.rank;
      });
  }
});

export const { clearError } = leaderboardSlice.actions;
export default leaderboardSlice.reducer;
