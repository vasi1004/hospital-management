import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { loginRequest } from "./loginApi";

function readStoredUser() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const initialState = {
  user: readStoredUser(),
  accessToken: sessionStorage.getItem(STORAGE_KEYS.accessToken),
  refreshToken: sessionStorage.getItem(STORAGE_KEYS.refreshToken),
  status: sessionStorage.getItem(STORAGE_KEYS.accessToken)
    ? "authenticated"
    : "idle",
  error: null,
};

export const login = createAsyncThunk(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      return await loginRequest(payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign in.";
      return rejectWithValue(message);
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
      if (state.status === "failed") {
        state.status = "idle";
      }
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = "idle";
      state.error = null;
      sessionStorage.removeItem(STORAGE_KEYS.accessToken);
      sessionStorage.removeItem(STORAGE_KEYS.refreshToken);
      sessionStorage.removeItem(STORAGE_KEYS.user);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.user = action.payload.user;
        state.accessToken = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token;
        state.error = null;
        sessionStorage.setItem(
          STORAGE_KEYS.accessToken,
          action.payload.access_token,
        );
        sessionStorage.setItem(
          STORAGE_KEYS.refreshToken,
          action.payload.refresh_token,
        );
        sessionStorage.setItem(
          STORAGE_KEYS.user,
          JSON.stringify(action.payload.user),
        );
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.error =
          action.payload || action.error.message || "Unable to sign in.";
      });
  },
});

export const { clearAuthError, logout } = authSlice.actions;
export default authSlice.reducer;
