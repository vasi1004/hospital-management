import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useAppSelector } from "@/store/hooks";
import {
  createDepartmentRequest,
  deactivateDepartmentRequest,
  listDepartmentsRequest,
  updateDepartmentRequest,
} from "@/services/hmsApi";
import { ADMIN_NAV } from "@/constants/nav";

const EMPTY = { name: "", code: "", description: "", is_active: true };

export function DepartmentsPage() {
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  if (!user) return <Navigate to="/login" replace />;

  function startEdit(dept) {
    setEditingId(dept.id);
    setForm({
      name: dept.name,
      code: dept.code,
      description: dept.description || "",
      is_active: dept.is_active,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      setError("Name and code are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        is_active: form.is_active,
      };
      if (editingId) {
        await updateDepartmentRequest(accessToken, editingId, payload);
      } else {
        await createDepartmentRequest(accessToken, payload);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id) {
    try {
      await deactivateDepartmentRequest(accessToken, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <RoleLayout
      user={user}
      subtitle="Admin console"
      navItems={ADMIN_NAV}
      title="Departments"
    >
      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} className="ui-panel ui-panel-pad">
          <h2 className="ui-title text-base">
            {editingId ? "Edit department" : "Add department"}
          </h2>
          <div className="mt-4 grid gap-3">
            <label className="ui-label">
              Name *
              <input
                className="ui-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="ui-label">
              Code *
              <input
                className="ui-input uppercase"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </label>
            <label className="ui-label">
              Description
              <textarea
                className="ui-textarea"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_active: e.target.checked }))
                }
              />
              Active
            </label>
          </div>
          {error ? <p className="ui-alert-error mt-3">{error}</p> : null}
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="ui-btn ui-btn-primary"
            >
              {saving ? "Saving…" : editingId ? "Update" : "Create"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="ui-btn ui-btn-ghost"
                onClick={resetForm}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="ui-muted">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ui-muted">
                    No departments yet.
                  </td>
                </tr>
              ) : (
                items.map((dept) => (
                  <tr key={dept.id}>
                    <td className="font-semibold">{dept.code}</td>
                    <td>
                      <div className="font-medium">{dept.name}</div>
                      {dept.description ? (
                        <div className="ui-muted text-xs">{dept.description}</div>
                      ) : null}
                    </td>
                    <td>
                      <span
                        className={`ui-badge ${
                          dept.is_active ? "ui-badge-ok" : "ui-badge-muted"
                        }`}
                      >
                        {dept.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="ui-link"
                          onClick={() => startEdit(dept)}
                        >
                          Edit
                        </button>
                        {dept.is_active ? (
                          <button
                            type="button"
                            className="ui-link text-[var(--coral)]"
                            onClick={() => handleDeactivate(dept.id)}
                          >
                            Deactivate
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RoleLayout>
  );
}
