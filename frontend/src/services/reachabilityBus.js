/**
 * App-wide reachability probes. Network failures can request an immediate
 * GET /health check without treating HTTP 4xx/5xx as offline.
 */

const listeners = new Set();

export function subscribeReachabilityProbe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function requestReachabilityProbe() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      // Isolation: one bad listener must not break others.
    }
  }
}

/** True for browser network / CORS / offline failures (not HTTP error statuses). */
export function isNetworkFetchFailure(error) {
  if (!error) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }
  const name = error.name || "";
  const message = String(error.message || error);
  if (name === "TypeError" && /fetch|network|load failed/i.test(message)) {
    return true;
  }
  if (name === "AbortError") return false;
  return /failed to fetch|networkerror|load failed|err_connection|econnrefused/i.test(
    message,
  );
}
