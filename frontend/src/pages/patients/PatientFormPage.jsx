import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useAppSelector } from "@/store/hooks";
import {
  createPatientRequest,
  getPatientRequest,
  updatePatientRequest,
} from "@/services/hmsApi";
import { ADMIN_NAV, RECEPTION_NAV } from "@/constants/nav";
import { ROLES } from "@/constants/roles";

const EMPTY = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  gender: "male",
  blood_group: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  emergency_contact_name: "",
  emergency_relationship: "",
  emergency_contact_number: "",
  allergies: "",
  existing_conditions: "",
  medical_history: "",
  is_active: true,
};

function validate(form) {
  const errors = {};
  if (!form.first_name.trim()) errors.first_name = "First name is required";
  if (!form.last_name.trim()) errors.last_name = "Last name is required";
  if (!form.date_of_birth) errors.date_of_birth = "Date of birth is required";
  else if (form.date_of_birth > new Date().toISOString().slice(0, 10)) {
    errors.date_of_birth = "Date of birth cannot be in the future";
  }
  if (!form.gender) errors.gender = "Gender is required";
  const phoneDigits = form.phone.replace(/\D/g, "");
  if (phoneDigits.length !== 10) errors.phone = "Phone must be 10 digits";
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email";
  }
  if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
    errors.pincode = "Pincode must be 6 digits";
  }
  if (
    form.emergency_contact_number &&
    form.emergency_contact_number.replace(/\D/g, "").length !== 10
  ) {
    errors.emergency_contact_number = "Emergency phone must be 10 digits";
  }
  return errors;
}

function Field({ label, error, children }) {
  return (
    <label className="ui-label">
      {label}
      {children}
      {error ? (
        <span className="text-xs font-medium text-[var(--danger)]">{error}</span>
      ) : null}
    </label>
  );
}

export function PatientFormPage({ basePath, mode }) {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(mode !== "create");
  const [saving, setSaving] = useState(false);

  const isView = mode === "view";
  const isEdit = mode === "edit";
  const title =
    mode === "create" ? "Add Patient" : isEdit ? "Edit Patient" : "Patient Details";

  const navItems = useMemo(() => {
    if (user?.role === ROLES.ADMIN) return ADMIN_NAV;
    if (user?.role === ROLES.RECEPTIONIST) return RECEPTION_NAV;
    return [];
  }, [user]);

  const canMutate =
    user?.role === ROLES.ADMIN || user?.role === ROLES.RECEPTIONIST;

  useEffect(() => {
    if (mode === "create" || !patientId || !accessToken) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setApiError(null);
      try {
        const patient = await getPatientRequest(accessToken, patientId);
        if (cancelled) return;
        setForm({
          first_name: patient.first_name || "",
          last_name: patient.last_name || "",
          date_of_birth: patient.date_of_birth || "",
          gender: patient.gender || "male",
          blood_group: patient.blood_group || "",
          phone: patient.phone || "",
          email: patient.email || "",
          address: patient.address || "",
          city: patient.city || "",
          state: patient.state || "",
          country: patient.country || "India",
          pincode: patient.pincode || "",
          emergency_contact_name: patient.emergency_contact_name || "",
          emergency_relationship: patient.emergency_relationship || "",
          emergency_contact_number: patient.emergency_contact_number || "",
          allergies: patient.allergies || "",
          existing_conditions: patient.existing_conditions || "",
          medical_history: patient.medical_history || "",
          is_active: patient.is_active,
          patient_code: patient.patient_code,
          age: patient.age,
        });
      } catch (err) {
        if (!cancelled) {
          setApiError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [mode, patientId, accessToken]);

  if (!user) return <Navigate to="/login" replace />;
  if (!canMutate && mode !== "view") {
    return <Navigate to={basePath} replace />;
  }
  if (![ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR].includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isView) return;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      blood_group: form.blood_group || null,
      phone: form.phone.replace(/\D/g, ""),
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      country: form.country.trim() || null,
      pincode: form.pincode.trim() || null,
      emergency_contact_name: form.emergency_contact_name.trim() || null,
      emergency_relationship: form.emergency_relationship.trim() || null,
      emergency_contact_number: form.emergency_contact_number
        ? form.emergency_contact_number.replace(/\D/g, "")
        : null,
      allergies: form.allergies.trim() || null,
      existing_conditions: form.existing_conditions.trim() || null,
      medical_history: form.medical_history.trim() || null,
      is_active: Boolean(form.is_active),
    };

    setSaving(true);
    setApiError(null);
    try {
      if (mode === "create") {
        await createPatientRequest(accessToken, payload);
      } else {
        await updatePatientRequest(accessToken, patientId, payload);
      }
      navigate(basePath);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleLayout
      user={user}
      subtitle={user.role === ROLES.ADMIN ? "Admin console" : "Front desk"}
      navItems={navItems}
      title={title}
    >
      <div className="mb-4">
        <Link to={basePath} className="ui-link text-sm">
          ← Back to patients
        </Link>
      </div>

      {apiError ? <p className="ui-alert-error mb-4">{apiError}</p> : null}

      {loading ? (
        <p className="ui-muted">Loading…</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="ui-panel ui-panel-pad space-y-5"
          noValidate
        >
          {form.patient_code ? (
            <p className="ui-muted text-sm">
              Patient ID: <strong className="text-[var(--ink)]">{form.patient_code}</strong>
              {form.age != null ? ` · Age ${form.age}` : null}
            </p>
          ) : null}

          <section className="ui-section space-y-3">
            <h2 className="ui-title text-base">Personal Information</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="First Name *" error={errors.first_name}>
                <input
                  className="ui-input"
                  disabled={isView || saving}
                  value={form.first_name}
                  onChange={(e) => update("first_name", e.target.value)}
                />
              </Field>
              <Field label="Last Name *" error={errors.last_name}>
                <input
                  className="ui-input"
                  disabled={isView || saving}
                  value={form.last_name}
                  onChange={(e) => update("last_name", e.target.value)}
                />
              </Field>
              <Field label="Date of Birth *" error={errors.date_of_birth}>
                <input
                  type="date"
                  className="ui-input"
                  disabled={isView || saving}
                  value={form.date_of_birth}
                  onChange={(e) => update("date_of_birth", e.target.value)}
                />
              </Field>
              <Field label="Gender *" error={errors.gender}>
                <select
                  className="ui-select"
                  disabled={isView || saving}
                  value={form.gender}
                  onChange={(e) => update("gender", e.target.value)}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Blood Group">
                <input
                  className="ui-input"
                  disabled={isView || saving}
                  value={form.blood_group}
                  onChange={(e) => update("blood_group", e.target.value)}
                  placeholder="O+"
                />
              </Field>
              <Field label="Phone Number *" error={errors.phone}>
                <input
                  className="ui-input"
                  disabled={isView || saving}
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </Field>
              <Field label="Email" error={errors.email}>
                <input
                  type="email"
                  className="ui-input"
                  disabled={isView || saving}
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="ui-section space-y-3">
            <h2 className="ui-title text-base">Address</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Address">
                <input
                  className="ui-input"
                  disabled={isView || saving}
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                />
              </Field>
              <Field label="City">
                <input
                  className="ui-input"
                  disabled={isView || saving}
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </Field>
              <Field label="State">
                <input
                  className="ui-input"
                  disabled={isView || saving}
                  value={form.state}
                  onChange={(e) => update("state", e.target.value)}
                />
              </Field>
              <Field label="Country">
                <input
                  className="ui-input"
                  disabled={isView || saving}
                  value={form.country}
                  onChange={(e) => update("country", e.target.value)}
                />
              </Field>
              <Field label="Pincode" error={errors.pincode}>
                <input
                  className="ui-input"
                  disabled={isView || saving}
                  value={form.pincode}
                  onChange={(e) => update("pincode", e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="ui-section space-y-3">
            <h2 className="ui-title text-base">Emergency Contact</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Contact Name">
                <input
                  className="ui-input"
                  disabled={isView || saving}
                  value={form.emergency_contact_name}
                  onChange={(e) => update("emergency_contact_name", e.target.value)}
                />
              </Field>
              <Field label="Relationship">
                <input
                  className="ui-input"
                  disabled={isView || saving}
                  value={form.emergency_relationship}
                  onChange={(e) => update("emergency_relationship", e.target.value)}
                />
              </Field>
              <Field
                label="Contact Number"
                error={errors.emergency_contact_number}
              >
                <input
                  className="ui-input"
                  disabled={isView || saving}
                  value={form.emergency_contact_number}
                  onChange={(e) =>
                    update("emergency_contact_number", e.target.value)
                  }
                />
              </Field>
            </div>
          </section>

          <section className="ui-section space-y-3">
            <h2 className="ui-title text-base">Medical Information</h2>
            <div className="grid gap-3">
              <Field label="Allergies">
                <textarea
                  className="ui-textarea"
                  rows={2}
                  disabled={isView || saving}
                  value={form.allergies}
                  onChange={(e) => update("allergies", e.target.value)}
                />
              </Field>
              <Field label="Existing Conditions">
                <textarea
                  className="ui-textarea"
                  rows={2}
                  disabled={isView || saving}
                  value={form.existing_conditions}
                  onChange={(e) => update("existing_conditions", e.target.value)}
                />
              </Field>
              <Field label="Medical History">
                <textarea
                  className="ui-textarea"
                  rows={3}
                  disabled={isView || saving}
                  value={form.medical_history}
                  onChange={(e) => update("medical_history", e.target.value)}
                />
              </Field>
            </div>
          </section>

          {!isView ? (
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.is_active}
                disabled={saving}
                onChange={(e) => update("is_active", e.target.checked)}
              />
              Active patient
            </label>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            {!isView ? (
              <button
                type="submit"
                disabled={saving}
                className="ui-btn ui-btn-primary"
              >
                {saving ? "Saving…" : mode === "create" ? "Create patient" : "Save changes"}
              </button>
            ) : canMutate ? (
              <button
                type="button"
                className="ui-btn ui-btn-primary"
                onClick={() => navigate(`${basePath}/${patientId}/edit`)}
              >
                Edit patient
              </button>
            ) : null}
            <button
              type="button"
              className="ui-btn ui-btn-ghost"
              onClick={() => navigate(basePath)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </RoleLayout>
  );
}
