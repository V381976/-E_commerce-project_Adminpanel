import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, ShoppingCart, Download, Undo2, X } from "lucide-react";
import { errorMessage } from "../api";
import { PageHeader, DataTable, Pagination, SearchInput, EmptyState, ErrorState } from "../Components/ui";
import { formatDateTime, formatPrice } from "../lib/format";
import { ORDER_STATUSES, PAYMENT_STATUSES, humanize, orderLabel, cleanParams, downloadCsv } from "../Components/sales/constants";
import { useQueryState, useRemote, useDebouncedFilter } from "../Components/sales/hooks";
import { StatusBadge, PaymentBadge, ReturnBadge, RefundBadge, CustomerCell, Tabs, DateRange } from "../Components/sales/bits";

const LIMIT = 20;
const DEFAULTS = { status: "", q: "", paymentStatus: "", paymentMethod: "", from: "", to: "", sort: "newest", page: "1" };

export default function Orders() {
  const [f, update] = useQueryState(DEFAULTS);
  const [search, setSearch] = useDebouncedFilter(f.q, (q) => update({ q }));
  const [exporting, setExporting] = useState(false);

  const filters = cleanParams({
    status: f.status,
    paymentStatus: f.paymentStatus,
    paymentMethod: f.paymentMethod,
    from: f.from,
    to: f.to,
  });
  const query = new URLSearchParams({
    ...filters,
    ...cleanParams({ q: f.q, sort: f.sort === "newest" ? "" : f.sort }),
    page: f.page,
    limit: String(LIMIT),
  }).toString();
  const { data, loading, error, retry } = useRemote("/orders", query);

  const orders = data?.orders || [];
  const counts = data?.counts || {};
  const page = Number(f.page) || 1;
  const hasFilters = !!(f.q || f.paymentStatus || f.paymentMethod || f.from || f.to);

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadCsv("/admin/orders-export", filters, `orders-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(errorMessage(err, "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      key: "order",
      header: "Order",
      mobile: "title",
      render: (o) => (
        <Link to={`/orders/${o._id}`} className="block">
          <p className="font-semibold text-ink-900 hover:text-brand-700">{orderLabel(o)}</p>
          <p className="text-xs text-ink-500">{formatDateTime(o.createdAt)}</p>
        </Link>
      ),
    },
    { key: "customer", header: "Customer", render: (o) => <CustomerCell order={o} /> },
    {
      key: "items",
      header: "Items",
      render: (o) => {
        const qty = (o.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
        return (
          <span title={(o.items || []).map((i) => `${i.title || "Item"} × ${i.quantity}`).join(", ")}>
            {qty} item{qty === 1 ? "" : "s"}
          </span>
        );
      },
    },
    {
      key: "total",
      header: "Total",
      render: (o) => <span className="font-semibold text-ink-900 tabular-nums">{formatPrice(o.totalAmount)}</span>,
    },
    {
      key: "payment",
      header: "Payment",
      render: (o) => (
        <div className="flex flex-col items-start gap-1">
          <PaymentBadge status={o.paymentStatus} />
          <span className="text-[11px] text-ink-500">{o.paymentMethod === "ONLINE" ? "Online" : "COD"}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (o) => (
        <div className="flex flex-wrap items-start gap-1">
          <StatusBadge status={o.orderStatus} />
          <ReturnBadge status={o.returnRequest?.status} />
          <RefundBadge refund={o.refund} />
        </div>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (o) => (
        <Link to={`/orders/${o._id}`} className="btn btn-secondary btn-sm">
          <Eye className="size-4" /> View
        </Link>
      ),
    },
  ];

  const tabs = [
    { value: "", label: "All", count: counts.ALL },
    ...ORDER_STATUSES.map((s) => ({ value: s, label: humanize(s), count: counts[s] })),
  ];

  return (
    <div>
      <PageHeader
        title="Orders"
        description={loading && !data ? "Loading orders…" : `${data?.total ?? 0} order${data?.total === 1 ? "" : "s"} match the current view`}
        actions={
          <>
            <Link to="/returns" className="btn btn-secondary">
              <Undo2 className="size-4" /> Returns
              {counts.RETURNS > 0 && <span className="badge badge-warning">{counts.RETURNS}</span>}
            </Link>
            <button onClick={exportCsv} disabled={exporting} className="btn btn-secondary">
              <Download className="size-4" /> {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </>
        }
      />

      <div className="card overflow-hidden">
        <Tabs tabs={tabs} value={f.status} onChange={(status) => update({ status })} />

        <div className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:px-6 lg:flex-row lg:flex-wrap lg:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Order number, customer, phone…"
            className="w-full lg:max-w-xs"
          />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <select
              value={f.paymentStatus}
              onChange={(e) => update({ paymentStatus: e.target.value })}
              aria-label="Payment status"
              className="input h-10 sm:w-44"
            >
              <option value="">Any payment status</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </select>
            <select
              value={f.paymentMethod}
              onChange={(e) => update({ paymentMethod: e.target.value })}
              aria-label="Payment method"
              className="input h-10 sm:w-40"
            >
              <option value="">Any method</option>
              <option value="COD">Cash on delivery</option>
              <option value="ONLINE">Online</option>
            </select>
            <select
              value={f.sort}
              onChange={(e) => update({ sort: e.target.value })}
              aria-label="Sort orders"
              className="input col-span-2 h-10 sm:w-40"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount-desc">Highest amount</option>
            </select>
          </div>
          <DateRange from={f.from} to={f.to} onChange={update} />
          {hasFilters && (
            <button
              onClick={() => update({ q: "", paymentStatus: "", paymentMethod: "", from: "", to: "" })}
              className="btn btn-ghost btn-sm self-start lg:self-center"
            >
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
              rows={orders}
              loading={loading}
              skeletonRows={8}
              empty={
                <EmptyState
                  icon={ShoppingCart}
                  title={hasFilters || f.status ? "No orders match these filters" : "No orders yet"}
                  description={hasFilters || f.status ? "Try a different search, status or date range." : "Orders placed on the storefront appear here."}
                />
              }
            />
            {!loading && (
              <Pagination
                page={page}
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
