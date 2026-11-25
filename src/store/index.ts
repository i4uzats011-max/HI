import { configureStore } from '@reduxjs/toolkit';
import ledgerReducer from './ledgerSlice';

export const store = configureStore({
  reducer: {
    ledger: ledgerReducer
  },
  devTools: process.env.NODE_ENV !== 'production'
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
