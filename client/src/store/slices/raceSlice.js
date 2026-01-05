import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const initialState = {
  currentRace: null,
  roomId: null,
  players: [],
  raceText: '',
  isWaiting: false,
  isRacing: false,
  countdown: null,
  userProgress: 0,
  userWPM: 0,
  userAccuracy: 100,
  startTime: null,
  raceResults: null,
  history: [],
  loading: false,
  error: null
};

// Save race results
export const saveRaceResults = createAsyncThunk(
  'race/saveResults',
  async (raceData, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.post(
        `${API_URL}/api/race/save`,
        raceData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message || 'Failed to save race');
    }
  }
);

// Get race history
export const getRaceHistory = createAsyncThunk(
  'race/getHistory',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await axios.get(`${API_URL}/api/race/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message || 'Failed to fetch history');
    }
  }
);

const raceSlice = createSlice({
  name: 'race',
  initialState,
  reducers: {
    setWaiting: (state, action) => {
      state.isWaiting = action.payload;
    },
    setRaceReady: (state, action) => {
      state.roomId = action.payload.roomId;
      state.players = action.payload.players;
      state.raceText = action.payload.text;
      state.isWaiting = false;
    },
    setCountdown: (state, action) => {
      state.countdown = action.payload;
    },
    startRace: (state) => {
      state.isRacing = true;
      state.countdown = null;
      state.startTime = Date.now();
      state.userProgress = 0;
      state.userWPM = 0;
      state.userAccuracy = 100;
    },
    updateProgress: (state, action) => {
      state.userProgress = action.payload.progress;
      state.userWPM = action.payload.wpm;
      state.userAccuracy = action.payload.accuracy;
    },
    updatePlayers: (state, action) => {
      state.players = action.payload;
    },
    finishRace: (state, action) => {
      state.isRacing = false;
      state.raceResults = action.payload;
    },
    resetRace: (state) => {
      state.currentRace = null;
      state.roomId = null;
      state.players = [];
      state.raceText = '';
      state.isWaiting = false;
      state.isRacing = false;
      state.countdown = null;
      state.userProgress = 0;
      state.userWPM = 0;
      state.userAccuracy = 100;
      state.startTime = null;
      state.raceResults = null;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Save race results
      .addCase(saveRaceResults.pending, (state) => {
        state.loading = true;
      })
      .addCase(saveRaceResults.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(saveRaceResults.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get race history
      .addCase(getRaceHistory.pending, (state) => {
        state.loading = true;
      })
      .addCase(getRaceHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload.history;
      })
      .addCase(getRaceHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const {
  setWaiting,
  setRaceReady,
  setCountdown,
  startRace,
  updateProgress,
  updatePlayers,
  finishRace,
  resetRace,
  setError,
  clearError
} = raceSlice.actions;

export default raceSlice.reducer;
