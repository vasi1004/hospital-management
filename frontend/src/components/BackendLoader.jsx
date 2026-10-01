import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { DEFAULT_UI_LOADER, selectUiLoader } from "@/features/ui/uiConfigSlice";
import MetalUnfold from "@/components/metalUnfold/MetalUnfold";
import "./BackendLoader.css";

function loaderPropsFromConfig(loader) {
  const cfg = loader ?? DEFAULT_UI_LOADER;
  return {
    background: "transparent",
    baseColor: cfg.base_color,
    speed: cfg.speed,
    distance: cfg.distance,
    material: cfg.material,
    motion: cfg.motion,
    camera: {
      tilt: cfg.camera?.tilt,
      sideTilt: cfg.camera?.side_tilt,
    },
  };
}

/**
 * Metal Unfold loader — colors/motion from backend `/public/ui-config`.
 */
export function BackendLoader({
  variant = "inline",
  label,
  className = "",
  backdrop,
}) {
  const loaderConfig = useAppSelector(selectUiLoader);
  const metalProps = useMemo(
    () => loaderPropsFromConfig(loaderConfig),
    [loaderConfig],
  );

  if (loaderConfig?.enabled === false) {
    return label ? (
      <p className={`ui-muted backend-loader__fallback ${className}`}>{label}</p>
    ) : null;
  }

  const ariaLabel = label || "Loading";

  if (variant === "overlay") {
    const bg = backdrop ?? loaderConfig.background ?? DEFAULT_UI_LOADER.background;
    return (
      <div
        className={`backend-loader backend-loader--overlay ${className}`}
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
      >
        <div className="backend-loader__overlay-panel" style={{ background: bg }}>
          <div className="backend-loader__stage backend-loader__stage--overlay">
            <MetalUnfold {...metalProps} />
          </div>
          {label ? <p className="backend-loader__label">{label}</p> : null}
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={`backend-loader backend-loader--compact ${className}`}
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
      >
        <div className="backend-loader__stage backend-loader__stage--compact">
          <MetalUnfold {...metalProps} />
        </div>
        {label ? (
          <p className="backend-loader__label backend-loader__label--compact">
            {label}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`backend-loader backend-loader--inline ${className}`}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <div className="backend-loader__stage backend-loader__stage--inline">
        <MetalUnfold {...metalProps} />
      </div>
      {label ? <p className="backend-loader__label">{label}</p> : null}
    </div>
  );
}
