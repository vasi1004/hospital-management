/**
 * Themeable HMS brand mark + wordmark.
 * Colors follow CSS variables so the logo tracks the product palette.
 */
import { useId } from "react";
import "./AppLogo.css";

export function AppLogo({
  variant = "full",
  tone = "onLight",
  effect3d = false,
  className = "",
  decorative = false,
}) {
  const uid = useId().replace(/:/g, "");
  const crossId = `hms-cross-${uid}`;
  const handId = `hms-hand-${uid}`;

  const classes = [
    "app-logo",
    `app-logo--${variant}`,
    `app-logo--${tone}`,
    effect3d ? "app-logo--3d" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const labelled = decorative
    ? { "aria-hidden": true }
    : { role: "img", "aria-label": "Hospital Management System" };

  const viewBox = variant === "mark" ? "40 10 160 160" : "0 0 240 220";

  return (
    <svg
      className={classes}
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      {...labelled}
    >
      <defs>
        <linearGradient
          id={crossId}
          x1="36"
          y1="28"
          x2="204"
          y2="156"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--brand-logo-from, #0f766e)" />
          <stop offset="1" stopColor="var(--brand-logo-to, #0b6e99)" />
        </linearGradient>
        <linearGradient
          id={handId}
          x1="156"
          y1="96"
          x2="84"
          y2="148"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--brand-logo-to, #0b6e99)" />
          <stop offset="1" stopColor="var(--brand-logo-from, #0f766e)" />
        </linearGradient>
      </defs>

      <path
        fill={`url(#${crossId})`}
        d="M98 18h44c8 0 14 6 14 14v28h28c8 0 14 6 14 14v44c0 8-6 14-14 14h-28v28c0 8-6 14-14 14H98c-8 0-14-6-14-14v-28H56c-8 0-14-6-14-14V74c0-8 6-14 14-14h28V32c0-8 6-14 14-14z"
      />

      <circle cx="120" cy="62" r="13" fill="#fff" />
      <path
        fill="var(--brand-logo-figure, #0f2f3a)"
        d="M102 78c6-8 14-12 18-12s12 4 18 12c-4 10-11 16-18 16s-14-6-18-16z"
      />
      <path
        fill="none"
        stroke="var(--brand-logo-figure, #0f2f3a)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M120 118c-14-10-22-18-22-28 0-7 5-12 12-12 4 0 7 2 10 5 3-3 6-5 10-5 7 0 12 5 12 12 0 10-8 18-22 28z"
      />
      <path
        fill={`url(#${handId})`}
        d="M88 132c8 10 20 16 32 16s24-6 32-16c-4 18-18 30-32 30s-28-12-32-30z"
      />

      {variant === "full" ? (
        <g className="app-logo__wordmark">
          <text
            x="120"
            y="188"
            textAnchor="middle"
            fontFamily="Outfit, system-ui, sans-serif"
            fontWeight="700"
            fontSize="34"
            fill="var(--brand-logo-title, #047857)"
          >
            Hospital
          </text>
          <text
            x="120"
            y="210"
            textAnchor="middle"
            fontFamily="Outfit, system-ui, sans-serif"
            fontWeight="500"
            fontSize="14"
            letterSpacing="0.04em"
            fill="var(--brand-logo-subtitle, #5a7380)"
          >
            Management System
          </text>
        </g>
      ) : null}
    </svg>
  );
}
