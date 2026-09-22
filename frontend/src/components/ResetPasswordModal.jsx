import { useEffect, useId, useState } from "react";
import { resetUserPasswordRequest } from "@/features/login/loginApi";
import "./UserAccountModal.css";

export function ResetPasswordModal({
  accessToken,
  targetUser,
  onClose,
  onSuccess,
}) {
  const resetPasswordId = useId();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !saving) onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  if (!targetUser) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!accessToken) {
      setError("Your session expired. Please sign in again.");
      return;
    }
    if (password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await resetUserPasswordRequest(
        accessToken,
        targetUser.id,
        password,
      );
      onSuccess?.(updated);
      onClose?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reset password.",
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
        className="user-modal user-modal--compact"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-password-title"
        noValidate
      >
        <header className="user-modal__head">
          <div>
            <p className="screen-kicker">Security</p>
            <h2 id="reset-password-title" className="ui-title text-base">
              Reset password
            </h2>
            <p className="ui-muted mt-1 text-sm">
              Set a new password for{" "}
              <strong>{targetUser.username}</strong>.
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
          <label className="ui-label" htmlFor={resetPasswordId}>
            New password
            <div className="user-modal__password">
              <input
                id={resetPasswordId}
                className="ui-input"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                disabled={saving}
                onChange={(e) => {
                  setError(null);
                  setPassword(e.target.value);
                }}
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
            disabled={password.length < 8 || saving}
          >
            {saving ? "Updating…" : "Update password"}
          </button>
        </footer>
      </form>
    </div>
  );
}
