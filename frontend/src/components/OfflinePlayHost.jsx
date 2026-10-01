import { useEffect } from "react";
import { PixelRunGame } from "@/components/PixelRunGame";
import { useBackendReachability } from "@/hooks/useBackendReachability";
import "./OfflinePlayHost.css";

/**
 * Full-screen offline play while GET /health is unreachable.
 * Mount once next to App (login + authenticated routes).
 */
export function OfflinePlayHost() {
  const { offlinePlay, showGame, showRecovered } = useBackendReachability();
  const active = showGame || showRecovered;

  useEffect(() => {
    if (!active) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  if (!active) return null;

  const game = offlinePlay.game ?? {};

  return (
    <div
      className={`offline-play-host ${showRecovered ? "offline-play-host--recovered" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label={
        showRecovered
          ? offlinePlay.reconnect_message
          : offlinePlay.offline_message
      }
    >
      <div className="offline-play-host__veil" aria-hidden="true" />

      <div className="offline-play-host__panel">
        {showRecovered ? (
          <div className="offline-play-host__banner offline-play-host__banner--recovered">
            <span className="offline-play-host__pulse" aria-hidden="true" />
            <p>{offlinePlay.reconnect_message}</p>
          </div>
        ) : (
          <div className="offline-play-host__banner">
            <p>{offlinePlay.offline_message}</p>
            <span className="offline-play-host__hint">
              Tap or press Space / ↑ to jump
            </span>
          </div>
        )}

        {showGame ? (
          <div className="offline-play-host__stage">
            <PixelRunGame
              background={game.background}
              ink={game.ink}
              startSpeed={game.start_speed}
              jump={game.jump}
              className="offline-play-host__game"
            />
            <div className="offline-play-host__glow" aria-hidden="true" />
          </div>
        ) : (
          <div
            className="offline-play-host__stage offline-play-host__stage--idle"
            style={{ background: game.background }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
