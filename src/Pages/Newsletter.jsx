import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Download, Mail, MailX, Users } from "lucide-react";
import api, { errorMessage } from "../api";
import { PageHeader, DataTable, Pagination, SearchInput, EmptyState, ErrorState, Spinner } from "../Components/ui";
import { StatusTabs } from "../Components/site/shared";
import { downloadCsv } from "../Components/site/helpers";
import { formatDate, titleCase } from "../lib/format";

const LIMIT = 30;

const TABS = [
  { value: "", label: "All" },
  { value: "subscribed", label: "Subscribed" },
  { value: "unsubscribed", label: "Unsubscribed" },
];

export default function Newsletter() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1, active: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const requestId = useRef(0);

  const params = { q: search || undefined, status: status || undefined };

  const fetchRows = useCallback(() => {
    const id = ++requestId.current;
    return api
      .get("/admin/subscribers", { params: { page, limit: LIMIT, q: search || undefined, status: status || undefined } })
      .then((res) => {
        if (id !== requestId.current) return;
        setRows(res.data.subscribers || []);
        setMeta({ total: res.data.total || 0, pages: Math.max(res.data.pages || 1, 1), active: res.data.active || 0 });
        setError("");
      })
      .catch((err) => id === requestId.current && setError(errorMessage(err, "Subscribers load failed")))
      .finally(() => id === requestId.current && setLoading(false));
  }, [page, search, status]);

  useEffect(() => {
    const t = setTimeout(fetchRows, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchRows, search]);

  const onSearch = (v) => {
    setLoading(true);
    setPage(1);
    setSearch(v);
  };
  const onStatus = (v) => {
    setLoading(true);
    setPage(1);
    setStatus(v);
  };
  const onPage = (p) => {
    setLoading(true);
    setPage(p);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadCsv("/admin/subscribers", { ...params, format: "csv" }, `subscribers-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(errorMessage(err, "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      key: "email",
      header: "Email",
      mobile: "title",
      render: (s) => (
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
              s.status === "subscribed" ? "bg-brand-50 text-brand-600" : "bg-ink-100 text-ink-400"
            }`}
          >
            {s.status === "subscribed" ? <Mail className="size-4" /> : <MailX className="size-4" />}
          </span>
          <a href={`mailto:${s.email}`} className="truncate font-medium text-ink-900 hover:text-brand-700">
            {s.email}
          </a>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (s) => (
        <span className={`badge ${s.status === "subscribed" ? "badge-success" : "badge-neutral"}`}>{titleCase(s.status)}</span>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (s) => <span className="capitalize text-ink-600">{s.source ? s.source.replace(/[-_]/g, " ") : "—"}</span>,
    },
    {
      key: "account",
      header: "Account",
      render: (s) => (s.user ? <span className="badge badge-info">Customer</span> : <span className="text-ink-400">Guest</span>),
    },
    { key: "createdAt", header: "Joined", render: (s) => formatDate(s.createdAt) },
  ];

  return (
    <div>
      <PageHeader
        title="Newsletter"
        description="People who signed up via the storefront newsletter form. Export the list to use in your email tool."
        actions={
          <button onClick={exportCsv} disabled={exporting || !meta.total} className="btn btn-secondary">
            {exporting ? <Spinner /> : <Download className="size-4" />} Export CSV
          </button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="card flex items-center gap-4 p-5">
          <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Users className="size-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Active subscribers</p>
            {loading && !rows.length ? <div className="skeleton mt-1 h-6 w-16" /> : <p className="text-2xl font-bold tabular-nums">{meta.active}</p>}
          </div>
        </div>
        <div className="card flex items-center gap-4 p-5">
          <span className="flex size-11 items-center justify-center rounded-xl bg-ink-100 text-ink-500">
            <Mail className="size-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Matching filter</p>
            {loading && !rows.length ? <div className="skeleton mt-1 h-6 w-16" /> : <p className="text-2xl font-bold tabular-nums">{meta.total}</p>}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-ink-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <StatusTabs tabs={TABS} value={status} onChange={onStatus} />
          <SearchInput value={search} onChange={onSearch} placeholder="Search email…" className="w-full lg:w-72" />
        </div>
        {error ? (
          <ErrorState
            message={error}
            onRetry={() => {
              setLoading(true);
              fetchRows();
            }}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            empty={
              <EmptyState
                icon={Mail}
                title={search || status ? "No subscribers match" : "No subscribers yet"}
                description={
                  search || status ? "Try another search or filter." : "Sign-ups from the storefront newsletter section will appear here."
                }
              />
            }
          />
        )}
        <Pagination page={page} pages={meta.pages} total={meta.total} pageSize={LIMIT} onChange={onPage} />
      </div>
    </div>
  );
}
