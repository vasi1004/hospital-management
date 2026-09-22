import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useAppSelector } from "@/store/hooks";
import {
  fetchAuditMetaRequest,
  getAuditEventRequest,
  listAuditEventsRequest,
} from "@/services/hmsApi";
import { ADMIN_NAV } from "@/constants/nav";
import { ROLES } from "@/constants/roles";
import "./AuditTrailPage.css";

function formatWhen(value) {
  if (!value) return "—";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  } catch {
    return String(value);
  }
}

function formatDay(value) {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return "";
  }
}

function formatClock(value) {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
}

function prettyJson(value) {
  if (value == null) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function actionTone(action) {
  const key = String(action || "").toLowerCase();
  if (key.includes("delete") || key.includes("deactivate")) return "danger";
  if (key.includes("create") || key.includes("activate") || key.includes("login")) {
    return "ok";
  }
  if (key.includes("password") || key.includes("update") || key.includes("logout")) {
    return "warn";
  }
  return "info";
}

function countChangedKeys(before, after) {
  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);
  return keys.size;
}

const EMPTY_FILTERS = {
  search: "",
  service: "",
  action: "",
  actor: "",
  entity_type: "",
  date_from: "",
  date_to: "",
};

export function AuditTrailPage() {
  const searchId = useId();
  const serviceId = useId();
  const actionId = useId();
  const actorId = useId();
  const entityTypeId = useId();
  const dateFromId = useId();
  const dateToId = useId();

  const { user, accessToken } = useAppSelector((state) => state.auth);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [meta, setMeta] = useState({ actions: [], services: [] });
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadMeta = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await fetchAuditMetaRequest(accessToken);
      setMeta({
        actions: Array.isArray(data?.actions) ? data.actions : [],
        services: Array.isArray(data?.services) ? data.services : [],
      });
    } catch {
      // Meta is optional for filtering; list still works.
    }
  }, [accessToken]);

  const loadEvents = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listAuditEventsRequest(accessToken, {
        search: applied.search || undefined,
        service: applied.service || undefined,
        action: applied.action || undefined,
        actor: applied.actor || undefined,
        entity_type: applied.entity_type || undefined,
        date_from: applied.date_from
          ? new Date(applied.date_from).toISOString()
          : undefined,
        date_to: applied.date_to
          ? new Date(applied.date_to).toISOString()
          : undefined,
        page,
        page_size: pageSize,
      });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total || 0));
      setTotalPages(Number(data?.total_pages || 0));
    } catch (err) {
      setItems([]);
      setTotal(0);
      setTotalPages(0);
      setError(
        err instanceof Error ? err.message : "Unable to load audit events.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, applied, page, pageSize]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const activeFilterCount = useMemo(() => {
    return Object.entries(applied).filter(
      ([key, value]) => key !== "search" && Boolean(value),
    ).length;
  }, [applied]);

  const rangeLabel = useMemo(() => {
    if (!total) return "No events yet";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `${start}–${end} of ${total}`;
  }, [page, pageSize, total]);

  const groupedItems = useMemo(() => {
    const groups = [];
    let currentDay = null;
    let bucket = null;
    for (const row of items) {
      const day = formatDay(row.occurred_at) || "Unknown date";
      if (day !== currentDay) {
        currentDay = day;
        bucket = { day, rows: [] };
        groups.push(bucket);
      }
      bucket.rows.push(row);
    }
    return groups;
  }, [items]);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setPage(1);
    setApplied({ ...filters });
    setFiltersOpen(false);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  }

  async function openDetail(row) {
    if (!accessToken || !row?.event_id) return;
    setDetailLoading(true);
    setError(null);
    try {
      const detail = await getAuditEventRequest(accessToken, row.event_id);
      setSelected(detail);
    } catch (err) {
      setSelected(row);
      setError(
        err instanceof Error ? err.message : "Unable to load event detail.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelected(null);
  }

  if (!user || user.role !== ROLES.ADMIN) {
    return <Navigate to="/login" replace />;
  }

  const detailOpen = Boolean(selected) || detailLoading;
  const changedCount = selected
    ? countChangedKeys(selected.before_data, selected.after_data)
    : 0;

  return (
    <RoleLayout
      user={user}
      subtitle="Admin console"
      navItems={ADMIN_NAV}
      title="Audit Trail"
    >
      <div className={`audit-shell${detailOpen ? " audit-shell--detail" : ""}`}>
        <div className="audit-stage">
          <header className="audit-toolbar">
            <div className="audit-toolbar__intro">
              <p className="audit-kicker">Security log</p>
              <h2 className="ui-title audit-toolbar__title">Activity trail</h2>
              <p className="ui-muted audit-toolbar__sub">
                Live events from connected services. Filters and actions are
                loaded from the audit API.
              </p>
            </div>

            <div className="audit-toolbar__stats">
              <div className="audit-stat">
                <span className="audit-stat__label">Showing</span>
                <strong className="audit-stat__value">{rangeLabel}</strong>
              </div>
              <div className="audit-stat">
                <span className="audit-stat__label">Services</span>
                <strong className="audit-stat__value">
                  {meta.services.length || "—"}
                </strong>
              </div>
              <div className="audit-stat">
                <span className="audit-stat__label">Actions</span>
                <strong className="audit-stat__value">
                  {meta.actions.length || "—"}
                </strong>
              </div>
            </div>
          </header>

          <form className="audit-searchbar" onSubmit={applyFilters}>
            <label className="audit-search" htmlFor={searchId}>
              <span className="audit-search__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
                  <path
                    d="M16.2 16.2L20 20"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                id={searchId}
                className="audit-search__input"
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                placeholder="Search summary, actor, action, entity…"
              />
            </label>

            <div className="audit-searchbar__actions">
              <button
                type="button"
                className={`ui-btn ui-btn-ghost audit-filter-toggle${filtersOpen ? " is-open" : ""}`}
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
              >
                Filters
                {activeFilterCount ? (
                  <span className="audit-filter-count">{activeFilterCount}</span>
                ) : null}
              </button>
              <button type="submit" className="ui-btn ui-btn-primary" disabled={loading}>
                Search
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-ghost"
                onClick={() => loadEvents()}
                disabled={loading}
              >
                Refresh
              </button>
            </div>
          </form>

          {filtersOpen ? (
            <section className="audit-filters-panel" aria-label="Advanced filters">
              <div className="audit-filters-grid">
                <label className="ui-label" htmlFor={serviceId}>
                  Service
                  <select
                    id={serviceId}
                    className="ui-input"
                    value={filters.service}
                    onChange={(e) => updateFilter("service", e.target.value)}
                  >
                    <option value="">All services</option>
                    {meta.services.map((svc) => (
                      <option key={svc} value={svc}>
                        {svc}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="ui-label" htmlFor={actionId}>
                  Action
                  <select
                    id={actionId}
                    className="ui-input"
                    value={filters.action}
                    onChange={(e) => updateFilter("action", e.target.value)}
                  >
                    <option value="">All actions</option>
                    {meta.actions.map((act) => (
                      <option key={act} value={act}>
                        {act}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="ui-label" htmlFor={actorId}>
                  Actor
                  <input
                    id={actorId}
                    className="ui-input"
                    value={filters.actor}
                    onChange={(e) => updateFilter("actor", e.target.value)}
                    placeholder="Username or email"
                  />
                </label>

                <label className="ui-label" htmlFor={entityTypeId}>
                  Entity type
                  <input
                    id={entityTypeId}
                    className="ui-input"
                    value={filters.entity_type}
                    onChange={(e) => updateFilter("entity_type", e.target.value)}
                    placeholder="e.g. user"
                  />
                </label>

                <label className="ui-label" htmlFor={dateFromId}>
                  From
                  <input
                    id={dateFromId}
                    className="ui-input"
                    type="datetime-local"
                    value={filters.date_from}
                    onChange={(e) => updateFilter("date_from", e.target.value)}
                  />
                </label>

                <label className="ui-label" htmlFor={dateToId}>
                  To
                  <input
                    id={dateToId}
                    className="ui-input"
                    type="datetime-local"
                    value={filters.date_to}
                    onChange={(e) => updateFilter("date_to", e.target.value)}
                  />
                </label>
              </div>

              <div className="audit-filters-panel__foot">
                <button type="button" className="ui-btn ui-btn-ghost" onClick={clearFilters}>
                  Clear all
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-primary"
                  onClick={(event) => applyFilters(event)}
                  disabled={loading}
                >
                  Apply filters
                </button>
              </div>
            </section>
          ) : null}

          {error ? (
            <div className="ui-alert ui-alert-danger" role="alert">
              {error}
            </div>
          ) : null}

          <section className="audit-feed" aria-live="polite">
            <div className="audit-feed__head">
              <h3 className="audit-feed__title">Timeline</h3>
              <div className="audit-pager">
                <button
                  type="button"
                  className="ui-btn ui-btn-ghost"
                  disabled={loading || page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="ui-muted text-sm">
                  Page {page}
                  {totalPages ? ` / ${totalPages}` : ""}
                </span>
                <button
                  type="button"
                  className="ui-btn ui-btn-ghost"
                  disabled={loading || !totalPages || page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>

            {loading ? (
              <div className="audit-empty">
                <div className="audit-empty__pulse" />
                <p className="ui-muted">Loading audit events…</p>
              </div>
            ) : items.length === 0 ? (
              <div className="audit-empty">
                <p className="ui-title text-base">No matching events</p>
                <p className="ui-muted">
                  Try clearing filters or wait for new activity from auth and
                  other services.
                </p>
              </div>
            ) : (
              groupedItems.map((group) => (
                <div key={group.day} className="audit-day">
                  <div className="audit-day__label">
                    <span>{group.day}</span>
                  </div>
                  <ul className="audit-list">
                    {group.rows.map((row) => {
                      const tone = actionTone(row.action);
                      const active = selected?.event_id === row.event_id;
                      return (
                        <li key={row.event_id || row.id}>
                          <button
                            type="button"
                            className={`audit-card audit-card--${tone}${active ? " is-active" : ""}`}
                            onClick={() => openDetail(row)}
                          >
                            <span className="audit-card__rail" aria-hidden="true" />
                            <div className="audit-card__time">
                              <strong>{formatClock(row.occurred_at)}</strong>
                              <span>{formatWhen(row.occurred_at)}</span>
                            </div>
                            <div className="audit-card__body">
                              <div className="audit-card__tags">
                                <span className="audit-chip audit-chip--muted">
                                  {row.service || "service"}
                                </span>
                                <span className={`audit-chip audit-chip--${tone}`}>
                                  {row.action || "action"}
                                </span>
                              </div>
                              <p className="audit-card__summary">
                                {row.summary || "No summary provided"}
                              </p>
                              <div className="audit-card__meta">
                                <span>
                                  <strong>{row.actor_username || "—"}</strong>
                                  {row.actor_role ? ` · ${row.actor_role}` : ""}
                                </span>
                                <span>
                                  {row.entity_type || "entity"}
                                  {row.entity_id ? ` #${row.entity_id}` : ""}
                                </span>
                                {row.ip_address ? <span>{row.ip_address}</span> : null}
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </section>
        </div>

        <aside
          className={`audit-drawer${detailOpen ? " is-open" : ""}`}
          aria-hidden={!detailOpen}
        >
          <div className="audit-drawer__inner">
            <div className="audit-drawer__head">
              <div>
                <p className="audit-kicker">Inspection</p>
                <h2 className="ui-title text-base">Event detail</h2>
              </div>
              <button
                type="button"
                className="ui-btn ui-btn-ghost"
                onClick={closeDetail}
                disabled={!detailOpen}
              >
                Close
              </button>
            </div>

            {detailLoading ? (
              <div className="audit-empty audit-empty--drawer">
                <div className="audit-empty__pulse" />
                <p className="ui-muted">Loading detail…</p>
              </div>
            ) : !selected ? (
              <div className="audit-empty audit-empty--drawer">
                <p className="ui-title text-base">Select an event</p>
                <p className="ui-muted">
                  Open any timeline row to inspect changed fields (before /
                  after).
                </p>
              </div>
            ) : (
              <div className="audit-detail-body">
                <div className="audit-detail-hero">
                  <span
                    className={`audit-chip audit-chip--${actionTone(selected.action)}`}
                  >
                    {selected.action}
                  </span>
                  <p className="audit-detail-hero__summary">
                    {selected.summary || "—"}
                  </p>
                  <p className="ui-muted text-sm">
                    {formatWhen(selected.occurred_at)}
                    {changedCount
                      ? ` · ${changedCount} field${changedCount === 1 ? "" : "s"} changed`
                      : ""}
                  </p>
                </div>

                <dl className="audit-meta-grid">
                  <div>
                    <dt>Event ID</dt>
                    <dd>{selected.event_id}</dd>
                  </div>
                  <div>
                    <dt>Service</dt>
                    <dd>{selected.service || "—"}</dd>
                  </div>
                  <div>
                    <dt>Actor</dt>
                    <dd>
                      {selected.actor_username || "—"}
                      {selected.actor_email ? (
                        <span className="ui-muted"> · {selected.actor_email}</span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt>Entity</dt>
                    <dd>
                      {selected.entity_type || "—"}
                      {selected.entity_id ? ` #${selected.entity_id}` : ""}
                    </dd>
                  </div>
                  {selected.ip_address ? (
                    <div>
                      <dt>IP</dt>
                      <dd>{selected.ip_address}</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="audit-json-grid">
                  <div className="audit-json-block">
                    <div className="audit-json-block__head">
                      <h3>Before</h3>
                    </div>
                    <pre className="audit-json">{prettyJson(selected.before_data)}</pre>
                  </div>
                  <div className="audit-json-block audit-json-block--after">
                    <div className="audit-json-block__head">
                      <h3>After</h3>
                    </div>
                    <pre className="audit-json">{prettyJson(selected.after_data)}</pre>
                  </div>
                </div>

                {selected.metadata ? (
                  <div className="audit-json-block">
                    <div className="audit-json-block__head">
                      <h3>Metadata</h3>
                    </div>
                    <pre className="audit-json">{prettyJson(selected.metadata)}</pre>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </aside>
      </div>
    </RoleLayout>
  );
}
