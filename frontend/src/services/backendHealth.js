import { API_URLS } from "@/constants/urls";

/**
 * Probe GET /health with a timeout. Does not use trackedFetch so it never
 * drives the global Metal Unfold loader.
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<boolean>}
 */
export async function checkBackendHealth({ timeoutMs = 4000 } = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(API_URLS.health.auth, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const body = await response.json().catch(() => null);
    if (body && typeof body === "object" && "status" in body) {
      return String(body.status).toLowerCase() === "ok";
    }
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}
