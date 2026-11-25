import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Printer,
  Trash2,
  Truck,
  User,
  MapPin,
  CreditCard,
  StickyNote,
  Banknote,
  History,
  Package,
  ExternalLink,
  Pencil,
  Send,
  ArrowRightLeft,
} from "lucide-react";
import api, { errorMessage } from "../api";
import { Card, ErrorState, Input, TextArea, Thumb, useConfirm } from "../Components/ui";
import { formatDate, formatPrice } from "../lib/format";
import {
  PAYMENT_METHOD_LABEL,
  humanize,
  orderLabel,
  orderCustomer,
  formatFull,
  toDateInput,
} from "../Components/sales/constants";
import { StatusBadge, PaymentBadge, ReturnBadge, RefundBadge, Detail } from "../Components/sales/bits";

const EMPTY_TRACKING = { courier: "", number: "", url: "", estimatedDelivery: "" };

const trackingForm = (t) => ({
  courier: t?.courier || "",
  number: t?.number || "",
  url: t?.url || "",
  estimatedDelivery: toDateInput(t?.estimatedDelivery),
});

function TrackingFields({ value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Input label="Courier" value={value.courier} onChange={set("courier")} placeholder="e.g. Delhivery" maxLength={60} />
      <Input label="Tracking number" value={value.number} onChange={set("number")} maxLength={80} />
      <Input label="Tracking URL" type="url" value={value.url} onChange={set("url")} placeholder="https://…" maxLength={300} />
      <Input label="Estimated delivery" type="date" value={value.estimatedDelivery} onChange={set("estimatedDelivery")} />
    </div>
  );
}

/* ================= STATUS ================= */
function StatusCard({ order, allowedNext, onDone }) {
  const confirm = useConfirm();
  // the server rejects every move except cancel for unpaid online orders
  const unpaidOnline = order.paymentMethod === "ONLINE" && order.paymentStatus !== "PAID";
  const options = unpaidOnline ? allowedNext.filter((s) => s === "CANCELLED") : allowedNext;
  const [picked, setPicked] = useState("");
  const [note, setNote] = useState("");
  const [tracking, setTracking] = useState(() => trackingForm(order.tracking));
  const [saving, setSaving] = useState(false);
  const next = options.includes(picked) ? picked : "";

  const submit = async (e) => {
    e.preventDefault();
    if (!next) return;
    if (next === "CANCELLED" || next === "RETURNED") {
      const ok = await confirm({
        title: next === "CANCELLED" ? "Cancel this order?" : "Mark as returned?",
        message:
          next === "CANCELLED"
            ? `${orderLabel(order)} will be cancelled and its stock released.${order.paymentStatus === "PAID" ? " A refund will be flagged as pending." : ""} The customer is notified.`
            : `${orderLabel(order)} will be marked as returned and its items restocked.${order.paymentStatus === "PAID" ? " A refund will be flagged as pending." : ""}`,
        confirmLabel: next === "CANCELLED" ? "Cancel order" : "Mark returned",
      });
      if (!ok) return;
    }
    const body = { status: next, note: note.trim() };
    if (next === "SHIPPED" && Object.values(tracking).some((v) => v.trim())) body.tracking = tracking;
    setSaving(true);
    try {
      await api.put(`/orders/status/${order._id}`, body);
      toast.success(`Order marked ${humanize(next).toLowerCase()}`);
      setPicked("");
      setNote("");
      await onDone();
    } catch (err) {
      toast.error(errorMessage(err, "Status update failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Update status" description={`Currently ${humanize(order.orderStatus).toLowerCase()}`}>
      {options.length === 0 ? (
        <p className="text-sm text-ink-500">
          {allowedNext.length === 0
            ? `This order is ${humanize(order.orderStatus).toLowerCase()} — its status can't change any more.`
            : "Waiting for payment — this online order can only be cancelled until it's paid."}
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {unpaidOnline && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Payment hasn't been received yet, so the order can only be cancelled for now.
            </p>
          )}
          <div>
            <p className="label">Move to</p>
            <div className="flex flex-wrap gap-2">
              {options.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={next === s}
                  onClick={() => setPicked(s)}
                  className={`btn btn-sm ${next === s ? (s === "CANCELLED" ? "btn-danger" : "btn-dark") : "btn-secondary"}`}
                >
                  {humanize(s)}
                </button>
              ))}
            </div>
          </div>
          {next === "SHIPPED" && (
            <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-ink-800">
                <Truck className="size-4" /> Shipment details <span className="font-normal text-ink-500">(optional)</span>
              </p>
              <TrackingFields value={tracking} onChange={setTracking} />
            </div>
          )}
          {next && (
            <TextArea
              label={next === "CANCELLED" ? "Reason / note" : "Note"}
              hint="Saved in the order timeline."
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={!next || saving} className={`btn ${next === "CANCELLED" ? "btn-danger" : "btn-primary"}`}>
              <ArrowRightLeft className="size-4" />
              {saving ? "Updating…" : next ? `Mark ${humanize(next).toLowerCase()}` : "Choose a status"}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

/* ================= ITEMS + TOTALS ================= */
function ItemsCard({ order }) {
  const items = order.items || [];
  const subtotal = order.subtotal ?? items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0);
  const tax = order.tax || {};
  return (
    <Card title={`Items (${items.length})`} bodyClassName="p-0">
      <ul className="divide-y divide-ink-100">
        {items.map((i, idx) => (
          <li key={i._id || idx} className="flex items-start gap-3 px-5 py-4 sm:px-6">
            <Thumb src={i.thumbnail} className="size-14" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-900">{i.title || "Item"}</p>
              <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink-500">
                {i.variantLabel && <span>{i.variantLabel}</span>}
                {i.sku && <span>SKU {i.sku}</span>}
              </p>
              <p className="mt-1 text-xs text-ink-600 tabular-nums">
                {i.quantity} × {formatPrice(i.price)}
                {i.mrp > i.price && <span className="ml-1.5 text-ink-400 line-through">{formatPrice(i.mrp)}</span>}
              </p>
            </div>
            <p className="text-sm font-semibold text-ink-900 tabular-nums">{formatPrice((i.price || 0) * (i.quantity || 0))}</p>
          </li>
        ))}
      </ul>
      <dl className="space-y-2 border-t border-ink-100 px-5 py-4 text-sm sm:px-6">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-600">Subtotal</dt>
          <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
        </div>
        {order.offerDiscount > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-600">Offer discount</dt>
            <dd className="text-emerald-700 tabular-nums">−{formatPrice(order.offerDiscount)}</dd>
          </div>
        )}
        {order.coupon?.code && (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-600">
              Coupon <span className="badge badge-brand ml-1 font-mono">{order.coupon.code}</span>
              {order.coupon.freeShipping && <span className="ml-1 text-xs text-ink-500">(free shipping)</span>}
            </dt>
            <dd className="text-emerald-700 tabular-nums">−{formatPrice(order.coupon.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-ink-600">Shipping</dt>
          <dd className="tabular-nums">{order.shippingFee > 0 ? formatPrice(order.shippingFee) : "Free"}</dd>
        </div>
        {tax.amount > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-600">
              Tax{tax.rate ? ` (${tax.rate}%)` : ""}
              {tax.inclusive && <span className="ml-1 text-xs text-ink-500">included in prices</span>}
            </dt>
            <dd className="tabular-nums">{tax.inclusive ? `(${formatPrice(tax.amount)})` : formatPrice(tax.amount)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 border-t border-ink-100 pt-3">
          <dt className="font-semibold text-ink-900">Total</dt>
          <dd className="text-lg font-bold text-ink-900 tabular-nums">{formatPrice(order.totalAmount)}</dd>
        </div>
        {order.refund?.status === "PROCESSED" && (
          <div className="flex justify-between gap-4 text-ink-600">
            <dt>Refunded</dt>
            <dd className="tabular-nums">−{formatPrice(order.refund.amount)}</dd>
          </div>
        )}
      </dl>
    </Card>
  );
}

/* ================= RETURN REQUEST ================= */
function ReturnCard({ order, canEdit, onDone }) {
  const confirm = useConfirm();
  const rr = order.returnRequest;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");

  const act = async (action) => {
    const copy = {
      approve: null,
      reject: { title: "Reject this return?", message: "The customer is notified that their return was rejected.", confirmLabel: "Reject return" },
      receive: {
        title: "Mark the return as received?",
        message: `The order becomes "Returned", its items are restocked${order.paymentStatus === "PAID" ? " and a refund is flagged as pending" : ""}.`,
        confirmLabel: "Mark received",
        tone: "primary",
      },
    }[action];
    if (copy && !(await confirm(copy))) return;
    setBusy(action);
    try {
      await api.post(`/admin/orders/${order._id}/return`, { action, note: note.trim() });
      toast.success(action === "approve" ? "Return approved" : action === "reject" ? "Return rejected" : "Return received");
      setNote("");
      await onDone();
    } catch (err) {
      toast.error(errorMessage(err, "Return update failed"));
    } finally {
      setBusy("");
    }
  };

  const actions = [];
  if (rr.status === "REQUESTED") actions.push("approve", "reject");
  if (rr.status === "APPROVED") actions.push("receive", "reject");

  return (
    <Card title="Return request" actions={<ReturnBadge status={rr.status} />}>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Detail label="Reason">{rr.reason}</Detail>
        <Detail label="Requested">{formatFull(rr.requestedAt)}</Detail>
        {rr.comment && (
          <div className="sm:col-span-2">
            <Detail label="Customer comment">{rr.comment}</Detail>
          </div>
        )}
        {rr.adminNote && <Detail label="Admin note">{rr.adminNote}</Detail>}
        {rr.resolvedAt && <Detail label="Resolved">{formatFull(rr.resolvedAt)}</Detail>}
      </dl>
      {canEdit && actions.length > 0 && (
        <div className="mt-5 space-y-3 border-t border-ink-100 pt-5">
          <TextArea
            label="Note to customer (optional)"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex flex-wrap justify-end gap-2">
            {actions.includes("reject") && (
              <button onClick={() => act("reject")} disabled={!!busy} className="btn btn-danger-ghost">
                {busy === "reject" ? "Rejecting…" : "Reject"}
              </button>
            )}
            {actions.includes("approve") && (
              <button onClick={() => act("approve")} disabled={!!busy} className="btn btn-primary">
                {busy === "approve" ? "Approving…" : "Approve return"}
              </button>
            )}
            {actions.includes("receive") && (
              <button onClick={() => act("receive")} disabled={!!busy} className="btn btn-primary">
                {busy === "receive" ? "Saving…" : "Mark item received"}
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ================= REFUND ================= */
function RefundCard({ order, canEdit, onDone }) {
  const confirm = useConfirm();
  const r = order.refund || {};
  const manual = order.paymentMethod === "COD" || !order.paymentId;
  const [form, setForm] = useState({ amount: String(r.amount ?? order.totalAmount), reference: "", note: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  if (r.status === "PROCESSED") {
    return (
      <Card title="Refund" actions={<RefundBadge refund={r} />}>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Detail label="Amount">{formatPrice(r.amount)}</Detail>
          <Detail label="Reference">
            <span className="font-mono text-xs">{r.reference}</span>
          </Detail>
          <Detail label="Processed">{formatFull(r.processedAt)}</Detail>
          {r.note && (
            <div className="sm:col-span-3">
              <Detail label="Note">{r.note}</Detail>
            </div>
          )}
        </dl>
      </Card>
    );
  }

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    const found = {};
    if (!(amount > 0) || amount > order.totalAmount) found.amount = `Enter an amount between ₹1 and ${formatPrice(order.totalAmount)}`;
    if (manual && !form.reference.trim()) found.reference = "Enter the bank / UPI transaction id of the refund";
    setErrors(found);
    if (Object.keys(found).length) return;

    const ok = await confirm({
      title: `Refund ${formatPrice(amount)}?`,
      message: form.reference.trim()
        ? `The refund is recorded with reference ${form.reference.trim()} and the customer is notified.`
        : "The amount is refunded to the customer's original payment method through Razorpay. This can't be undone.",
      confirmLabel: "Process refund",
    });
    if (!ok) return;
    setSaving(true);
    try {
      await api.post(`/admin/orders/${order._id}/refund`, {
        amount,
        reference: form.reference.trim(),
        note: form.note.trim(),
      });
      toast.success("Refund processed");
      await onDone();
    } catch (err) {
      toast.error(errorMessage(err, "Refund failed"));
      // a failed Razorpay attempt is saved on the order (refund.status FAILED)
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Refund"
      description={r.status ? `Refund of ${formatPrice(r.amount ?? order.totalAmount)} is ${r.status.toLowerCase()}` : "This paid order hasn't been refunded"}
      actions={<RefundBadge refund={r} />}
    >
      {r.status === "FAILED" && r.note && (
        <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">Last attempt failed: {r.note}</p>
      )}
      {r.status === "PENDING" && r.note && <p className="mb-4 text-xs text-ink-500">{r.note}</p>}
      {canEdit ? (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Amount (₹)"
              type="number"
              min="1"
              step="0.01"
              max={order.totalAmount}
              value={form.amount}
              onChange={set("amount")}
              error={errors.amount}
              required
            />
            <Input
              label="Reference"
              value={form.reference}
              onChange={set("reference")}
              error={errors.reference}
              required={manual}
              maxLength={100}
              hint={manual ? "Transaction id of the bank / UPI transfer you made." : "Leave empty to refund automatically through Razorpay."}
            />
          </div>
          <TextArea label="Note (optional)" rows={2} maxLength={300} value={form.note} onChange={set("note")} />
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn btn-primary">
              <Banknote className="size-4" /> {saving ? "Processing…" : "Process refund"}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-ink-500">You don't have permission to process refunds.</p>
      )}
    </Card>
  );
}

/* ================= TIMELINE ================= */
function TimelineCard({ order }) {
  const history = [...(order.statusHistory || [])].reverse();
  return (
    <Card title="Timeline" actions={<History className="size-4 text-ink-400" />}>
      {history.length === 0 ? (
        <p className="text-sm text-ink-500">No history recorded.</p>
      ) : (
        <ol className="relative space-y-5 border-l border-ink-100 pl-5">
          {history.map((h, i) => (
            <li key={h._id || i} className="relative">
              <span className={`absolute -left-[26px] top-1 size-3 rounded-full ring-4 ring-white ${i === 0 ? "bg-brand-600" : "bg-ink-300"}`} />
              <div className="flex flex-wrap items-center gap-2">
                {h.status ? <StatusBadge status={h.status} /> : <span className="badge badge-neutral">Update</span>}
                <span className="text-xs text-ink-500">{formatFull(h.at)}</span>
              </div>
              {h.note && <p className="mt-1 text-sm text-ink-700">{h.note}</p>}
              {h.by && <p className="mt-0.5 text-xs text-ink-400">by {h.by}</p>}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/* ================= SIDE CARDS ================= */
function CustomerCard({ order, canCustomers }) {
  const c = orderCustomer(order);
  return (
    <Card title="Customer" actions={<User className="size-4 text-ink-400" />}>
      <div className="space-y-1">
        <p className="flex items-center gap-2 font-semibold text-ink-900">
          {c.name}
          {c.guest && <span className="badge badge-neutral">Guest</span>}
          {c.deleted && <span className="badge badge-neutral">Account deleted</span>}
        </p>
        {c.email && (
          <a href={`mailto:${c.email}`} className="block break-all text-sm text-brand-700 hover:underline">
            {c.email}
          </a>
        )}
        {(c.phone || order.shippingAddress?.phone) && <p className="text-sm text-ink-600">{c.phone || order.shippingAddress?.phone}</p>}
        {order.user?.createdAt && <p className="text-xs text-ink-500">Customer since {formatDate(order.user.createdAt)}</p>}
      </div>
      {c.id && canCustomers && (
        <Link to={`/customers/${c.id}`} className="btn btn-secondary btn-sm mt-4">
          View customer
        </Link>
      )}
    </Card>
  );
}

function Address({ a }) {
  if (!a?.fullName && !a?.address) return <p className="text-sm text-ink-400">Not provided</p>;
  return (
    <address className="text-sm not-italic leading-relaxed text-ink-700">
      <span className="font-medium text-ink-900">{a.fullName}</span>
      <br />
      {a.address}
      <br />
      {[a.city, a.state].filter(Boolean).join(", ")} {a.pincode && `– ${a.pincode}`}
      {a.phone && (
        <>
          <br />
          {a.phone}
        </>
      )}
    </address>
  );
}

const sameAddress = (a = {}, b = {}) => ["fullName", "phone", "address", "city", "state", "pincode"].every((k) => (a[k] || "") === (b[k] || ""));

function AddressCard({ order }) {
  const same = !order.billingAddress || sameAddress(order.shippingAddress, order.billingAddress);
  return (
    <Card title="Addresses" actions={<MapPin className="size-4 text-ink-400" />}>
      <div className="space-y-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-500">Shipping</p>
          <Address a={order.shippingAddress} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-500">Billing</p>
          {same ? <p className="text-sm text-ink-500">Same as shipping</p> : <Address a={order.billingAddress} />}
        </div>
      </div>
    </Card>
  );
}

function PaymentCard({ order }) {
  return (
    <Card title="Payment" actions={<CreditCard className="size-4 text-ink-400" />}>
      <dl className="space-y-3">
        <Detail label="Method">{PAYMENT_METHOD_LABEL[order.paymentMethod] || order.paymentMethod}</Detail>
        <Detail label="Status">
          <PaymentBadge status={order.paymentStatus} />
        </Detail>
        {order.paymentId && (
          <Detail label="Payment ID">
            <span className="font-mono text-xs">{order.paymentId}</span>
          </Detail>
        )}
        {order.razorpayOrderId && (
          <Detail label="Razorpay order ID">
            <span className="font-mono text-xs">{order.razorpayOrderId}</span>
          </Detail>
        )}
        {order.paymentStatus === "PENDING" && order.paymentExpiresAt && (
          <Detail label="Payment window ends">{formatFull(order.paymentExpiresAt)}</Detail>
        )}
      </dl>
    </Card>
  );
}

function TrackingCard({ order, canEdit, onDone }) {
  const t = order.tracking || {};
  const has = !!(t.courier || t.number || t.url || t.estimatedDelivery);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_TRACKING);
  const [saving, setSaving] = useState(false);

  const start = () => {
    setForm(trackingForm(t));
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/orders/${order._id}/tracking`, form);
      toast.success("Tracking updated");
      setEditing(false);
      await onDone();
    } catch (err) {
      toast.error(errorMessage(err, "Tracking update failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Shipment tracking"
      actions={
        canEdit && !editing ? (
          <button onClick={start} className="btn btn-ghost btn-sm">
            <Pencil className="size-3.5" /> {has ? "Edit" : "Add"}
          </button>
        ) : (
          <Truck className="size-4 text-ink-400" />
        )
      }
    >
      {editing ? (
        <form onSubmit={save} className="space-y-4">
          <TrackingFields value={form} onChange={setForm} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
              {saving ? "Saving…" : "Save tracking"}
            </button>
          </div>
        </form>
      ) : has ? (
        <dl className="space-y-3">
          <Detail label="Courier">{t.courier}</Detail>
          <Detail label="Tracking number">
            <span className="font-mono text-xs">{t.number}</span>
          </Detail>
          {t.estimatedDelivery && <Detail label="Estimated delivery">{formatDate(t.estimatedDelivery)}</Detail>}
          {t.url && (
            <a href={t.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
              Track shipment <ExternalLink className="size-3.5" />
            </a>
          )}
        </dl>
      ) : (
        <p className="text-sm text-ink-500">No tracking details yet.</p>
      )}
      {order.deliveredAt && <p className="mt-3 text-xs text-ink-500">Delivered {formatFull(order.deliveredAt)}</p>}
    </Card>
  );
}

function NotesCard({ order, canEdit, onDone }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const notes = [...(order.notes || [])].reverse();

  const add = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      await api.post(`/admin/orders/${order._id}/notes`, { text: text.trim() });
      toast.success("Note added");
      setText("");
      await onDone();
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't add note"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Internal notes" description="Only visible to staff" actions={<StickyNote className="size-4 text-ink-400" />}>
      {canEdit && (
        <form onSubmit={add} className="mb-4 space-y-2">
          <TextArea
            rows={2}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a note for the team…"
            aria-label="New note"
          />
          <div className="flex justify-end">
            <button type="submit" disabled={saving || !text.trim()} className="btn btn-secondary btn-sm">
              <Send className="size-3.5" /> {saving ? "Adding…" : "Add note"}
            </button>
          </div>
        </form>
      )}
      {notes.length === 0 ? (
        <p className="text-sm text-ink-500">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n, i) => (
            <li key={n._id || i} className="rounded-xl bg-ink-50 p-3">
              <p className="whitespace-pre-wrap break-words text-sm text-ink-800">{n.text}</p>
              <p className="mt-1 text-xs text-ink-500">
                {n.by || "Staff"} · {formatFull(n.at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {[180, 260, 200].map((h) => (
          <div key={h} className="card p-6">
            <div className="skeleton mb-4 h-5 w-40" />
            <div className="skeleton w-full" style={{ height: h }} />
          </div>
        ))}
      </div>
      <div className="space-y-6">
        {[120, 140, 120].map((h, i) => (
          <div key={i} className="card p-6">
            <div className="skeleton mb-4 h-5 w-28" />
            <div className="skeleton w-full" style={{ height: h }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= PAGE ================= */
export default function OrderDetail() {
  const { id } = useParams();
  const { admin, can } = useOutletContext();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [prevId, setPrevId] = useState(id);
  if (prevId !== id) {
    setPrevId(id);
    setData(null);
    setLoading(true);
  }

  const fetchOrder = useCallback(
    () =>
      api
        .get(`/admin/orders/${id}`)
        .then((res) => {
          setData(res.data);
          setError("");
        })
        .catch((err) => setError(errorMessage(err, "Order load failed")))
        .finally(() => setLoading(false)),
    [id]
  );

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const retry = () => {
    setLoading(true);
    fetchOrder();
  };

  const order = data?.order;
  const canEdit = can("orders");
  const isSuper = admin?.role === "Super_Admin";

  const deleteOrder = async () => {
    const ok = await confirm({
      title: "Delete this order?",
      message: `${orderLabel(order)} and its history will be permanently deleted. Reserved stock is released. This can't be undone.`,
      confirmLabel: "Delete order",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete(`/orders/${order._id}`);
      toast.success("Order deleted");
      navigate("/orders", { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, "Delete failed"));
      setDeleting(false);
    }
  };

  const back = (
    <Link to="/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
      <ArrowLeft className="size-4" /> Orders
    </Link>
  );

  if (loading && !order) {
    return (
      <div>
        {back}
        <div className="mb-8 space-y-2">
          <div className="skeleton h-7 w-48" />
          <div className="skeleton h-4 w-64" />
        </div>
        <DetailSkeleton />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        {back}
        <div className="card">
          <ErrorState message={error || "Order not found"} onRetry={retry} />
        </div>
      </div>
    );
  }

  const r = order.refund;
  const showRefund =
    r?.status === "PENDING" ||
    r?.status === "FAILED" ||
    r?.status === "PROCESSED" ||
    (order.paymentStatus === "PAID" && ["CANCELLED", "RETURNED"].includes(order.orderStatus));

  return (
    <div>
      {back}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">Order {orderLabel(order)}</h1>
            <StatusBadge status={order.orderStatus} />
            <PaymentBadge status={order.paymentStatus} prefix="Payment " />
            <ReturnBadge status={order.returnRequest?.status} />
            <RefundBadge refund={order.refund} />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            Placed {formatFull(order.createdAt)} · {order.items?.length || 0} item{order.items?.length === 1 ? "" : "s"} ·{" "}
            {formatPrice(order.totalAmount)}
          </p>
          {order.cancelReason && order.orderStatus === "CANCELLED" && (
            <p className="mt-1 text-sm text-rose-700">Cancelled: {order.cancelReason}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/orders/${order._id}/invoice`} className="btn btn-secondary">
            <Printer className="size-4" /> Print invoice
          </Link>
          {isSuper && (
            <button onClick={deleteOrder} disabled={deleting} className="btn btn-danger-ghost">
              <Trash2 className="size-4" /> {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {canEdit && <StatusCard key={order.orderStatus + order.paymentStatus} order={order} allowedNext={data.allowedNext || []} onDone={fetchOrder} />}
          {order.returnRequest?.status && <ReturnCard order={order} canEdit={canEdit} onDone={fetchOrder} />}
          {showRefund && <RefundCard key={`${r?.status}-${r?.amount}`} order={order} canEdit={canEdit} onDone={fetchOrder} />}
          <ItemsCard order={order} />
          <TimelineCard order={order} />
        </div>
        <div className="min-w-0 space-y-6">
          <CustomerCard order={order} canCustomers={can("customers")} />
          <AddressCard order={order} />
          <PaymentCard order={order} />
          <TrackingCard order={order} canEdit={canEdit} onDone={fetchOrder} />
          <NotesCard order={order} canEdit={canEdit} onDone={fetchOrder} />
        </div>
      </div>

      {!canEdit && (
        <p className="mt-6 flex items-center gap-1.5 text-xs text-ink-500">
          <Package className="size-3.5" /> View only — your role can't change orders.
        </p>
      )}
    </div>
  );
}
