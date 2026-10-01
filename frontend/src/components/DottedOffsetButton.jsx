import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAnimate, useReducedMotion } from "motion/react";

const radiusFromPercent = (w, h, pct) =>
  (Math.min(w, h) / 2) * (Math.max(0, Math.min(100, pct)) / 100);

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const DEFAULT_TRANSITION = {
  mass: 1,
  type: "spring",
  damping: 25,
  stiffness: 400,
};

/**
 * Originkit-style dotted offset button (product-sized defaults).
 */
export function DottedOffsetButton({
  label = "Continue",
  showText = true,
  padding = "0.72rem 1.15rem",
  rounded = 28,
  colors = {
    fill: "#18181b",
    hoverFill: "#18181b",
    textColor: "#ffffff",
    hoverTextColor: "#ffffff",
  },
  addIcon = false,
  icon = {
    side: "right",
    size: 16,
    type: "symbol",
    color: "#ffffff",
    symbol: "→",
    padding: 0,
    rounded: 0,
    hoverColor: "#00ff99",
  },
  gap = 8,
  border = {
    borderColor: "#ffffff",
    borderStyle: "dotted",
    borderWidth: 2,
  },
  hover = {
    offsetX: 8,
    offsetY: 8,
    rounded: 22,
    borderColor: "#ffffff",
  },
  shadow = { color: "#00ff99", side: "right", distance: 8 },
  font = {
    fontFamily: "Outfit, system-ui, sans-serif",
    fontSize: "0.92rem",
    fontWeight: 600,
    letterSpacing: "-0.01em",
    lineHeight: 1.2,
  },
  link = "",
  transition = DEFAULT_TRANSITION,
  newTab = false,
  type = "button",
  disabled = false,
  onClick,
  className = "",
  style,
  children,
}) {
  const fill = colors?.fill ?? "#18181b";
  const textColor = colors?.textColor ?? "#ffffff";
  const restBorderColor = border?.borderColor ?? "transparent";

  const hoverFill = hover?.fill ?? colors?.hoverFill ?? fill;
  const hoverTextColor = hover?.textColor ?? colors?.hoverTextColor ?? textColor;
  const hoverBorderColor = hover?.borderColor ?? restBorderColor;
  const hoverRounded = hover?.rounded ?? 22;

  const shadowColor = shadow?.color ?? "#00ff99";
  const shadowSide = shadow?.side ?? "right";
  const shadowDistance = shadow?.distance ?? 8;

  const legacyDist = Math.max(0, Math.round(shadowDistance));
  const shadowX = Math.round(
    hover?.offsetX ?? (shadowSide === "left" ? -legacyDist : legacyDist),
  );
  const shadowY = Math.round(hover?.offsetY ?? legacyDist);

  const [scope, animate] = useAnimate();
  const [radiusBox, setRadiusBox] = useState({ w: 0, h: 0 });
  const iconRef = useRef(null);
  const hovered = useRef(false);
  const reducedMotion = useReducedMotion();

  useIsoLayoutEffect(() => {
    const el = scope.current;
    if (!el) return undefined;
    const read = () =>
      setRadiusBox((prev) =>
        prev.w === el.offsetWidth && prev.h === el.offsetHeight
          ? prev
          : { w: el.offsetWidth, h: el.offsetHeight },
      );
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scope]);

  const radiusPx = radiusFromPercent(radiusBox.w, radiusBox.h, rounded);
  const hoverRadiusPx = radiusFromPercent(radiusBox.w, radiusBox.h, hoverRounded);

  const {
    type: iconKind = "symbol",
    symbol: iconSymbol = "→",
    image: iconImage,
    color: iconColor = "#ffffff",
    hoverColor: iconHoverColor = "#00ff99",
    size: iconSize = 16,
    padding: iconPaddingProp = 0,
    rounded: iconRounded = 0,
    side: iconSide = "right",
  } = icon;

  const iconSrc =
    typeof iconImage === "string"
      ? iconImage
      : iconImage?.src
        ? iconImage.src
        : "";
  const iconMode = iconKind === "image" && iconSrc ? "image" : "symbol";
  const iconPx = Math.max(1, Math.round(iconSize));
  const iconPadPx = Math.max(0, Math.round(iconPaddingProp));
  const iconRadius = radiusFromPercent(iconPx, iconPx, iconRounded);
  const gapPx = Math.max(0, Math.round(gap));

  const labelText = children ?? label;

  const iconEl = !addIcon ? null : iconMode === "image" ? (
    <img
      src={iconSrc}
      alt=""
      aria-hidden
      draggable={false}
      style={{
        width: iconPx,
        height: iconPx,
        margin: iconPadPx,
        objectFit: iconRadius > 0 ? "cover" : "contain",
        borderRadius: Math.min(iconRadius, iconPx / 2),
        display: "block",
        flex: "none",
        pointerEvents: "none",
      }}
    />
  ) : (
    <span
      ref={iconRef}
      aria-hidden
      style={{
        fontSize: iconPx,
        margin: iconPadPx,
        lineHeight: 1,
        color: iconColor,
        flex: "none",
        pointerEvents: "none",
      }}
    >
      {iconSymbol}
    </span>
  );

  const apply = useCallback(
    (toHover, instant) => {
      if (!scope.current || disabled) return;
      const t = instant || reducedMotion ? { duration: 0 } : transition;
      animate(
        scope.current,
        toHover
          ? {
              x: -shadowX,
              y: -shadowY,
              borderRadius: hoverRadiusPx,
              backgroundColor: hoverFill,
              color: hoverTextColor,
              borderColor: hoverBorderColor,
              boxShadow: `${shadowX}px ${shadowY}px 0px ${shadowColor}`,
            }
          : {
              x: 0,
              y: 0,
              borderRadius: radiusPx,
              backgroundColor: fill,
              color: textColor,
              borderColor: restBorderColor,
              boxShadow: `0px 0px 0px ${shadowColor}`,
            },
        t,
      );
      if (iconRef.current) {
        animate(
          iconRef.current,
          { color: toHover ? iconHoverColor : iconColor },
          t,
        );
      }
    },
    [
      animate,
      scope,
      transition,
      reducedMotion,
      disabled,
      shadowX,
      shadowY,
      shadowColor,
      radiusPx,
      hoverRadiusPx,
      fill,
      hoverFill,
      textColor,
      hoverTextColor,
      restBorderColor,
      hoverBorderColor,
      iconColor,
      iconHoverColor,
    ],
  );

  useEffect(() => {
    apply(hovered.current, true);
  }, [apply]);

  const onEnter = () => {
    if (disabled) return;
    hovered.current = true;
    apply(true, false);
  };
  const onLeave = () => {
    hovered.current = false;
    apply(false, false);
  };
  const onDown = () => {
    if (disabled) return;
    apply(false, false);
  };
  const onUp = () => apply(hovered.current, false);

  const isLink = typeof link === "string" && link.length > 0;
  const Tag = isLink ? "a" : "button";
  const tagProps = isLink
    ? {
        href: link,
        target: newTab ? "_blank" : undefined,
        rel: newTab ? "noopener noreferrer" : undefined,
      }
    : { type, disabled, onClick };

  const { borderColor: _bc, ...borderBox } = border || {};

  return (
    <div
      className={["dotted-offset-wrap", className].filter(Boolean).join(" ")}
      style={{
        display: "inline-block",
        boxSizing: "border-box",
        paddingLeft: Math.max(0, shadowX),
        paddingTop: Math.max(0, shadowY),
        paddingRight: Math.max(0, -shadowX),
        paddingBottom: Math.max(0, -shadowY),
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      <Tag
        {...tagProps}
        aria-label={showText ? undefined : label || undefined}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onPointerDown={onDown}
        onPointerUp={onUp}
        style={{
          display: "inline-flex",
          width: "100%",
          height: "100%",
          padding: 0,
          border: 0,
          background: "transparent",
          color: "inherit",
          font: "inherit",
          textDecoration: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <span
          ref={scope}
          style={{
            display: "inline-block",
            width: "100%",
            padding,
            ...borderBox,
            borderColor: restBorderColor,
            borderRadius: radiusPx,
            backgroundColor: fill,
            boxSizing: "border-box",
            whiteSpace: "nowrap",
            ...font,
            color: textColor,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: iconEl && showText ? gapPx : 0,
              flexDirection: iconSide === "right" ? "row-reverse" : "row",
            }}
          >
            {iconEl}
            {showText ? <span>{labelText}</span> : null}
          </span>
        </span>
      </Tag>
    </div>
  );
}

export default DottedOffsetButton;
