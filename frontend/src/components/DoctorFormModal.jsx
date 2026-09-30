import { useEffect, useId, useMemo, useState } from "react";
import { createUserRequest } from "@/features/login/loginApi";
import {
  createDoctorRequest,
  updateDoctorRequest,
} from "@/services/hmsApi";
import "./DoctorFormModal.css";

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

function suggestUsername(first, last) {
  const a = String(first || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  const b = String(last || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  const base = [a, b].filter(Boolean).join(".") || "doctor";
  return base.slice(0, 90);
}

/** Inline specialty glyph matched from the live specialty/department name. */
function SpecialtyIcon({ name }) {
  const key = String(name || "").toLowerCase();
  const common = {
    className: "doc-chip__icon",
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.85,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (/cardio|heart/.test(key)) {
    return (
      <svg {...common}>
        <path d="M19.5 12.5c1.8-1.9 1.8-4.8 0-6.6a4.4 4.4 0 0 0-6.3 0L12 7l-1.2-1.1a4.4 4.4 0 0 0-6.3 0c-1.8 1.8-1.8 4.7 0 6.6L12 20l7.5-7.5Z" />
      </svg>
    );
  }
  if (/ortho|bone|joint|fracture/.test(key)) {
    return (
      <svg {...common}>
        <path d="M8 8c-1.5-1.5-1.5-4 0-5.5S12 1 13.5 2.5 15 7 13.5 8.5L8 14c-1.5 1.5-4 1.5-5.5 0S1 10 2.5 8.5 7 6.5 8 8Z" />
        <path d="M16 16c1.5 1.5 1.5 4 0 5.5S12 23 10.5 21.5 9 17 10.5 15.5L16 10c1.5-1.5 4-1.5 5.5 0S23 14 21.5 15.5 17 17.5 16 16Z" />
      </svg>
    );
  }
  if (/pedia|child|neonat/.test(key)) {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M6.5 19.5c1.2-3 3.2-4.5 5.5-4.5s4.3 1.5 5.5 4.5" />
        <path d="M9 11.5 7.5 14M15 11.5 16.5 14" />
      </svg>
    );
  }
  if (/derma|skin|cosmet/.test(key)) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="7.5" />
        <circle cx="9.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="14.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
        <path d="M9.5 14.5c1.2 1.2 3.8 1.2 5 0" />
      </svg>
    );
  }
  if (/neuro|brain|psych|mental/.test(key)) {
    return (
      <svg {...common}>
        <path d="M9.5 4.5a4.2 4.2 0 0 1 5 0 4 4 0 0 1 4 4.2c0 3.4-2.2 5.2-4 6.5v3.3H9.5v-3.3c-1.8-1.3-4-3.1-4-6.5a4 4 0 0 1 4-4.2Z" />
        <path d="M10 21h4" />
      </svg>
    );
  }
  if (/dent|oral|tooth/.test(key)) {
    return (
      <svg {...common}>
        <path d="M8 4.5c2-.8 6-.8 8 0 1.4.6 2.2 2 2 3.6-.4 2.6-1.6 4-2.4 7.4-.4 1.5-1.2 3.5-2.4 3.5s-1.6-2-2.2-3.2c-.6 1.2-1.1 3.2-2.2 3.2s-2-2-2.4-3.5C7.6 12.1 6.4 10.7 6 8.1c-.2-1.6.6-3 2-3.6Z" />
      </svg>
    );
  }
  if (/eye|ophthal|vision/.test(key)) {
    return (
      <svg {...common}>
        <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="2.6" />
      </svg>
    );
  }
  if (/ent|ear|nose|throat/.test(key)) {
    return (
      <svg {...common}>
        <path d="M8 10a4 4 0 1 1 6.5 3.1c-.8.6-1.3 1.4-1.3 2.4V18" />
        <circle cx="13.2" cy="19.2" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (/gyn|obstet|women|fertil/.test(key)) {
    return (
      <svg {...common}>
        <circle cx="12" cy="9" r="4" />
        <path d="M12 13v7M9.5 17.5H14.5" />
      </svg>
    );
  }
  if (/emerg|trauma|casualty|icu|critical/.test(key)) {
    return (
      <svg {...common}>
        <path d="M13 3 5.5 13.5h5L9.5 21 18.5 10h-5L13 3Z" />
      </svg>
    );
  }
  if (/radio|scan|imaging|x-?ray/.test(key)) {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 9h8M8 12h8M8 15h5" />
      </svg>
    );
  }
  if (/onco|cancer/.test(key)) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 5v2M12 17v2M5 12h2M17 12h2M7.2 7.2l1.4 1.4M15.4 15.4l1.4 1.4M16.8 7.2l-1.4 1.4M8.6 15.4l-1.4 1.4" />
      </svg>
    );
  }
  if (/pulmon|lung|respir|chest/.test(key)) {
    return (
      <svg {...common}>
        <path d="M8 20c-2.5 0-4-2-4-4.5V10a3.5 3.5 0 0 1 7 0v9.5" />
        <path d="M16 20c2.5 0 4-2 4-4.5V10a3.5 3.5 0 0 0-7 0v9.5" />
        <path d="M12 10v10" />
      </svg>
    );
  }
  if (/nephro|kidney|uro/.test(key)) {
    return (
      <svg {...common}>
        <path d="M12 4c3.5 1.5 5.5 4.5 5.5 8S14.8 19 12 20.5C9.2 19 6.5 15.5 6.5 12S8.5 5.5 12 4Z" />
        <path d="M12 8.5v7" />
      </svg>
    );
  }
  if (/gastro|digest|liver|hepat/.test(key)) {
    return (
      <svg {...common}>
        <path d="M8 6c3-2 5-2 8 0 2 1.4 3 4 2 7s-3.5 5-6 6c-2.5-1-5-3-6-6s0-5.6 2-7Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M9.5 3.5h5v5.5H20.5v5H14.5V20h-5v-6H3.5v-5h6Z" />
    </svg>
  );
}

/**
 * Add / Edit doctor.
 * Create pattern: create a new doctor login in-form (default), or link an
 * unused existing doctor-role account. Specialty chips from departments.
 */
export function DoctorFormModal({
  mode = "create",
  accessToken,
  departments = [],
  doctorUsers = [],
  linkedAuthUserIds = [],
  editingDoctor = null,
  onClose,
  onSuccess,
}) {
  const isEdit = mode === "edit" && editingDoctor;
  const firstNameId = useId();
  const lastNameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const licenseId = useId();
  const authId = useId();
  const expId = useId();
  const feeId = useId();
  const activeId = useId();
  const loginSearchId = useId();
  const loginUserId = useId();
  const loginPassId = useId();
  const loginEmailId = useId();

  const [form, setForm] = useState(() => {
    if (!isEdit) return { ...EMPTY };
    return {
      first_name: editingDoctor.first_name || "",
      last_name: editingDoctor.last_name || "",
      specialization: editingDoctor.specialization || "",
      department_id: editingDoctor.department_id
        ? String(editingDoctor.department_id)
        : "",
      experience_years: editingDoctor.experience_years || 0,
      phone: editingDoctor.phone || "",
      email: editingDoctor.email || "",
      license_number: editingDoctor.license_number || "",
      consultation_fee: Number(editingDoctor.consultation_fee || 0),
      auth_user_id: editingDoctor.auth_user_id
        ? String(editingDoctor.auth_user_id)
        : "",
      is_active: Boolean(editingDoctor.is_active),
    };
  });

  // Create: prefer "new" login so admin can finish in one screen.
  const [loginMode, setLoginMode] = useState(isEdit ? "existing" : "new");
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
    email: "",
  });
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loginQuery, setLoginQuery] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const specialtyOptions = useMemo(() => {
    return (departments || [])
      .filter((d) => d && d.name)
      .slice()
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [departments]);

  const availableLogins = useMemo(() => {
    const currentAuthId = isEdit ? editingDoctor?.auth_user_id : null;
    const taken = new Set(
      (linkedAuthUserIds || [])
        .filter((id) => id != null)
        .map((id) => String(id)),
    );
    return (doctorUsers || []).filter((u) => {
      const id = String(u.id);
      if (currentAuthId != null && id === String(currentAuthId)) return true;
      return !taken.has(id);
    });
  }, [doctorUsers, linkedAuthUserIds, isEdit, editingDoctor]);

  const selectedLogin = useMemo(
    () =>
      doctorUsers.find((u) => String(u.id) === String(form.auth_user_id)) ||
      availableLogins.find((u) => String(u.id) === String(form.auth_user_id)) ||
      null,
    [doctorUsers, availableLogins, form.auth_user_id],
  );

  const filteredLogins = useMemo(() => {
    const q = loginQuery.trim().toLowerCase();
    if (!q) return availableLogins;
    return availableLogins.filter((u) => {
      const hay =
        `${u.username} ${u.full_name || ""} ${u.email || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [availableLogins, loginQuery]);

  // Suggest username from doctor name while creating a new login.
  useEffect(() => {
    if (isEdit || loginMode !== "new" || usernameTouched) return;
    setLoginForm((prev) => ({
      ...prev,
      username: suggestUsername(form.first_name, form.last_name),
    }));
  }, [form.first_name, form.last_name, isEdit, loginMode, usernameTouched]);

  // Keep login email in sync with profile email until user edits login email.
  useEffect(() => {
    if (isEdit || loginMode !== "new") return;
    setLoginForm((prev) => {
      if (prev.email && prev.email !== form.email) return prev;
      return { ...prev, email: form.email || "" };
    });
  }, [form.email, isEdit, loginMode]);

  // Auto-pick sole free login when linking existing.
  useEffect(() => {
    if (loginMode !== "existing") return;
    if (form.auth_user_id) return;
    if (availableLogins.length !== 1) return;
    setForm((prev) => ({
      ...prev,
      auth_user_id: String(availableLogins[0].id),
    }));
  }, [loginMode, form.auth_user_id, availableLogins]);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !saving) {
        if (loginOpen) {
          setLoginOpen(false);
          return;
        }
        onClose?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving, loginOpen]);

  function update(name, value) {
    setError(null);
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function updateLogin(name, value) {
    setError(null);
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  }

  function selectSpecialty(dept) {
    setError(null);
    setForm((prev) => ({
      ...prev,
      specialization: dept.name,
      department_id: String(dept.id),
    }));
  }

  function selectLogin(user) {
    update("auth_user_id", String(user.id));
    setLoginQuery("");
    setLoginOpen(false);
  }

  function switchLoginMode(next) {
    setError(null);
    setLoginMode(next);
    if (next === "new") {
      update("auth_user_id", "");
    }
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
        "First name, last name, specialty, and 10-digit phone are required.",
      );
      return;
    }

    let authUserId = form.auth_user_id ? Number(form.auth_user_id) : null;

    setSaving(true);
    setError(null);
    try {
      if (!isEdit && loginMode === "new") {
        const username = loginForm.username.trim();
        const password = loginForm.password;
        const loginEmail = (loginForm.email || form.email || "").trim();
        if (username.length < 3) {
          setError("Login username must be at least 3 characters.");
          setSaving(false);
          return;
        }
        if (password.length < 8) {
          setError("Login password must be at least 8 characters.");
          setSaving(false);
          return;
        }
        if (!loginEmail || !loginEmail.includes("@")) {
          setError("Login email is required to create the doctor account.");
          setSaving(false);
          return;
        }

        const createdUser = await createUserRequest(
          {
            username,
            email: loginEmail,
            password,
            full_name: `Dr. ${form.first_name.trim()} ${form.last_name.trim()}`,
            role: "doctor",
            is_active: true,
          },
          accessToken,
        );
        authUserId = createdUser.id;
      } else if (!authUserId) {
        setLoginOpen(true);
        setError(
          availableLogins.length === 0
            ? "No free doctor login available. Switch to “New login” to create one here."
            : "Select an existing doctor login, or switch to “New login”.",
        );
        setSaving(false);
        return;
      }

      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        specialization: form.specialization.trim(),
        department_id: form.department_id ? Number(form.department_id) : null,
        experience_years: Number(form.experience_years) || 0,
        phone: phoneDigits,
        email: form.email.trim() || loginForm.email.trim() || null,
        license_number: form.license_number.trim() || null,
        consultation_fee: Number(form.consultation_fee) || 0,
        auth_user_id: Number(authUserId),
        is_active: Boolean(form.is_active),
      };

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

  const phoneOk = String(form.phone).replace(/\D/g, "").length === 10;
  const newLoginOk =
    loginForm.username.trim().length >= 3 &&
    loginForm.password.length >= 8 &&
    String(loginForm.email || form.email || "").includes("@");
  const existingLoginOk = Boolean(form.auth_user_id);

  const canSubmit =
    Boolean(form.first_name.trim()) &&
    Boolean(form.last_name.trim()) &&
    Boolean(form.specialization.trim()) &&
    phoneOk &&
    specialtyOptions.length > 0 &&
    !saving &&
    (isEdit
      ? existingLoginOk
      : loginMode === "new"
        ? newLoginOk
        : existingLoginOk);

  const initials = `${String(form.first_name || "").trim()[0] || ""}${
    String(form.last_name || "").trim()[0] || ""
  }`.toUpperCase();

  return (
    <div
      className="doc-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose?.();
      }}
    >
      <form
        className="doc-modal"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="doctor-modal-title"
        noValidate
      >
        <header className="doc-modal__head">
          <div className="doc-modal__brand">
            <div className="doc-modal__avatar" aria-hidden="true">
              {initials || "DR"}
            </div>
            <div>
              <p className="doc-modal__kicker">
                {isEdit ? "Edit profile" : "New clinician"}
              </p>
              <h2 id="doctor-modal-title" className="doc-modal__title">
                {isEdit ? "Edit doctor" : "Add doctor"}
              </h2>
              <p className="doc-modal__sub">
                {isEdit
                  ? "Update profile details. Availability stays doctor-owned."
                  : "Create the doctor profile and login in one step — or link an unused doctor account."}
              </p>
            </div>
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

        <div className="doc-modal__layout">
          <div className="doc-modal__main">
            <section className="doc-section">
              <div className="doc-section__label">
                <span>1</span> Identity
              </div>
              <div className="doc-modal__grid-2">
                <label className="ui-label" htmlFor={firstNameId}>
                  First name *
                  <input
                    id={firstNameId}
                    className="ui-input"
                    value={form.first_name}
                    disabled={saving}
                    onChange={(e) => update("first_name", e.target.value)}
                    required
                    autoComplete="given-name"
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
                    autoComplete="family-name"
                  />
                </label>
              </div>
            </section>

            <section className="doc-section">
              <div className="doc-section__label">
                <span>2</span> Specialty *
              </div>
              {specialtyOptions.length === 0 ? (
                <p className="doc-empty">
                  No departments found. Add departments first — they appear here
                  as specialty options.
                </p>
              ) : (
                <div
                  className="doc-chip-row"
                  role="listbox"
                  aria-label="Specialty"
                >
                  {specialtyOptions.map((dept) => {
                    const active =
                      String(form.department_id) === String(dept.id) ||
                      String(form.specialization).toLowerCase() ===
                        String(dept.name).toLowerCase();
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={[
                          "doc-chip",
                          active ? "is-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        disabled={saving}
                        onClick={() => selectSpecialty(dept)}
                      >
                        <span>{dept.name}</span>
                        <SpecialtyIcon name={dept.name} />
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="doc-section">
              <div className="doc-section__label">
                <span>3</span> Contact
              </div>
              <div className="doc-modal__grid-2">
                <label className="ui-label" htmlFor={phoneId}>
                  Phone *
                  <input
                    id={phoneId}
                    className="ui-input"
                    value={form.phone}
                    disabled={saving}
                    onChange={(e) => update("phone", e.target.value)}
                    inputMode="numeric"
                    placeholder="10-digit mobile"
                    required
                  />
                </label>
                <label className="ui-label" htmlFor={emailId}>
                  Profile email
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
            </section>

            <section className="doc-section">
              <div className="doc-section__label">
                <span>4</span> Practice details
              </div>
              <div className="doc-modal__grid-2">
                <label className="ui-label" htmlFor={expId}>
                  Experience (years)
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
                  Consultation fee (₹)
                  <input
                    id={feeId}
                    type="number"
                    min="0"
                    className="ui-input"
                    value={form.consultation_fee}
                    disabled={saving}
                    onChange={(e) =>
                      update("consultation_fee", e.target.value)
                    }
                  />
                </label>
              </div>
            </section>

            <section className="doc-section">
              <div className="doc-section__label">
                <span>5</span> Login account *
              </div>

              {!isEdit ? (
                <div className="doc-login-mode" role="tablist" aria-label="Login mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={loginMode === "new"}
                    className={[
                      "doc-login-mode__btn",
                      loginMode === "new" ? "is-active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={saving}
                    onClick={() => switchLoginMode("new")}
                  >
                    New login
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={loginMode === "existing"}
                    className={[
                      "doc-login-mode__btn",
                      loginMode === "existing" ? "is-active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={saving}
                    onClick={() => switchLoginMode("existing")}
                  >
                    Link existing
                  </button>
                </div>
              ) : null}

              {!isEdit && loginMode === "new" ? (
                <div className="doc-login-create">
                  <p className="doc-hint">
                    Creates a doctor-role user, then links it to this profile
                    automatically.
                  </p>
                  <div className="doc-modal__grid-2">
                    <label className="ui-label" htmlFor={loginUserId}>
                      Username *
                      <input
                        id={loginUserId}
                        className="ui-input"
                        value={loginForm.username}
                        disabled={saving}
                        autoComplete="off"
                        onChange={(e) => {
                          setUsernameTouched(true);
                          updateLogin("username", e.target.value);
                        }}
                      />
                    </label>
                    <label className="ui-label" htmlFor={loginPassId}>
                      Password *
                      <div className="doc-password">
                        <input
                          id={loginPassId}
                          className="ui-input"
                          type={showPassword ? "text" : "password"}
                          value={loginForm.password}
                          disabled={saving}
                          autoComplete="new-password"
                          placeholder="Min 8 characters"
                          onChange={(e) =>
                            updateLogin("password", e.target.value)
                          }
                        />
                        <button
                          type="button"
                          className="doc-password__toggle"
                          onClick={() => setShowPassword((v) => !v)}
                          disabled={saving}
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </label>
                  </div>
                  <label className="ui-label" htmlFor={loginEmailId}>
                    Login email *
                    <input
                      id={loginEmailId}
                      className="ui-input"
                      type="email"
                      value={loginForm.email}
                      disabled={saving}
                      placeholder="Used for sign-in recovery"
                      onChange={(e) => updateLogin("email", e.target.value)}
                    />
                  </label>
                </div>
              ) : (
                <>
                  {availableLogins.length === 0 ? (
                    <p className="doc-empty">
                      {isEdit
                        ? "No alternate free logins available. Keep the current linked account."
                        : "No unused doctor logins found. Use “New login” to create one here."}
                    </p>
                  ) : (
                    <div className="doc-login">
                      <button
                        type="button"
                        id={authId}
                        className={[
                          "doc-login__trigger",
                          form.auth_user_id ? "is-filled" : "",
                          !form.auth_user_id ? "is-required" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        disabled={saving}
                        aria-expanded={loginOpen}
                        onClick={() => setLoginOpen((open) => !open)}
                      >
                        {selectedLogin ? (
                          <span>
                            <strong>
                              {selectedLogin.full_name ||
                                selectedLogin.username}
                            </strong>
                            <em>
                              {selectedLogin.username}
                              {selectedLogin.email
                                ? ` · ${selectedLogin.email}`
                                : ""}
                            </em>
                          </span>
                        ) : (
                          <span className="doc-login__placeholder">
                            Select an unused doctor login *
                          </span>
                        )}
                        <span aria-hidden="true">
                          {loginOpen ? "▴" : "▾"}
                        </span>
                      </button>
                      {loginOpen ? (
                        <div className="doc-login__panel" role="listbox">
                          <label className="sr-only" htmlFor={loginSearchId}>
                            Search login accounts
                          </label>
                          <input
                            id={loginSearchId}
                            className="doc-login__search"
                            type="search"
                            placeholder="Search username, name, email…"
                            value={loginQuery}
                            onChange={(e) => setLoginQuery(e.target.value)}
                            autoFocus
                          />
                          <div className="doc-login__list">
                            {filteredLogins.length === 0 ? (
                              <p className="doc-empty">No matching free logins</p>
                            ) : (
                              filteredLogins.map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  role="option"
                                  aria-selected={
                                    String(u.id) === String(form.auth_user_id)
                                  }
                                  className={[
                                    "doc-login__option",
                                    String(u.id) === String(form.auth_user_id)
                                      ? "is-active"
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                  onClick={() => selectLogin(u)}
                                >
                                  <strong>{u.full_name || u.username}</strong>
                                  <span>
                                    {u.username}
                                    {u.email ? ` · ${u.email}` : ""}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </>
              )}
            </section>

            <label className="doc-active" htmlFor={activeId}>
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

          <aside className="doc-modal__aside" aria-live="polite">
            <div className="doc-preview">
              <p className="doc-preview__eyebrow">Preview</p>
              <div className="doc-preview__avatar" aria-hidden="true">
                {initials || "DR"}
              </div>
              <h3 className="doc-preview__name">
                {form.first_name || form.last_name
                  ? `Dr. ${form.first_name} ${form.last_name}`.trim()
                  : "Doctor name"}
              </h3>
              <p className="doc-preview__spec">
                {form.specialization || "Select a specialty"}
              </p>
              <dl className="doc-preview__stats">
                <div>
                  <dt>Experience</dt>
                  <dd>{Number(form.experience_years || 0)} yrs</dd>
                </div>
                <div>
                  <dt>Fee</dt>
                  <dd>
                    ₹
                    {Number(form.consultation_fee || 0).toLocaleString("en-IN")}
                  </dd>
                </div>
              </dl>
              <p className="doc-preview__note">
                {!isEdit && loginMode === "new"
                  ? "A new doctor login will be created with this profile."
                  : "New doctors stay unbookable until they publish availability."}
              </p>
            </div>
          </aside>
        </div>

        {error ? (
          <p className="ui-alert-error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="doc-modal__foot">
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
            disabled={!canSubmit}
          >
            {saving
              ? isEdit
                ? "Saving…"
                : loginMode === "new"
                  ? "Creating doctor & login…"
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
