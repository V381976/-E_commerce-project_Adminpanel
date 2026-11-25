import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Boxes, ChevronDown, ChevronRight, History, SlidersHorizontal, Download, Pencil, PackageX, AlertTriangle } from "lucide-react";
import api, { errorMessage } from "../api";
import { PageHeader, SearchInput, EmptyState, ErrorState, Thumb, Pagination, Modal, Spinner, Input, Select, TextArea } from "../Components/ui";
import { formatDateTime } from "../lib/format";
import { downloadFile, blobErrorMessage, stockState, variantLabel, REASON_LABEL } from "../Components/catalog/catalog";

const LIMIT = 20;
const TABS = [
  { key: "all", label: "All" },
  { key: "low", label: "Low stock" },
  { key: "out", label: "Out of stock" },
  { key: "untracked", label: "Not tracked" },
];
const SORTS = [
  { value: "", label: "Lowest stock first" },
  { value: "stock-desc", label: "Highest stock first" },
  { value: "title", label: "Title A–Z" },
];
const STOCK_BADGE = { out: "badge-danger", low: "badge-warning", ok: "badge-success", untracked: "badge-neutral" };

function StockBadge({ stock, threshold }) {
  const state = stockState(stock, threshold);
  return (
    <span className={`badge ${STOCK_BADGE[state]} tabular-nums`}>
      {state === "untracked" ? "Not tracked" : state === "out" ? "Out · 0" : state === "low" ? `Low · ${stock}` : stock}
    </span>
  );
}

/* =================================================
   ADJUST MODAL
================================================= */
function AdjustModal({ target, onClose, onSaved }) {
  const current = target?.variant ? Number(target.variant.stock) || 0 : target?.product.totalStock ?? 0;
  const [mode, setMode] = useState("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("restock");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const q = Number(quantity);
  const valid = quantity !== "" && Number.isInteger(q) && (mode === "add" ? q !== 0 : q >= 0);
  const after = valid ? (mode === "set" ? q : current + q) : null;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return setError(mode === "set" ? "Enter a whole number, 0 or more" : "Enter a whole number (negative to remove)");
    if (after < 0) return setError(`Only ${current} in stock — can't remove more than that`);
    setSaving(true);
    try {
      const res = await api.post("/admin/inventory/adjust", {
        productId: target.product._id,
        variantId: target.variant?._id,
        mode,
        quantity: q,
        reason,
        note: note.trim(),
      });
      toast.success(`Stock updated: ${res.data.before} → ${res.data.after}`);
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err, "Stock update failed"));
      setError(errorMessage(err, "Stock update failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => !saving && onClose()}
      title="Adjust stock"
      description={`${target.product.title}${target.variant ? ` — ${variantLabel(target.variant)}` : ""}`}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" form="adjust-form" disabled={saving} className="btn btn-primary">
            {saving && <Spinner className="size-3.5" />} Save
          </button>
        </>
      }
    >
      <form id="adjust-form" onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-ink-100 p-1" role="group" aria-label="Mode">
          {[
            ["add", "Add / remove"],
            ["set", "Set to exact"],
          ].map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setMode(k);
                setError("");
              }}
              aria-pressed={mode === k}
              className={`rounded-md py-1.5 text-sm font-medium transition ${mode === k ? "bg-white text-ink-900 shadow-soft" : "text-ink-500"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <Input
          label={mode === "set" ? "New stock" : "Quantity (use − to remove)"}
          type="number"
          step="1"
          inputMode="numeric"
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value);
            setError("");
          }}
          error={error}
          hint={`Currently ${current} in stock${after != null ? ` → will be ${after}` : ""}`}
        />
        <Select
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          options={[
            { value: "restock", label: "Restock (new delivery)" },
            { value: "adjustment", label: "Adjustment (count, damage, loss)" },
          ]}
        />
        <TextArea label="Note" rows={2} maxLength={300} placeholder="Optional — e.g. supplier invoice #, reason for loss" value={note} onChange={(e) => setNote(e.target.value)} />
      </form>
    </Modal>
  );
}

/* =================================================
   THRESHOLD MODAL
================================================= */
function ThresholdModal({ product, defaultThreshold, onClose, onSaved }) {
  const [value, setValue] = useState(product.lowStockThreshold ?? (product.threshold !== defaultThreshold ? String(product.threshold) : ""));
  const [saving, setSaving] = useState(false);
  const invalid = value !== "" && (!Number.isInteger(Number(value)) || Number(value) < 0);

  const submit = async (e) => {
    e.preventDefault();
    if (invalid) return;
    setSaving(true);
    try {
      await api.put(`/admin/inventory/threshold/${product._id}`, { lowStockThreshold: value === "" ? null : Number(value) });
      toast.success("Low-stock alert updated");
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err, "Update failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      size="sm"
      onClose={() => !saving && onClose()}
      title="Low-stock alert"
      description={product.title}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" form="threshold-form" disabled={saving || invalid} className="btn btn-primary">
            {saving && <Spinner className="size-3.5" />} Save
          </button>
        </>
      }
    >
      <form id="threshold-form" onSubmit={submit} noValidate>
        <Input
          label="Alert when stock is at or below"
          type="number"
          min="0"
          step="1"
          placeholder={`Store default (${defaultThreshold})`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={invalid ? "Enter a whole number, 0 or more" : undefined}
          hint="Leave empty to use the store default."
        />
      </form>
    </Modal>
  );
}

/* =================================================
   STOCK HISTORY MODAL
================================================= */
function HistoryModal({ product, onClose }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ logs: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const params = product ? { product: product._id } : {};

  const fetchLogs = useCallback(
    () =>
      api
        .get("/admin/inventory/logs", { params: { ...(product ? { product: product._id } : {}), page, limit: 15 } })
        .then((res) => {
          setData(res.data);
          setError("");
        })
        .catch((err) => setError(errorMessage(err, "History failed to load")))
        .finally(() => setLoading(false)),
    [product, page]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadFile("/admin/inventory/logs", { ...params, format: "csv" }, "stock-movements.csv");
    } catch (err) {
      toast.error(await blobErrorMessage(err, "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title="Stock movements"
      description={product ? product.title : "All products"}
      footer={
        <>
          <button type="button" onClick={exportCsv} disabled={exporting || !data.total} className="btn btn-secondary mr-auto">
            {exporting ? <Spinner className="size-3.5" /> : <Download className="size-4" />} Export CSV
          </button>
          <button type="button" onClick={onClose} className="btn btn-primary">
            Done
          </button>
        </>
      }
    >
      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            setLoading(true);
            fetchLogs();
          }}
        />
      ) : loading && !data.logs.length ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-12" />
          ))}
        </div>
      ) : !data.logs.length ? (
        <EmptyState compact icon={History} title="No stock movements yet" />
      ) : (
        <div className={loading ? "opacity-60 transition-opacity" : ""}>
          <ul className="-mx-2 divide-y divide-ink-100">
            {data.logs.map((l) => (
              <li key={l._id} className="flex items-start justify-between gap-3 px-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-ink-800">
                    {REASON_LABEL[l.reason] || l.reason}
                    {l.refId && <span className="font-normal text-ink-500"> · {l.refId}</span>}
                  </p>
                  <p className="text-xs text-ink-500">
                    {!product && <span className="font-medium text-ink-600">{l.productTitle} · </span>}
                    {l.variantLabel && `${l.variantLabel} · `}
                    {formatDateTime(l.createdAt)}
                    {l.by && ` · ${l.by}`}
                  </p>
                  {l.note && <p className="mt-0.5 text-xs italic text-ink-500">“{l.note}”</p>}
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p className={`font-semibold ${l.change > 0 ? "text-emerald-600" : l.change < 0 ? "text-rose-600" : "text-ink-500"}`}>
                    {l.change > 0 ? "+" : ""}
                    {l.change}
                  </p>
                  <p className="text-xs text-ink-400">
                    {l.before} → {l.after}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="-mx-6 -mb-5 mt-2">
            <Pagination
              page={data.page || page}
              pages={data.pages || 1}
              total={data.total}
              pageSize={15}
              onChange={(p) => {
                setLoading(true);
                setPage(p);
              }}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

/* =================================================
   PAGE
================================================= */
export default function Inventory() {
  const { can = () => false } = useOutletContext() || {};
  const [params, setParams] = useSearchParams();
  const filter = TABS.some((t) => t.key === params.get("filter")) ? params.get("filter") : "all";

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1, counts: null, defaultLowStockThreshold: 5 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState([]);
  const [adjust, setAdjust] = useState(null);
  const [threshold, setThreshold] = useState(null);
  const [history, setHistory] = useState(undefined);
  const requestId = useRef(0);

  // the tab lives in the URL (dashboard links to ?filter=low); reset paging when it changes
  const [prevFilter, setPrevFilter] = useState(filter);
  if (prevFilter !== filter) {
    setPrevFilter(filter);
    setPage(1);
    setLoading(true);
  }

  /* ================= FETCH ================= */
  const fetchItems = useCallback(() => {
    const id = ++requestId.current;
    return api
      .get("/admin/inventory", { params: { filter, q: search, page, limit: LIMIT, ...(sort ? { sort } : {}) } })
      .then((res) => {
        if (id !== requestId.current) return;
        setData(res.data);
        setError("");
      })
      .catch((err) => id === requestId.current && setError(errorMessage(err, "Inventory failed to load")))
      .finally(() => id === requestId.current && setLoading(false));
  }, [filter, search, page, sort]);

  useEffect(() => {
    const timer = setTimeout(fetchItems, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchItems, search]);

  const reload = () => {
    setLoading(true);
    fetchItems();
  };

  const setTab = (key) => {
    if (key === filter) return;
    setParams(key === "all" ? {} : { filter: key });
  };

  const onSearch = (v) => {
    setLoading(true);
    setPage(1);
    setSearch(v);
  };

  const toggle = (id) => setExpanded((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));
  const counts = data.counts || {};
  const items = data.items || [];

  const titleCell = (p) => (
    <div className="flex min-w-0 items-center gap-3">
      <Thumb src={p.thumbnail} className="size-10" />
      <div className="min-w-0">
        {can("products") ? (
          <Link to={`/products/${p._id}/edit`} className="block truncate font-semibold text-ink-900 hover:text-brand-700 hover:underline">
            {p.title}
          </Link>
        ) : (
          <p className="truncate font-semibold text-ink-900">{p.title}</p>
        )}
        <p className="truncate text-xs text-ink-500">
          {p.sku ? <span className="font-mono">{p.sku}</span> : "No SKU"}
          {p.category && <span className="capitalize"> · {p.category.replace(/-/g, " ")}</span>}
          {p.status && p.status !== "active" && <span className="badge badge-neutral ml-1.5 capitalize">{p.status}</span>}
        </p>
      </div>
    </div>
  );

  const thresholdButton = (p) => (
    <button
      type="button"
      onClick={() => setThreshold(p)}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm tabular-nums text-ink-700 hover:bg-ink-100"
      aria-label={`Edit low-stock alert for ${p.title}`}
      title="Edit low-stock alert"
    >
      ≤ {p.threshold}
      <Pencil className="size-3 text-ink-400" />
    </button>
  );

  const rowActions = (p) => (
    <>
      {!p.variants?.length && (
        <button type="button" onClick={() => setAdjust({ product: p })} className="btn btn-secondary btn-sm">
          <SlidersHorizontal className="size-3.5" /> Adjust
        </button>
      )}
      <button type="button" onClick={() => setHistory(p)} className="btn btn-ghost btn-sm" aria-label={`Stock history for ${p.title}`}>
        <History className="size-4" /> <span className="lg:sr-only">History</span>
      </button>
    </>
  );

  const variantRows = (p) =>
    p.variants.map((v) => (
      <div key={v._id} className="flex items-center justify-between gap-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-800">{variantLabel(v) || "Variant"}</p>
          <p className="truncate font-mono text-xs text-ink-500">{v.sku || "No SKU"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StockBadge stock={v.stock ?? 0} threshold={p.threshold} />
          <button type="button" onClick={() => setAdjust({ product: p, variant: v })} className="btn btn-secondary btn-sm" aria-label={`Adjust ${variantLabel(v)}`}>
            <SlidersHorizontal className="size-3.5" /> <span className="hidden sm:inline">Adjust</span>
          </button>
        </div>
      </div>
    ));

  return (
    <div>
      <PageHeader
        title="Inventory"
        description={counts.all != null ? `${counts.units ?? 0} units across ${counts.all} products` : "Track and adjust stock levels."}
        actions={
          <button type="button" onClick={() => setHistory(null)} className="btn btn-secondary">
            <History className="size-4" /> Stock movements
          </button>
        }
      />

      <div className="card overflow-hidden">
        {/* ================= TABS ================= */}
        <div className="overflow-x-auto border-b border-ink-100">
          <div className="flex min-w-max gap-1 px-4 sm:px-6" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={filter === t.key}
                onClick={() => setTab(t.key)}
                className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition ${
                  filter === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800"
                }`}
              >
                {t.label}
                <span
                  className={`badge tabular-nums ${
                    t.key === "out" && counts.out ? "badge-danger" : t.key === "low" && counts.low ? "badge-warning" : "badge-neutral"
                  }`}
                >
                  {counts[t.key] ?? "–"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <SearchInput value={search} onChange={onSearch} placeholder="Search title, SKU, brand…" className="w-full sm:max-w-sm" />
          <div className="flex items-center gap-3">
            {loading && items.length > 0 && <span className="spinner size-4 text-brand-600" />}
            <select
              aria-label="Sort"
              className="input h-10 sm:w-52"
              value={sort}
              onChange={(e) => {
                setLoading(true);
                setPage(1);
                setSort(e.target.value);
              }}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && !items.length ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-12" />
            ))}
          </div>
        ) : !items.length ? (
          <EmptyState
            icon={filter === "out" ? PackageX : filter === "low" ? AlertTriangle : Boxes}
            title={search ? "No matching products" : filter === "all" ? "No products yet" : `No ${TABS.find((t) => t.key === filter).label.toLowerCase()} products`}
            description={filter === "low" || filter === "out" ? "Nice — nothing needs restocking here." : undefined}
          />
        ) : (
          <div className={loading ? "pointer-events-none opacity-60 transition-opacity" : ""}>
            {/* desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50/70 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                    <th className="w-10 py-3 pl-6" />
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Alert at</th>
                    <th className="px-4 py-3 text-right">Sold</th>
                    <th className="py-3 pl-4 pr-6 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {items.map((p) => {
                    const open = expanded.includes(p._id);
                    return (
                      <Fragment key={p._id}>
                        <tr className="hover:bg-ink-50/60">
                          <td className="py-3 pl-6">
                            {p.variants?.length > 0 && (
                              <button type="button" onClick={() => toggle(p._id)} aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} variants`} className="btn btn-ghost btn-icon btn-sm">
                                {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                              </button>
                            )}
                          </td>
                          <td className="max-w-md px-4 py-3">{titleCell(p)}</td>
                          <td className="px-4 py-3">
                            <StockBadge stock={p.totalStock} threshold={p.threshold} />
                            {p.variants?.length > 0 && (
                              <button type="button" onClick={() => toggle(p._id)} className="mt-0.5 block text-xs text-brand-600 hover:underline">
                                {p.variants.length} variants
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">{thresholdButton(p)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-ink-600">{p.soldCount || 0}</td>
                          <td className="py-3 pl-4 pr-6">
                            <div className="flex justify-end gap-1">{rowActions(p)}</div>
                          </td>
                        </tr>
                        {open && (
                          <tr className="bg-ink-50/50">
                            <td />
                            <td colSpan={5} className="px-4 pb-3 pr-6 pt-1">
                              <div className="divide-y divide-ink-100 rounded-xl border border-ink-100 bg-white px-4">{variantRows(p)}</div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* mobile */}
            <ul className="divide-y divide-ink-100 md:hidden">
              {items.map((p) => {
                const open = expanded.includes(p._id);
                return (
                  <li key={p._id} className="space-y-3 p-4">
                    {titleCell(p)}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <StockBadge stock={p.totalStock} threshold={p.threshold} />
                      <span className="text-ink-500">Alert at {thresholdButton(p)}</span>
                      <span className="text-ink-500">Sold {p.soldCount || 0}</span>
                    </div>
                    {p.variants?.length > 0 && (
                      <div>
                        <button type="button" onClick={() => toggle(p._id)} aria-expanded={open} className="flex items-center gap-1 text-sm font-medium text-brand-600">
                          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />} {p.variants.length} variants
                        </button>
                        {open && <div className="mt-2 divide-y divide-ink-100 rounded-xl border border-ink-100 px-3">{variantRows(p)}</div>}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">{rowActions(p)}</div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {!error && (
          <Pagination
            page={page}
            pages={data.pages || 1}
            total={data.total}
            pageSize={LIMIT}
            onChange={(p) => {
              setLoading(true);
              setPage(p);
            }}
          />
        )}
      </div>

      {adjust && (
        <AdjustModal
          target={adjust}
          onClose={() => setAdjust(null)}
          onSaved={() => {
            setAdjust(null);
            reload();
          }}
        />
      )}
      {threshold && (
        <ThresholdModal
          product={threshold}
          defaultThreshold={data.defaultLowStockThreshold}
          onClose={() => setThreshold(null)}
          onSaved={() => {
            setThreshold(null);
            reload();
          }}
        />
      )}
      {history !== undefined && <HistoryModal product={history} onClose={() => setHistory(undefined)} />}
    </div>
  );
}
