import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/login/authSlice";
import uiConfigReducer from "@/features/ui/uiConfigSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    uiConfig: uiConfigReducer,
  },
});
