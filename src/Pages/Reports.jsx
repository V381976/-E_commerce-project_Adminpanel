import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { Download, BarChart3, Package, FolderTree, TicketPercent, CalendarDays } from "lucide-react";
import api, { errorMessage } from "../api";
import { PageHeader, Card, DataTable, EmptyState, ErrorState, Thumb, Spinner } from "../Components/ui";
import RevenueChart from "../Components/catalog/RevenueChart";
import { downloadFile, blobErrorMessage, isoDay } from "../Components/catalog/catalog";
import { formatDate, formatPrice, titleCase } from "../lib/format";

const GROUPS = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
];

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDay(d);
};

const PRESETS = [
  { key: "7d", label: "7 days", range: () => ({ from: daysAgo(6), to: isoDay(new Date()), groupBy: "day" }) },
  { key: "30d", label: "30 days", range: () => ({ from: daysAgo(29), to: isoDay(new Date()), groupBy: "day" }) },
  {
    key: "month",
    label: "This month",
    range: () => {
      const d = new Date();
      return { from: isoDay(new Date(d.getFullYear(), d.getMonth(), 1)), to: isoDay(d), groupBy: "day" };
    },
  },
  {
    key: "year",
    label: "This year",
    range: () => {
      const d = new Date();
      return { from: isoDay(new Date(d.getFullYear(), 0, 1)), to: isoDay(d), groupBy: "month" };
    },
  },
];

const STATUS_TONE = {
  PENDING: "bg-amber-400",
  CONFIRMED: "bg-sky-400",
  PROCESSING: "bg-brand-400",
  SHIPPED: "bg-indigo-400",
  DELIVERED: "bg-emerald-500",
  CANCELLED: "bg-rose-400",
  RETURNED: "bg-ink-400",
};

const periodLabel = (iso, groupBy) => {
  const d = new Date(iso);
  if (groupBy === "year") return String(d.getFullYear());
  if (groupBy === "month") return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

function Metric({ label, value, hint, loading, tone = "" }) {
  return (
    <div className="card min-w-0 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
      {loading ? (
        <div className="skeleton mt-2 h-7 w-20" />
      ) : (
        <p className={`mt-1.5 truncate text-xl font-bold tracking-tight tabular-nums ${tone || "text-ink-900"}`}>{value}</p>
      )}
      {hint && !loading && <p className="mt-0.5 truncate text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

// share bars for status / payment breakdowns
function Breakdown({ rows, total, loading, empty }) {
  if (loading)
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-8" />
        ))}
      </div>
    );
  if (!rows.length) return <EmptyState compact title={empty} />;
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => {
        const pct = total ? Math.round((r.count / total) * 100) : 0;
        return (
          <li key={r.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-ink-800">{r.label}</span>
              <span className="text-right tabular-nums text-ink-600">
                {r.count} <span className="text-xs text-ink-400">· {formatPrice(r.value)}</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100" role="presentation">
              <div className={`h-full rounded-full ${r.tone || "bg-brand-500"}`} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function Reports() {
  const { can = () => false } = useOutletContext() || {};
  const initial = PRESETS[1].range();
  const [filters, setFilters] = useState(initial);
  const [preset, setPreset] = useState("30d");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");

  const invalid = filters.from && filters.to && filters.from > filters.to;

  /* ================= FETCH ================= */
  const fetchReport = useCallback(() => {
    if (invalid) return Promise.resolve();
    return api
      .get("/admin/reports", { params: filters })
      .then((res) => {
        setReport(res.data);
        setError("");
      })
      .catch((err) => setError(errorMessage(err, "Report failed to load")))
      .finally(() => setLoading(false));
  }, [filters, invalid]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const update = (patch, presetKey = "") => {
    const next = { ...filters, ...patch };
    if (!(next.from && next.to && next.from > next.to)) setLoading(true);
    setPreset(presetKey);
    setFilters(next);
  };

  const download = async (type) => {
    setDownloading(type);
    try {
      await downloadFile("/admin/reports", { ...filters, format: "csv", type }, `${type}-report.csv`);
    } catch (err) {
      toast.error(await blobErrorMessage(err, "Download failed"));
    } finally {
      setDownloading("");
    }
  };

  const s = report?.summary || {};
  const groupBy = report?.groupBy || filters.groupBy;
  const series = (report?.series || []).map((r) => ({
    ...r,
    label: periodLabel(r.period, groupBy),
    tooltipLabel: groupBy === "week" ? `Week of ${formatDate(r.period)}` : periodLabel(r.period, groupBy),
  }));

  const statusRows = Object.entries(report?.statusBreakdown || {})
    .map(([k, v]) => ({ key: k, label: titleCase(k), count: v.count, value: v.value, tone: STATUS_TONE[k] }))
    .sort((a, b) => b.count - a.count);
  const paymentRows = Object.entries(report?.paymentBreakdown || {})
    .map(([k, v]) => ({ key: k, label: k === "COD" ? "Cash on delivery" : k === "ONLINE" ? "Online payment" : k, count: v.count, value: v.value }))
    .sort((a, b) => b.count - a.count);

  const productColumns = [
    {
      key: "title",
      header: "Product",
      mobile: "title",
      render: (p) => (
        <div className="flex min-w-0 items-center gap-3">
          <Thumb src={p.thumbnail} className="size-10" />
          {can("products") && p._id ? (
            <Link to={`/products/${p._id}/edit`} className="truncate font-medium text-ink-900 hover:text-brand-700 hover:underline">
              {p.title}
            </Link>
          ) : (
            <span className="truncate font-medium text-ink-900">{p.title}</span>
          )}
        </div>
      ),
    },
    { key: "units", header: "Units sold", align: "right", render: (p) => <span className="tabular-nums">{p.units}</span> },
    { key: "revenue", header: "Revenue", align: "right", render: (p) => <span className="font-semibold tabular-nums">{formatPrice(p.revenue)}</span> },
  ];
  const categoryColumns = [
    { key: "category", header: "Category", mobile: "title", render: (c) => <span className="font-medium capitalize text-ink-900">{c.category?.replace(/-/g, " ")}</span> },
    { key: "units", header: "Units sold", align: "right", render: (c) => <span className="tabular-nums">{c.units}</span> },
    { key: "revenue", header: "Revenue", align: "right", render: (c) => <span className="font-semibold tabular-nums">{formatPrice(c.revenue)}</span> },
  ];
  const couponColumns = [
    { key: "_id", header: "Code", mobile: "title", render: (c) => <span className="font-mono font-semibold text-ink-900">{c._id}</span> },
    { key: "orders", header: "Orders", align: "right", render: (c) => <span className="tabular-nums">{c.orders}</span> },
    { key: "discount", header: "Discount given", align: "right", render: (c) => <span className="tabular-nums text-rose-600">{formatPrice(c.discount)}</span> },
    { key: "revenue", header: "Revenue", align: "right", render: (c) => <span className="font-semibold tabular-nums">{formatPrice(c.revenue)}</span> },
  ];

  const csvButton = (type, label) => (
    <button type="button" onClick={() => download(type)} disabled={!!downloading || invalid} className="btn btn-secondary btn-sm">
      {downloading === type ? <Spinner className="size-3.5" /> : <Download className="size-3.5" />} {label}
    </button>
  );

  const showData = !error && !invalid;
  const busy = loading && !report;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Sales performance, best sellers and order health for any date range."
        actions={
          <>
            {csvButton("sales", "Sales CSV")}
            {csvButton("products", "Products CSV")}
            {csvButton("categories", "Categories CSV")}
          </>
        }
      />

      {/* ================= FILTERS ================= */}
      <div className="card flex flex-col gap-4 p-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick ranges">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => update(p.range(), p.key)}
              aria-pressed={preset === p.key}
              className={`btn btn-sm ${preset === p.key ? "btn-dark" : "btn-secondary"}`}
            >
              {p.key === preset && <CalendarDays className="size-3.5" />} {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:items-end">
          <div className="min-w-0">
            <label htmlFor="rep-from" className="label">
              From
            </label>
            <input id="rep-from" type="date" className="input" value={filters.from} max={filters.to || undefined} onChange={(e) => update({ from: e.target.value })} />
          </div>
          <div className="min-w-0">
            <label htmlFor="rep-to" className="label">
              To
            </label>
            <input id="rep-to" type="date" className="input" value={filters.to} min={filters.from || undefined} onChange={(e) => update({ to: e.target.value })} aria-invalid={invalid} />
          </div>
          <div className="col-span-2 min-w-0 sm:col-span-1">
            <label htmlFor="rep-group" className="label">
              Group by
            </label>
            <select id="rep-group" className="input" value={filters.groupBy} onChange={(e) => update({ groupBy: e.target.value }, preset)}>
              {GROUPS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {invalid && <p className="field-error -mt-3">The start date must be on or before the end date.</p>}

      {error ? (
        <div className="card">
          <ErrorState
            message={error}
            onRetry={() => {
              setLoading(true);
              fetchReport();
            }}
          />
        </div>
      ) : (
        showData && (
          <div className={`space-y-6 ${loading && report ? "pointer-events-none opacity-60 transition-opacity" : ""}`}>
            {/* ================= SUMMARY ================= */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              <Metric loading={busy} label="Revenue" value={formatPrice(s.revenue)} tone="text-emerald-700" />
              <Metric loading={busy} label="Orders" value={s.orders ?? 0} hint={`${s.ordersPlaced ?? 0} placed in total`} />
              <Metric loading={busy} label="Avg. order value" value={formatPrice(s.averageOrderValue)} />
              <Metric loading={busy} label="Items sold" value={s.itemsSold ?? 0} />
              <Metric loading={busy} label="Discounts" value={formatPrice(s.discounts)} hint="Offers + coupons" />
              <Metric loading={busy} label="New customers" value={s.newCustomers ?? 0} hint={`${s.customers ?? 0} buying customers`} />
              <Metric loading={busy} label="Cancellation rate" value={`${s.cancellationRate ?? 0}%`} hint={`${s.cancelled ?? 0} cancelled`} tone={s.cancellationRate > 20 ? "text-rose-600" : ""} />
              <Metric loading={busy} label="Returns" value={s.returnRequests ?? 0} hint={`${s.returned ?? 0} returned orders`} />
              <Metric loading={busy} label="Refunds processed" value={s.refundsProcessed ?? 0} />
              <Metric loading={busy} label="Refunds pending" value={s.refundsPending ?? 0} tone={s.refundsPending ? "text-amber-600" : ""} />
              <Metric loading={busy} label="Refunded amount" value={formatPrice(s.refundedAmount)} tone="text-rose-600" />
              <Metric loading={busy} label="Shipping + tax" value={formatPrice((s.shipping || 0) + (s.tax || 0))} hint={`Tax ${formatPrice(s.tax)}`} />
            </div>

            {/* ================= CHART ================= */}
            <Card
              title="Revenue & orders"
              description={report ? `${formatDate(report.range?.from)} – ${formatDate(report.range?.to)} · ${GROUPS.find((g) => g.value === groupBy)?.label}` : "Loading…"}
            >
              <div className="h-64 sm:h-80">
                {busy ? (
                  <div className="skeleton size-full" />
                ) : series.length === 0 ? (
                  <EmptyState compact icon={BarChart3} title="No sales in this period" description="Try a wider date range." />
                ) : (
                  <RevenueChart data={series} id="rep" />
                )}
              </div>
            </Card>

            {/* ================= TOP LISTS ================= */}
            <div className="grid gap-6 xl:grid-cols-2">
              <Card title="Top products" description="By units sold" bodyClassName="" actions={csvButton("products", "CSV")}>
                <DataTable
                  columns={productColumns}
                  rows={report?.topProducts || []}
                  rowKey="_id"
                  loading={busy}
                  empty={<EmptyState compact icon={Package} title="No products sold" />}
                />
              </Card>
              <Card title="Top categories" description="By revenue" bodyClassName="" actions={csvButton("categories", "CSV")}>
                <DataTable
                  columns={categoryColumns}
                  rows={report?.topCategories || []}
                  rowKey="category"
                  loading={busy}
                  empty={<EmptyState compact icon={FolderTree} title="No category sales" />}
                />
              </Card>
            </div>

            {/* ================= BREAKDOWNS ================= */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Order status" description="All orders placed in the period">
                <Breakdown rows={statusRows} total={statusRows.reduce((n, r) => n + r.count, 0)} loading={busy} empty="No orders placed" />
              </Card>
              <Card title="Payment methods" description="Completed sales only">
                <Breakdown rows={paymentRows} total={paymentRows.reduce((n, r) => n + r.count, 0)} loading={busy} empty="No sales" />
              </Card>
            </div>

            <Card title="Coupon performance" description="Top coupons used on completed sales" bodyClassName="">
              <DataTable
                columns={couponColumns}
                rows={report?.coupons || []}
                rowKey="_id"
                loading={busy}
                empty={<EmptyState compact icon={TicketPercent} title="No coupons used in this period" />}
              />
            </Card>
          </div>
        )
      )}
    </div>
  );
}
