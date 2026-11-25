import { ScrollText, X } from "lucide-react";
import { PageHeader, DataTable, Pagination, SearchInput, EmptyState, ErrorState } from "../Components/ui";
import { ROLE_LABELS, cleanParams, formatFull, humanize } from "../Components/sales/constants";
import { useQueryState, useRemote, useDebouncedFilter } from "../Components/sales/hooks";
import { DateRange } from "../Components/sales/bits";

const LIMIT = 30;
const DEFAULTS = { q: "", entity: "", from: "", to: "", page: "1" };

// entity names written by the backend's audit() calls
const ENTITIES = ["order", "product", "category", "brand", "user", "coupon", "offer", "banner", "content", "review", "ticket", "settings", "subscriber"];

// colour by verb so destructive actions stand out
const actionTone = (action = "") =>
  /delete|remove|block/.test(action)
    ? "badge-danger"
    : /refund|return|status/.test(action)
      ? "badge-warning"
      : /create|add|publish/.test(action)
        ? "badge-success"
        : /login|logout/.test(action)
          ? "badge-neutral"
          : "badge-info";

export default function AuditLog() {
  const [f, update] = useQueryState(DEFAULTS);
  const [search, setSearch] = useDebouncedFilter(f.q, (q) => update({ q }));

  const query = new URLSearchParams({
    ...cleanParams({ q: f.q, entity: f.entity, from: f.from, to: f.to }),
    page: f.page,
    limit: String(LIMIT),
  }).toString();
  const { data, loading, error, retry } = useRemote("/admin/audit-logs", query);
  const logs = data?.logs || [];
  const hasFilters = !!(f.q || f.entity || f.from || f.to);

  const columns = [
    {
      key: "summary",
      header: "Activity",
      mobile: "title",
      render: (l) => (
        <div className="min-w-0 max-w-md">
          <span className={`badge ${actionTone(l.action)} font-mono text-[11px]`}>{l.action}</span>
          {l.summary && <p className="mt-1 break-words text-sm text-ink-800">{l.summary}</p>}
        </div>
      ),
    },
    {
      key: "actor",
      header: "By",
      render: (l) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-800">{l.actor?.name || "System"}</p>
          {l.actor?.role && <p className="text-xs text-ink-500">{ROLE_LABELS[l.actor.role] || humanize(l.actor.role)}</p>}
        </div>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      render: (l) =>
        l.entity ? (
          <div className="min-w-0">
            <span className="badge badge-neutral capitalize">{l.entity}</span>
            {l.entityId && <p className="mt-0.5 font-mono text-[11px] text-ink-400">…{String(l.entityId).slice(-8)}</p>}
          </div>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    { key: "when", header: "When", render: (l) => <span className="whitespace-nowrap">{formatFull(l.createdAt)}</span> },
    { key: "ip", header: "IP", render: (l) => <span className="font-mono text-xs text-ink-500">{l.ip || "—"}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Audit log"
        description={loading && !data ? "Loading activity…" : `${data?.total ?? 0} recorded action${data?.total === 1 ? "" : "s"}${hasFilters ? " match" : ""}`}
      />

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:px-6 lg:flex-row lg:flex-wrap lg:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Action, summary or person…" className="w-full lg:max-w-xs" />
          <select
            value={f.entity}
            onChange={(e) => update({ entity: e.target.value })}
            aria-label="Entity"
            className="input h-10 lg:w-44"
          >
            <option value="">All entities</option>
            {ENTITIES.map((e) => (
              <option key={e} value={e}>
                {humanize(e)}
              </option>
            ))}
          </select>
          <DateRange from={f.from} to={f.to} onChange={update} />
          {hasFilters && (
            <button onClick={() => update({ q: "", entity: "", from: "", to: "" })} className="btn btn-ghost btn-sm self-start lg:self-center">
              <X className="size-4" /> Clear filters
            </button>
          )}
        </div>

        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={logs}
              loading={loading}
              skeletonRows={10}
              empty={
                <EmptyState
                  icon={ScrollText}
                  title={hasFilters ? "No activity matches" : "No activity yet"}
                  description={hasFilters ? "Try a different search, entity or date range." : "Admin actions are recorded here as they happen."}
                />
              }
            />
            {!loading && (
              <Pagination
                page={Number(f.page) || 1}
                pages={data?.pages || 1}
                total={data?.total || 0}
                pageSize={LIMIT}
                onChange={(p) => update({ page: p })}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
