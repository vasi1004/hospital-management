import {
  isNetworkFetchFailure,
  requestReachabilityProbe,
} from "@/services/reachabilityBus";

const listeners = new Set();
let pending = 0;
let pendingMutating = 0;

function snapshot() {
  return { total: pending, mutating: pendingMutating };
}

function emit() {
  const state = snapshot();
  for (const fn of listeners) fn(state);
}

/** Subscribe to in-flight backend request counts. Returns unsubscribe. */
export function subscribeApiActivity(listener) {
  listeners.add(listener);
  listener(snapshot());
  return () => listeners.delete(listener);
}

export function getApiActivityCount() {
  return snapshot();
}

export function beginApiActivity({ mutating = false } = {}) {
  pending += 1;
  if (mutating) pendingMutating += 1;
  emit();
}

export function endApiActivity({ mutating = false } = {}) {
  pending = Math.max(0, pending - 1);
  if (mutating) pendingMutating = Math.max(0, pendingMutating - 1);
  emit();
}

/**
 * Wrap fetch for HMS API calls; tracks activity for global loader (when enabled).
 * Global overlay uses mutating (non-GET) requests only.
 * Network failures request an immediate /health probe (does not treat HTTP errors as offline).
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {{ track?: boolean, trackGlobal?: boolean }} [meta]
 */
export async function trackedFetch(url, options, meta = {}) {
  const method = String(options?.method || "GET").toUpperCase();
  const mutating = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  const track = meta.trackGlobal ?? meta.track ?? true;
  if (track) beginApiActivity({ mutating });
  try {
    return await fetch(url, options);
  } catch (error) {
    if (isNetworkFetchFailure(error)) {
      requestReachabilityProbe();
    }
    throw error;
  } finally {
    if (track) endApiActivity({ mutating });
  }
}
