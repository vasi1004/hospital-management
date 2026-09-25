import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { DepartmentFormModal } from "@/components/DepartmentFormModal";
import { useAppSelector } from "@/store/hooks";
import {
  deactivateDepartmentRequest,
  listDepartmentsRequest,
} from "@/services/hmsApi";
import { ADMIN_NAV } from "@/constants/nav";
import "./AdminCatalog.css";

export function DepartmentsPage() {
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [modal, setModal] = useState(null);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listDepartmentsRequest(accessToken, false);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [accessToken]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((dept) => {
      const hay = [dept.code, dept.name, dept.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [items, search]);

  const activeCount = useMemo(
    () => items.filter((row) => row.is_active).length,
    [items],
  );

  if (!user) return <Navigate to="/login" replace />;

  async function handleDeactivate(dept) {
    setActionId(dept.id);
    setError(null);
    setSuccess(null);
    try {
      await deactivateDepartmentRequest(accessToken, dept.id);
      setSuccess(`Department ${dept.name} deactivated.`);
      if (modal?.department?.id === dept.id) setModal(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActionId(null);
    }
  }

  return (
    <RoleLayout
      user={user}
      subtitle="Admin console"
      navItems={ADMIN_NAV}
      title="Departments"
    >
      <div className="admin-catalog">
        <header className="screen-toolbar">
          <div>
            <p className="screen-kicker">Organization</p>
            <h2 className="ui-title screen-toolbar__title">Departments</h2>
            <p className="ui-muted screen-toolbar__sub">
              Define clinical units. Doctors are assigned to these when you
              create their profiles.
            </p>
          </div>
          <div className="screen-toolbar__aside">
            <div className="screen-toolbar__stats">
              <div className="screen-stat">
                <span className="screen-stat__label">Total</span>
                <strong className="screen-stat__value">
                  {loading ? "…" : items.length}
                </strong>
              </div>
              <div className="screen-stat">
                <span className="screen-stat__label">Active</span>
                <strong className="screen-stat__value">
                  {loading ? "…" : activeCount}
                </strong>
              </div>
            </div>
            <button
              type="button"
              className="ui-btn ui-btn-primary admin-catalog__create"
              onClick={() => {
                setSuccess(null);
                setError(null);
                setModal({ mode: "create" });
              }}
            >
              Add department
            </button>
          </div>
        </header>

        <section className="screen-panel admin-catalog__board">
          <div className="screen-panel__head">
            <div>
              <p className="screen-kicker">Catalog</p>
              <h3 className="ui-title text-base">Clinical departments</h3>
              <p className="ui-muted mt-1 text-sm">
                {loading
                  ? "Loading…"
                  : `${filtered.length} of ${items.length} shown`}
              </p>
            </div>
            <button
              type="button"
              className="ui-btn ui-btn-ghost"
              onClick={load}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          <div className="admin-catalog__filters admin-catalog__filters--single">
            <label className="ui-label">
              Search
              <input
                className="ui-input"
                type="search"
                placeholder="Code, name, description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>

          {error ? (
            <p className="ui-alert-error mb-3" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="ui-alert-success mb-3" role="status">
              {success}
            </p>
          ) : null}

          {loading ? (
            <p className="ui-muted">Loading departments…</p>
          ) : filtered.length === 0 ? (
            <p className="ui-muted">
              {items.length === 0
                ? "No departments yet. Click Add department to create one."
                : "No departments match your search."}
            </p>
          ) : (
            <div className="admin-catalog__dept-card-grid">
              {filtered.map((dept) => {
                const busy = actionId === dept.id;
                return (
                  <article key={dept.id} className="admin-catalog__dept-card">
                    <div className="admin-catalog__dept-card-top">
                      <div>
                        <span className="admin-catalog__code">{dept.code}</span>
                        <h3>{dept.name}</h3>
                      </div>
                      <span
                        className={`ui-badge ${
                          dept.is_active ? "ui-badge-ok" : "ui-badge-muted"
                        }`}
                      >
                        {dept.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p>
                      {dept.description?.trim()
                        ? dept.description
                        : "No description provided."}
                    </p>
                    <div className="admin-catalog__actions">
                      <button
                        type="button"
                        className="ui-btn ui-btn-ghost"
                        disabled={busy}
                        onClick={() => {
                          setSuccess(null);
                          setError(null);
                          setModal({ mode: "edit", department: dept });
                        }}
                      >
                        Edit
                      </button>
                      {dept.is_active ? (
                        <button
                          type="button"
                          className="ui-btn ui-btn-ghost admin-catalog__danger"
                          disabled={busy}
                          onClick={() => handleDeactivate(dept)}
                        >
                          {busy ? "…" : "Deactivate"}
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {modal ? (
        <DepartmentFormModal
          key={
            modal.mode === "edit"
              ? `edit-${modal.department?.id}`
              : "create-department"
          }
          mode={modal.mode}
          accessToken={accessToken}
          editingDepartment={modal.department || null}
          onClose={() => setModal(null)}
          onSuccess={async (saved, mode) => {
            setSuccess(
              mode === "edit"
                ? `Department ${saved.name} updated.`
                : `Department ${saved.name} created.`,
            );
            setModal(null);
            await load();
          }}
        />
      ) : null}
    </RoleLayout>
  );
}
