import { STATUS_BADGE, PAYMENT_BADGE, RETURN_BADGE, REFUND_BADGE, humanize, orderCustomer } from "./constants";

export function StatusBadge({ status }) {
  if (!status) return null;
  return <span className={`badge ${STATUS_BADGE[status] || "badge-neutral"}`}>{humanize(status)}</span>;
}

export function PaymentBadge({ status, prefix = "" }) {
  if (!status) return null;
  return (
    <span className={`badge ${PAYMENT_BADGE[status] || "badge-neutral"}`}>
      {prefix}
      {prefix ? humanize(status).toLowerCase() : humanize(status)}
    </span>
  );
}

export function ReturnBadge({ status }) {
  if (!status) return null;
  return <span className={`badge ${RETURN_BADGE[status] || "badge-neutral"}`}>Return {status.toLowerCase()}</span>;
}

export function RefundBadge({ refund }) {
  if (!refund?.status) return null;
  return <span className={`badge ${REFUND_BADGE[refund.status] || "badge-neutral"}`}>Refund {refund.status.toLowerCase()}</span>;
}

export function CustomerCell({ order }) {
  const c = orderCustomer(order);
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 font-medium text-ink-800">
        <span className="truncate">{c.name || "—"}</span>
        {c.guest && <span className="badge badge-neutral shrink-0 px-2 text-[10px]">Guest</span>}
        {c.deleted && <span className="badge badge-neutral shrink-0 px-2 text-[10px]">Deleted</span>}
      </p>
      {c.email && <p className="max-w-52 truncate text-xs text-ink-500">{c.email}</p>}
    </div>
  );
}

// underline tabs with counts (scrolls inside itself on narrow screens)
export function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="scrollbar-none flex gap-1 overflow-x-auto border-b border-ink-100 px-4 pt-3 sm:px-6">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 pb-3 text-sm font-medium transition ${
            value === t.value ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800"
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={`badge ${value === t.value ? "badge-brand" : "badge-neutral"}`}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function DateRange({ from, to, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
      <input
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => onChange({ from: e.target.value })}
        aria-label="From date"
        className="input h-10 min-w-0 sm:w-40"
      />
      <input
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => onChange({ to: e.target.value })}
        aria-label="To date"
        className="input h-10 min-w-0 sm:w-40"
      />
    </div>
  );
}

// label / value pair for detail cards
export function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-ink-800">{children || "—"}</dd>
    </div>
  );
}
