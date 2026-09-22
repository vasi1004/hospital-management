import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { UserAccountModal } from "@/components/UserAccountModal";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";
import { useAppSelector } from "@/store/hooks";
import {
  deleteUserRequest,
  listUserRolesRequest,
  listUsersRequest,
  setUserActiveRequest,
} from "@/features/login/loginApi";
import { ADMIN_NAV } from "@/constants/nav";
import { ROLES } from "@/constants/roles";
import "./UsersPage.css";

function formatDate(value) {
  if (!value) return "—";
  try {
    const raw = String(value).trim();
    // Backend sends wall-clock ISO (no Z). Avoid timezone shift when parsing.
    const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)
      ? raw
      : raw.replace(" ", "T");
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  } catch {
    return String(value);
  }
}

function roleBadgeClass(role) {
  if (role === "admin") return "ui-badge-info";
  if (role === "doctor") return "ui-badge-ok";
  if (role === "receptionist") return "ui-badge-warn";
  return "ui-badge-muted";
}

export function UsersPage() {
  const searchId = useId();
  const filterRoleId = useId();
  const filterStatusId = useId();

  const { user, status, accessToken } = useAppSelector((state) => state.auth);

  const [roleOptions, setRoleOptions] = useState([]);
  const [defaultRole, setDefaultRole] = useState("");
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [listError, setListError] = useState(null);
  const [accountModal, setAccountModal] = useState(null);
  const [resetUser, setResetUser] = useState(null);

  const roleLabelMap = useMemo(() => {
    const map = {};
    roleOptions.forEach((option) => {
      map[option.value] = option.label;
    });
    return map;
  }, [roleOptions]);

  const loadRoles = useCallback(async () => {
    if (!accessToken) return;
    setLoadingMeta(true);
    setError(null);
    try {
      const catalog = await listUserRolesRequest(accessToken);
      const roles = Array.isArray(catalog?.roles) ? catalog.roles : [];
      setRoleOptions(roles);
      const fallback =
        catalog?.default_role ||
        roles.find((item) => item.value === "patient")?.value ||
        roles[0]?.value ||
        "";
      setDefaultRole(fallback);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load roles from server.",
      );
      setRoleOptions([]);
    } finally {
      setLoadingMeta(false);
    }
  }, [accessToken]);

  const loadUsers = useCallback(async () => {
    if (!accessToken) return;
    setLoadingList(true);
    setListError(null);
    try {
      const data = await listUsersRequest(accessToken, {
        search: search.trim() || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : "Unable to load users.",
      );
    } finally {
      setLoadingList(false);
    }
  }, [accessToken, search, roleFilter, statusFilter]);

  useEffect(() => {
    if (status === "authenticated" && user?.role === ROLES.ADMIN) {
      loadRoles();
    }
  }, [status, user, loadRoles]);

  useEffect(() => {
    if (status !== "authenticated" || user?.role !== ROLES.ADMIN) return;
    const timer = window.setTimeout(loadUsers, 220);
    return () => window.clearTimeout(timer);
  }, [status, user, loadUsers]);

  if (status !== "authenticated" || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== ROLES.ADMIN) {
    return <Navigate to="/login" replace />;
  }

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  function upsertUserInList(nextUser) {
    if (!nextUser?.id) return;
    setUsers((prev) => {
      const index = prev.findIndex((item) => item.id === nextUser.id);
      if (index === -1) return [nextUser, ...prev];
      const copy = [...prev];
      copy[index] = { ...copy[index], ...nextUser };
      return copy;
    });
  }

  function openCreate() {
    clearMessages();
    setResetUser(null);
    setAccountModal({ mode: "create" });
  }

  function openEdit(row) {
    clearMessages();
    setResetUser(null);
    setAccountModal({ mode: "edit", user: row });
  }

  function openReset(row) {
    clearMessages();
    setAccountModal(null);
    setResetUser(row);
  }

  async function handleToggleActive(row) {
    if (!accessToken) return;
    setActionId(row.id);
    clearMessages();
    try {
      const next = !row.is_active;
      const updated = await setUserActiveRequest(accessToken, row.id, next);
      upsertUserInList(updated);
      setSuccess(
        `User "${updated.username}" is now ${updated.is_active ? "active" : "inactive"}.`,
      );
      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to change user status.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(row) {
    if (!accessToken) return;
    const confirmed = window.confirm(
      `Delete user "${row.username}" permanently?\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;

    setActionId(row.id);
    clearMessages();
    try {
      const result = await deleteUserRequest(accessToken, row.id);
      setSuccess(
        result?.message || `User "${row.username}" deleted successfully.`,
      );
      if (accountModal?.user?.id === row.id) setAccountModal(null);
      if (resetUser?.id === row.id) setResetUser(null);
      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete user.",
      );
    } finally {
      setActionId(null);
    }
  }

  const activeCount = useMemo(
    () => users.filter((row) => row.is_active).length,
    [users],
  );

  const canCreate = !loadingMeta && roleOptions.length > 0;

  return (
    <RoleLayout
      user={user}
      subtitle="Admin console"
      navItems={ADMIN_NAV}
      title="Users"
    >
      <div className="users-shell">
        <header className="screen-toolbar">
          <div>
            <p className="screen-kicker">Access control</p>
            <h2 className="ui-title screen-toolbar__title">User accounts</h2>
            <p className="ui-muted screen-toolbar__sub">
              Full directory board. Use Create user to open the account popup —
              roles are loaded from the server catalog.
            </p>
          </div>
          <div className="screen-toolbar__aside">
            <div className="screen-toolbar__stats">
              <div className="screen-stat">
                <span className="screen-stat__label">Listed</span>
                <strong className="screen-stat__value">
                  {loadingList ? "…" : users.length}
                </strong>
              </div>
              <div className="screen-stat">
                <span className="screen-stat__label">Active</span>
                <strong className="screen-stat__value">
                  {loadingList ? "…" : activeCount}
                </strong>
              </div>
              <div className="screen-stat">
                <span className="screen-stat__label">Roles</span>
                <strong className="screen-stat__value">
                  {loadingMeta ? "…" : roleOptions.length}
                </strong>
              </div>
            </div>
            <button
              type="button"
              className="ui-btn ui-btn-primary users-create-btn"
              onClick={openCreate}
              disabled={!canCreate}
              title={
                canCreate
                  ? undefined
                  : loadingMeta
                    ? "Loading roles…"
                    : "No roles available from server"
              }
            >
              Create user
            </button>
          </div>
        </header>

        <section className="screen-panel users-board">
          <div className="screen-panel__head">
            <div>
              <p className="screen-kicker">Directory</p>
              <h3 className="ui-title text-base">Access accounts</h3>
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

          <div className="users-filters">
            <label className="ui-label" htmlFor={searchId}>
              Search
              <input
                id={searchId}
                className="ui-input"
                type="search"
                placeholder="Username, email, name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="ui-label" htmlFor={filterRoleId}>
              Role
              <select
                id={filterRoleId}
                className="ui-select"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="all">All roles</option>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="ui-label" htmlFor={filterStatusId}>
              Status
              <select
                id={filterStatusId}
                className="ui-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
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
          {listError ? (
            <p className="ui-alert-error mb-3" role="alert">
              {listError}
            </p>
          ) : null}

          <div className="ui-table-wrap users-table-wrap">
            <table className="ui-table users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr>
                    <td colSpan={6} className="ui-muted text-center">
                      Loading users…
                    </td>
                  </tr>
                ) : null}
                {!loadingList && users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="ui-muted text-center">
                      No users match the current filters. Click Create user to
                      add one.
                    </td>
                  </tr>
                ) : null}
                {!loadingList
                  ? users.map((row) => {
                      const isSelf = row.id === user.id;
                      const busy = actionId === row.id;
                      return (
                        <tr key={row.id}>
                          <td>
                            <div className="users-row-name">
                              <strong>
                                {row.username}
                                {isSelf ? " (you)" : ""}
                              </strong>
                              <span className="ui-muted text-sm">
                                {row.email}
                              </span>
                              {row.full_name ? (
                                <span className="text-sm">{row.full_name}</span>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`ui-badge ${roleBadgeClass(row.role)}`}
                            >
                              {roleLabelMap[row.role] || row.role}
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
                          <td>{formatDate(row.updated_at)}</td>
                          <td>
                            <div className="users-actions">
                              <button
                                type="button"
                                className="ui-btn ui-btn-ghost"
                                onClick={() => openEdit(row)}
                                disabled={busy || !canCreate}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="ui-btn ui-btn-ghost"
                                onClick={() => openReset(row)}
                                disabled={busy}
                              >
                                Reset password
                              </button>
                              <button
                                type="button"
                                className="ui-btn ui-btn-ghost"
                                onClick={() => handleToggleActive(row)}
                                disabled={busy || isSelf}
                                title={
                                  isSelf
                                    ? "You cannot deactivate your own account"
                                    : undefined
                                }
                              >
                                {busy
                                  ? "…"
                                  : row.is_active
                                    ? "Deactivate"
                                    : "Activate"}
                              </button>
                              <button
                                type="button"
                                className="ui-btn ui-btn-ghost users-action-danger"
                                onClick={() => handleDelete(row)}
                                disabled={busy || isSelf}
                                title={
                                  isSelf
                                    ? "You cannot delete your own account"
                                    : "Delete user permanently"
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {accountModal ? (
        <UserAccountModal
          key={
            accountModal.mode === "edit"
              ? `edit-${accountModal.user?.id}`
              : "create"
          }
          mode={accountModal.mode}
          accessToken={accessToken}
          roleOptions={roleOptions}
          defaultRole={defaultRole}
          editingUser={accountModal.user || null}
          onClose={() => setAccountModal(null)}
          onSuccess={async (saved, mode) => {
            upsertUserInList(saved);
            setSuccess(
              mode === "edit"
                ? `User "${saved.username}" updated successfully.`
                : `User "${saved.username}" created successfully.`,
            );
            setAccountModal(null);
            await loadUsers();
          }}
        />
      ) : null}

      {resetUser ? (
        <ResetPasswordModal
          key={`reset-${resetUser.id}`}
          accessToken={accessToken}
          targetUser={resetUser}
          onClose={() => setResetUser(null)}
          onSuccess={async (updated) => {
            upsertUserInList(updated);
            setSuccess(`Password reset for "${updated.username}".`);
            setResetUser(null);
            await loadUsers();
          }}
        />
      ) : null}
    </RoleLayout>
  );
}
