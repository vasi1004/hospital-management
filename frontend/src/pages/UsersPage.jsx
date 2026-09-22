import { useCallback, useEffect, useId, useState } from "react";
import { Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useAppSelector } from "@/store/hooks";
import {
  createUserRequest,
  listUsersRequest,
} from "@/features/login/loginApi";
import { ADMIN_NAV } from "@/constants/nav";
import { ROLE_OPTIONS, ROLES } from "@/constants/roles";
import "./UsersPage.css";

const INITIAL_FORM = {
  username: "",
  email: "",
  password: "",
  full_name: "",
  role: "patient",
  is_active: true,
};

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function roleBadgeClass(role) {
  const map = {
    admin: "ui-badge-info",
    doctor: "ui-badge-ok",
    receptionist: "ui-badge-warn",
    patient: "ui-badge-muted",
  };
  return map[role] || "ui-badge-muted";
}

export function UsersPage() {
  const usernameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const fullNameId = useId();
  const roleId = useId();
  const activeId = useId();

  const { user, status, accessToken } = useAppSelector((state) => state.auth);
  const [form, setForm] = useState(INITIAL_FORM);
  const [users, setUsers] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadUsers = useCallback(async () => {
    if (!accessToken) return;
    setLoadingList(true);
    setListError(null);
    try {
      const data = await listUsersRequest(accessToken);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : "Unable to load users.",
      );
    } finally {
      setLoadingList(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (status === "authenticated" && user?.role === ROLES.ADMIN) {
      loadUsers();
    }
  }, [status, user, loadUsers]);

  if (status !== "authenticated" || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== ROLES.ADMIN) {
    return <Navigate to="/login" replace />;
  }

  function updateField(name, value) {
    setError(null);
    setSuccess(null);
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!accessToken) {
      setError("Your session expired. Please sign in again.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
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
      setSuccess(`User "${created.username}" created successfully.`);
      setForm(INITIAL_FORM);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create user.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    form.username.trim().length >= 3 &&
    form.email.trim().length > 3 &&
    form.password.length >= 8 &&
    !submitting;

  return (
    <RoleLayout
      user={user}
      subtitle="Admin console"
      navItems={ADMIN_NAV}
      title="Users"
    >
      <div className="users-layout">
        <section className="ui-panel ui-panel-pad">
          <div className="mb-4">
            <h2 className="ui-title text-base">Create user</h2>
            <p className="ui-muted mt-1 text-sm">
              Add Admin, Doctor, Receptionist, or Patient accounts.
            </p>
          </div>

          <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
            <label className="ui-label" htmlFor={usernameId}>
              Username
              <input
                id={usernameId}
                className="ui-input"
                name="username"
                type="text"
                autoComplete="off"
                value={form.username}
                disabled={submitting}
                onChange={(event) => updateField("username", event.target.value)}
                required
                minLength={3}
              />
            </label>

            <label className="ui-label" htmlFor={emailId}>
              Email
              <input
                id={emailId}
                className="ui-input"
                name="email"
                type="email"
                autoComplete="off"
                value={form.email}
                disabled={submitting}
                onChange={(event) => updateField("email", event.target.value)}
                required
              />
            </label>

            <label className="ui-label" htmlFor={passwordId}>
              Password
              <input
                id={passwordId}
                className="ui-input"
                name="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                disabled={submitting}
                onChange={(event) => updateField("password", event.target.value)}
                required
                minLength={8}
              />
            </label>

            <label className="ui-label" htmlFor={fullNameId}>
              Full name
              <input
                id={fullNameId}
                className="ui-input"
                name="full_name"
                type="text"
                autoComplete="off"
                value={form.full_name}
                disabled={submitting}
                onChange={(event) => updateField("full_name", event.target.value)}
              />
            </label>

            <label className="ui-label" htmlFor={roleId}>
              Role
              <select
                id={roleId}
                className="ui-select"
                name="role"
                value={form.role}
                disabled={submitting}
                onChange={(event) => updateField("role", event.target.value)}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm font-semibold" htmlFor={activeId}>
              <input
                id={activeId}
                name="is_active"
                type="checkbox"
                checked={form.is_active}
                disabled={submitting}
                onChange={(event) =>
                  updateField("is_active", event.target.checked)
                }
              />
              Account is active
            </label>

            {error ? (
              <p className="ui-alert-error" role="alert">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="ui-alert-success" role="status">
                {success}
              </p>
            ) : null}

            <button
              type="submit"
              className="ui-btn ui-btn-primary"
              disabled={!canSubmit}
            >
              {submitting ? "Creating…" : "Create user"}
            </button>
          </form>
        </section>

        <section className="ui-panel ui-panel-pad">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="ui-title text-base">Created users</h2>
              <p className="ui-muted mt-1 text-sm">
                {loadingList
                  ? "Loading…"
                  : `${users.length} account${users.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <button
              type="button"
              className="ui-btn ui-btn-ghost"
              onClick={loadUsers}
              disabled={loadingList}
            >
              Refresh
            </button>
          </div>

          {listError ? (
            <p className="ui-alert-error mb-3" role="alert">
              {listError}
            </p>
          ) : null}

          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {!loadingList && users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="ui-muted text-center">
                      No users yet. Create the first account on the left.
                    </td>
                  </tr>
                ) : null}
                {users.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="users-row-name">
                        <strong>{row.username}</strong>
                        <span className="ui-muted text-sm">{row.email}</span>
                        {row.full_name ? (
                          <span className="text-sm">{row.full_name}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span className={`ui-badge ${roleBadgeClass(row.role)}`}>
                        {row.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`ui-badge ${
                          row.is_active ? "ui-badge-ok" : "ui-badge-muted"
                        }`}
                      >
                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{formatDate(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </RoleLayout>
  );
}
