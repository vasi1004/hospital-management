import { BRAND_LOGO_ALT, BRAND_LOGO_SRC } from "@/constants/brand";
import "./AppLogo.css";

/**
 * Reusable product logo.
 * @param {"full"|"mark"} [variant="full"] full = icon+wordmark; mark = compact for chrome
 * @param {boolean} [effect3d=false]
 * @param {string} [className]
 */
export function AppLogo({
  variant = "full",
  effect3d = false,
  className = "",
  decorative = false,
}) {
  const classes = [
    "app-logo",
    `app-logo--${variant}`,
    effect3d ? "app-logo--3d" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <img
      className={classes}
      src={BRAND_LOGO_SRC}
      alt={decorative ? "" : BRAND_LOGO_ALT}
      decoding="async"
      draggable={false}
    />
  );
}
