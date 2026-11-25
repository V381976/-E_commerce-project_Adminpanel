import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { LifeBuoy, Send, ExternalLink, Package, ShoppingBag, User, MessageCircleQuestion, Mail, Globe } from "lucide-react";
import api, { errorMessage } from "../api";
import { PageHeader, Pagination, SearchInput, EmptyState, ErrorState, Thumb, Switch, Spinner, FullPageLoader } from "../Components/ui";
import { StatusTabs, Drawer } from "../Components/site/shared";
import { STORE_URL } from "../Components/nav";
import { formatDateTime, formatPrice, shortId, titleCase, ORDER_BADGE } from "../lib/format";

const LIMIT = 20;

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Awaiting customer" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const STATUS_BADGE = { open: "badge-warning", pending: "badge-info", resolved: "badge-success", closed: "badge-neutral" };
const STATUS_LABEL = { open: "Open", pending: "Awaiting customer", resolved: "Resolved", closed: "Closed" };

const TYPES = [
  { value: "", label: "All types" },
  { value: "contact", label: "Contact form" },
  { value: "order", label: "Order help" },
  { value: "product_question", label: "Product questions" },
];
const TYPE_META = {
  contact: { label: "Contact", icon: Mail },
  order: { label: "Order", icon: ShoppingBag },
  product_question: { label: "Product Q&A", icon: MessageCircleQuestion },
};

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [counts, setCounts] = useState({});
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("open");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const requestId = useRef(0);

  const fetchTickets = useCallback(() => {
    const id = ++requestId.current;
    return api
      .get("/admin/support", { params: { page, limit: LIMIT, status: status || undefined, type: type || undefined, q: search || undefined } })
      .then((res) => {
        if (id !== requestId.current) return;
        setTickets(res.data.tickets || []);
        setCounts(res.data.counts || {});
        setMeta({ total: res.data.total || 0, pages: Math.max(res.data.pages || 1, 1) });
        setError("");
      })
      .catch((err) => id === requestId.current && setError(errorMessage(err, "Tickets load failed")))
      .finally(() => id === requestId.current && setLoading(false));
  }, [page, status, type, search]);

  useEffect(() => {
    const t = setTimeout(fetchTickets, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchTickets, search]);

  const change = (setter) => (v) => {
    setLoading(true);
    setPage(1);
    setter(v);
  };
  const onPage = (p) => {
    setLoading(true);
    setPage(p);
  };

  const allCount = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div>
      <PageHeader
        title="Support & Q&A"
        description="Contact-form messages, order help requests and product questions. Replies notify the customer."
      />

      <div className="card mb-5 flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
        <StatusTabs
          tabs={STATUS_TABS.map((t) => (t.value ? t : { ...t, count: allCount }))}
          value={status}
          onChange={change(setStatus)}
          counts={counts}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={type} onChange={(e) => change(setType)(e.target.value)} aria-label="Filter by type" className="input h-10 sm:w-48">
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <SearchInput value={search} onChange={change(setSearch)} placeholder="Ticket #, email, subject…" className="w-full sm:w-64" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {error ? (
          <ErrorState
            message={error}
            onRetry={() => {
              setLoading(true);
              fetchTickets();
            }}
          />
        ) : loading ? (
          <ul className="divide-y divide-ink-100">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="space-y-2 p-4 sm:px-6">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-3 w-2/3" />
              </li>
            ))}
          </ul>
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title={status === "open" && !type && !search ? "No open tickets" : "No tickets found"}
            description={status === "open" && !type && !search ? "You're all caught up." : "Try another status, type or search."}
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {tickets.map((t) => {
              const tm = TYPE_META[t.type] || TYPE_META.contact;
              const Icon = tm.icon;
              const last = t.replies?.[t.replies.length - 1];
              return (
                <li key={t._id}>
                  <button
                    onClick={() => setSelected(t._id)}
                    className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-ink-50/70 sm:px-6"
                  >
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-mono text-xs font-semibold text-ink-500">{t.ticketNumber}</span>
                        <span className={`badge ${STATUS_BADGE[t.status] || "badge-neutral"}`}>{STATUS_LABEL[t.status] || t.status}</span>
                        <span className="badge badge-neutral">{tm.label}</span>
                        {t.type === "product_question" && t.isPublic && <span className="badge badge-success">Published</span>}
                      </div>
                      <p className="mt-1 truncate font-semibold text-ink-900">
                        {t.type === "product_question" && t.product ? t.product.title : t.subject || "No subject"}
                      </p>
                      <p className="line-clamp-1 text-sm text-ink-600">{t.message}</p>
                      <p className="mt-1 text-xs text-ink-400">
                        {t.name || "Guest"} · {t.email} · {formatDateTime(t.updatedAt)}
                        {last && ` · last reply by ${last.from === "admin" ? last.by || "staff" : "customer"}`}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination page={page} pages={meta.pages} total={meta.total} pageSize={LIMIT} onChange={onPage} />
      </div>

      {selected && <TicketDrawer key={selected} id={selected} onClose={() => setSelected(null)} onChanged={fetchTickets} />}
    </div>
  );
}

/* =================================================
   DETAIL DRAWER
================================================= */
function TicketDrawer({ id, onClose, onChanged }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [replyStatus, setReplyStatus] = useState("");
  const [publish, setPublish] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const load = useCallback(
    () =>
      api
        .get(`/admin/support/${id}`)
        .then((r) => {
          setTicket(r.data);
          setError("");
        })
        .catch((err) => setError(errorMessage(err, "Ticket load failed")))
        .finally(() => setLoading(false)),
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  const isQuestion = ticket?.type === "product_question";

  const send = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return toast.error("Write a reply first");
    setSending(true);
    try {
      const body = { message: reply.trim() };
      if (replyStatus) body.status = replyStatus;
      if (isQuestion) body.publish = publish;
      await api.post(`/admin/support/${id}/reply`, body);
      toast.success(isQuestion && publish ? "Answer sent and published" : "Reply sent");
      setReply("");
      await load();
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Reply failed"));
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (next) => {
    setStatusBusy(true);
    try {
      const { data } = await api.put(`/admin/support/${id}/status`, { status: next });
      setTicket((t) => ({ ...t, status: data.status }));
      toast.success(`Marked ${STATUS_LABEL[next].toLowerCase()}`);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Status update failed"));
    } finally {
      setStatusBusy(false);
    }
  };

  const togglePublic = async (value) => {
    setStatusBusy(true);
    try {
      const { data } = await api.put(`/admin/support/${id}/status`, { status: ticket.status, isPublic: value });
      setTicket((t) => ({ ...t, isPublic: data.isPublic }));
      toast.success(value ? "Answer is visible on the product page" : "Answer hidden from the product page");
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Update failed"));
    } finally {
      setStatusBusy(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={ticket ? ticket.subject || (isQuestion ? "Product question" : "Support request") : "Ticket"}
      subtitle={ticket && <span className="font-mono text-xs">{ticket.ticketNumber}</span>}
      footer={
        ticket && (
          <form onSubmit={send} className="space-y-3">
            <label htmlFor="reply-box" className="sr-only">
              Reply
            </label>
            <textarea
              id="reply-box"
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={isQuestion ? "Write the answer…" : `Reply to ${ticket.name || ticket.email}…`}
              className="input"
              maxLength={4000}
            />
            {isQuestion && (
              <label className="flex items-center justify-between gap-3 rounded-lg bg-ink-50 px-3 py-2">
                <span className="flex items-center gap-2 text-sm text-ink-700">
                  <Globe className="size-4 text-ink-400" /> Publish answer on product page
                </span>
                <Switch checked={publish} onChange={setPublish} label="Publish answer on product page" />
              </label>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={replyStatus}
                onChange={(e) => setReplyStatus(e.target.value)}
                aria-label="Status after reply"
                className="input h-10 sm:flex-1"
              >
                <option value="">After sending: awaiting customer</option>
                <option value="resolved">After sending: mark resolved</option>
                <option value="closed">After sending: close ticket</option>
                <option value="open">After sending: keep open</option>
              </select>
              <button disabled={sending || !reply.trim()} className="btn btn-primary">
                {sending ? <Spinner /> : <Send className="size-4" />} Send reply
              </button>
            </div>
          </form>
        )
      }
    >
      {loading ? (
        <FullPageLoader label="Loading ticket…" />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            setLoading(true);
            load();
          }}
        />
      ) : (
        <div className="space-y-5">
          {/* status */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${STATUS_BADGE[ticket.status] || "badge-neutral"}`}>{STATUS_LABEL[ticket.status]}</span>
            <span className="badge badge-neutral">{TYPE_META[ticket.type]?.label}</span>
            <select
              value={ticket.status}
              disabled={statusBusy}
              onChange={(e) => changeStatus(e.target.value)}
              aria-label="Change status"
              className="input ml-auto h-9 w-auto py-1 text-sm"
            >
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* customer + links */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-ink-100 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                <User className="size-3.5" /> Customer
              </p>
              <p className="font-medium text-ink-900">{ticket.user?.name || ticket.name || "Guest"}</p>
              <a href={`mailto:${ticket.user?.email || ticket.email}`} className="break-all text-sm text-brand-600 hover:underline">
                {ticket.user?.email || ticket.email}
              </a>
              {ticket.user ? (
                <Link to={`/customers/${ticket.user._id}`} className="mt-1 block text-xs text-ink-500 hover:text-brand-700">
                  View customer →
                </Link>
              ) : (
                <p className="mt-1 text-xs text-ink-400">Guest (no account)</p>
              )}
            </div>

            {ticket.product && (
              <div className="rounded-xl border border-ink-100 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  <Package className="size-3.5" /> Product
                </p>
                <div className="flex items-center gap-2.5">
                  <Thumb src={ticket.product.thumbnail} className="size-10" />
                  <a
                    href={`${STORE_URL}/products/${ticket.product.slug || ticket.product._id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="line-clamp-2 text-sm font-medium text-ink-900 hover:text-brand-700"
                  >
                    {ticket.product.title} <ExternalLink className="inline size-3 text-ink-400" />
                  </a>
                </div>
              </div>
            )}

            {ticket.order && (
              <div className="rounded-xl border border-ink-100 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  <ShoppingBag className="size-3.5" /> Order
                </p>
                <Link to={`/orders/${ticket.order._id}`} className="font-medium text-brand-600 hover:underline">
                  #{ticket.order.orderNumber || shortId(ticket.order._id)}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-600">
                  {formatPrice(ticket.order.totalAmount)}
                  {ticket.order.orderStatus && (
                    <span className={`badge ${ORDER_BADGE[ticket.order.orderStatus] || "badge-neutral"}`}>{titleCase(ticket.order.orderStatus)}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {isQuestion && ticket.answer && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <div className="text-sm">
                <p className="font-medium text-emerald-900">{ticket.isPublic ? "Answer is public" : "Answer is private"}</p>
                <p className="text-xs text-emerald-800/80">
                  {ticket.isPublic ? "Shoppers see this Q&A on the product page." : "Only the customer received this answer."}
                </p>
              </div>
              <Switch checked={!!ticket.isPublic} disabled={statusBusy} onChange={togglePublic} label="Show answer on product page" />
            </div>
          )}

          {/* thread */}
          <ol className="space-y-3">
            <li className="rounded-xl bg-ink-50 p-4">
              <p className="text-xs text-ink-500">
                <span className="font-semibold text-ink-700">{ticket.name || "Customer"}</span> · {formatDateTime(ticket.createdAt)}
              </p>
              <p className="mt-1.5 whitespace-pre-line break-words text-sm text-ink-800">{ticket.message}</p>
            </li>
            {(ticket.replies || []).map((r, i) => (
              <li
                key={r._id || i}
                className={`rounded-xl p-4 ${r.from === "admin" ? "ml-6 border border-brand-100 bg-brand-50/60" : "mr-6 bg-ink-50"}`}
              >
                <p className="text-xs text-ink-500">
                  <span className="font-semibold text-ink-700">{r.from === "admin" ? r.by || "Staff" : ticket.name || "Customer"}</span>
                  {r.from === "admin" && <span className="badge badge-brand ml-1.5">Staff</span>} · {formatDateTime(r.at)}
                </p>
                <p className="mt-1.5 whitespace-pre-line break-words text-sm text-ink-800">{r.message}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Drawer>
  );
}
