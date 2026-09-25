import { useEffect, useId, useState } from "react";
import {
  createDoctorRequest,
  updateDoctorRequest,
} from "@/services/hmsApi";
import "./AdminFormModal.css";

const EMPTY = {
  first_name: "",
  last_name: "",
  specialization: "",
  department_id: "",
  experience_years: 0,
  phone: "",
  email: "",
  license_number: "",
  consultation_fee: 500,
  auth_user_id: "",
  is_active: true,
};

export function DoctorFormModal({
  mode = "create",
  accessToken,
  departments = [],
  doctorUsers = [],
  editingDoctor = null,
  onClose,
  onSuccess,
}) {
  const isEdit = mode === "edit" && editingDoctor;
  const firstNameId = useId();
  const lastNameId = useId();
  const specId = useId();
  const phoneId = useId();
  const emailId = useId();
  const licenseId = useId();
  const authId = useId();
  const deptId = useId();
  const expId = useId();
  const feeId = useId();
  const activeId = useId();

  const [form, setForm] = useState(() => {
    if (!isEdit) return { ...EMPTY };
    return {
      first_name: editingDoctor.first_name || "",
      last_name: editingDoctor.last_name || "",
      specialization: editingDoctor.specialization || "",
      department_id: editingDoctor.department_id || "",
      experience_years: editingDoctor.experience_years || 0,
      phone: editingDoctor.phone || "",
      email: editingDoctor.email || "",
      license_number: editingDoctor.license_number || "",
      consultation_fee: Number(editingDoctor.consultation_fee || 0),
      auth_user_id: editingDoctor.auth_user_id || "",
      is_active: Boolean(editingDoctor.is_active),
    };
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !saving) onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  function update(name, value) {
    setError(null);
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!accessToken) {
      setError("Your session expired. Please sign in again.");
      return;
    }
    const phoneDigits = String(form.phone).replace(/\D/g, "");
    if (
      !form.first_name.trim() ||
      !form.last_name.trim() ||
      !form.specialization.trim() ||
      phoneDigits.length !== 10
    ) {
      setError(
        "First name, last name, specialization, and 10-digit phone are required.",
      );
      return;
    }
    if (!form.auth_user_id) {
      setError("Link a doctor login account is required.");
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
      consultation_fee: Number(form.consultation_fee) || 0,
      auth_user_id: Number(form.auth_user_id),
      is_active: Boolean(form.is_active),
    };

    setSaving(true);
    setError(null);
    try {
      const saved = isEdit
        ? await updateDoctorRequest(accessToken, editingDoctor.id, payload)
        : await createDoctorRequest(accessToken, payload);
      onSuccess?.(saved, isEdit ? "edit" : "create");
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save doctor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose?.();
      }}
    >
      <form
        className="admin-modal"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="doctor-modal-title"
        noValidate
      >
        <header className="admin-modal__head">
          <div>
            <p className="screen-kicker">{isEdit ? "Edit" : "Create"}</p>
            <h2 id="doctor-modal-title" className="ui-title text-base">
              {isEdit ? "Edit doctor" : "Add doctor"}
            </h2>
            <p className="ui-muted mt-1 text-sm">
              Profile and login link only — availability is set by the doctor.
            </p>
          </div>
          <button
            type="button"
            className="ui-btn ui-btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            Close
          </button>
        </header>

        <div className="admin-modal__body">
          <p className="admin-modal__note">
            New doctors start as not bookable until they publish hours in their
            Availability screen.
          </p>

          <div className="admin-modal__grid-2">
            <label className="ui-label" htmlFor={firstNameId}>
              First name *
              <input
                id={firstNameId}
                className="ui-input"
                value={form.first_name}
                disabled={saving}
                onChange={(e) => update("first_name", e.target.value)}
                required
              />
            </label>
            <label className="ui-label" htmlFor={lastNameId}>
              Last name *
              <input
                id={lastNameId}
                className="ui-input"
                value={form.last_name}
                disabled={saving}
                onChange={(e) => update("last_name", e.target.value)}
                required
              />
            </label>
          </div>

          <label className="ui-label" htmlFor={specId}>
            Specialization *
            <input
              id={specId}
              className="ui-input"
              value={form.specialization}
              disabled={saving}
              onChange={(e) => update("specialization", e.target.value)}
              required
            />
          </label>

          <div className="admin-modal__grid-2">
            <label className="ui-label" htmlFor={phoneId}>
              Phone *
              <input
                id={phoneId}
                className="ui-input"
                value={form.phone}
                disabled={saving}
                onChange={(e) => update("phone", e.target.value)}
                required
              />
            </label>
            <label className="ui-label" htmlFor={emailId}>
              Email
              <input
                id={emailId}
                className="ui-input"
                type="email"
                value={form.email}
                disabled={saving}
                onChange={(e) => update("email", e.target.value)}
              />
            </label>
          </div>

          <label className="ui-label" htmlFor={licenseId}>
            License number
            <input
              id={licenseId}
              className="ui-input"
              value={form.license_number}
              disabled={saving}
              onChange={(e) => update("license_number", e.target.value)}
            />
          </label>

          <label className="ui-label" htmlFor={authId}>
            Login account (doctor role) *
            <select
              id={authId}
              className="ui-select"
              value={form.auth_user_id}
              disabled={saving}
              onChange={(e) => update("auth_user_id", e.target.value)}
              required
            >
              <option value="">Select auth user</option>
              {doctorUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                  {u.full_name ? ` · ${u.full_name}` : ""} ({u.email})
                </option>
              ))}
            </select>
          </label>

          <label className="ui-label" htmlFor={deptId}>
            Department
            <select
              id={deptId}
              className="ui-select"
              value={form.department_id}
              disabled={saving}
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

          <div className="admin-modal__grid-2">
            <label className="ui-label" htmlFor={expId}>
              Experience (yrs)
              <input
                id={expId}
                type="number"
                min="0"
                className="ui-input"
                value={form.experience_years}
                disabled={saving}
                onChange={(e) => update("experience_years", e.target.value)}
              />
            </label>
            <label className="ui-label" htmlFor={feeId}>
              Consultation fee
              <input
                id={feeId}
                type="number"
                min="0"
                className="ui-input"
                value={form.consultation_fee}
                disabled={saving}
                onChange={(e) => update("consultation_fee", e.target.value)}
              />
            </label>
          </div>

          <label className="admin-modal__active" htmlFor={activeId}>
            <input
              id={activeId}
              type="checkbox"
              checked={form.is_active}
              disabled={saving}
              onChange={(e) => update("is_active", e.target.checked)}
            />
            <span>Doctor profile is active</span>
          </label>
        </div>

        {error ? (
          <p className="ui-alert-error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="admin-modal__foot">
          <button
            type="button"
            className="ui-btn ui-btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
            disabled={saving}
          >
            {saving
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
                ? "Save changes"
                : "Create doctor"}
          </button>
        </footer>
      </form>
    </div>
  );
}
