import { useEffect, useId, useState } from "react";
import {
  createDepartmentRequest,
  updateDepartmentRequest,
} from "@/services/hmsApi";
import "./AdminFormModal.css";

const EMPTY = { name: "", code: "", description: "", is_active: true };

export function DepartmentFormModal({
  mode = "create",
  accessToken,
  editingDepartment = null,
  onClose,
  onSuccess,
}) {
  const isEdit = mode === "edit" && editingDepartment;
  const nameId = useId();
  const codeId = useId();
  const descId = useId();
  const activeId = useId();

  const [form, setForm] = useState(() => {
    if (!isEdit) return { ...EMPTY };
    return {
      name: editingDepartment.name || "",
      code: editingDepartment.code || "",
      description: editingDepartment.description || "",
      is_active: Boolean(editingDepartment.is_active),
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
    if (!form.name.trim() || !form.code.trim()) {
      setError("Name and code are required.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      is_active: Boolean(form.is_active),
    };

    setSaving(true);
    setError(null);
    try {
      const saved = isEdit
        ? await updateDepartmentRequest(
            accessToken,
            editingDepartment.id,
            payload,
          )
        : await createDepartmentRequest(accessToken, payload);
      onSuccess?.(saved, isEdit ? "edit" : "create");
      onClose?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save department.",
      );
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
        className="admin-modal admin-modal--sm"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="department-modal-title"
        noValidate
      >
        <header className="admin-modal__head">
          <div>
            <p className="screen-kicker">{isEdit ? "Edit" : "Create"}</p>
            <h2 id="department-modal-title" className="ui-title text-base">
              {isEdit ? "Edit department" : "Add department"}
            </h2>
            <p className="ui-muted mt-1 text-sm">
              Organize clinical units used when assigning doctors.
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
          <label className="ui-label" htmlFor={nameId}>
            Name *
            <input
              id={nameId}
              className="ui-input"
              value={form.name}
              disabled={saving}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </label>
          <label className="ui-label" htmlFor={codeId}>
            Code *
            <input
              id={codeId}
              className="ui-input uppercase"
              value={form.code}
              disabled={saving}
              onChange={(e) => update("code", e.target.value)}
              required
            />
          </label>
          <label className="ui-label" htmlFor={descId}>
            Description
            <textarea
              id={descId}
              className="ui-textarea"
              rows={3}
              value={form.description}
              disabled={saving}
              onChange={(e) => update("description", e.target.value)}
            />
          </label>
          <label className="admin-modal__active" htmlFor={activeId}>
            <input
              id={activeId}
              type="checkbox"
              checked={form.is_active}
              disabled={saving}
              onChange={(e) => update("is_active", e.target.checked)}
            />
            <span>Department is active</span>
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
                : "Create department"}
          </button>
        </footer>
      </form>
    </div>
  );
}
