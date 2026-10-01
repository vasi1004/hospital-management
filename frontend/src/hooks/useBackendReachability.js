import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  DEFAULT_OFFLINE_PLAY,
  fetchPublicUiConfig,
  markBackendRecovered,
  selectOfflinePlay,
} from "@/features/ui/uiConfigSlice";
import { checkBackendHealth } from "@/services/backendHealth";
import { subscribeReachabilityProbe } from "@/services/reachabilityBus";

/** @typedef {'checking' | 'reachable' | 'unreachable' | 'recovered'} ReachabilityPhase */

/**
 * App-wide reachability: GET /health + backend offline_play config.
 * Optional immediate probes after network-level fetch failures.
 */
export function useBackendReachability() {
  const dispatch = useAppDispatch();
  const offlinePlay = useAppSelector(selectOfflinePlay) ?? DEFAULT_OFFLINE_PLAY;

  /** @type {[ReachabilityPhase, function]} */
  const [phase, setPhase] = useState("checking");
  const failCountRef = useRef(0);
  const successCountRef = useRef(0);
  const wasUnreachableRef = useRef(false);
  const phaseRef = useRef(phase);
  const probingRef = useRef(false);
  phaseRef.current = phase;

  useEffect(() => {
    if (offlinePlay.enabled === false) {
      setPhase("reachable");
      return undefined;
    }

    let cancelled = false;
    let timeoutId = 0;

    const cfg = offlinePlay;
    const failThreshold = Math.max(1, Number(cfg.fail_threshold) || 2);
    const successThreshold = Math.max(1, Number(cfg.success_threshold) || 1);
    const timeoutMs = Math.max(500, Number(cfg.request_timeout_ms) || 4000);
    const onlineMs = Math.max(
      2000,
      Number(cfg.poll_interval_online_ms) || 15000,
    );
    const offlineMs = Math.max(
      1000,
      Number(cfg.poll_interval_offline_ms) || 4000,
    );
    const noticeMs = Math.max(250, Number(cfg.reconnect_notice_ms) || 1000);

    const schedule = (ms) => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        tick({ fromProbe: false });
      }, ms);
    };

    /**
     * @param {{ fromProbe?: boolean }} [opts]
     * fromProbe: network fetch already failed — one confirmed /health miss
     * is enough to show offline play (still health-gated, not HTTP-error-gated).
     */
    const tick = async ({ fromProbe = false } = {}) => {
      if (cancelled) return;
      if (phaseRef.current === "recovered") {
        schedule(offlineMs);
        return;
      }
      if (probingRef.current && fromProbe) return;

      probingRef.current = true;
      const ok = await checkBackendHealth({ timeoutMs });
      probingRef.current = false;
      if (cancelled) return;

      if (ok) {
        failCountRef.current = 0;
        successCountRef.current += 1;

        if (wasUnreachableRef.current) {
          if (successCountRef.current >= successThreshold) {
            wasUnreachableRef.current = false;
            successCountRef.current = 0;
            setPhase("recovered");
            dispatch(markBackendRecovered());
            dispatch(fetchPublicUiConfig());
            window.dispatchEvent(new CustomEvent("hms:backend-recovered"));
            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => {
              if (!cancelled) {
                setPhase("reachable");
                schedule(onlineMs);
              }
            }, noticeMs);
            return;
          }
          schedule(offlineMs);
          return;
        }

        setPhase("reachable");
        schedule(onlineMs);
        return;
      }

      successCountRef.current = 0;
      // Probe after a real network failure: accelerate to offline (still via /health).
      failCountRef.current = fromProbe
        ? failThreshold
        : failCountRef.current + 1;
      if (failCountRef.current >= failThreshold) {
        wasUnreachableRef.current = true;
        setPhase("unreachable");
      }
      schedule(offlineMs);
    };

    const onProbe = () => {
      if (cancelled) return;
      if (phaseRef.current === "unreachable" || phaseRef.current === "recovered") {
        return;
      }
      window.clearTimeout(timeoutId);
      tick({ fromProbe: true });
    };

    const onOffline = () => {
      if (cancelled) return;
      window.clearTimeout(timeoutId);
      tick({ fromProbe: true });
    };

    const onOnline = () => {
      if (cancelled) return;
      window.clearTimeout(timeoutId);
      tick({ fromProbe: false });
    };

    const unsubProbe = subscribeReachabilityProbe(onProbe);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    tick({ fromProbe: false });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      unsubProbe();
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [
    dispatch,
    offlinePlay.enabled,
    offlinePlay.fail_threshold,
    offlinePlay.success_threshold,
    offlinePlay.request_timeout_ms,
    offlinePlay.poll_interval_online_ms,
    offlinePlay.poll_interval_offline_ms,
    offlinePlay.reconnect_notice_ms,
  ]);

  return {
    phase,
    offlinePlay,
    showGame: phase === "unreachable",
    showRecovered: phase === "recovered",
  };
}
