import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import {
  Plus,
  Trash2,
  Package,
  Pencil,
  Copy,
  ExternalLink,
  Download,
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { errorMessage } from "../api";
import { PageHeader, DataTable, Pagination, SearchInput, EmptyState, ErrorState, Thumb, Modal, Spinner, useConfirm } from "../Components/ui";
import { STORE_URL } from "../Components/nav";
import { formatPrice, titleCase } from "../lib/format";
import { downloadFile, blobErrorMessage, totalStock, stockState, STATUS_BADGE, PRODUCT_STATUSES, LABELS } from "../Components/catalog/catalog";

const LIMIT = 20;

const EMPTY_FILTERS = { status: "", category: "", stock: "", label: "", sort: "newest" };

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title A–Z" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "stock-asc", label: "Stock: low to high" },
  { value: "stock-desc", label: "Stock: high to low" },
  { value: "bestselling", label: "Best selling" },
];

const BULK_ACTIONS = [
  { value: "status", label: "Change status" },
  { value: "category", label: "Change category" },
  { value: "label", label: "Add / remove label" },
  { value: "price", label: "Update price" },
  { value: "stock", label: "Update stock" },
  { value: "delete", label: "Delete" },
];

const PRICE_MODES = [
  { value: "set", label: "Set price to (₹)" },
  { value: "increase_pct", label: "Increase by %" },
  { value: "decrease_pct", label: "Decrease by %" },
  { value: "increase_amt", label: "Increase by ₹" },
  { value: "decrease_amt", label: "Decrease by ₹" },
];

const STOCK_BADGE = { out: "badge-danger", low: "badge-warning", ok: "badge-success", untracked: "badge-neutral" };

/* =================================================
   BULK BAR
================================================= */
function BulkBar({ count, categories, onApply, onClear, busy }) {
  const [action, setAction] = useState("status");
  const [value, setValue] = useState("");
  const [mode, setMode] = useState("");
  const [subcategory, setSubcategory] = useState("");

  const parents = categories.filter((c) => !c.parent);
  const parentId = parents.find((c) => c.name === value)?._id;
  const subs = categories.filter((c) => c.parent && String(c.parent) === String(parentId));

  const changeAction = (a) => {
    setAction(a);
    setValue("");
    setSubcategory("");
    setMode(a === "label" ? "add" : a === "price" ? "set" : a === "stock" ? "add" : "");
  };

  const needsNumber = action === "price" || action === "stock";
  const ready = action === "delete" || (value !== "" && (!needsNumber || !Number.isNaN(Number(value))));

  const submit = (e) => {
    e.preventDefault();
    if (!ready) return;
    const body = { action };
    if (action !== "delete") body.value = needsNumber ? Number(value) : value;
    if (mode) body.mode = mode;
    if (action === "category") body.subcategory = subcategory;
    onApply(body);
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 border-b border-brand-100 bg-brand-50/70 px-4 py-3 sm:px-6 lg:flex-row lg:flex-wrap lg:items-center"
    >
      <div className="flex items-center justify-between gap-3 lg:justify-start">
        <span className="text-sm font-semibold text-brand-800">{count} selected</span>
        <button type="button" onClick={onClear} className="btn btn-ghost btn-sm text-ink-600">
          <X className="size-3.5" /> Clear
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-1 lg:flex-wrap lg:items-center">
        <select aria-label="Bulk action" className="input h-9 lg:w-48" value={action} onChange={(e) => changeAction(e.target.value)}>
          {BULK_ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>

        {action === "status" && (
          <select aria-label="New status" className="input h-9 lg:w-40" value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="">Choose status…</option>
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
        )}

        {action === "category" && (
          <>
            <select
              aria-label="New category"
              className="input h-9 lg:w-44"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setSubcategory("");
              }}
            >
              <option value="">Choose category…</option>
              {parents.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <select aria-label="Subcategory" className="input h-9 lg:w-44" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} disabled={!subs.length}>
              <option value="">{subs.length ? "No subcategory" : "No subcategories"}</option>
              {subs.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </>
        )}

        {action === "label" && (
          <>
            <select aria-label="Add or remove" className="input h-9 lg:w-32" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="add">Add</option>
              <option value="remove">Remove</option>
            </select>
            <select aria-label="Label" className="input h-9 lg:w-40" value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="">Choose label…</option>
              {LABELS.map((l) => (
                <option key={l} value={l}>
                  {titleCase(l)}
                </option>
              ))}
            </select>
          </>
        )}

        {action === "price" && (
          <>
            <select aria-label="Price change" className="input h-9 lg:w-48" value={mode} onChange={(e) => setMode(e.target.value)}>
              {PRICE_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <input
              aria-label="Value"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder={mode.endsWith("pct") ? "e.g. 10" : "Amount"}
              className="input h-9 lg:w-32"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </>
        )}

        {action === "stock" && (
          <>
            <select aria-label="Stock change" className="input h-9 lg:w-44" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="add">Add (use − to remove)</option>
              <option value="set">Set stock to</option>
            </select>
            <input
              aria-label="Quantity"
              type="number"
              step="1"
              inputMode="numeric"
              placeholder="Quantity"
              className="input h-9 lg:w-28"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </>
        )}

        <button disabled={!ready || busy} className={`btn btn-sm h-9 ${action === "delete" ? "btn-danger" : "btn-primary"}`}>
          {busy && <Spinner className="size-3.5" />}
          {action === "delete" ? `Delete ${count}` : "Apply"}
        </button>
      </div>
      {action === "stock" && (
        <p className="text-xs text-ink-500 lg:basis-full">Bulk stock changes the product-level stock only — adjust products with variants per variant from Inventory.</p>
      )}
    </form>
  );
}

/* =================================================
   IMPORT MODAL
================================================= */
function ImportModal({ open, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState("");
  const inputRef = useRef(null);

  const close = () => {
    if (busy) return;
    setFile(null);
    setPreview(null);
    onClose();
  };

  const template = async () => {
    setBusy("template");
    try {
      await downloadFile("/admin/products-import/template", undefined, "product-import-template.csv");
    } catch (err) {
      toast.error(await blobErrorMessage(err, "Template download failed"));
    } finally {
      setBusy("");
    }
  };

  const send = async (dryRun) => {
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    setBusy(dryRun ? "preview" : "import");
    try {
      const res = await api.post("/admin/products-import", data, { params: dryRun ? { dryRun: 1 } : undefined });
      if (dryRun) setPreview(res.data);
      else {
        const r = res.data;
        toast.success(`Imported: ${r.created} created, ${r.updated} updated${r.skipped ? `, ${r.skipped} skipped` : ""}`);
        setFile(null);
        setPreview(null);
        onDone();
      }
    } catch (err) {
      toast.error(errorMessage(err, "Import failed"));
    } finally {
      setBusy("");
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Import products from CSV"
      description="Rows with an existing _id or SKU update that product; other rows create new products."
      footer={
        <>
          <button type="button" onClick={close} disabled={!!busy} className="btn btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={() => send(true)} disabled={!file || !!busy} className="btn btn-secondary">
            {busy === "preview" && <Spinner className="size-3.5" />} Preview
          </button>
          <button
            type="button"
            onClick={() => send(false)}
            disabled={!file || !preview || !!busy || preview.created + preview.updated === 0}
            className="btn btn-primary"
            title={!preview ? "Preview the file first" : undefined}
          >
            {busy === "import" ? <Spinner className="size-3.5" /> : <Upload className="size-4" />} Import
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-ink-50/60 p-3 text-sm">
          <p className="text-ink-600">Start from the template to get the right columns. New products need a thumbnail URL.</p>
          <button type="button" onClick={template} disabled={!!busy} className="btn btn-secondary btn-sm">
            {busy === "template" ? <Spinner className="size-3.5" /> : <Download className="size-3.5" />} Template
          </button>
        </div>

        <div>
          <p className="label">CSV file</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-ink-200 px-4 py-5 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft">
              <FileSpreadsheet className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink-800">{file ? file.name : "Choose a .csv file"}</span>
              <span className="block text-xs text-ink-500">{file ? `${Math.ceil(file.size / 1024)} KB` : "Up to 2000 rows, 5 MB"}</span>
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setPreview(null);
              e.target.value = "";
            }}
          />
        </div>

        {preview && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-sm font-semibold text-ink-900">Preview — nothing has been saved yet</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xl font-bold text-emerald-700 tabular-nums">{preview.created}</p>
                <p className="text-xs text-emerald-700">to create</p>
              </div>
              <div className="rounded-xl bg-sky-50 p-3">
                <p className="text-xl font-bold text-sky-700 tabular-nums">{preview.updated}</p>
                <p className="text-xs text-sky-700">to update</p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3">
                <p className="text-xl font-bold text-rose-700 tabular-nums">{preview.skipped}</p>
                <p className="text-xs text-rose-700">skipped</p>
              </div>
            </div>
            {preview.errors?.length > 0 ? (
              <div className="max-h-56 overflow-y-auto rounded-xl border border-rose-100">
                <ul className="divide-y divide-rose-100 text-sm">
                  {preview.errors.map((e) => (
                    <li key={e.row} className="flex gap-3 px-3 py-2">
                      <span className="shrink-0 font-mono text-xs text-rose-600">Row {e.row}</span>
                      <span className="min-w-0 text-ink-700">
                        {e.title && <span className="font-medium">{e.title}: </span>}
                        {e.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="size-4" /> No row errors.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* =================================================
   PAGE
================================================= */
export default function Products() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { can = () => false } = useOutletContext() || {};
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyRow, setBusyRow] = useState(null);
  const [selected, setSelected] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const requestId = useRef(0);

  /* ================= FETCH ================= */
  const fetchProducts = useCallback(() => {
    // ignore out-of-order responses when typing fast
    const id = ++requestId.current;
    const params = { page, limit: LIMIT, keyword: search };
    Object.entries(filters).forEach(([k, v]) => v && (params[k] = v));
    return api
      .get("/list", { params })
      .then((res) => {
        if (id !== requestId.current) return;
        setProducts(res.data.products || []);
        setMeta({ pages: Math.max(res.data.pages || 1, 1), total: res.data.total || 0 });
        setError("");
      })
      .catch((err) => id === requestId.current && setError(errorMessage(err, "Products load failed")))
      .finally(() => id === requestId.current && setLoading(false));
  }, [page, search, filters]);

  useEffect(() => {
    // search me har key press pe request na jaye
    const timer = setTimeout(fetchProducts, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchProducts, search]);

  useEffect(() => {
    api
      .get("/categories")
      .then((res) => setCategories(res.data || []))
      .catch(() => toast.error("Categories failed to load"));
  }, []);

  const parents = useMemo(() => categories.filter((c) => !c.parent), [categories]);

  const reload = () => {
    setLoading(true);
    fetchProducts();
  };

  const onSearch = (value) => {
    setLoading(true);
    setPage(1);
    setSelected([]);
    setSearch(value);
  };

  const setFilter = (key, value) => {
    setLoading(true);
    setPage(1);
    setSelected([]);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const clearFilters = () => {
    setLoading(true);
    setPage(1);
    setSelected([]);
    setSearch("");
    setFilters(EMPTY_FILTERS);
  };

  const onPage = (p) => {
    setLoading(true);
    setSelected([]);
    setPage(p);
  };

  const filtered = !!search || Object.entries(filters).some(([k, v]) => k !== "sort" && v);

  /* ================= SELECTION ================= */
  const pageIds = products.map((p) => p._id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected(allOnPage ? [] : pageIds);

  /* ================= ACTIONS ================= */
  const deleteProduct = async (p) => {
    const ok = await confirm({
      title: "Delete product?",
      message: `“${p.title}” will be permanently removed from the store. This can't be undone.`,
    });
    if (!ok) return;
    setBusyRow(p._id);
    try {
      await api.delete(`/product/${p._id}`);
      toast.success("Product deleted");
      setSelected((s) => s.filter((x) => x !== p._id));
      // stepping back a page if we just emptied the last one
      if (products.length === 1 && page > 1) onPage(page - 1);
      else fetchProducts();
    } catch (err) {
      toast.error(errorMessage(err, "Delete failed"));
    } finally {
      setBusyRow(null);
    }
  };

  const duplicate = async (p) => {
    setBusyRow(p._id);
    try {
      const res = await api.post(`/admin/products/${p._id}/duplicate`);
      toast.success("Draft copy created");
      navigate(`/products/${res.data._id}/edit`);
    } catch (err) {
      toast.error(errorMessage(err, "Duplicate failed"));
      setBusyRow(null);
    }
  };

  const applyBulk = async (body) => {
    const n = selected.length;
    const what =
      body.action === "delete"
        ? `permanently delete ${n} product${n === 1 ? "" : "s"}`
        : body.action === "price"
          ? `change the price of ${n} product${n === 1 ? "" : "s"}`
          : body.action === "stock"
            ? `${body.mode === "set" ? "set" : "adjust"} stock on ${n} product${n === 1 ? "" : "s"}`
            : `update ${n} product${n === 1 ? "" : "s"}`;
    const ok = await confirm({
      title: body.action === "delete" ? "Delete products?" : "Apply bulk change?",
      message: `This will ${what}.${body.action === "delete" ? " This can't be undone." : ""}`,
      confirmLabel: body.action === "delete" ? "Delete" : "Apply",
      tone: body.action === "delete" ? undefined : "primary",
    });
    if (!ok) return;
    setBulkBusy(true);
    try {
      const res = await api.post("/admin/products-bulk", { ids: selected, ...body });
      const failed = res.data.errors?.length || 0;
      if (failed) toast.error(`${failed} product${failed === 1 ? "" : "s"} couldn't be updated: ${res.data.errors[0].message}`);
      toast.success(`${res.data.affected} product${res.data.affected === 1 ? "" : "s"} updated`);
      setSelected([]);
      if (body.action === "delete" && n >= products.length && page > 1) onPage(page - 1);
      else reload();
    } catch (err) {
      toast.error(errorMessage(err, "Bulk update failed"));
    } finally {
      setBulkBusy(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadFile("/admin/products-export", undefined, "products.csv");
    } catch (err) {
      toast.error(await blobErrorMessage(err, "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  /* ================= TABLE ================= */
  const checkbox = (p, className = "") => (
    <input
      type="checkbox"
      className={`size-4 shrink-0 cursor-pointer rounded accent-brand-600 ${className}`}
      checked={selected.includes(p._id)}
      onChange={() => toggle(p._id)}
      aria-label={`Select ${p.title}`}
    />
  );

  const columns = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          className="size-4 cursor-pointer rounded accent-brand-600"
          checked={allOnPage}
          onChange={toggleAll}
          aria-label="Select all on this page"
        />
      ),
      mobile: false,
      className: "w-10",
      render: (p) => checkbox(p),
    },
    {
      key: "product",
      header: "Product",
      mobile: "title",
      render: (p) => (
        <div className="flex min-w-0 items-center gap-3">
          {checkbox(p, "md:hidden")}
          <Thumb src={p.thumbnail} />
          <div className="min-w-0">
            <Link to={`/products/${p._id}/edit`} className="block max-w-xs truncate font-semibold text-ink-900 hover:text-brand-700 hover:underline">
              {p.title}
            </Link>
            <p className="truncate text-xs text-ink-500">
              {p.sku ? <span className="font-mono">{p.sku}</span> : "No SKU"}
              {" · "}
              <span className="capitalize">{p.category?.replace(/-/g, " ")}</span>
              {p.subcategory && <span className="capitalize"> › {p.subcategory}</span>}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => {
        const s = p.status || "active";
        return (
          <div className="flex flex-wrap gap-1">
            <span className={`badge ${STATUS_BADGE[s] || "badge-neutral"}`}>{titleCase(s)}</span>
            {(p.labels || []).map((l) => (
              <span key={l} className="badge badge-brand capitalize">
                {l}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "price",
      header: "Price",
      render: (p) => {
        const final = p.finalPrice ?? p.price;
        const reduced = final < p.price;
        return (
          <div className="tabular-nums">
            <p className="font-semibold text-ink-900">{formatPrice(final)}</p>
            {reduced && (
              <p className="text-xs text-ink-400">
                <span className="line-through">{formatPrice(p.price)}</span>{" "}
                <span className="text-emerald-600">{p.salePrice != null && p.salePrice < p.price ? "sale" : `${Math.round(p.discountPercent)}% off`}</span>
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "stock",
      header: "Stock",
      render: (p) => {
        const s = totalStock(p);
        const state = stockState(s, p.lowStockThreshold ?? 5);
        return (
          <div>
            <span className={`badge ${STOCK_BADGE[state]} tabular-nums`}>
              {state === "untracked" ? "Not tracked" : state === "out" ? "Out of stock" : `${s} in stock`}
            </span>
            {state === "low" && <p className="mt-0.5 text-xs text-amber-600">Low stock</p>}
            {p.variants?.length > 0 && <p className="mt-0.5 text-xs text-ink-400">{p.variants.length} variants</p>}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (p) => {
        const busy = busyRow === p._id;
        const live = !p.status || p.status === "active";
        return (
          <div className="flex flex-wrap items-center justify-end gap-1">
            <Link to={`/products/${p._id}/edit`} className="btn btn-ghost btn-sm" aria-label={`Edit ${p.title}`}>
              <Pencil className="size-4" /> <span className="md:sr-only">Edit</span>
            </Link>
            <button onClick={() => duplicate(p)} disabled={busy} className="btn btn-ghost btn-sm" aria-label={`Duplicate ${p.title}`} title="Duplicate as draft">
              <Copy className="size-4" /> <span className="md:sr-only">Duplicate</span>
            </button>
            {live && (
              <a
                href={`${STORE_URL}/products/${p.slug || p._id}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
                aria-label={`View ${p.title} on store`}
                title="View on store"
              >
                <ExternalLink className="size-4" /> <span className="md:sr-only">View</span>
              </a>
            )}
            <button onClick={() => deleteProduct(p)} disabled={busy} className="btn btn-danger-ghost btn-sm" aria-label={`Delete ${p.title}`} title="Delete">
              {busy ? <span className="spinner size-3.5" /> : <Trash2 className="size-4" />} <span className="md:sr-only">Delete</span>
            </button>
          </div>
        );
      },
    },
  ];

  const filterSelect = (key, label, options) => (
    <select aria-label={label} className="input h-10" value={filters[key]} onChange={(e) => setFilter(key, e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${meta.total} product${meta.total === 1 ? "" : "s"}${filtered ? " match your filters" : " in your catalogue"}`}
        actions={
          <>
            <button onClick={exportCsv} disabled={exporting} className="btn btn-secondary">
              {exporting ? <Spinner className="size-4" /> : <Download className="size-4" />} Export
            </button>
            <button onClick={() => setImportOpen(true)} className="btn btn-secondary">
              <Upload className="size-4" /> Import
            </button>
            {can("products") && (
              <Link to="/add" className="btn btn-primary">
                <Plus className="size-4" /> Add product
              </Link>
            )}
          </>
        }
      />

      <div className="card overflow-hidden">
        {/* ================= FILTERS ================= */}
        <div className="space-y-3 border-b border-ink-100 p-4 sm:px-6">
          <div className="flex items-center gap-3">
            <SearchInput value={search} onChange={onSearch} placeholder="Search title, SKU, brand, category…" className="w-full sm:max-w-sm" />
            {loading && products.length > 0 && <span className="spinner size-4 shrink-0 text-brand-600" />}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {filterSelect("status", "Status", [{ value: "", label: "All statuses" }, ...PRODUCT_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))])}
            {filterSelect("category", "Category", [{ value: "", label: "All categories" }, ...parents.map((c) => ({ value: c.name, label: c.name }))])}
            {filterSelect("stock", "Stock", [
              { value: "", label: "Any stock" },
              { value: "low", label: "Low stock" },
              { value: "out", label: "Out of stock" },
            ])}
            {filterSelect("label", "Label", [{ value: "", label: "Any label" }, ...LABELS.map((l) => ({ value: l, label: titleCase(l) }))])}
            {filterSelect("sort", "Sort", SORTS)}
            {filtered && (
              <button type="button" onClick={clearFilters} className="btn btn-ghost h-10 text-ink-600">
                <X className="size-4" /> Clear filters
              </button>
            )}
          </div>
          {products.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-ink-600 md:hidden">
              <input type="checkbox" className="size-4 rounded accent-brand-600" checked={allOnPage} onChange={toggleAll} />
              Select all on this page
            </label>
          )}
        </div>

        {selected.length > 0 && (
          <BulkBar count={selected.length} categories={categories} onApply={applyBulk} onClear={() => setSelected([])} busy={bulkBusy} />
        )}

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <div className={loading && products.length > 0 ? "pointer-events-none opacity-60 transition-opacity" : ""}>
            <DataTable
              columns={columns}
              rows={products}
              loading={loading && products.length === 0}
              empty={
                <EmptyState
                  icon={filtered ? AlertTriangle : Package}
                  title={filtered ? "No matching products" : "No products yet"}
                  description={filtered ? "Try a different search or clear the filters." : "Add your first product to start selling."}
                  action={
                    filtered ? (
                      <button onClick={clearFilters} className="btn btn-secondary btn-sm">
                        Clear filters
                      </button>
                    ) : (
                      <Link to="/add" className="btn btn-primary btn-sm">
                        <Plus className="size-4" /> Add product
                      </Link>
                    )
                  }
                />
              }
            />
          </div>
        )}

        {!error && <Pagination page={page} pages={meta.pages} total={meta.total} pageSize={LIMIT} onChange={onPage} />}
      </div>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={() => {
          setImportOpen(false);
          reload();
        }} />
    </div>
  );
}
