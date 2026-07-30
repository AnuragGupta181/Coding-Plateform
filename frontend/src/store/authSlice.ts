import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'candidate' | 'admin';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

const getStoredToken = () => localStorage.getItem('token');

const getStoredUser = () => {
  const token = getStoredToken();
  if (!token) {
    localStorage.removeItem('user');
    return null;
  }

  try {
    return JSON.parse(localStorage.getItem('user') || 'null') as User | null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

const initialState: AuthState = {
  user: getStoredUser(),
  token: getStoredToken(),
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      if (action.payload) state.error = null; // Clear error when starting a new action
    },
    setAuth: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isLoading = false;
      state.error = null;
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      localStorage.setItem('token', action.payload.token);
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isLoading = false;
      state.error = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  },
});

export const { setLoading, setAuth, setError, logout } = authSlice.actions;
export default authSlice.reducer;
