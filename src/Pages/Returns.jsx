import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, Undo2, Check, X, Banknote } from "lucide-react";
import api, { errorMessage } from "../api";
import { PageHeader, DataTable, Pagination, EmptyState, ErrorState, useConfirm } from "../Components/ui";
import { formatDate, formatPrice } from "../lib/format";
import { orderLabel } from "../Components/sales/constants";
import { useQueryState, useRemote } from "../Components/sales/hooks";
import { StatusBadge, ReturnBadge, RefundBadge, CustomerCell, Tabs } from "../Components/sales/bits";

const LIMIT = 20;
const DEFAULTS = { tab: "REQUESTED", page: "1" };

const TABS = [
  { value: "REQUESTED", label: "Requested", params: { returnStatus: "REQUESTED" } },
  { value: "APPROVED", label: "Approved", params: { returnStatus: "APPROVED" } },
  { value: "RECEIVED", label: "Received", params: { returnStatus: "RECEIVED" } },
  { value: "REJECTED", label: "Rejected", params: { returnStatus: "REJECTED" } },
  { value: "REFUNDS", label: "Refunds pending", params: { refund: "pending" } },
];

const EMPTY_COPY = {
  REQUESTED: "No return requests are waiting for review.",
  APPROVED: "No approved returns are waiting for the item to come back.",
  RECEIVED: "No returned items have been received yet.",
  REJECTED: "No returns have been rejected.",
  REFUNDS: "Every paid cancellation and return has been refunded.",
};

export default function Returns() {
  const { can } = useOutletContext();
  const confirm = useConfirm();
  const [f, update] = useQueryState(DEFAULTS);
  const tab = TABS.find((t) => t.value === f.tab) || TABS[0];
  const [busy, setBusy] = useState(null);
  const [counts, setCounts] = useState({});

  const query = new URLSearchParams({ ...tab.params, page: f.page, limit: String(LIMIT) }).toString();
  const { data, loading, error, retry, reload } = useRemote("/orders", query);
  const orders = data?.orders || [];

  // one tiny request per tab just for the badge counts
  const fetchCounts = useCallback(
    () =>
      Promise.all(
        TABS.map((t) =>
          api
            .get("/orders", { params: { ...t.params, page: 1, limit: 1 } })
            .then((res) => [t.value, res.data.total])
            .catch(() => [t.value, undefined])
        )
      ).then((pairs) => setCounts(Object.fromEntries(pairs))),
    []
  );

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const resolve = async (order, action) => {
    if (
      action === "reject" &&
      !(await confirm({
        title: "Reject this return?",
        message: `The return on ${orderLabel(order)} will be rejected and the customer notified.`,
        confirmLabel: "Reject return",
      }))
    )
      return;
    setBusy(order._id);
    try {
      await api.post(`/admin/orders/${order._id}/return`, { action });
      toast.success(action === "approve" ? `Return on ${orderLabel(order)} approved` : `Return on ${orderLabel(order)} rejected`);
      // stepping back a page if we just emptied the last one
      if (orders.length === 1 && Number(f.page) > 1) update({ page: Number(f.page) - 1 });
      else reload();
      fetchCounts();
    } catch (err) {
      toast.error(errorMessage(err, "Return update failed"));
    } finally {
      setBusy(null);
    }
  };

  const isRefunds = tab.value === "REFUNDS";
  const canEdit = can("orders");

  const columns = [
    {
      key: "order",
      header: "Order",
      mobile: "title",
      render: (o) => (
        <Link to={`/orders/${o._id}`} className="block">
          <p className="font-semibold text-ink-900 hover:text-brand-700">{orderLabel(o)}</p>
          <p className="text-xs text-ink-500">Placed {formatDate(o.createdAt)}</p>
        </Link>
      ),
    },
    { key: "customer", header: "Customer", render: (o) => <CustomerCell order={o} /> },
    isRefunds
      ? {
          key: "refund",
          header: "Refund due",
          render: (o) => (
            <div>
              <p className="font-semibold text-ink-900 tabular-nums">{formatPrice(o.refund?.amount ?? o.totalAmount)}</p>
              <p className="text-xs text-ink-500">{o.paymentMethod === "ONLINE" ? "Online" : "COD"}</p>
            </div>
          ),
        }
      : {
          key: "reason",
          header: "Reason",
          render: (o) => (
            <div className="min-w-0 max-w-64">
              <p className="truncate text-ink-800" title={o.returnRequest?.reason}>
                {o.returnRequest?.reason || "—"}
              </p>
              {o.returnRequest?.comment && (
                <p className="truncate text-xs text-ink-500" title={o.returnRequest.comment}>
                  “{o.returnRequest.comment}”
                </p>
              )}
            </div>
          ),
        },
    {
      key: "date",
      header: isRefunds ? "Updated" : "Requested",
      render: (o) => formatDate(isRefunds ? o.updatedAt : o.returnRequest?.requestedAt),
    },
    {
      key: "total",
      header: "Order total",
      render: (o) => <span className="tabular-nums">{formatPrice(o.totalAmount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (o) => (
        <div className="flex flex-wrap gap-1">
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
        <div className="flex flex-wrap justify-end gap-1.5">
          {canEdit && o.returnRequest?.status === "REQUESTED" && (
            <>
              <button onClick={() => resolve(o, "approve")} disabled={busy === o._id} className="btn btn-primary btn-sm">
                <Check className="size-4" /> Approve
              </button>
              <button onClick={() => resolve(o, "reject")} disabled={busy === o._id} className="btn btn-danger-ghost btn-sm">
                <X className="size-4" /> Reject
              </button>
            </>
          )}
          {isRefunds ? (
            <Link to={`/orders/${o._id}`} className="btn btn-secondary btn-sm">
              <Banknote className="size-4" /> Refund
            </Link>
          ) : (
            <Link to={`/orders/${o._id}`} className="btn btn-secondary btn-sm">
              <Eye className="size-4" /> View
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Returns & refunds" description="Review return requests and settle refunds for paid orders that were cancelled or returned." />

      <div className="card overflow-hidden">
        <Tabs
          tabs={TABS.map((t) => ({ value: t.value, label: t.label, count: counts[t.value] }))}
          value={tab.value}
          onChange={(v) => update({ tab: v })}
        />

        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={orders}
              loading={loading}
              empty={<EmptyState icon={isRefunds ? Banknote : Undo2} title="Nothing here" description={EMPTY_COPY[tab.value]} />}
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
