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
 * Top-rail hospital shell (no left sidebar).
 * @param {boolean} [props.lockViewport=false]
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
  const [menuOpen, setMenuOpen] = useState(false);

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
        "role-shell",
        lockViewport ? "role-shell--locked" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="role-shell__glow" aria-hidden="true" />

      <header className="role-topbar">
        <div className="role-topbar__brand">
          <AppLogo variant="mark" tone="onLight" className="role-topbar__mark" />
          <div className="role-topbar__brand-text">
            <p className="role-topbar__app">{APP_NAME}</p>
            <p className="role-topbar__sub">{subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          className="role-topbar__menu-btn ui-btn ui-btn-ghost"
          aria-expanded={menuOpen}
          aria-controls="role-top-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>

        <nav
          id="role-top-nav"
          className={[
            "role-topbar__nav",
            menuOpen ? "is-open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="Main"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                ["role-topbar__link", isActive ? "is-active" : ""]
                  .filter(Boolean)
                  .join(" ")
              }
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="role-topbar__user">
          <div className="role-topbar__identity">
            <div className="role-topbar__avatar" aria-hidden="true">
              {profileInitials(profile)}
            </div>
            <div className="role-topbar__meta">
              <p className="role-topbar__name">{displayName}</p>
              <p className="role-topbar__role">{roleLabel(profile?.role)}</p>
            </div>
          </div>
          <button
            type="button"
            className="ui-btn ui-btn-ghost role-topbar__logout"
            onClick={handleLogout}
            disabled={signingOut}
          >
            {signingOut ? "Signing out…" : "Logout"}
          </button>
        </div>
      </header>

      <div className="role-pagehead">
        <h1 className="role-pagehead__title">{title}</h1>
      </div>

      <main
        className={[
          "role-main",
          lockViewport ? "role-main--locked" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </main>
    </div>
  );
}
