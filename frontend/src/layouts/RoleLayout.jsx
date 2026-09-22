import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { APP_NAME } from "@/constants/urls";
import { roleLabel } from "@/constants/roles";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout, refreshCurrentUser } from "@/features/login";
import { AppLogo } from "@/components/AppLogo";
import "./RoleLayout.css";

function profileInitials(profile) {
  const source =
    String(profile?.full_name || "").trim() ||
    String(profile?.username || "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/**
 * @param {object} props
 * @param {boolean} [props.lockViewport=false] When true, page does not scroll (dashboard screens).
 */
export function RoleLayout({
  user: userProp,
  subtitle,
  navItems,
  title,
  children,
  lockViewport = false,
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user: sessionUser, accessToken, status } = useAppSelector(
    (state) => state.auth,
  );
  const [signingOut, setSigningOut] = useState(false);

  // Prefer live session user (refreshed from /auth/me); fall back to page prop.
  const profile = sessionUser || userProp;

  useEffect(() => {
    if (status === "authenticated" && accessToken) {
      dispatch(refreshCurrentUser());
    }
  }, [status, accessToken, dispatch]);

  const displayName = useMemo(() => {
    if (!profile) return "Account";
    return profile.full_name?.trim() || profile.username || "Account";
  }, [profile]);

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await dispatch(logout());
      navigate("/login", { replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div
      className={[
        "grid grid-cols-1 lg:grid-cols-[272px_minmax(0,1fr)]",
        lockViewport
          ? "lg:h-dvh lg:max-h-dvh lg:overflow-hidden min-h-dvh"
          : "min-h-dvh",
      ].join(" ")}
    >
      <aside
        className={[
          "role-sidebar relative flex flex-col gap-6 overflow-hidden px-4 py-5 lg:border-b-0",
          lockViewport ? "lg:h-dvh" : "lg:min-h-dvh",
        ].join(" ")}
      >
        <div className="role-sidebar__glow" aria-hidden="true" />
        <div className="role-sidebar__grid" aria-hidden="true" />

        <div className="relative px-2 pt-1">
          <div className="role-brand">
            <AppLogo variant="full" effect3d className="role-brand__logo" />
          </div>
          <p className="role-sidebar__subtitle mt-3">{subtitle}</p>
          <span className="sr-only">{APP_NAME}</span>
        </div>

        <nav
          className="relative flex flex-1 flex-wrap gap-1.5 lg:flex-col"
          aria-label="Main"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "role-sidebar__link",
                  isActive ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div
        className={[
          "relative flex min-w-0 flex-col",
          lockViewport ? "lg:min-h-0 lg:h-dvh lg:overflow-hidden" : "",
        ].join(" ")}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 420px at 100% -10%, rgba(43,108,176,0.12), transparent 55%), radial-gradient(700px 360px at 0% 100%, rgba(196,146,42,0.07), transparent 50%), linear-gradient(180deg, #eef2f6 0%, #e6ecf2 100%)",
          }}
        />
        <header className="role-header relative shrink-0 border-b border-[#d5e0e6]/80 bg-white/70 px-5 py-3.5 backdrop-blur-md">
          <div className="role-header__title">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#2b6cb0]">
              Workspace
            </p>
            <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-[#0b1f2a]">
              {title}
            </h1>
          </div>

          <div className="role-header__profile" aria-label="Signed-in user">
            <div className="role-header__identity">
              <div className="role-header__avatar" aria-hidden="true">
                {profileInitials(profile)}
              </div>
              <div className="role-header__meta">
                <p className="role-header__name">{displayName}</p>
                <p className="role-header__role">
                  {roleLabel(profile?.role)}
                  {profile?.email ? (
                    <span className="role-header__email"> · {profile.email}</span>
                  ) : null}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="ui-btn ui-btn-ghost role-header__logout"
              onClick={handleLogout}
              disabled={signingOut}
            >
              {signingOut ? "Signing out…" : "Logout"}
            </button>
          </div>
        </header>
        <div
          className={[
            "relative flex-1 p-5",
            lockViewport ? "lg:min-h-0 lg:overflow-hidden" : "",
          ].join(" ")}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
