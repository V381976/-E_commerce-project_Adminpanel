import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Ban, CheckCircle2, Trash2, MapPin, StickyNote, Send, ShoppingCart, LifeBuoy, Mail, Phone } from "lucide-react";
import api, { errorMessage } from "../api";
import { Card, DataTable, EmptyState, ErrorState, TextArea, useConfirm } from "../Components/ui";
import { formatDate, formatPrice } from "../lib/format";
import { formatFull, initials, orderLabel, humanize } from "../Components/sales/constants";
import { StatusBadge, PaymentBadge, Detail } from "../Components/sales/bits";

const TICKET_BADGE = { open: "badge-warning", pending: "badge-info", resolved: "badge-success", closed: "badge-neutral" };

function Stat({ label, value, sub }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-1.5 truncate text-xl font-bold tracking-tight text-ink-900 tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-ink-500">{sub}</p>}
    </div>
  );
}

function NotesCard({ userId, notes, onSaved }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const list = [...(notes || [])].reverse();

  const add = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await api.post(`/admin/customers/${userId}/notes`, { note: text.trim() });
      onSaved(res.data);
      setText("");
      toast.success("Note added");
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't add note"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Support notes" description="Only visible to staff" actions={<StickyNote className="size-4 text-ink-400" />}>
      <form onSubmit={add} className="mb-4 space-y-2">
        <TextArea
          rows={2}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Prefers delivery after 6pm"
          aria-label="New support note"
        />
        <div className="flex justify-end">
          <button type="submit" disabled={saving || !text.trim()} className="btn btn-secondary btn-sm">
            <Send className="size-3.5" /> {saving ? "Adding…" : "Add note"}
          </button>
        </div>
      </form>
      {list.length === 0 ? (
        <p className="text-sm text-ink-500">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((n, i) => (
            <li key={n._id || i} className="rounded-xl bg-ink-50 p-3">
              <p className="whitespace-pre-wrap break-words text-sm text-ink-800">{n.note}</p>
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

export default function CustomerDetail() {
  const { id } = useParams();
  const { can } = useOutletContext();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const [prevId, setPrevId] = useState(id);
  if (prevId !== id) {
    setPrevId(id);
    setData(null);
    setLoading(true);
  }

  const fetchCustomer = useCallback(
    () =>
      api
        .get(`/admin/customers/${id}`)
        .then((res) => {
          setData(res.data);
          setError("");
        })
        .catch((err) => setError(errorMessage(err, "Customer load failed")))
        .finally(() => setLoading(false)),
    [id]
  );

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const user = data?.user;

  const toggleBlock = async () => {
    const blocking = !user.blocked;
    const ok = await confirm({
      title: blocking ? `Block ${user.name}?` : `Unblock ${user.name}?`,
      message: blocking
        ? "They'll be signed out and won't be able to log in or place orders until unblocked."
        : "They'll be able to sign in and place orders again.",
      confirmLabel: blocking ? "Block customer" : "Unblock",
      tone: blocking ? undefined : "primary",
    });
    if (!ok) return;
    setBusy("block");
    try {
      const res = await api.put(`/users/toggle/${user._id}`);
      setData((d) => ({ ...d, user: { ...d.user, blocked: res.data.blocked } }));
      toast.success(res.data.blocked ? "Customer blocked" : "Customer unblocked");
    } catch (err) {
      toast.error(errorMessage(err, "Update failed"));
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${user.name}?`,
      message: "Their account, saved addresses and wishlist are permanently removed. Past orders stay in the order list. This can't be undone.",
      confirmLabel: "Delete customer",
    });
    if (!ok) return;
    setBusy("delete");
    try {
      await api.delete(`/users/${user._id}`);
      toast.success("Customer deleted");
      navigate("/customers", { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, "Delete failed"));
      setBusy("");
    }
  };

  const back = (
    <Link to="/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
      <ArrowLeft className="size-4" /> Customers
    </Link>
  );

  if (loading && !user) {
    return (
      <div>
        {back}
        <div className="mb-8 flex items-center gap-4">
          <div className="skeleton size-14 rounded-full" />
          <div className="space-y-2">
            <div className="skeleton h-6 w-48" />
            <div className="skeleton h-4 w-64" />
          </div>
        </div>
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="skeleton h-72 lg:col-span-2" />
          <div className="skeleton h-72" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        {back}
        <div className="card">
          <ErrorState
            message={error || "Customer not found"}
            onRetry={() => {
              setLoading(true);
              fetchCustomer();
            }}
          />
        </div>
      </div>
    );
  }

  const { stats = {}, orders = [], tickets = [] } = data;

  const orderColumns = [
    {
      key: "order",
      header: "Order",
      mobile: "title",
      render: (o) => (
        <Link to={`/orders/${o._id}`} className="block">
          <p className="font-semibold text-ink-900 hover:text-brand-700">{orderLabel(o)}</p>
          <p className="text-xs text-ink-500">{formatDate(o.createdAt)}</p>
        </Link>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (o) => {
        const qty = (o.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
        return `${qty} item${qty === 1 ? "" : "s"}`;
      },
    },
    { key: "total", header: "Total", render: (o) => <span className="font-semibold tabular-nums">{formatPrice(o.totalAmount)}</span> },
    { key: "payment", header: "Payment", render: (o) => <PaymentBadge status={o.paymentStatus} /> },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.orderStatus} /> },
  ];

  return (
    <div>
      {back}

      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-bold text-brand-700">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight text-ink-900">{user.name}</h1>
              <span className={`badge ${user.blocked ? "badge-danger" : "badge-success"}`}>{user.blocked ? "Blocked" : "Active"}</span>
              {user.role && user.role !== "User" && <span className="badge badge-brand">{humanize(user.role)}</span>}
            </div>
            <p className="mt-0.5 break-all text-sm text-ink-500">{user.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={toggleBlock} disabled={!!busy} className="btn btn-secondary">
            {user.blocked ? <CheckCircle2 className="size-4" /> : <Ban className="size-4" />}
            {busy === "block" ? "Saving…" : user.blocked ? "Unblock" : "Block"}
          </button>
          <button onClick={remove} disabled={!!busy} className="btn btn-danger-ghost">
            <Trash2 className="size-4" /> {busy === "delete" ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Orders" value={stats.orders || 0} sub="excluding cancelled" />
        <Stat label="Lifetime value" value={formatPrice(stats.lifetimeValue)} />
        <Stat label="Average order" value={formatPrice(stats.averageOrder)} />
        <Stat
          label="Last order"
          value={stats.lastOrder ? formatDate(stats.lastOrder) : "—"}
          sub={stats.firstOrder ? `First: ${formatDate(stats.firstOrder)}` : "No orders yet"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card title="Orders" description={orders.length >= 50 ? "Latest 50 orders" : undefined} bodyClassName="p-0">
            <DataTable
              columns={orderColumns}
              rows={orders}
              empty={<EmptyState compact icon={ShoppingCart} title="No orders yet" description="Orders this customer places appear here." />}
            />
          </Card>

          <Card
            title="Support tickets"
            actions={
              can("support") && tickets.length > 0 ? (
                <Link to="/support" className="btn btn-ghost btn-sm">
                  Open support
                </Link>
              ) : (
                <LifeBuoy className="size-4 text-ink-400" />
              )
            }
            bodyClassName={tickets.length ? "p-0" : "p-5 sm:p-6"}
          >
            {tickets.length === 0 ? (
              <p className="text-sm text-ink-500">No support tickets.</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {tickets.map((t) => (
                  <li key={t._id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 sm:px-6">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">{t.subject || "(no subject)"}</p>
                      <p className="text-xs text-ink-500">
                        {t.ticketNumber && <span className="font-mono">{t.ticketNumber} · </span>}
                        {t.type && `${humanize(t.type)} · `}
                        {formatDate(t.createdAt)}
                      </p>
                    </div>
                    <span className={`badge ${TICKET_BADGE[t.status] || "badge-neutral"}`}>{humanize(t.status || "open")}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="Profile">
            <dl className="space-y-3">
              <Detail label="Email">
                <a href={`mailto:${user.email}`} className="inline-flex items-center gap-1.5 break-all text-brand-700 hover:underline">
                  <Mail className="size-3.5 shrink-0" /> {user.email}
                </a>
              </Detail>
              <Detail label="Phone">
                {user.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3.5" /> {user.phone}
                  </span>
                )}
              </Detail>
              <Detail label="Joined">{formatDate(user.createdAt)}</Detail>
              <Detail label="Last login">{user.lastLoginAt ? formatFull(user.lastLoginAt) : "Never"}</Detail>
              <Detail label="Reviews written">{String(data.reviews ?? 0)}</Detail>
              <Detail label="Wishlist items">{String(user.wishlistCount ?? 0)}</Detail>
              {user.notificationPrefs && (
                <Detail label="Marketing emails">{user.notificationPrefs.promotions ? "Subscribed" : "Not subscribed"}</Detail>
              )}
            </dl>
          </Card>

          <Card title="Saved addresses" actions={<MapPin className="size-4 text-ink-400" />}>
            {(user.addresses || []).length === 0 ? (
              <p className="text-sm text-ink-500">No saved addresses.</p>
            ) : (
              <ul className="space-y-3">
                {user.addresses.map((a) => (
                  <li key={a._id} className="rounded-xl border border-ink-100 p-3 text-sm text-ink-700">
                    <p className="mb-1 flex flex-wrap items-center gap-2 font-medium text-ink-900">
                      {a.fullName}
                      <span className="badge badge-neutral">{a.label || "Address"}</span>
                      {a.isDefault && <span className="badge badge-brand">Default</span>}
                    </p>
                    <p>{a.address}</p>
                    <p>
                      {[a.city, a.state].filter(Boolean).join(", ")} – {a.pincode}
                    </p>
                    <p className="text-ink-500">{a.phone}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <NotesCard
            userId={user._id}
            notes={user.supportNotes}
            onSaved={(supportNotes) => setData((d) => ({ ...d, user: { ...d.user, supportNotes } }))}
          />
        </div>
      </div>
    </div>
  );
}
