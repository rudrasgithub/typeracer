import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import raceReducer from './slices/raceSlice';
import leaderboardReducer from './slices/leaderboardSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    race: raceReducer,
    leaderboard: leaderboardReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});

export default store;
