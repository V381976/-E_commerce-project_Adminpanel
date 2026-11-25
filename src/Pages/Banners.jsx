import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Upload, Trash2, Image as ImageIcon, Link2, Monitor, Smartphone, AlertTriangle, CheckCircle2, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import api, { imageUrl, errorMessage } from "../api";
import { PageHeader, Card, Input, ImageDropzone, EmptyState, ErrorState, Switch, Spinner, Modal, useConfirm } from "../Components/ui";
import { moveItem } from "../Components/site/helpers";

const linkError = (link) => (link && !/^(\/|https?:\/\/)/i.test(link) ? "Use a path like /products or a full https:// URL" : undefined);

/*
  Mirrors the storefront hero (Ecommerce_Frontend/src/Component/HeroBanner.jsx):
  desktop frame 3:1, tablet 5:2, mobile 2:1 — image drawn with object-contain
  over a blurred copy of itself, so nothing is ever stretched or cropped.
*/
const RECOMMENDED = { w: 1920, h: 640, ratio: 3 };

function BannerFrame({ src, ratio = "aspect-[3/1]", className = "" }) {
  return (
    <div className={`relative w-full overflow-hidden rounded-xl bg-ink-900 ${ratio} ${className}`}>
      {src ? (
        <>
          <img src={src} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-70 blur-2xl" />
          <img src={src} alt="" loading="lazy" decoding="async" className="relative size-full object-contain" />
        </>
      ) : (
        <div className="flex size-full items-center justify-center text-ink-500">
          <ImageIcon className="size-8" />
        </div>
      )}
    </div>
  );
}

// reads the chosen file's pixel size so we can warn about off-ratio uploads
// (URL is created inside the effect so StrictMode's mount→cleanup→mount can't revoke a live one)
function useImageSize(file) {
  const [state, setState] = useState(null); // { file, url, w, h }

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    let alive = true;
    const img = new window.Image();
    img.onload = () => alive && setState({ file, url, w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    return () => {
      alive = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const current = file && state?.file === file ? state : null;
  return { url: current?.url || null, size: current };
}

export default function Banners() {
  const confirm = useConfirm();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", link: "" });
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(null);
  const [reordering, setReordering] = useState(false);

  const { url: preview, size } = useImageSize(files[0]);
  const ratio = size ? size.w / size.h : null;
  const ratioOk = ratio ? Math.abs(ratio - RECOMMENDED.ratio) / RECOMMENDED.ratio <= 0.12 : null;
  const tooSmall = size ? size.w < 1200 : false;

  const load = useCallback(
    () =>
      api
        .get("/banner")
        .then((res) => {
          setBanners(res.data || []);
          setError("");
        })
        .catch((err) => setError(errorMessage(err, "Banners load failed")))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  /* ================= ADD ================= */
  const addBanner = async (e) => {
    e.preventDefault();
    const found = {};
    if (!files[0]) found.image = "Banner image required";
    const link = form.link.trim();
    if (linkError(link)) found.link = linkError(link);
    setErrors(found);
    if (Object.keys(found).length) return;

    try {
      setSaving(true);
      const data = new FormData();
      data.append("title", form.title.trim());
      data.append("link", link);
      data.append("image", files[0]);

      await api.post("/banner", data);
      toast.success("Banner added");

      setForm({ title: "", link: "" });
      setFiles([]);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Banner add failed"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b) => {
    if (!(await confirm({ title: "Delete banner?", message: `${b.title ? `“${b.title}”` : "This banner"} will be removed from the home page.` })))
      return;
    try {
      setBusy(b._id);
      await api.delete(`/banner/${b._id}`);
      toast.success("Banner deleted");
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Delete failed"));
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (b) => {
    setBusy(b._id);
    setBanners((list) => list.map((x) => (x._id === b._id ? { ...x, active: !x.active } : x)));
    try {
      await api.put(`/banner/${b._id}`);
      toast.success(b.active ? "Banner hidden from storefront" : "Banner is live");
    } catch (err) {
      toast.error(errorMessage(err, "Update failed"));
    }
    setBusy(null);
    load();
  };

  // slider order = list order; the server returns the list re-sorted by position
  const move = async (index, dir) => {
    const next = moveItem(banners, index, dir);
    if (next === banners) return;
    const prev = banners;
    setBanners(next);
    setReordering(true);
    try {
      const { data } = await api.put("/admin/banner-order", { ids: next.map((b) => b._id) });
      setBanners(data || next);
      toast.success("Order updated");
    } catch (err) {
      setBanners(prev);
      toast.error(errorMessage(err, "Reorder failed"));
    } finally {
      setReordering(false);
    }
  };

  const activeCount = banners.filter((b) => b.active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banners"
        description="Hero slides on the storefront home page. Active banners rotate automatically in the order shown below."
      />

      {/* ================= UPLOAD ================= */}
      <Card title="New banner" description={`Recommended size ${RECOMMENDED.w}×${RECOMMENDED.h} px (3:1). Keep text near the centre.`}>
        <form onSubmit={addBanner} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
          <div className="space-y-4">
            <Input
              label="Title"
              placeholder="e.g. Festive Sale — up to 50% off"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              hint="Used as the image's accessible label"
            />
            <Input
              label="Link"
              placeholder="/products?category=beauty"
              value={form.link}
              onChange={(e) => {
                setForm({ ...form, link: e.target.value });
                if (errors.link) setErrors((er) => ({ ...er, link: undefined }));
              }}
              error={errors.link}
              hint="Where a click goes — a store path or a full URL. Optional."
            />
            <div>
              <p className="label">
                Image <span className="text-rose-500">*</span>
              </p>
              <ImageDropzone
                files={files}
                onChange={(f) => {
                  setFiles(f);
                  if (errors.image) setErrors((er) => ({ ...er, image: undefined }));
                }}
                label="Upload banner"
                hint="JPG, PNG or WebP · 1920×640 recommended"
                error={errors.image}
                previewClassName="hidden"
              />
            </div>
            <button disabled={saving} className="btn btn-primary w-full">
              {saving ? <Spinner /> : <Upload className="size-4" />}
              {saving ? "Uploading…" : "Publish banner"}
            </button>
          </div>

          {/* live preview */}
          <div className="min-w-0 space-y-4">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                <Monitor className="size-3.5" /> Desktop preview
              </p>
              <BannerFrame src={preview} ratio="aspect-[3/1]" />
            </div>
            <div className="flex flex-wrap items-start gap-4">
              <div className="w-48">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <Smartphone className="size-3.5" /> Mobile
                </p>
                <BannerFrame src={preview} ratio="aspect-[2/1]" className="rounded-lg" />
              </div>
              {size && (
                <div
                  className={`flex min-w-0 flex-1 gap-2.5 rounded-xl border p-3 text-sm ${
                    ratioOk && !tooSmall ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {ratioOk && !tooSmall ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold">
                      {size.w}×{size.h} px · {ratio.toFixed(2)}:1
                    </p>
                    <p className="mt-0.5 text-xs">
                      {ratioOk && !tooSmall
                        ? "Great fit — this will fill the banner edge to edge on desktop."
                        : !ratioOk
                          ? "Not 3:1, so it will show with a blurred fill at the sides or top. It won't be stretched or cropped."
                          : "Image is narrow for large screens and may look soft. 1920 px wide is recommended."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </Card>

      {/* ================= LIST ================= */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">
            All banners{" "}
            {!loading && (
              <span className="ml-1 text-sm font-normal text-ink-500">
                {activeCount} live of {banners.length}
              </span>
            )}
          </h2>
        </div>

        {error ? (
          <div className="card">
            <ErrorState
              message={error}
              onRetry={() => {
                setLoading(true);
                load();
              }}
            />
          </div>
        ) : loading ? (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {[0, 1].map((i) => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton aspect-[3/1] rounded-none" />
                <div className="space-y-2 p-4">
                  <div className="skeleton h-4 w-1/2" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : banners.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={ImageIcon}
              title="No banners yet"
              description="Upload a banner above — until then the storefront shows a default hero."
            />
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {banners.map((b, i) => (
              <article key={b._id} className={`card overflow-hidden transition ${b.active ? "" : "opacity-75"}`}>
                <div className="relative">
                  <BannerFrame src={imageUrl(b.image)} className="rounded-none" />
                  <span className={`badge absolute left-3 top-3 shadow ${b.active ? "badge-success" : "bg-ink-900/70 text-white"}`}>
                    {b.active ? "Live" : "Hidden"}
                  </span>
                  <span className="badge absolute right-3 top-3 bg-white/90 text-ink-700 shadow">Slide {i + 1}</span>
                </div>
                <div className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-900">{b.title || "Untitled banner"}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-500">
                      <Link2 className="size-3 shrink-0" /> {b.link || "No link"}
                    </p>
                  </div>
                  <div className="flex shrink-0">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || reordering}
                      className="btn btn-ghost btn-icon btn-sm"
                      aria-label="Move earlier"
                      title="Move earlier"
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === banners.length - 1 || reordering}
                      className="btn btn-ghost btn-icon btn-sm"
                      aria-label="Move later"
                      title="Move later"
                    >
                      <ArrowDown className="size-4" />
                    </button>
                  </div>
                  <Switch
                    checked={!!b.active}
                    onChange={() => toggle(b)}
                    disabled={busy === b._id}
                    label={b.active ? "Hide banner" : "Show banner"}
                  />
                  <button onClick={() => setEditing(b)} className="btn btn-ghost btn-icon btn-sm" aria-label="Edit banner">
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => remove(b)}
                    disabled={busy === b._id}
                    className="btn btn-danger-ghost btn-icon btn-sm"
                    aria-label="Delete banner"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <EditBannerModal
          key={editing._id}
          banner={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setBanners((list) => list.map((x) => (x._id === updated._id ? updated : x)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditBannerModal({ banner, onClose, onSaved }) {
  const [form, setForm] = useState({ title: banner.title || "", link: banner.link || "" });
  const [error, setError] = useState();
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    const link = form.link.trim();
    const err = linkError(link);
    setError(err);
    if (err) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/banner/${banner._id}`, { title: form.title.trim(), link });
      toast.success("Banner updated");
      onSaved(data);
    } catch (e2) {
      toast.error(errorMessage(e2, "Update failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit banner"
      description="To change the image, upload a new banner and delete this one."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" form="banner-edit-form" disabled={saving} className="btn btn-primary">
            {saving && <Spinner />} Save
          </button>
        </>
      }
    >
      <form id="banner-edit-form" onSubmit={save} noValidate className="space-y-4">
        <BannerFrame src={imageUrl(banner.image)} />
        <Input
          label="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          hint="Used as the image's accessible label"
        />
        <Input
          label="Link"
          placeholder="/products?category=beauty"
          value={form.link}
          onChange={(e) => {
            setForm({ ...form, link: e.target.value });
            setError(undefined);
          }}
          error={error}
          hint="A store path or a full URL. Leave empty for no link."
        />
      </form>
    </Modal>
  );
}
