import { NavLink } from "react-router-dom";
import { APP_NAME } from "@/constants/urls";
import { roleLabel } from "@/constants/roles";
import { useAppDispatch } from "@/store/hooks";
import { logout } from "@/features/login";

export function RoleLayout({ user, subtitle, navItems, title, children }) {
  const dispatch = useAppDispatch();

  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="relative flex flex-col gap-6 overflow-hidden border-b border-white/10 bg-[#071525] px-4 py-5 text-slate-200 lg:min-h-dvh lg:border-b-0 lg:border-r">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(43,108,176,0.4), transparent 40%), radial-gradient(circle at 80% 80%, rgba(196,146,42,0.16), transparent 35%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative px-2 pt-1">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2b6cb0] to-[#1a4a7c] font-display text-sm font-bold text-white shadow-lg shadow-blue-950/40">
            H+
          </div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#8fb4e0]">
            Care continuum
          </p>
          <p className="mt-1 font-display text-[1.05rem] font-bold tracking-tight text-white">
            {APP_NAME}
          </p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>

        <nav className="relative flex flex-1 flex-wrap gap-1.5 lg:flex-col" aria-label="Main">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition",
                  isActive
                    ? "bg-[#2b6cb0] text-white shadow-lg shadow-blue-950/40"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="relative rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur">
          <p className="text-sm font-semibold text-white">
            {user?.full_name || user?.username}
          </p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.14em] text-[#a8c4e8]">
            {roleLabel(user?.role)}
          </p>
          <button
            type="button"
            className="mt-3 w-full rounded-xl border border-white/15 bg-[#0b1f2a]/60 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-[#2b6cb0] hover:bg-[#2b6cb0]"
            onClick={() => dispatch(logout())}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-col">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 420px at 100% -10%, rgba(43,108,176,0.12), transparent 55%), radial-gradient(700px 360px at 0% 100%, rgba(196,146,42,0.07), transparent 50%), linear-gradient(180deg, #eef2f6 0%, #e6ecf2 100%)",
          }}
        />
        <header className="relative border-b border-[#d5e0e6]/80 bg-white/70 px-5 py-4 backdrop-blur-md">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#2b6cb0]">
            Workspace
          </p>
          <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-[#0b1f2a]">
            {title}
          </h1>
        </header>
        <div className="relative flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}
