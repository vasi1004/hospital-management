import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { API_URLS } from "@/constants/urls";
import {
  isNetworkFetchFailure,
  requestReachabilityProbe,
} from "@/services/reachabilityBus";

export const DEFAULT_UI_LOADER = {
  enabled: true,
  mode: "both",
  background: "rgba(244, 244, 245, 0.94)",
  base_color: "#059669",
  speed: 50,
  distance: 11,
  material: { roughness: 100, reflect: 100 },
  motion: { spin: 90, fold: 90, hold: 50 },
  camera: { tilt: 18, side_tilt: 0 },
};

/** Mirrors backend defaults from GET /api/v1/public/ui-config → offline_play. */
export const DEFAULT_OFFLINE_PLAY = {
  enabled: true,
  offline_message: "Can't reach the server — play while we reconnect",
  reconnect_message: "Server is back — continue",
  reconnect_notice_ms: 1000,
  fail_threshold: 2,
  success_threshold: 1,
  poll_interval_online_ms: 15000,
  poll_interval_offline_ms: 4000,
  request_timeout_ms: 4000,
  game: {
    background: "#00484C",
    ink: "#FFFFFF",
    start_speed: 620,
    jump: 1840,
  },
};

function normalizeLoader(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_UI_LOADER };
  const mode = String(raw.mode || "both").toLowerCase();
  return {
    enabled: raw.enabled !== false,
    mode: mode === "login" || mode === "api" ? mode : "both",
    background: raw.background ?? DEFAULT_UI_LOADER.background,
    base_color: raw.base_color ?? DEFAULT_UI_LOADER.base_color,
    speed: Number(raw.speed ?? DEFAULT_UI_LOADER.speed),
    distance: Number(raw.distance ?? DEFAULT_UI_LOADER.distance),
    material: {
      roughness: Number(
        raw.material?.roughness ?? DEFAULT_UI_LOADER.material.roughness,
      ),
      reflect: Number(
        raw.material?.reflect ?? DEFAULT_UI_LOADER.material.reflect,
      ),
    },
    motion: {
      spin: Number(raw.motion?.spin ?? DEFAULT_UI_LOADER.motion.spin),
      fold: Number(raw.motion?.fold ?? DEFAULT_UI_LOADER.motion.fold),
      hold: Number(raw.motion?.hold ?? DEFAULT_UI_LOADER.motion.hold),
    },
    camera: {
      tilt: Number(raw.camera?.tilt ?? DEFAULT_UI_LOADER.camera.tilt),
      side_tilt: Number(
        raw.camera?.side_tilt ??
          raw.camera?.sideTilt ??
          DEFAULT_UI_LOADER.camera.side_tilt,
      ),
    },
  };
}

function normalizeOfflinePlay(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_OFFLINE_PLAY,
      game: { ...DEFAULT_OFFLINE_PLAY.game },
    };
  }
  const game = raw.game && typeof raw.game === "object" ? raw.game : {};
  return {
    enabled: raw.enabled !== false,
    offline_message:
      typeof raw.offline_message === "string" && raw.offline_message.trim()
        ? raw.offline_message.trim()
        : DEFAULT_OFFLINE_PLAY.offline_message,
    reconnect_message:
      typeof raw.reconnect_message === "string" && raw.reconnect_message.trim()
        ? raw.reconnect_message.trim()
        : DEFAULT_OFFLINE_PLAY.reconnect_message,
    reconnect_notice_ms: Number(
      raw.reconnect_notice_ms ?? DEFAULT_OFFLINE_PLAY.reconnect_notice_ms,
    ),
    fail_threshold: Number(
      raw.fail_threshold ?? DEFAULT_OFFLINE_PLAY.fail_threshold,
    ),
    success_threshold: Number(
      raw.success_threshold ?? DEFAULT_OFFLINE_PLAY.success_threshold,
    ),
    poll_interval_online_ms: Number(
      raw.poll_interval_online_ms ??
        DEFAULT_OFFLINE_PLAY.poll_interval_online_ms,
    ),
    poll_interval_offline_ms: Number(
      raw.poll_interval_offline_ms ??
        DEFAULT_OFFLINE_PLAY.poll_interval_offline_ms,
    ),
    request_timeout_ms: Number(
      raw.request_timeout_ms ?? DEFAULT_OFFLINE_PLAY.request_timeout_ms,
    ),
    game: {
      background: game.background ?? DEFAULT_OFFLINE_PLAY.game.background,
      ink: game.ink ?? DEFAULT_OFFLINE_PLAY.game.ink,
      start_speed: Number(
        game.start_speed ?? DEFAULT_OFFLINE_PLAY.game.start_speed,
      ),
      jump: Number(game.jump ?? DEFAULT_OFFLINE_PLAY.game.jump),
    },
  };
}

export const fetchPublicUiConfig = createAsyncThunk(
  "ui/fetchPublicUiConfig",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(API_URLS.public.uiConfig, {
        headers: { Accept: "application/json" },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        return rejectWithValue(body?.detail || "Unable to load UI config.");
      }
      return body;
    } catch (error) {
      if (isNetworkFetchFailure(error)) {
        requestReachabilityProbe();
      }
      const message =
        error instanceof Error ? error.message : "Unable to load UI config.";
      return rejectWithValue(message);
    }
  },
);

const initialState = {
  hospitalDisplayName: null,
  loader: { ...DEFAULT_UI_LOADER },
  offlinePlay: {
    ...DEFAULT_OFFLINE_PLAY,
    game: { ...DEFAULT_OFFLINE_PLAY.game },
  },
  /** Bumped when /health recovers after an outage — remounts protected routes to refetch. */
  recoveryEpoch: 0,
  status: "idle",
  error: null,
};

const uiConfigSlice = createSlice({
  name: "uiConfig",
  initialState,
  reducers: {
    markBackendRecovered(state) {
      state.recoveryEpoch += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPublicUiConfig.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchPublicUiConfig.fulfilled, (state, action) => {
        state.status = "ready";
        state.hospitalDisplayName = action.payload.hospital_display_name ?? null;
        state.loader = normalizeLoader(action.payload.loader);
        state.offlinePlay = normalizeOfflinePlay(action.payload.offline_play);
      })
      .addCase(fetchPublicUiConfig.rejected, (state, action) => {
        state.status = "ready";
        state.error = action.payload || action.error.message || null;
        state.loader = { ...DEFAULT_UI_LOADER };
        // Keep prior offlinePlay if we had a successful fetch earlier this session.
        if (!state.offlinePlay) {
          state.offlinePlay = {
            ...DEFAULT_OFFLINE_PLAY,
            game: { ...DEFAULT_OFFLINE_PLAY.game },
          };
        }
      });
  },
});

export const { markBackendRecovered } = uiConfigSlice.actions;

export const selectUiLoader = (state) => state.uiConfig.loader;
export const selectUiConfigStatus = (state) => state.uiConfig.status;
export const selectOfflinePlay = (state) => state.uiConfig.offlinePlay;
export const selectBackendRecoveryEpoch = (state) =>
  state.uiConfig.recoveryEpoch;

export default uiConfigSlice.reducer;
