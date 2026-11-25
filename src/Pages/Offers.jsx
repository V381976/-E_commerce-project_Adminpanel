import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, TicketPercent, Pencil, Save, X } from "lucide-react";
import api, { errorMessage } from "../api";
import { PageHeader, Card, DataTable, EmptyState, ErrorState, Input, Select, Switch, Spinner, useConfirm } from "../Components/ui";
import { formatDate } from "../lib/format";
import { toDateInput, todayInput } from "../Components/site/helpers";

const EMPTY = { title: "", discountPercent: "", category: "", startsAt: "", expiresAt: "" };

export default function Offers() {
  const confirm = useConfirm();
  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [editingId, setEditingId] = useState(null);

  /* ================= FETCH ================= */
  const load = useCallback(
    () =>
      Promise.all([api.get("/offers"), api.get("/categories")])
        .then(([offerRes, catRes]) => {
          setOffers(offerRes.data || []);
          setCategories(catRes.data || []);
          setError("");
        })
        .catch((err) => setError(errorMessage(err, "Load failed")))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const startEdit = (o) => {
    setEditingId(o._id);
    setErrors({});
    setForm({
      title: o.title || "",
      discountPercent: String(o.discountPercent ?? ""),
      category: o.category?._id || o.category || "",
      startsAt: toDateInput(o.startsAt),
      expiresAt: toDateInput(o.expiresAt),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setErrors({});
    setForm(EMPTY);
  };

  /* ================= ADD / EDIT ================= */
  const saveOffer = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.title.trim()) found.title = "Title is required";
    const d = Number(form.discountPercent);
    if (form.discountPercent === "") found.discountPercent = "Discount is required";
    else if (d < 1 || d > 90) found.discountPercent = "Must be between 1 and 90";
    if (!form.category) found.category = "Choose a category";
    if (form.startsAt && form.expiresAt && form.expiresAt < form.startsAt) found.expiresAt = "Must be after the start date";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const body = {
        ...form,
        title: form.title.trim(),
        // date inputs mean "from the start of / through the end of" that local day
        startsAt: form.startsAt ? new Date(`${form.startsAt}T00:00:00`).toISOString() : undefined,
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : undefined,
      };
      if (editingId) {
        await api.put(`/offers/${editingId}`, { ...body, expiresAt: body.expiresAt || null });
        toast.success("Offer updated");
      } else {
        await api.post("/offers", body);
        toast.success("Offer added");
      }
      setEditingId(null);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(errorMessage(err, editingId ? "Offer update failed" : "Offer add failed"));
    } finally {
      setSaving(false);
    }
  };

  /* ================= DELETE ================= */
  const remove = async (o) => {
    if (!(await confirm({ title: "Delete offer?", message: `“${o.title}” will be removed from the storefront.` }))) return;
    try {
      await api.delete(`/offers/${o._id}`);
      toast.success("Offer deleted");
      if (editingId === o._id) cancelEdit();
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Delete failed"));
    }
  };

  /* ================= TOGGLE ================= */
  const toggle = async (o) => {
    setToggling(o._id);
    setOffers((list) => list.map((x) => (x._id === o._id ? { ...x, active: !x.active } : x)));
    try {
      await api.put(`/offers/toggle/${o._id}`);
      toast.success(o.active ? "Offer paused" : "Offer activated");
    } catch (err) {
      toast.error(errorMessage(err, "Update failed"));
    }
    setToggling(null);
    load();
  };

  const now = new Date();
  const columns = [
    {
      key: "title",
      header: "Offer",
      mobile: "title",
      render: (o) => (
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <span className="text-sm font-bold leading-none">{o.discountPercent}%</span>
          </span>
          <p className="font-semibold text-ink-900">{o.title}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (o) => <span className="badge badge-neutral capitalize">{o.category?.name || "—"}</span>,
    },
    {
      key: "expiry",
      header: "Runs",
      render: (o) => (
        <span className="text-xs text-ink-600">
          {o.startsAt ? formatDate(o.startsAt) : "Now"} → {o.expiresAt ? formatDate(o.expiresAt) : "No limit"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (o) => {
        const expired = o.expiresAt && new Date(o.expiresAt) < now;
        if (expired) return <span className="badge badge-danger">Expired</span>;
        const scheduled = o.startsAt && new Date(o.startsAt) > now;
        return (
          <div className="flex items-center gap-2.5">
            <Switch
              checked={!!o.active}
              onChange={() => toggle(o)}
              disabled={toggling === o._id}
              label={o.active ? "Deactivate offer" : "Activate offer"}
            />
            <span className={`text-xs font-medium ${o.active ? "text-emerald-600" : "text-ink-400"}`}>
              {o.active ? (scheduled ? "Scheduled" : "Active") : "Paused"}
            </span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (o) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => startEdit(o)} className="btn btn-ghost btn-sm" aria-label={`Edit ${o.title}`}>
            <Pencil className="size-4" /> Edit
          </button>
          <button onClick={() => remove(o)} className="btn btn-danger-ghost btn-sm" aria-label={`Delete ${o.title}`}>
            <Trash2 className="size-4" /> Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Automatic discounts"
        description="Category-wide offers — no code needed. While an offer is active it applies automatically at checkout to every product in its category, and the discounted price shows on the storefront."
      />

      <div className="grid items-start gap-6 xl:grid-cols-[360px_1fr]">
        {/* ================= FORM ================= */}
        <Card
          title={editingId ? "Edit offer" : "Create offer"}
          className="xl:sticky xl:top-24"
          actions={
            editingId && (
              <button type="button" onClick={cancelEdit} className="btn btn-ghost btn-sm">
                <X className="size-4" /> Cancel
              </button>
            )
          }
        >
          <form onSubmit={saveOffer} noValidate className="space-y-4">
            <Input
              label="Title"
              required
              placeholder="e.g. Summer Sale"
              value={form.title}
              onChange={set("title")}
              error={errors.title}
            />
            <Input
              label="Discount %"
              required
              type="number"
              min="1"
              max="90"
              placeholder="1–90"
              value={form.discountPercent}
              onChange={set("discountPercent")}
              error={errors.discountPercent}
            />
            <Select
              label="Category"
              required
              value={form.category}
              onChange={set("category")}
              options={categories.map((c) => ({ value: c._id, label: c.name }))}
              placeholder="Select category"
              error={errors.category}
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Input
                label="Start date"
                type="date"
                value={form.startsAt}
                onChange={set("startsAt")}
                error={errors.startsAt}
                hint="Leave empty to start now"
              />
              <Input
                label="Expiry date"
                type="date"
                min={form.startsAt || (editingId ? undefined : todayInput())}
                value={form.expiresAt}
                onChange={set("expiresAt")}
                error={errors.expiresAt}
                hint="Leave empty for no expiry"
              />
            </div>
            <button disabled={saving} className="btn btn-primary w-full">
              {saving ? <Spinner /> : editingId ? <Save className="size-4" /> : <Plus className="size-4" />}
              {editingId ? "Save changes" : "Add offer"}
            </button>
          </form>
        </Card>

        {/* ================= TABLE ================= */}
        <div className="card overflow-hidden">
          <div className="border-b border-ink-100 px-5 py-4 sm:px-6">
            <h2 className="font-semibold">All offers</h2>
            <p className="text-xs text-ink-500">
              {loading ? "Loading…" : `${offers.filter((o) => o.active).length} active of ${offers.length}`}
            </p>
          </div>
          {error ? (
            <ErrorState
              message={error}
              onRetry={() => {
                setLoading(true);
                load();
              }}
            />
          ) : (
            <DataTable
              columns={columns}
              rows={offers}
              loading={loading}
              skeletonRows={4}
              empty={
                <EmptyState
                  icon={TicketPercent}
                  title="No offers yet"
                  description="Create your first offer to highlight discounts on the storefront."
                />
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
