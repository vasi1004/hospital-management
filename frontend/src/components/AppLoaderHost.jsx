import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchPublicUiConfig,
  selectUiLoader,
} from "@/features/ui/uiConfigSlice";
import { subscribeApiActivity } from "@/services/apiActivity";
import { BackendLoader } from "@/components/BackendLoader";

const SHOW_DELAY_MS = 180;

/**
 * Global loader driven by backend UI config: login + optional API activity.
 */
export function AppLoaderHost() {
  const dispatch = useAppDispatch();
  const loader = useAppSelector(selectUiLoader);
  const authStatus = useAppSelector((state) => state.auth.status);
  const [apiActivity, setApiActivity] = useState({ total: 0, mutating: 0 });
  const [showApiOverlay, setShowApiOverlay] = useState(false);

  useEffect(() => {
    dispatch(fetchPublicUiConfig());
  }, [dispatch]);

  useEffect(() => subscribeApiActivity(setApiActivity), []);

  const authLoading = authStatus === "loading";
  const mode = loader?.mode ?? "both";
  const apiEligible =
    loader?.enabled !== false && (mode === "api" || mode === "both");
  const loginEligible =
    loader?.enabled !== false && (mode === "login" || mode === "both");

  const apiBusy = apiActivity.mutating > 0;

  useEffect(() => {
    if (!apiEligible || !apiBusy) {
      setShowApiOverlay(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setShowApiOverlay(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [apiEligible, apiBusy]);

  const showOverlay =
    (loginEligible && authLoading) ||
    (apiEligible && showApiOverlay && apiBusy);

  if (!showOverlay) return null;

  const label = authLoading ? "Signing in…" : "Working with the server…";

  return <BackendLoader variant="overlay" label={label} />;
}
