import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, FolderTree, Tag, Pencil, Check, X, Star, CornerDownRight } from "lucide-react";
import api, { errorMessage } from "../api";
import { PageHeader, SearchInput, EmptyState, ErrorState, Spinner, Switch, useConfirm } from "../Components/ui";

const countLabel = (n) => `${n || 0} product${n === 1 ? "" : "s"}`;

/* =================================================
   ONE ROW (rename inline, optional featured toggle)
================================================= */
function ItemRow({ item, sub, onRename, onDelete, onFeatured, busy }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    const next = name.trim();
    if (!next || next === item.name) {
      setEditing(false);
      setName(item.name);
      return;
    }
    setSaving(true);
    const ok = await onRename(item, next);
    setSaving(false);
    if (ok) setEditing(false);
  };

  return (
    <li className={`group flex items-center gap-3 py-2.5 pr-5 hover:bg-ink-50/60 sm:pr-6 ${sub ? "pl-9 sm:pl-10" : "pl-5 sm:pl-6"}`}>
      {sub && <CornerDownRight className="-ml-5 size-3.5 shrink-0 text-ink-300" aria-hidden />}
      {editing ? (
        <form onSubmit={save} className="flex flex-1 items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setEditing(false);
                setName(item.name);
              }
            }}
            aria-label={`Rename ${item.name}`}
            maxLength={80}
            className="input h-9"
            autoFocus
          />
          <button disabled={saving} className="btn btn-primary btn-sm btn-icon" aria-label="Save name">
            {saving ? <Spinner className="size-3.5" /> : <Check className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setName(item.name);
            }}
            className="btn btn-ghost btn-sm btn-icon"
            aria-label="Cancel rename"
          >
            <X className="size-4" />
          </button>
        </form>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm capitalize ${sub ? "text-ink-700" : "font-medium text-ink-900"}`}>
              {item.name}
              {item.featured && <Star className="ml-1.5 inline size-3.5 fill-amber-400 text-amber-400" aria-label="Featured" />}
            </p>
            <p className="text-xs text-ink-400">{countLabel(item.productCount)}</p>
          </div>
          {onFeatured && (
            <div className="flex items-center gap-2" title="Featured on the storefront">
              <span className="hidden text-xs text-ink-500 sm:inline">Featured</span>
              <Switch checked={!!item.featured} onChange={(v) => onFeatured(item, v)} disabled={busy} label={`Feature ${item.name}`} />
            </div>
          )}
          <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            <button onClick={() => setEditing(true)} className="btn btn-ghost btn-sm btn-icon" aria-label={`Rename ${item.name}`}>
              <Pencil className="size-4" />
            </button>
            <button onClick={() => onDelete(item)} className="btn btn-danger-ghost btn-sm btn-icon" aria-label={`Delete ${item.name}`}>
              <Trash2 className="size-4" />
            </button>
          </div>
        </>
      )}
    </li>
  );
}

/* =================================================
   PANEL SHELL
================================================= */
function Panel({ title, icon: Icon, subtitle, form, search, children }) {
  return (
    <section className="card flex min-w-0 flex-col">
      <header className="flex items-center gap-3 border-b border-ink-100 px-5 py-4 sm:px-6">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="size-[18px]" />
        </span>
        <div className="flex-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-ink-500">{subtitle}</p>
        </div>
      </header>
      <div className="space-y-4 p-5 sm:p-6">
        {form}
        {search}
      </div>
      <div className="max-h-[32rem] flex-1 overflow-y-auto border-t border-ink-100">{children}</div>
    </section>
  );
}

const ListSkeleton = () => (
  <div className="space-y-2 p-5">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="skeleton h-10" />
    ))}
  </div>
);

/* =================================================
   PAGE
================================================= */
export default function Categories() {
  const confirm = useConfirm();
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [catName, setCatName] = useState("");
  const [catParent, setCatParent] = useState("");
  const [catError, setCatError] = useState("");
  const [catQuery, setCatQuery] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandError, setBrandError] = useState("");
  const [brandQuery, setBrandQuery] = useState("");
  const [adding, setAdding] = useState("");

  /* ================= FETCH ================= */
  const fetchData = useCallback(
    () =>
      Promise.all([api.get("/categories", { params: { counts: 1 } }), api.get("/brands", { params: { counts: 1 } })])
        .then(([c, b]) => {
          setCategories(c.data || []);
          setBrands(b.data || []);
          setError("");
        })
        .catch((err) => setError(errorMessage(err, "Load failed")))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // add/rename/delete ke errors ek jagah handle
  const run = async (request, success) => {
    try {
      await request();
      toast.success(success);
      await fetchData();
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  };

  /* ================= TREE ================= */
  const parents = useMemo(() => categories.filter((c) => !c.parent), [categories]);
  const tree = useMemo(() => {
    const q = catQuery.trim().toLowerCase();
    const ids = new Set(parents.map((p) => String(p._id)));
    const childrenOf = (id) => categories.filter((c) => c.parent && String(c.parent) === String(id));
    // subcategories whose parent no longer exists are shown at the top level
    const orphans = categories.filter((c) => c.parent && !ids.has(String(c.parent)));
    return [...parents, ...orphans]
      .map((p) => {
        const kids = ids.has(String(p._id)) ? childrenOf(p._id) : [];
        const selfMatch = !q || p.name.toLowerCase().includes(q);
        const matchedKids = selfMatch ? kids : kids.filter((k) => k.name.toLowerCase().includes(q));
        return selfMatch || matchedKids.length ? { ...p, kids: matchedKids } : null;
      })
      .filter(Boolean);
  }, [categories, parents, catQuery]);

  const filteredBrands = useMemo(() => brands.filter((b) => b.name.toLowerCase().includes(brandQuery.trim().toLowerCase())), [brands, brandQuery]);

  /* ================= CATEGORY ACTIONS ================= */
  const addCategory = async (e) => {
    e.preventDefault();
    const name = catName.trim();
    if (!name) return setCatError("Enter a category name");
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return setCatError("This category already exists");
    setAdding("category");
    const ok = await run(() => api.post("/categories", { name, parent: catParent || null }), catParent ? "Subcategory added" : "Category added");
    setAdding("");
    if (ok) setCatName("");
  };

  const renameCategory = async (c, name) => {
    if (c.productCount > 0) {
      const ok = await confirm({
        title: "Rename category?",
        message: `“${c.name}” will become “${name}”. ${countLabel(c.productCount)} using it will be updated to the new name.`,
        confirmLabel: "Rename",
        tone: "primary",
      });
      if (!ok) return false;
    }
    return run(() => api.put(`/categories/${c._id}`, { name }), "Category renamed");
  };

  const toggleFeatured = async (c, featured) => {
    setBusyId(c._id);
    await run(() => api.put(`/categories/${c._id}`, { featured }), featured ? `“${c.name}” is now featured` : `“${c.name}” is no longer featured`);
    setBusyId(null);
  };

  const deleteCategory = async (c) => {
    const kids = categories.filter((x) => x.parent && String(x.parent) === String(c._id)).length;
    const parts = [`“${c.name}” will be removed.`];
    if (c.productCount) parts.push(`${countLabel(c.productCount)} keep their category text.`);
    if (kids) parts.push(`Its ${kids} subcategor${kids === 1 ? "y becomes a top-level category" : "ies become top-level categories"}.`);
    if (!(await confirm({ title: "Delete category?", message: parts.join(" ") }))) return;
    run(() => api.delete(`/categories/${c._id}`), "Category deleted");
  };

  /* ================= BRAND ACTIONS ================= */
  const addBrand = async (e) => {
    e.preventDefault();
    const name = brandName.trim();
    if (!name) return setBrandError("Enter a brand name");
    if (brands.some((b) => b.name.toLowerCase() === name.toLowerCase())) return setBrandError("This brand already exists");
    setAdding("brand");
    const ok = await run(() => api.post("/brands", { name }), "Brand added");
    setAdding("");
    if (ok) setBrandName("");
  };

  const renameBrand = async (b, name) => {
    if (b.productCount > 0) {
      const ok = await confirm({
        title: "Rename brand?",
        message: `“${b.name}” will become “${name}”. ${countLabel(b.productCount)} using it will be updated to the new name.`,
        confirmLabel: "Rename",
        tone: "primary",
      });
      if (!ok) return false;
    }
    return run(() => api.put(`/brands/${b._id}`, { name }), "Brand renamed");
  };

  const deleteBrand = async (b) => {
    const extra = b.productCount ? ` ${countLabel(b.productCount)} keep the brand text.` : "";
    if (!(await confirm({ title: "Delete brand?", message: `“${b.name}” will be removed.${extra}` }))) return;
    run(() => api.delete(`/brands/${b._id}`), "Brand deleted");
  };

  const subCount = categories.length - parents.length;

  return (
    <div>
      <PageHeader title="Categories & Brands" description="Organise your catalogue so customers can find products faster." />

      {error ? (
        <div className="card">
          <ErrorState
            message={error}
            onRetry={() => {
              setLoading(true);
              fetchData();
            }}
          />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ================= CATEGORIES ================= */}
          <Panel
            title="Categories"
            icon={FolderTree}
            subtitle={loading ? "Loading…" : `${parents.length} categories · ${subCount} subcategories`}
            form={
              <form onSubmit={addCategory} noValidate>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={catName}
                    onChange={(e) => {
                      setCatName(e.target.value);
                      setCatError("");
                    }}
                    placeholder={catParent ? "New subcategory name" : "New category name"}
                    aria-label="New category name"
                    aria-invalid={!!catError}
                    maxLength={80}
                    className="input"
                  />
                  <div className="flex gap-2">
                    <select aria-label="Parent category" value={catParent} onChange={(e) => setCatParent(e.target.value)} className="input sm:w-44">
                      <option value="">Top level</option>
                      {parents.map((p) => (
                        <option key={p._id} value={p._id}>
                          Under: {p.name}
                        </option>
                      ))}
                    </select>
                    <button disabled={adding === "category"} className="btn btn-primary shrink-0">
                      {adding === "category" ? <Spinner /> : <Plus className="size-4" />} Add
                    </button>
                  </div>
                </div>
                {catError && <p className="field-error">{catError}</p>}
              </form>
            }
            search={categories.length > 6 && <SearchInput value={catQuery} onChange={setCatQuery} placeholder="Filter categories…" />}
          >
            {loading ? (
              <ListSkeleton />
            ) : tree.length === 0 ? (
              <EmptyState compact icon={FolderTree} title={catQuery ? "No matches" : "No categories yet"} />
            ) : (
              <ul className="divide-y divide-ink-100">
                {tree.map((p) => (
                  <li key={p._id}>
                    <ul className="divide-y divide-ink-100/70">
                      <ItemRow item={p} onRename={renameCategory} onDelete={deleteCategory} onFeatured={toggleFeatured} busy={busyId === p._id} />
                      {p.kids.map((k) => (
                        <ItemRow key={k._id} item={k} sub onRename={renameCategory} onDelete={deleteCategory} onFeatured={toggleFeatured} busy={busyId === k._id} />
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* ================= BRANDS ================= */}
          <Panel
            title="Brands"
            icon={Tag}
            subtitle={loading ? "Loading…" : `${brands.length} total`}
            form={
              <form onSubmit={addBrand} noValidate>
                <div className="flex gap-2">
                  <input
                    value={brandName}
                    onChange={(e) => {
                      setBrandName(e.target.value);
                      setBrandError("");
                    }}
                    placeholder="New brand name"
                    aria-label="New brand name"
                    aria-invalid={!!brandError}
                    maxLength={80}
                    className="input"
                  />
                  <button disabled={adding === "brand"} className="btn btn-primary shrink-0">
                    {adding === "brand" ? <Spinner /> : <Plus className="size-4" />} Add
                  </button>
                </div>
                {brandError && <p className="field-error">{brandError}</p>}
              </form>
            }
            search={brands.length > 6 && <SearchInput value={brandQuery} onChange={setBrandQuery} placeholder="Filter brands…" />}
          >
            {loading ? (
              <ListSkeleton />
            ) : filteredBrands.length === 0 ? (
              <EmptyState compact icon={Tag} title={brandQuery ? "No matches" : "No brands yet"} />
            ) : (
              <ul className="divide-y divide-ink-100">
                {filteredBrands.map((b) => (
                  <ItemRow key={b._id} item={b} onRename={renameBrand} onDelete={deleteBrand} />
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
