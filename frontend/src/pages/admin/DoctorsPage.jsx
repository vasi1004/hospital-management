import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useAppSelector } from "@/store/hooks";
import {
  createDoctorRequest,
  listDepartmentsRequest,
  listDoctorsRequest,
  setDoctorActiveRequest,
  updateDoctorRequest,
} from "@/services/hmsApi";
import { ADMIN_NAV } from "@/constants/nav";

const EMPTY = {
  first_name: "",
  last_name: "",
  specialization: "",
  department_id: "",
  experience_years: 0,
  phone: "",
  email: "",
  license_number: "",
  available_days: "Mon,Tue,Wed,Thu,Fri",
  available_from: "09:00",
  available_to: "17:00",
  consultation_fee: 500,
  is_active: true,
};

export function DoctorsPage() {
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [docs, deps] = await Promise.all([
        listDoctorsRequest(accessToken, {
          search,
          status,
          page: 1,
          page_size: 50,
        }),
        listDepartmentsRequest(accessToken, true),
      ]);
      setItems(docs.items || []);
      setDepartments(Array.isArray(deps) ? deps : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = window.setTimeout(load, 200);
    return () => window.clearTimeout(t);
  }, [accessToken, search, status]);

  if (!user) return <Navigate to="/login" replace />;

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function startEdit(doc) {
    setEditingId(doc.id);
    setForm({
      first_name: doc.first_name,
      last_name: doc.last_name,
      specialization: doc.specialization,
      department_id: doc.department_id || "",
      experience_years: doc.experience_years || 0,
      phone: doc.phone,
      email: doc.email || "",
      license_number: doc.license_number || "",
      available_days: doc.available_days || "",
      available_from: doc.available_from ? String(doc.available_from).slice(0, 5) : "",
      available_to: doc.available_to ? String(doc.available_to).slice(0, 5) : "",
      consultation_fee: Number(doc.consultation_fee || 0),
      is_active: doc.is_active,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (
      !form.first_name.trim() ||
      !form.last_name.trim() ||
      !form.specialization.trim() ||
      phoneDigits.length !== 10
    ) {
      setError("First name, last name, specialization, and 10-digit phone are required");
      return;
    }

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      specialization: form.specialization.trim(),
      department_id: form.department_id ? Number(form.department_id) : null,
      experience_years: Number(form.experience_years) || 0,
      phone: phoneDigits,
      email: form.email.trim() || null,
      license_number: form.license_number.trim() || null,
      available_days: form.available_days.trim() || null,
      available_from: form.available_from || null,
      available_to: form.available_to || null,
      consultation_fee: Number(form.consultation_fee) || 0,
      is_active: Boolean(form.is_active),
    };

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateDoctorRequest(accessToken, editingId, payload);
      } else {
        await createDoctorRequest(accessToken, payload);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(doc) {
    try {
      await setDoctorActiveRequest(accessToken, doc.id, !doc.is_active);
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
      title="Doctors"
    >
      <div className="ui-panel ui-panel-pad mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="ui-label flex-1">
          Search
          <input
            className="ui-input"
            placeholder="Name, code, specialization…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="ui-label">
          Status
          <select
            className="ui-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} className="ui-panel ui-panel-pad">
          <h2 className="ui-title text-base">
            {editingId ? "Edit doctor" : "Add doctor"}
          </h2>
          <div className="mt-4 grid gap-3">
            {[
              ["first_name", "First name *"],
              ["last_name", "Last name *"],
              ["specialization", "Specialization *"],
              ["phone", "Phone *"],
              ["email", "Email"],
              ["license_number", "License number"],
              ["available_days", "Available days"],
            ].map(([key, label]) => (
              <label key={key} className="ui-label">
                {label}
                <input
                  className="ui-input"
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                />
              </label>
            ))}
            <label className="ui-label">
              Department
              <select
                className="ui-select"
                value={form.department_id}
                onChange={(e) => update("department_id", e.target.value)}
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="ui-label">
                Experience (yrs)
                <input
                  type="number"
                  min="0"
                  className="ui-input"
                  value={form.experience_years}
                  onChange={(e) => update("experience_years", e.target.value)}
                />
              </label>
              <label className="ui-label">
                Fee
                <input
                  type="number"
                  min="0"
                  className="ui-input"
                  value={form.consultation_fee}
                  onChange={(e) => update("consultation_fee", e.target.value)}
                />
              </label>
              <label className="ui-label">
                From
                <input
                  type="time"
                  className="ui-input"
                  value={form.available_from}
                  onChange={(e) => update("available_from", e.target.value)}
                />
              </label>
              <label className="ui-label">
                To
                <input
                  type="time"
                  className="ui-input"
                  value={form.available_to}
                  onChange={(e) => update("available_to", e.target.value)}
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => update("is_active", e.target.checked)}
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
                <th>Doctor</th>
                <th>Specialization</th>
                <th>Department</th>
                <th>Exp</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="ui-muted">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="ui-muted">
                    No doctors found.
                  </td>
                </tr>
              ) : (
                items.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div className="font-semibold">
                        Dr. {doc.first_name} {doc.last_name}
                      </div>
                      <div className="ui-muted text-xs">{doc.doctor_code}</div>
                    </td>
                    <td>{doc.specialization}</td>
                    <td>{doc.department_name || "—"}</td>
                    <td>{doc.experience_years} yrs</td>
                    <td>{doc.phone}</td>
                    <td>
                      <span
                        className={`ui-badge ${
                          doc.is_active ? "ui-badge-ok" : "ui-badge-muted"
                        }`}
                      >
                        {doc.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="ui-link"
                          onClick={() => startEdit(doc)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ui-link text-[var(--coral)]"
                          onClick={() => toggleActive(doc)}
                        >
                          {doc.is_active ? "Deactivate" : "Activate"}
                        </button>
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
