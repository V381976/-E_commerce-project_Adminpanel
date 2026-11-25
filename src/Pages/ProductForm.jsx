import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  Save,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  X,
  ExternalLink,
  Layers,
  History,
  CheckCircle2,
  PackagePlus,
  Pencil,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { errorMessage, imageUrl } from "../api";
import { PageHeader, Card, Input, TextArea, Select, ImageDropzone, Spinner, ErrorState, FullPageLoader, Modal, EmptyState, useConfirm } from "../Components/ui";
import { STORE_URL } from "../Components/nav";
import { formatDateTime, formatPrice, titleCase } from "../lib/format";
import { LABELS, PRODUCT_STATUSES, REASON_LABEL, variantLabel } from "../Components/catalog/catalog";

/* =================================================
   HELPERS
================================================= */
// mirrors the backend slugify so the URL preview matches what gets saved
const slugify = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

const splitList = (s) => [...new Set(String(s || "").split(",").map((x) => x.trim()).filter(Boolean))];

const numOrEmpty = (v) => (v == null ? "" : String(v));

const EMPTY = {
  title: "",
  description: "",
  price: "",
  salePrice: "",
  discountPercent: "",
  stock: "",
  sku: "",
  barcode: "",
  lowStockThreshold: "",
  category: "",
  subcategory: "",
  brand: "",
  tags: "",
  labels: [],
  status: "active",
  seoTitle: "",
  seoDescription: "",
  slug: "",
  warrantyInformation: "",
  returnPolicy: "",
  shippingInformation: "",
  specifications: [],
  options: [],
  variants: [],
};

const fromProduct = (p) => ({
  title: p.title || "",
  description: p.description || "",
  price: numOrEmpty(p.price),
  salePrice: numOrEmpty(p.salePrice),
  discountPercent: numOrEmpty(p.discountPercent),
  stock: numOrEmpty(p.stock),
  sku: p.sku || "",
  barcode: p.barcode || "",
  lowStockThreshold: numOrEmpty(p.lowStockThreshold),
  category: p.category || "",
  subcategory: p.subcategory || "",
  brand: p.brand || "",
  tags: (p.tags || []).join(", "),
  labels: p.labels || [],
  status: p.status || "active",
  seoTitle: p.seo?.title || "",
  seoDescription: p.seo?.description || "",
  slug: p.slug || "",
  warrantyInformation: p.warrantyInformation || "",
  returnPolicy: p.returnPolicy || "",
  shippingInformation: p.shippingInformation || "",
  specifications: (p.specifications || []).map((s) => ({ key: s.key || "", value: s.value || "" })),
  options: (p.variantOptions || []).map((o) => ({ name: o.name || "", values: (o.values || []).join(", ") })),
  variants: (p.variants || []).map((v) => ({
    _id: v._id,
    options: v.options || {},
    sku: v.sku || "",
    price: numOrEmpty(v.price),
    salePrice: numOrEmpty(v.salePrice),
    stock: numOrEmpty(v.stock ?? 0),
    image: v.image,
  })),
});

const validOptions = (options) =>
  options.map((o) => ({ name: o.name.trim(), values: splitList(o.values) })).filter((o) => o.name && o.values.length);

// every combination of option values, keeping data (and _id → stock history) of rows that still exist
const buildVariants = (options, previous) => {
  const opts = validOptions(options);
  if (!opts.length) return [];
  let combos = [{}];
  opts.forEach((o) => {
    combos = combos.flatMap((c) => o.values.map((v) => ({ ...c, [o.name]: v })));
  });
  const byKey = new Map(previous.map((v) => [opts.map((o) => `${o.name}=${v.options?.[o.name]}`).join("|"), v]));
  // fallback match on the value tuple (survives an option being renamed)
  const byValues = new Map(previous.map((v) => [Object.values(v.options || {}).join("|"), v]));
  return combos.slice(0, 100).map((options) => {
    const prev = byKey.get(opts.map((o) => `${o.name}=${options[o.name]}`).join("|")) || byValues.get(opts.map((o) => options[o.name]).join("|"));
    return prev ? { ...prev, options } : { options, sku: "", price: "", salePrice: "", stock: "0" };
  });
};

const customerPays = (price, sale, pct) => {
  const p = Number(price);
  if (price === "" || !Number.isFinite(p)) return null;
  const s = Number(sale);
  if (sale !== "" && Number.isFinite(s) && s > 0 && s < p) return s;
  const d = Number(pct);
  if (pct !== "" && d > 0) return Math.round(p * (1 - Math.min(d, 95) / 100) * 100) / 100;
  return p;
};

const validate = (f, { hasThumb }) => {
  const e = {};
  if (!f.title.trim()) e.title = "Title is required";
  if (f.price === "") e.price = "Price is required";
  else if (Number(f.price) < 0) e.price = "Price can't be negative";
  if (!f.category) e.category = "Choose a category";
  if (f.salePrice !== "" && f.price !== "" && Number(f.salePrice) >= Number(f.price)) e.salePrice = "Sale price must be lower than the price";
  if (f.discountPercent !== "" && (Number(f.discountPercent) < 0 || Number(f.discountPercent) > 90)) e.discountPercent = "Must be between 0 and 90";
  if (f.stock !== "" && Number(f.stock) < 0) e.stock = "Stock can't be negative";
  if (f.lowStockThreshold !== "" && Number(f.lowStockThreshold) < 0) e.lowStockThreshold = "Can't be negative";
  if (!hasThumb) e.thumbnail = "A thumbnail image is required";
  f.variants.forEach((v, i) => {
    const price = v.price !== "" ? Number(v.price) : Number(f.price);
    if (v.salePrice !== "" && Number(v.salePrice) >= price) e[`variants.${i}`] = "Variant sale price must be lower than its price";
    if (v.stock !== "" && Number(v.stock) < 0) e[`variants.${i}`] = "Stock can't be negative";
  });
  return e;
};

/* =================================================
   SMALL PIECES
================================================= */
function Counter({ value, max }) {
  return <span className={`text-xs tabular-nums ${value > max ? "text-rose-600" : "text-ink-400"}`}>{value}/{max}</span>;
}

function CheckboxPill({ checked, onChange, children }) {
  return (
    <label
      className={`inline-flex cursor-pointer select-none items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
        checked ? "border-brand-300 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-600 hover:border-ink-300"
      }`}
    >
      <input type="checkbox" className="size-4 rounded accent-brand-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

/* =================================================
   EDITOR
================================================= */
function Editor({ product, onCreated }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { can = () => false } = useOutletContext() || {};
  const editing = !!product;

  const [form, setForm] = useState(() => (product ? fromProduct(product) : EMPTY));
  const existingThumb = product?.thumbnail || "";
  const [thumbUrl, setThumbUrl] = useState("");
  const [newThumb, setNewThumb] = useState([]);
  const [existingImages, setExistingImages] = useState(product?.images || []);
  const [newImages, setNewImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [listsError, setListsError] = useState("");
  const [listsLoaded, setListsLoaded] = useState(false);

  const fetchLists = useCallback(
    () =>
      Promise.all([api.get("/categories"), api.get("/brands")])
        .then(([c, b]) => {
          setCategories(c.data || []);
          setBrands(b.data || []);
          setListsError("");
          setListsLoaded(true);
        })
        .catch((err) => setListsError(errorMessage(err, "Categories and brands failed to load"))),
    []
  );

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  // browser-level guard for unsaved edits (tab close / reload)
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /* ================= FIELD HELPERS ================= */
  const clearError = (...keys) => {
    if (keys.some((k) => errors[k])) setErrors((er) => Object.fromEntries(Object.entries(er).filter(([k]) => !keys.includes(k))));
  };

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    clearError(key);
  };

  const bind = (key) => ({ name: key, value: form[key], onChange: (e) => set(key, e.target.value), error: errors[key] });

  const updateOptions = (options) => {
    setForm((f) => ({ ...f, options, variants: buildVariants(options, f.variants) }));
    setDirty(true);
  };

  const setVariant = (i, key, value) => {
    setForm((f) => ({ ...f, variants: f.variants.map((v, j) => (j === i ? { ...v, [key]: value } : v)) }));
    setDirty(true);
    clearError(`variants.${i}`);
  };

  const setSpec = (i, key, value) => {
    setForm((f) => ({ ...f, specifications: f.specifications.map((s, j) => (j === i ? { ...s, [key]: value } : s)) }));
    setDirty(true);
  };

  const moveImage = (i, dir) => {
    setExistingImages((list) => {
      const next = [...list];
      const j = i + dir;
      if (j < 0 || j >= next.length) return list;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
  };

  /* ================= OPTIONS (category tree, brands) ================= */
  const parents = useMemo(() => categories.filter((c) => !c.parent), [categories]);
  const parentId = parents.find((c) => c.name.toLowerCase() === form.category.toLowerCase())?._id;
  const subs = categories.filter((c) => c.parent && String(c.parent) === String(parentId));

  // keep legacy values selectable even if they aren't in the lists
  const withCurrent = (list, current) => {
    const opts = list.map((o) => ({ value: o.name, label: o.name }));
    if (current && !opts.some((o) => o.value.toLowerCase() === current.toLowerCase())) opts.unshift({ value: current, label: `${current} (not in list)` });
    return opts;
  };

  /* ================= DERIVED ================= */
  const hasVariants = form.variants.length > 0;
  const pays = customerPays(form.price, form.salePrice, form.discountPercent);
  const variantStock = form.variants.reduce((n, v) => n + (Number(v.stock) || 0), 0);
  const slugPreview = slugify(form.slug || form.title) || "product";
  const isLive = product && (!product.status || product.status === "active");

  /* ================= SUBMIT ================= */
  const submit = async (e) => {
    e.preventDefault();
    const hasThumb = newThumb.length > 0 || (editing ? !!existingThumb : !!thumbUrl.trim());
    const found = validate(form, { hasThumb });
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    const opts = validOptions(form.options);
    const data = {
      title: form.title.trim(),
      description: form.description,
      price: form.price,
      salePrice: form.salePrice,
      discountPercent: form.discountPercent,
      sku: form.sku,
      barcode: form.barcode,
      lowStockThreshold: form.lowStockThreshold,
      category: form.category,
      subcategory: form.subcategory,
      brand: form.brand,
      tags: splitList(form.tags),
      labels: form.labels,
      status: form.status,
      slug: form.slug,
      seo: { title: form.seoTitle, description: form.seoDescription },
      warrantyInformation: form.warrantyInformation,
      returnPolicy: form.returnPolicy,
      shippingInformation: form.shippingInformation,
      specifications: form.specifications.filter((s) => s.key.trim() && s.value.trim()),
      variantOptions: opts,
      variants: form.variants.map((v) => ({
        ...(v._id ? { _id: v._id } : {}),
        options: v.options,
        sku: v.sku,
        price: v.price,
        salePrice: v.salePrice,
        stock: v.stock === "" ? 0 : v.stock,
        ...(v.image ? { image: v.image } : {}),
      })),
    };
    // variant stock is the source of truth when variants exist
    if (!form.variants.length) data.stock = form.stock;
    if (editing) {
      data.images = existingImages;
      if (!newThumb.length) data.thumbnail = existingThumb;
    } else if (!newThumb.length) data.thumbnailUrl = thumbUrl.trim();

    const body = new FormData();
    body.append("data", JSON.stringify(data));
    if (newThumb[0]) body.append("thumbnail", newThumb[0]);
    newImages.forEach((f) => body.append("images", f));

    setSaving(true);
    try {
      const res = editing ? await api.put(`/product/${product._id}`, body) : await api.post("/add", body);
      setDirty(false);
      if (editing) {
        toast.success("Product saved");
        onCreated?.(res.data, true);
      } else {
        toast.success("Product created");
        onCreated?.(res.data, false);
      }
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && typeof serverErrors === "object") setErrors(serverErrors);
      toast.error(errorMessage(err, editing ? "Save failed" : "Product add failed"));
    } finally {
      setSaving(false);
    }
  };

  const leave = async (e) => {
    e.preventDefault();
    if (!dirty || (await confirm({ title: "Discard changes?", message: "You have unsaved changes on this product.", confirmLabel: "Discard" })))
      navigate("/products");
  };

  const variantErrors = Object.keys(errors).filter((k) => k.startsWith("variants."));
  const totalImages = existingImages.length + newImages.length;

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        title={editing ? "Edit product" : "Add product"}
        description={editing ? product.title : "Create a new product listing for your storefront."}
        actions={
          <>
            {isLive && (
              <a href={`${STORE_URL}/products/${product.slug || product._id}`} target="_blank" rel="noreferrer" className="btn btn-secondary">
                <ExternalLink className="size-4" /> View on store
              </a>
            )}
            <Link to="/products" onClick={leave} className="btn btn-ghost">
              <ArrowLeft className="size-4" /> All products
            </Link>
          </>
        }
      />

      {listsError && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {listsError}
          <button type="button" onClick={fetchLists} className="btn btn-secondary btn-sm">
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        {/* ================= MAIN ================= */}
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <Card title="Basic information" description="What customers see first.">
            <div className="space-y-5">
              <Input label="Title" required placeholder="e.g. Wireless Noise-Cancelling Headphones" maxLength={200} {...bind("title")} />
              <TextArea label="Description" rows={6} placeholder="Describe features, materials, sizing…" maxLength={5000} {...bind("description")} />
            </div>
          </Card>

          <Card title="Media" description="The thumbnail appears on product cards; gallery images show on the product page.">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="label">
                  Thumbnail <span className="text-rose-500">*</span>
                </p>
                {existingThumb && !newThumb.length && (
                  <div className="mb-3 flex items-center gap-3 rounded-xl border border-ink-100 p-2">
                    <img src={imageUrl(existingThumb)} alt="" className="size-20 rounded-lg bg-ink-50 object-contain p-1" />
                    <div className="min-w-0 text-xs text-ink-500">
                      <p className="font-medium text-ink-700">Current thumbnail</p>
                      <p>Upload below to replace it.</p>
                    </div>
                  </div>
                )}
                <ImageDropzone
                  files={newThumb}
                  onChange={(f) => {
                    setNewThumb(f);
                    setDirty(true);
                    clearError("thumbnail");
                  }}
                  label={existingThumb ? "Replace thumbnail" : "Upload thumbnail"}
                  hint={newThumb.length && existingThumb ? "Remove the new image to keep the current one" : "Square image, at least 800×800 px"}
                  error={errors.thumbnail}
                  previewClassName="size-28"
                />
                {!editing && !newThumb.length && (
                  <Input
                    className="mt-3"
                    label="…or image URL"
                    type="url"
                    placeholder="https://"
                    value={thumbUrl}
                    onChange={(e) => {
                      setThumbUrl(e.target.value);
                      setDirty(true);
                      clearError("thumbnail");
                    }}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="label">Gallery images</p>
                {existingImages.length > 0 && (
                  <ul className="mb-3 flex flex-wrap gap-2">
                    {existingImages.map((src, i) => (
                      <li key={src} className="group relative size-20 overflow-hidden rounded-xl border border-ink-100 bg-white">
                        <img src={imageUrl(src)} alt="" className="size-full object-contain p-1" />
                        <span className="absolute left-1 top-1 rounded bg-white/90 px-1 text-[10px] font-semibold text-ink-600">{i + 1}</span>
                        <div className="absolute inset-x-0 bottom-0 flex justify-between bg-white/90 p-0.5">
                          <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="btn btn-ghost btn-icon btn-sm size-6 disabled:opacity-30" aria-label="Move left">
                            <ChevronLeft className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setExistingImages((l) => l.filter((_, j) => j !== i));
                              setDirty(true);
                            }}
                            className="btn btn-danger-ghost btn-icon btn-sm size-6"
                            aria-label="Remove image"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(i, 1)}
                            disabled={i === existingImages.length - 1}
                            className="btn btn-ghost btn-icon btn-sm size-6 disabled:opacity-30"
                            aria-label="Move right"
                          >
                            <ChevronRight className="size-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <ImageDropzone
                  files={newImages}
                  onChange={(f) => {
                    setNewImages(f);
                    setDirty(true);
                  }}
                  multiple
                  max={10}
                  label="Upload images"
                  hint={`${newImages.length}/10 new${existingImages.length ? ` · added after the ${existingImages.length} above` : ""}`}
                  previewClassName="size-20"
                />
                {totalImages > 20 && <p className="field-error">Only the first 20 images are kept.</p>}
              </div>
            </div>
          </Card>

          {/* ================= VARIANTS ================= */}
          <Card
            title="Variants"
            description="Add options like Size or Color. Every combination becomes a variant with its own SKU, price and stock."
            actions={
              form.options.length < 3 && (
                <button type="button" onClick={() => updateOptions([...form.options, { name: "", values: "" }])} className="btn btn-secondary btn-sm">
                  <Plus className="size-3.5" /> Add option
                </button>
              )
            }
          >
            {form.options.length === 0 ? (
              <EmptyState compact icon={Layers} title="No variants" description="This product is sold as a single item." />
            ) : (
              <div className="space-y-5">
                <div className="space-y-3">
                  {form.options.map((o, i) => (
                    <div key={i} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
                      <Input
                        label={i === 0 ? "Option name" : undefined}
                        aria-label="Option name"
                        placeholder="e.g. Size"
                        value={o.name}
                        maxLength={40}
                        onChange={(e) => updateOptions(form.options.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      />
                      <Input
                        label={i === 0 ? "Values (comma separated)" : undefined}
                        aria-label="Option values"
                        placeholder="e.g. S, M, L, XL"
                        value={o.values}
                        onChange={(e) => updateOptions(form.options.map((x, j) => (j === i ? { ...x, values: e.target.value } : x)))}
                      />
                      <button
                        type="button"
                        onClick={() => updateOptions(form.options.filter((_, j) => j !== i))}
                        className="btn btn-danger-ghost btn-icon justify-self-end"
                        aria-label="Remove option"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {form.variants.length > 0 ? (
                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
                      <span>
                        {form.variants.length} variant{form.variants.length === 1 ? "" : "s"} · {variantStock} units in stock
                      </span>
                      <span>Leave price empty to use the product price.</span>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-ink-100">
                      <table className="w-full min-w-[40rem] text-sm">
                        <thead>
                          <tr className="bg-ink-50/70 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                            <th className="px-3 py-2.5">Variant</th>
                            <th className="px-2 py-2.5">SKU</th>
                            <th className="px-2 py-2.5">Price</th>
                            <th className="px-2 py-2.5">Sale price</th>
                            <th className="px-3 py-2.5">Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                          {form.variants.map((v, i) => (
                            <tr key={v._id || variantLabel(v)} className={errors[`variants.${i}`] ? "bg-rose-50/60" : ""}>
                              <td className="px-3 py-2">
                                <p className="font-medium text-ink-800">{Object.values(v.options).join(" / ")}</p>
                                {errors[`variants.${i}`] && <p className="text-xs text-rose-600">{errors[`variants.${i}`]}</p>}
                              </td>
                              <td className="px-2 py-2">
                                <input aria-label="Variant SKU" className="input h-9 min-w-28" value={v.sku} maxLength={60} onChange={(e) => setVariant(i, "sku", e.target.value)} />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  aria-label="Variant price"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="input h-9 w-28"
                                  placeholder={form.price || "—"}
                                  value={v.price}
                                  onChange={(e) => setVariant(i, "price", e.target.value)}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  aria-label="Variant sale price"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="input h-9 w-28"
                                  value={v.salePrice}
                                  onChange={(e) => setVariant(i, "salePrice", e.target.value)}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  aria-label="Variant stock"
                                  type="number"
                                  min="0"
                                  step="1"
                                  className="input h-9 w-24"
                                  value={v.stock}
                                  onChange={(e) => setVariant(i, "stock", e.target.value)}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {variantErrors.length > 0 && <p className="field-error">Some variants need attention (highlighted above).</p>}
                  </div>
                ) : (
                  <p className="text-sm text-ink-500">Enter an option name and at least one value to generate variants.</p>
                )}
              </div>
            )}
          </Card>

          {/* ================= SPECIFICATIONS ================= */}
          <Card
            title="Specifications"
            description="Shown as a table on the product page."
            actions={
              <button
                type="button"
                onClick={() => set("specifications", [...form.specifications, { key: "", value: "" }])}
                className="btn btn-secondary btn-sm"
                disabled={form.specifications.length >= 50}
              >
                <Plus className="size-3.5" /> Add row
              </button>
            }
          >
            {form.specifications.length === 0 ? (
              <p className="text-sm text-ink-500">No specifications yet — add rows like “Material: Cotton”.</p>
            ) : (
              <div className="space-y-2">
                {form.specifications.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
                    <input aria-label="Specification name" className="input" placeholder="e.g. Material" value={s.key} maxLength={80} onChange={(e) => setSpec(i, "key", e.target.value)} />
                    <input aria-label="Specification value" className="input" placeholder="e.g. Cotton" value={s.value} maxLength={300} onChange={(e) => setSpec(i, "value", e.target.value)} />
                    <button
                      type="button"
                      onClick={() => set("specifications", form.specifications.filter((_, j) => j !== i))}
                      className="btn btn-danger-ghost btn-icon"
                      aria-label="Remove specification"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ================= SEO ================= */}
          <Card title="Search engine listing" description="How this product appears in Google and link previews.">
            <div className="space-y-5">
              <div>
                <div className="flex items-end justify-between">
                  <label htmlFor="seo-title" className="label">
                    SEO title
                  </label>
                  <Counter value={form.seoTitle.length} max={70} />
                </div>
                <input id="seo-title" className="input" maxLength={70} placeholder={form.title || "Defaults to the product title"} value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
              </div>
              <div>
                <div className="flex items-end justify-between">
                  <label htmlFor="seo-desc" className="label">
                    SEO description
                  </label>
                  <Counter value={form.seoDescription.length} max={170} />
                </div>
                <textarea id="seo-desc" rows={3} className="input" maxLength={170} value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
              </div>
              <Input
                label="URL handle (slug)"
                placeholder={slugify(form.title) || "auto-generated-from-title"}
                maxLength={80}
                {...bind("slug")}
                hint={
                  <span className="break-all">
                    {STORE_URL}/products/<span className="font-medium text-ink-700">{slugPreview}</span>
                  </span>
                }
              />
              <div className="rounded-xl border border-ink-100 p-4">
                <p className="text-xs text-ink-500">Preview</p>
                <p className="mt-1 truncate text-base text-[#1a0dab]">{form.seoTitle || form.title || "Product title"}</p>
                <p className="truncate text-xs text-emerald-700">
                  {STORE_URL}/products/{slugPreview}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-ink-600">{form.seoDescription || form.description.slice(0, 170) || "Add a description to improve click-through."}</p>
              </div>
            </div>
          </Card>

          <Card title="Policies">
            <div className="grid gap-5 md:grid-cols-3">
              <Input label="Warranty" placeholder="e.g. 1 year manufacturer warranty" maxLength={200} {...bind("warrantyInformation")} />
              <Input label="Return policy" placeholder="e.g. 7 days return" maxLength={200} {...bind("returnPolicy")} />
              <Input label="Shipping" placeholder="e.g. Ships in 2–3 days" maxLength={200} {...bind("shippingInformation")} />
            </div>
          </Card>
        </div>

        {/* ================= SIDE ================= */}
        <div className="min-w-0 space-y-6">
          <Card title="Status & labels">
            <div className="space-y-5">
              <Select label="Status" options={PRODUCT_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))} {...bind("status")} hint="Only active products are visible in the store." />
              <div>
                <p className="label">Labels</p>
                <div className="flex flex-wrap gap-2">
                  {LABELS.map((l) => (
                    <CheckboxPill key={l} checked={form.labels.includes(l)} onChange={(on) => set("labels", on ? [...form.labels, l] : form.labels.filter((x) => x !== l))}>
                      {titleCase(l)}
                    </CheckboxPill>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Pricing">
            <div className="space-y-5">
              <Input label="Price (₹)" required type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" {...bind("price")} />
              <Input label="Sale price (₹)" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Optional" {...bind("salePrice")} hint="Wins over the discount % when set." />
              <Input label="Discount %" type="number" min="0" max="90" placeholder="0" {...bind("discountPercent")} hint="Optional, 0–90" />
              {pays != null && (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                  <span className="text-sm text-emerald-800">Customer pays</span>
                  <span className="text-right">
                    <span className="text-lg font-bold text-emerald-700 tabular-nums">{formatPrice(pays)}</span>
                    {pays < Number(form.price) && <span className="ml-2 text-xs text-ink-400 line-through">{formatPrice(form.price)}</span>}
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card title="Inventory">
            <div className="grid grid-cols-2 gap-4">
              {hasVariants ? (
                <div className="col-span-2 flex gap-2 rounded-xl bg-ink-50 px-3 py-2.5 text-sm text-ink-600">
                  <Info className="mt-0.5 size-4 shrink-0 text-ink-400" />
                  Stock is tracked per variant ({variantStock} units in total).
                </div>
              ) : (
                <Input label="Stock" type="number" min="0" step="1" placeholder="0" {...bind("stock")} className="col-span-2" />
              )}
              <Input label="SKU" maxLength={60} {...bind("sku")} />
              <Input label="Barcode" maxLength={60} {...bind("barcode")} />
              <Input label="Low stock alert at" type="number" min="0" step="1" placeholder="Store default" className="col-span-2" {...bind("lowStockThreshold")} />
            </div>
          </Card>

          <Card title="Organization">
            <div className="space-y-5">
              <Select
                label="Category"
                required
                options={withCurrent(parents, form.category)}
                placeholder="Select category"
                {...bind("category")}
                onChange={(e) => {
                  setForm((f) => ({ ...f, category: e.target.value, subcategory: "" }));
                  setDirty(true);
                  clearError("category");
                }}
                hint={listsLoaded && !parents.length ?<Link to="/categories" className="text-brand-600 hover:underline">Create a category first</Link> : undefined}
              />
              <Select
                label="Subcategory"
                options={withCurrent(subs, form.subcategory)}
                placeholder={subs.length || form.subcategory ? "None" : "No subcategories"}
                disabled={!subs.length && !form.subcategory}
                {...bind("subcategory")}
              />
              <Select label="Brand" options={withCurrent(brands, form.brand)} placeholder="No brand" {...bind("brand")} />
              <Input label="Tags" placeholder="cotton, summer, casual" {...bind("tags")} hint="Comma separated — helps search." />
            </div>
          </Card>

          {editing && (
            <Card
              title="Recent stock movements"
              bodyClassName="p-2"
              actions={
                can("inventory") && (
                  <Link to="/inventory" className="btn btn-ghost btn-sm text-brand-600">
                    Inventory
                  </Link>
                )
              }
            >
              {!product.inventoryLogs?.length ? (
                <EmptyState compact icon={History} title="No stock movements yet" />
              ) : (
                <ul className="max-h-80 divide-y divide-ink-100 overflow-y-auto">
                  {product.inventoryLogs.map((l) => (
                    <li key={l._id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-ink-800">
                          {REASON_LABEL[l.reason] || l.reason}
                          {l.refId && <span className="font-normal text-ink-500"> · {l.refId}</span>}
                        </p>
                        <p className="truncate text-xs text-ink-500">
                          {l.variantLabel && `${l.variantLabel} · `}
                          {formatDateTime(l.createdAt)}
                          {l.by && ` · ${l.by}`}
                        </p>
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
              )}
            </Card>
          )}
        </div>
      </div>

      {/* ================= ACTION BAR ================= */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-ink-100 bg-white/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {dirty && <span className="mr-auto text-sm text-amber-600">Unsaved changes</span>}
        <button
          type="button"
          onClick={leave}
          disabled={saving}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button disabled={saving} className="btn btn-primary min-w-36">
          {saving ? <Spinner /> : <Save className="size-4" />}
          {saving ? "Saving…" : editing ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}

/* =================================================
   LOADER (edit) / WRAPPER (create)
================================================= */
function EditProduct({ id }) {
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const fetchProduct = useCallback(
    () =>
      api
        .get(`/admin/products/${id}`)
        .then((res) => {
          setProduct(res.data);
          setError("");
        })
        .catch((err) => setError(errorMessage(err, "Product failed to load")))
        .finally(() => setLoading(false)),
    [id]
  );

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  if (loading) return <FullPageLoader label="Loading product…" />;
  if (error)
    return (
      <div className="card">
        <ErrorState
          message={error}
          onRetry={() => {
            setLoading(true);
            fetchProduct();
          }}
        />
      </div>
    );

  // after a save, reload so images/variant ids/stock history reflect the server
  return (
    <Editor
      key={version}
      product={product}
      onCreated={() =>
        fetchProduct().then(() => setVersion((v) => v + 1))
      }
    />
  );
}

function CreateProduct() {
  const navigate = useNavigate();
  const [round, setRound] = useState(0);
  const [created, setCreated] = useState(null);

  return (
    <>
      <Editor key={round} onCreated={(p) => setCreated(p)} />
      <Modal
        open={!!created}
        onClose={() => navigate(`/products/${created._id}/edit`)}
        title="Product created"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setCreated(null);
                setRound((r) => r + 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="btn btn-secondary"
            >
              <PackagePlus className="size-4" /> Add another
            </button>
            <button type="button" onClick={() => navigate(`/products/${created._id}/edit`)} className="btn btn-primary">
              <Pencil className="size-4" /> Edit product
            </button>
          </>
        }
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-5" />
          </span>
          <p className="text-sm text-ink-600">
            <span className="font-semibold text-ink-900">{created?.title}</span> was saved as{" "}
            <span className="font-medium">{titleCase(created?.status || "active")}</span>.
          </p>
        </div>
      </Modal>
    </>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  return id ? <EditProduct key={id} id={id} /> : <CreateProduct />;
}
