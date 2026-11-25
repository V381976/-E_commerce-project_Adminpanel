import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, Users, Download, X } from "lucide-react";
import { errorMessage } from "../api";
import { PageHeader, DataTable, Pagination, SearchInput, EmptyState, ErrorState } from "../Components/ui";
import { formatDate, formatPrice } from "../lib/format";
import { cleanParams, downloadCsv, initials } from "../Components/sales/constants";
import { useQueryState, useRemote, useDebouncedFilter } from "../Components/sales/hooks";

const LIMIT = 20;
const DEFAULTS = { q: "", status: "", sort: "newest", page: "1" };

export default function Customers() {
  const [f, update] = useQueryState(DEFAULTS);
  const [search, setSearch] = useDebouncedFilter(f.q, (q) => update({ q }));
  const [exporting, setExporting] = useState(false);

  const query = new URLSearchParams({
    ...cleanParams({ q: f.q, status: f.status }),
    sort: f.sort,
    page: f.page,
    limit: String(LIMIT),
  }).toString();
  const { data, loading, error, retry } = useRemote("/users", query);
  const users = data?.users || [];
  const hasFilters = !!(f.q || f.status);

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadCsv("/admin/customers-export", {}, `customers-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(errorMessage(err, "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      key: "customer",
      header: "Customer",
      mobile: "title",
      render: (u) => (
        <Link to={`/customers/${u._id}`} className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
            {initials(u.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink-900 hover:text-brand-700">{u.name}</span>
            <span className="block max-w-56 truncate text-xs text-ink-500">{u.email}</span>
          </span>
        </Link>
      ),
    },
    { key: "phone", header: "Phone", render: (u) => u.phone || <span className="text-ink-400">—</span> },
    { key: "orders", header: "Orders", align: "right", render: (u) => <span className="tabular-nums">{u.orderCount || 0}</span> },
    {
      key: "spent",
      header: "Lifetime value",
      align: "right",
      render: (u) => <span className="font-semibold text-ink-900 tabular-nums">{formatPrice(u.lifetimeValue)}</span>,
    },
    { key: "last", header: "Last order", render: (u) => (u.lastOrderAt ? formatDate(u.lastOrderAt) : <span className="text-ink-400">Never</span>) },
    { key: "joined", header: "Joined", render: (u) => formatDate(u.createdAt) },
    {
      key: "status",
      header: "Status",
      render: (u) => <span className={`badge ${u.blocked ? "badge-danger" : "badge-success"}`}>{u.blocked ? "Blocked" : "Active"}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (u) => (
        <Link to={`/customers/${u._id}`} className="btn btn-secondary btn-sm">
          <Eye className="size-4" /> View
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        description={loading && !data ? "Loading customers…" : `${data?.total ?? 0} customer${data?.total === 1 ? "" : "s"}${hasFilters ? " match" : ""}`}
        actions={
          <button onClick={exportCsv} disabled={exporting} className="btn btn-secondary">
            <Download className="size-4" /> {exporting ? "Exporting…" : "Export CSV"}
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-6">
          <SearchInput value={search} onChange={setSearch} placeholder="Name, email or phone…" className="w-full sm:max-w-xs" />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <select
              value={f.status}
              onChange={(e) => update({ status: e.target.value })}
              aria-label="Account status"
              className="input h-10 sm:w-40"
            >
              <option value="">All customers</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
            <select value={f.sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort customers" className="input h-10 sm:w-48">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="spent">Top spenders</option>
              <option value="orders">Most orders</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
          {hasFilters && (
            <button onClick={() => update({ q: "", status: "" })} className="btn btn-ghost btn-sm self-start sm:self-center">
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
              rows={users}
              loading={loading}
              skeletonRows={8}
              empty={
                <EmptyState
                  icon={Users}
                  title={hasFilters ? "No customers match" : "No customers yet"}
                  description={hasFilters ? "Try a different search or status." : "Shoppers who create an account appear here."}
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
