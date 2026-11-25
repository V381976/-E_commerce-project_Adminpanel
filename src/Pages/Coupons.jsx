import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, TicketPercent, Truck, X, Search, Package } from "lucide-react";
import api, { errorMessage } from "../api";
import {
  PageHeader,
  DataTable,
  Pagination,
  SearchInput,
  EmptyState,
  ErrorState,
  Switch,
  Modal,
  Input,
  TextArea,
  Select,
  Field,
  Spinner,
  Thumb,
  useConfirm,
} from "../Components/ui";
import { StatusTabs } from "../Components/site/shared";
import { fieldErrors, toDateInput, labelize } from "../Components/site/helpers";
import { formatPrice, formatDate } from "../lib/format";

const LIMIT = 20;

const TABS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "inactive", label: "Paused" },
];

const EMPTY = {
  code: "",
  description: "",
  type: "percent",
  value: "",
  maxDiscount: "",
  minCartValue: "",
  startsAt: "",
  expiresAt: "",
  usageLimit: "",
  perCustomerLimit: "1",
  applicableCategories: [],
  applicableProducts: [], // [{ _id, title }]
  freeShipping: false,
  active: true,
};

const numStr = (v) => (v == null ? "" : String(v));

const toForm = (c) => ({
  code: c.code || "",
  description: c.description || "",
  type: c.type || "percent",
  value: numStr(c.value),
  maxDiscount: c.maxDiscount ? String(c.maxDiscount) : "",
  minCartValue: c.minCartValue ? String(c.minCartValue) : "",
  startsAt: toDateInput(c.startsAt),
  expiresAt: toDateInput(c.expiresAt),
  usageLimit: c.usageLimit ? String(c.usageLimit) : "",
  perCustomerLimit: numStr(c.perCustomerLimit ?? 1),
  applicableCategories: c.applicableCategories || [],
  applicableProducts: (c.applicableProducts || []).map((p) => (typeof p === "string" ? { _id: p, title: "Product" } : p)),
  freeShipping: !!c.freeShipping,
  active: c.active !== false,
});

const discountText = (c) => {
  if (c.type === "percent") return `${c.value}%${c.maxDiscount ? ` up to ${formatPrice(c.maxDiscount)}` : ""} off`;
  return c.value > 0 ? `${formatPrice(c.value)} off` : "No discount";
};

// date-based state, independent of the active switch
const phase = (c, now = Date.now()) => {
  if (c.expiresAt && new Date(c.expiresAt).getTime() <= now) return "expired";
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return "scheduled";
  return "running";
};

function StatusBadge({ coupon }) {
  const p = phase(coupon);
  if (p === "expired") return <span className="badge badge-danger">Expired</span>;
  if (p === "scheduled") return <span className="badge badge-info">Scheduled</span>;
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return <span className="badge badge-warning">Used up</span>;
  if (!coupon.active) return <span className="badge badge-neutral">Paused</span>;
  return <span className="badge badge-success">Active</span>;
}

export default function Coupons() {
  const confirm = useConfirm();
  const [coupons, setCoupons] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | coupon
  const requestId = useRef(0);

  const fetchCoupons = useCallback(() => {
    const id = ++requestId.current;
    return api
      .get("/admin/coupons", { params: { page, limit: LIMIT, q: search || undefined, status: status || undefined } })
      .then((res) => {
        if (id !== requestId.current) return;
        setCoupons(res.data.coupons || []);
        setMeta({ total: res.data.total || 0, pages: Math.max(res.data.pages || 1, 1) });
        setError("");
      })
      .catch((err) => id === requestId.current && setError(errorMessage(err, "Coupons load failed")))
      .finally(() => id === requestId.current && setLoading(false));
  }, [page, search, status]);

  useEffect(() => {
    const t = setTimeout(fetchCoupons, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchCoupons, search]);

  const reload = () => {
    setLoading(true);
    fetchCoupons();
  };
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

  const toggle = async (c) => {
    setBusy(c._id);
    try {
      const { data } = await api.put(`/admin/coupons/${c._id}/toggle`);
      setCoupons((list) => list.map((x) => (x._id === c._id ? { ...x, active: data.active } : x)));
      toast.success(data.active ? `${c.code} activated` : `${c.code} paused`);
    } catch (err) {
      toast.error(errorMessage(err, "Update failed"));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (c) => {
    const ok = await confirm({
      title: "Delete coupon?",
      message: `${c.code} will stop working immediately. Past orders keep their discount.`,
    });
    if (!ok) return;
    setBusy(c._id);
    try {
      await api.delete(`/admin/coupons/${c._id}`);
      toast.success("Coupon deleted");
      if (coupons.length === 1 && page > 1) onPage(page - 1);
      else fetchCoupons();
    } catch (err) {
      toast.error(errorMessage(err, "Delete failed"));
    } finally {
      setBusy(null);
    }
  };

  const columns = [
    {
      key: "code",
      header: "Coupon",
      mobile: "title",
      render: (c) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-dashed border-brand-300 bg-brand-50 px-2 py-0.5 font-mono text-sm font-bold tracking-wide text-brand-700">
              {c.code}
            </span>
            {c.freeShipping && (
              <span className="badge badge-info">
                <Truck className="size-3" /> Free shipping
              </span>
            )}
          </div>
          {c.description && <p className="mt-1 max-w-xs truncate text-xs text-ink-500">{c.description}</p>}
        </div>
      ),
    },
    {
      key: "discount",
      header: "Discount",
      render: (c) => <span className="font-semibold text-ink-900">{discountText(c)}</span>,
    },
    {
      key: "conditions",
      header: "Conditions",
      render: (c) => (
        <ul className="space-y-0.5 text-xs text-ink-600">
          <li>{c.minCartValue ? `Min cart ${formatPrice(c.minCartValue)}` : "No minimum"}</li>
          <li>{c.perCustomerLimit ? `${c.perCustomerLimit}× per customer` : "Unlimited per customer"}</li>
          <li className="tabular-nums">
            Used {c.usedCount || 0}
            {c.usageLimit ? ` / ${c.usageLimit}` : " · no limit"}
          </li>
          {(c.applicableCategories?.length > 0 || c.applicableProducts?.length > 0) && (
            <li className="text-amber-700">
              Only{" "}
              {[
                c.applicableCategories?.length ? `${c.applicableCategories.length} categor${c.applicableCategories.length === 1 ? "y" : "ies"}` : "",
                c.applicableProducts?.length ? `${c.applicableProducts.length} product${c.applicableProducts.length === 1 ? "" : "s"}` : "",
              ]
                .filter(Boolean)
                .join(" + ")}
            </li>
          )}
        </ul>
      ),
    },
    {
      key: "validity",
      header: "Validity",
      render: (c) => (
        <div className="space-y-1">
          <StatusBadge coupon={c} />
          <p className="text-xs text-ink-500">
            {c.startsAt ? formatDate(c.startsAt) : "Now"} → {c.expiresAt ? formatDate(c.expiresAt) : "No expiry"}
          </p>
        </div>
      ),
    },
    {
      key: "stats",
      header: "Performance",
      render: (c) => (
        <div className="text-xs tabular-nums text-ink-600">
          <p>
            <span className="font-semibold text-ink-900">{c.stats?.orders || 0}</span> orders
          </p>
          <p>{formatPrice(c.stats?.revenue || 0)} revenue</p>
          <p className="text-rose-600">−{formatPrice(c.stats?.discount || 0)} given</p>
        </div>
      ),
    },
    {
      key: "active",
      header: "On",
      render: (c) => (
        <Switch
          checked={!!c.active}
          onChange={() => toggle(c)}
          disabled={busy === c._id}
          label={c.active ? `Pause ${c.code}` : `Activate ${c.code}`}
        />
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (c) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => setEditing(c)} className="btn btn-ghost btn-sm" aria-label={`Edit ${c.code}`}>
            <Pencil className="size-4" /> Edit
          </button>
          <button
            onClick={() => remove(c)}
            disabled={busy === c._id}
            className="btn btn-danger-ghost btn-sm"
            aria-label={`Delete ${c.code}`}
          >
            <Trash2 className="size-4" /> Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Codes customers enter at checkout. Stats count non-cancelled orders that used the code."
        actions={
          <button onClick={() => setEditing("new")} className="btn btn-primary">
            <Plus className="size-4" /> New coupon
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-ink-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <StatusTabs tabs={TABS} value={status} onChange={onStatus} />
          <SearchInput value={search} onChange={onSearch} placeholder="Search code…" className="w-full lg:w-64" />
        </div>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <DataTable
            columns={columns}
            rows={coupons}
            loading={loading}
            empty={
              <EmptyState
                icon={TicketPercent}
                title={search || status ? "No coupons match" : "No coupons yet"}
                description={search || status ? "Try another search or filter." : "Create a code like WELCOME10 to reward new customers."}
                action={
                  !search &&
                  !status && (
                    <button onClick={() => setEditing("new")} className="btn btn-primary btn-sm">
                      <Plus className="size-4" /> New coupon
                    </button>
                  )
                }
              />
            }
          />
        )}
        <Pagination page={page} pages={meta.pages} total={meta.total} pageSize={LIMIT} onChange={onPage} />
      </div>

      {editing && (
        <CouponModal
          key={editing === "new" ? "new" : editing._id}
          coupon={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

/* =================================================
   CREATE / EDIT MODAL
================================================= */
function CouponModal({ coupon, onClose, onSaved }) {
  const [form, setForm] = useState(() => (coupon ? toForm(coupon) : EMPTY));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api
      .get("/categories")
      .then((r) => setCategories((r.data || []).map((c) => c.name)))
      .catch(() => toast.error("Couldn't load categories"));
  }, []);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const bind = (key) => ({ value: form[key], onChange: (e) => set(key, e.target.value), error: errors[key] });

  const toggleCategory = (name) =>
    set(
      "applicableCategories",
      form.applicableCategories.includes(name) ? form.applicableCategories.filter((c) => c !== name) : [...form.applicableCategories, name]
    );

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!/^[A-Z0-9_-]{3,30}$/.test(form.code)) found.code = "Use 3–30 letters, numbers, - or _";
    if (form.value === "" && !form.freeShipping) found.value = "Enter a discount value";
    if (form.type === "percent" && Number(form.value) > 100) found.value = "Percentage can't exceed 100";
    if (form.startsAt && form.expiresAt && form.expiresAt < form.startsAt) found.expiresAt = "Expiry must be after the start date";
    setErrors(found);
    if (Object.keys(found).length) return;

    const body = {
      ...form,
      value: form.value === "" ? 0 : form.value,
      // send 0 (= no cap / unlimited) rather than "" — the server drops empty values on update, which would keep the old limit
      maxDiscount: form.type === "percent" && form.maxDiscount !== "" ? form.maxDiscount : 0,
      usageLimit: form.usageLimit === "" ? 0 : form.usageLimit,
      applicableProducts: form.applicableProducts.map((p) => p._id),
      startsAt: form.startsAt || null,
      expiresAt: form.expiresAt || null,
    };
    setSaving(true);
    try {
      if (coupon) await api.put(`/admin/coupons/${coupon._id}`, body);
      else await api.post("/admin/coupons", body);
      toast.success(coupon ? "Coupon updated" : "Coupon created");
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={coupon ? `Edit ${coupon.code}` : "New coupon"}
      description="Customers enter the code at checkout; the discount is checked against these rules."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" form="coupon-form" disabled={saving} className="btn btn-primary">
            {saving && <Spinner />} {coupon ? "Save changes" : "Create coupon"}
          </button>
        </>
      }
    >
      <form id="coupon-form" onSubmit={submit} noValidate className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Code"
            required
            placeholder="WELCOME10"
            {...bind("code")}
            onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s+/g, ""))}
            className="font-mono"
            hint="Letters, numbers, - and _ only"
          />
          <Select
            label="Discount type"
            required
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            error={errors.type}
            options={[
              { value: "percent", label: "Percentage off" },
              { value: "fixed", label: "Fixed amount off (₹)" },
            ]}
          />
          <Input
            label={form.type === "percent" ? "Discount %" : "Discount amount (₹)"}
            required
            type="number"
            min="0"
            max={form.type === "percent" ? 100 : undefined}
            placeholder={form.type === "percent" ? "10" : "200"}
            {...bind("value")}
          />
          {form.type === "percent" ? (
            <Input
              label="Max discount (₹)"
              type="number"
              min="0"
              placeholder="No cap"
              {...bind("maxDiscount")}
              hint="Caps the rupee value of the percentage. Empty = no cap."
            />
          ) : (
            <div className="hidden sm:block" />
          )}
        </div>

        <TextArea label="Description" rows={2} placeholder="Shown to staff — e.g. 10% off for first-time buyers" {...bind("description")} />

        <fieldset className="space-y-4 rounded-xl border border-ink-100 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-500">Conditions</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Min cart value (₹)" type="number" min="0" placeholder="0" {...bind("minCartValue")} />
            <Input label="Total uses" type="number" min="0" placeholder="Unlimited" {...bind("usageLimit")} hint="Empty = unlimited" />
            <Input label="Per customer" type="number" min="0" {...bind("perCustomerLimit")} hint="0 = unlimited" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Starts" type="date" {...bind("startsAt")} hint="Empty = immediately" />
            <Input label="Expires" type="date" min={form.startsAt || undefined} {...bind("expiresAt")} hint="Valid through the end of this day" />
          </div>
        </fieldset>

        <Field
          label="Limit to categories"
          hint={form.applicableCategories.length ? `${form.applicableCategories.length} selected` : "None selected = whole cart is eligible"}
          error={errors.applicableCategories}
        >
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-ink-100 p-2">
            {categories.length === 0 && <span className="px-1 py-1 text-xs text-ink-400">Loading categories…</span>}
            {categories.map((name) => {
              const on = form.applicableCategories.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleCategory(name)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition ${
                    on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-600 hover:border-ink-300"
                  }`}
                >
                  {labelize(name)}
                </button>
              );
            })}
          </div>
        </Field>

        <ProductPicker value={form.applicableProducts} onChange={(v) => set("applicableProducts", v)} />

        <div className="space-y-3 rounded-xl bg-ink-50 p-4">
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium text-ink-800">Free shipping</span>
              <span className="block text-xs text-ink-500">Waives the delivery charge when this code is applied.</span>
            </span>
            <Switch checked={form.freeShipping} onChange={(v) => set("freeShipping", v)} label="Free shipping" />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium text-ink-800">Active</span>
              <span className="block text-xs text-ink-500">Paused codes are rejected at checkout.</span>
            </span>
            <Switch checked={form.active} onChange={(v) => set("active", v)} label="Active" />
          </label>
        </div>
      </form>
    </Modal>
  );
}

function ProductPicker({ value, onChange }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    let alive = true;
    const t = setTimeout(() => {
      api
        .get("/list", { params: { keyword: term, limit: 10 } })
        .then((r) => alive && setResults(r.data.products || []))
        .catch(() => alive && setResults([]))
        .finally(() => alive && setSearching(false));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const onQuery = (v) => {
    setQ(v);
    setSearching(!!v.trim());
    if (!v.trim()) setResults([]);
  };

  const chosen = new Set(value.map((p) => p._id));
  const pick = (p) => {
    if (!chosen.has(p._id)) onChange([...value, { _id: p._id, title: p.title }]);
  };

  return (
    <Field label="Limit to products" hint="None selected = no product restriction">
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((p) => (
            <span key={p._id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-50 py-1 pl-2.5 pr-1 text-xs font-medium text-brand-700">
              <span className="truncate">{p.title}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x._id !== p._id))}
                aria-label={`Remove ${p.title}`}
                className="flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-brand-100"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search products to add…"
          aria-label="Search products"
          className="input pl-9"
        />
      </div>
      {q.trim() && (
        <ul className="mt-2 max-h-56 divide-y divide-ink-100 overflow-y-auto rounded-xl border border-ink-100">
          {searching ? (
            <li className="flex items-center gap-2 p-3 text-xs text-ink-500">
              <Spinner /> Searching…
            </li>
          ) : results.length === 0 ? (
            <li className="flex items-center gap-2 p-3 text-xs text-ink-500">
              <Package className="size-4" /> No products found
            </li>
          ) : (
            results.map((p) => (
              <li key={p._id}>
                <button
                  type="button"
                  onClick={() => pick(p)}
                  disabled={chosen.has(p._id)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-ink-50 disabled:opacity-50"
                >
                  <Thumb src={p.thumbnail} className="size-8" />
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  <span className="text-xs text-ink-500">{chosen.has(p._id) ? "Added" : formatPrice(p.finalPrice ?? p.price)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </Field>
  );
}
