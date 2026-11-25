import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import api, { errorMessage } from "../api";
import { ErrorState } from "../Components/ui";
import { formatDate, formatPrice } from "../lib/format";
import { PAYMENT_METHOD_LABEL, humanize, orderLabel, orderCustomer } from "../Components/sales/constants";

const FALLBACK_STORE = { name: "ShopEase" };

function AddressBlock({ title, a, extra }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</p>
      {a?.fullName || a?.address ? (
        <address className="text-sm not-italic leading-relaxed text-ink-800">
          <span className="font-semibold text-ink-900">{a.fullName}</span>
          <br />
          {a.address}
          <br />
          {[a.city, a.state].filter(Boolean).join(", ")} {a.pincode && `– ${a.pincode}`}
          {a.phone && (
            <>
              <br />
              Phone: {a.phone}
            </>
          )}
          {extra && (
            <>
              <br />
              {extra}
            </>
          )}
        </address>
      ) : (
        <p className="text-sm text-ink-500">—</p>
      )}
    </div>
  );
}

export default function OrderInvoice() {
  const { id } = useParams();
  const { can } = useOutletContext();
  const canSettings = can("settings");
  const [order, setOrder] = useState(null);
  const [store, setStore] = useState(FALLBACK_STORE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAll = useCallback(
    () =>
      Promise.all([
        api.get(`/admin/orders/${id}`),
        // store details are optional — roles without settings access get the fallback name
        canSettings ? api.get("/admin/settings").catch(() => null) : Promise.resolve(null),
      ])
        .then(([o, s]) => {
          setOrder(o.data.order);
          if (s?.data?.store) setStore({ ...FALLBACK_STORE, ...s.data.store });
          setError("");
        })
        .catch((err) => setError(errorMessage(err, "Invoice load failed")))
        .finally(() => setLoading(false)),
    [id, canSettings]
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const toolbar = (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link to={`/orders/${id}`} className="btn btn-secondary">
        <ArrowLeft className="size-4" /> Back to order
      </Link>
      <button onClick={() => window.print()} disabled={!order} className="btn btn-primary">
        <Printer className="size-4" /> Print
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        {toolbar}
        <div className="card space-y-4 p-8">
          <div className="skeleton h-8 w-40" />
          <div className="skeleton h-4 w-64" />
          <div className="skeleton h-40 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl">
        {toolbar}
        <div className="card">
          <ErrorState
            message={error || "Order not found"}
            onRetry={() => {
              setLoading(true);
              fetchAll();
            }}
          />
        </div>
      </div>
    );
  }

  const c = orderCustomer(order);
  const items = order.items || [];
  const subtotal = order.subtotal ?? items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0);
  const tax = order.tax || {};
  const billing = order.billingAddress?.fullName ? order.billingAddress : order.shippingAddress;

  return (
    <div className="mx-auto max-w-3xl">
      {toolbar}

      <article className="card p-6 text-ink-800 sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* header */}
        <header className="flex flex-col gap-6 border-b border-ink-200 pb-6 sm:flex-row sm:justify-between print:flex-row">
          <div className="min-w-0">
            <p className="text-2xl font-bold tracking-tight text-ink-900">{store.name}</p>
            <div className="mt-2 space-y-0.5 text-sm text-ink-600">
              {store.address && <p className="whitespace-pre-line">{store.address}</p>}
              {store.email && <p>{store.email}</p>}
              {store.phone && <p>{store.phone}</p>}
            </div>
          </div>
          <div className="sm:text-right print:text-right">
            <p className="text-xl font-semibold uppercase tracking-widest text-ink-900">Invoice</p>
            <dl className="mt-2 space-y-0.5 text-sm">
              <div>
                <dt className="inline text-ink-500">Invoice no. </dt>
                <dd className="inline font-semibold text-ink-900">{orderLabel(order)}</dd>
              </div>
              <div>
                <dt className="inline text-ink-500">Order date </dt>
                <dd className="inline">{formatDate(order.createdAt)}</dd>
              </div>
              {order.deliveredAt && (
                <div>
                  <dt className="inline text-ink-500">Delivered </dt>
                  <dd className="inline">{formatDate(order.deliveredAt)}</dd>
                </div>
              )}
              <div>
                <dt className="inline text-ink-500">Status </dt>
                <dd className="inline">{humanize(order.orderStatus)}</dd>
              </div>
            </dl>
          </div>
        </header>

        {/* parties */}
        <section className="grid gap-6 border-b border-ink-200 py-6 sm:grid-cols-2 print:grid-cols-2">
          <AddressBlock title="Bill to" a={billing} extra={c.email} />
          <AddressBlock title="Ship to" a={order.shippingAddress} />
        </section>

        {/* items — the only part that may scroll on a phone */}
        <section className="py-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="py-2 pr-3 font-semibold">#</th>
                  <th className="py-2 pr-3 font-semibold">Item</th>
                  <th className="py-2 pr-3 text-right font-semibold">Qty</th>
                  <th className="py-2 pr-3 text-right font-semibold">Unit price</th>
                  <th className="py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {items.map((i, idx) => (
                  <tr key={i._id || idx} className="align-top">
                    <td className="py-3 pr-3 text-ink-500">{idx + 1}</td>
                    <td className="py-3 pr-3">
                      <p className="font-medium text-ink-900">{i.title || "Item"}</p>
                      <p className="text-xs text-ink-500">{[i.variantLabel, i.sku && `SKU ${i.sku}`].filter(Boolean).join(" · ")}</p>
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums">{i.quantity}</td>
                    <td className="py-3 pr-3 text-right tabular-nums">{formatPrice(i.price)}</td>
                    <td className="py-3 text-right font-medium tabular-nums">{formatPrice((i.price || 0) * (i.quantity || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* totals + payment */}
        <section className="flex flex-col-reverse gap-6 border-t border-ink-200 pt-6 sm:flex-row sm:justify-between print:flex-row">
          <div className="text-sm">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Payment</p>
            <p>{PAYMENT_METHOD_LABEL[order.paymentMethod] || order.paymentMethod}</p>
            <p className="text-ink-600">Status: {humanize(order.paymentStatus)}</p>
            {order.paymentId && <p className="break-all text-xs text-ink-500">Txn: {order.paymentId}</p>}
            {order.refund?.status === "PROCESSED" && (
              <p className="mt-1 text-xs text-ink-600">
                Refunded {formatPrice(order.refund.amount)} on {formatDate(order.refund.processedAt)}
              </p>
            )}
          </div>
          <dl className="w-full space-y-1.5 text-sm sm:w-72">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-600">Subtotal</dt>
              <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
            </div>
            {order.offerDiscount > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-600">Offer discount</dt>
                <dd className="tabular-nums">−{formatPrice(order.offerDiscount)}</dd>
              </div>
            )}
            {order.coupon?.code && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-600">Coupon ({order.coupon.code})</dt>
                <dd className="tabular-nums">−{formatPrice(order.coupon.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-ink-600">Shipping</dt>
              <dd className="tabular-nums">{order.shippingFee > 0 ? formatPrice(order.shippingFee) : "Free"}</dd>
            </div>
            {tax.amount > 0 && !tax.inclusive && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-600">Tax{tax.rate ? ` (${tax.rate}%)` : ""}</dt>
                <dd className="tabular-nums">{formatPrice(tax.amount)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-ink-200 pt-2 text-base font-bold text-ink-900">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPrice(order.totalAmount)}</dd>
            </div>
            {tax.amount > 0 && tax.inclusive && (
              <p className="text-right text-xs text-ink-500">
                Includes tax{tax.rate ? ` @ ${tax.rate}%` : ""} of {formatPrice(tax.amount)}
              </p>
            )}
          </dl>
        </section>

        <footer className="mt-10 border-t border-ink-200 pt-4 text-center text-xs text-ink-500">
          Thank you for shopping with {store.name}.{store.email && ` Questions? Write to ${store.email}.`}
          <p className="mt-1">This is a computer-generated invoice and does not require a signature.</p>
        </footer>
      </article>
    </div>
  );
}
