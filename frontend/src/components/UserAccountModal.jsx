import { useEffect, useId, useState } from "react";
import {
  createUserRequest,
  updateUserRequest,
} from "@/features/login/loginApi";
import "./UserAccountModal.css";

const EMPTY_FORM = {
  username: "",
  email: "",
  password: "",
  full_name: "",
  role: "",
  is_active: true,
};

/**
 * Popup to create or edit a login account.
 * @param {"create"|"edit"} mode
 */
export function UserAccountModal({
  mode = "create",
  accessToken,
  roleOptions = [],
  defaultRole = "",
  editingUser = null,
  onClose,
  onSuccess,
}) {
  const usernameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const fullNameId = useId();
  const roleId = useId();
  const activeId = useId();

  const isEdit = mode === "edit" && editingUser;

  const [form, setForm] = useState(() => {
    if (isEdit) {
      return {
        username: editingUser.username || "",
        email: editingUser.email || "",
        password: "",
        full_name: editingUser.full_name || "",
        role: editingUser.role || defaultRole,
        is_active: Boolean(editingUser.is_active),
      };
    }
    return { ...EMPTY_FORM, role: defaultRole };
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !saving) onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  function updateField(name, value) {
    setError(null);
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const canSubmit = isEdit
    ? form.email.trim().length > 3 && Boolean(form.role) && !saving
    : form.username.trim().length >= 3 &&
      form.email.trim().length > 3 &&
      form.password.length >= 8 &&
      Boolean(form.role) &&
      !saving;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!accessToken) {
      setError("Your session expired. Please sign in again.");
      return;
    }
    if (!form.role) {
      setError("Select a role from the server catalog.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        const updated = await updateUserRequest(accessToken, editingUser.id, {
          email: form.email.trim(),
          full_name: form.full_name.trim() || null,
          role: form.role,
          is_active: form.is_active,
        });
        onSuccess?.(updated, "edit");
      } else {
        if (form.password.length < 8) {
          setError("Password must be at least 8 characters.");
          setSaving(false);
          return;
        }
        const created = await createUserRequest(
          {
            username: form.username.trim(),
            email: form.email.trim(),
            password: form.password,
            full_name: form.full_name.trim() || null,
            role: form.role,
            is_active: form.is_active,
          },
          accessToken,
        );
        onSuccess?.(created, "create");
      }
      onClose?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "Unable to update user."
            : "Unable to create user.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="user-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose?.();
      }}
    >
      <form
        className="user-modal"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-modal-title"
        noValidate
      >
        <header className="user-modal__head">
          <div>
            <p className="screen-kicker">{isEdit ? "Edit" : "Create"}</p>
            <h2 id="user-modal-title" className="ui-title text-base">
              {isEdit ? "Edit user" : "New account"}
            </h2>
            <p className="ui-muted mt-1 text-sm">
              Roles and account state come from the auth service.
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

        <div className="user-modal__body">
          <label className="ui-label" htmlFor={usernameId}>
            Username
            <input
              id={usernameId}
              className="ui-input"
              name="username"
              type="text"
              autoComplete="off"
              value={form.username}
              disabled={saving || Boolean(isEdit)}
              onChange={(e) => updateField("username", e.target.value)}
              required={!isEdit}
              minLength={3}
            />
          </label>
          {isEdit ? (
            <p className="ui-muted -mt-1 text-xs">
              Username cannot be changed after creation.
            </p>
          ) : null}

          <label className="ui-label" htmlFor={emailId}>
            Email
            <input
              id={emailId}
              className="ui-input"
              name="email"
              type="email"
              autoComplete="off"
              value={form.email}
              disabled={saving}
              onChange={(e) => updateField("email", e.target.value)}
              required
            />
          </label>

          {!isEdit ? (
            <label className="ui-label" htmlFor={passwordId}>
              Password
              <div className="user-modal__password">
                <input
                  id={passwordId}
                  className="ui-input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password}
                  disabled={saving}
                  onChange={(e) => updateField("password", e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="user-modal__eye"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={saving}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
          ) : null}

          <label className="ui-label" htmlFor={fullNameId}>
            Full name
            <input
              id={fullNameId}
              className="ui-input"
              name="full_name"
              type="text"
              autoComplete="off"
              value={form.full_name}
              disabled={saving}
              onChange={(e) => updateField("full_name", e.target.value)}
            />
          </label>

          <label className="ui-label" htmlFor={roleId}>
            Role
            <select
              id={roleId}
              className="ui-select"
              name="role"
              value={form.role}
              disabled={saving || roleOptions.length === 0}
              onChange={(e) => updateField("role", e.target.value)}
              required
            >
              {roleOptions.length === 0 ? (
                <option value="">No roles available</option>
              ) : (
                roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="user-modal__active" htmlFor={activeId}>
            <input
              id={activeId}
              name="is_active"
              type="checkbox"
              checked={form.is_active}
              disabled={saving}
              onChange={(e) => updateField("is_active", e.target.checked)}
            />
            <span>Account is active</span>
          </label>
        </div>

        {error ? (
          <p className="ui-alert-error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="user-modal__foot">
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
                : "Creating…"
              : isEdit
                ? "Save changes"
                : "Create user"}
          </button>
        </footer>
      </form>
    </div>
  );
}
