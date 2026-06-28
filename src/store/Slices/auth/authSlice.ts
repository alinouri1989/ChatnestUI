// @ts-nocheck
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null, 
  token: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    clearUser: (state) => {
      state.user = null;
      state.token = null;
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
  },
});

export const { setUser, clearUser, setToken } = authSlice.actions;
export default authSlice.reducer;
