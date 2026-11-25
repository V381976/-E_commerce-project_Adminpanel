import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Save,
  Eye,
  Rocket,
  Undo2,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Megaphone,
  LayoutList,
  Tag,
  Navigation,
  PanelBottom,
  HelpCircle,
  FileText,
  Phone,
  AlertTriangle,
  X,
} from "lucide-react";
import api, { errorMessage } from "../api";
import { PageHeader, Card, ErrorState, FullPageLoader, Input, TextArea, Switch, Spinner, useConfirm } from "../Components/ui";
import { StatusTabs } from "../Components/site/shared";
import { moveItem, labelize } from "../Components/site/helpers";
import { STORE_URL } from "../Components/nav";
import { formatDateTime } from "../lib/format";

const TABS = [
  { value: "announcement", label: "Announcement", icon: Megaphone },
  { value: "sections", label: "Homepage", icon: LayoutList },
  { value: "categories", label: "Featured categories", icon: Tag },
  { value: "nav", label: "Navigation", icon: Navigation },
  { value: "footer", label: "Footer", icon: PanelBottom },
  { value: "faqs", label: "FAQs", icon: HelpCircle },
  { value: "policies", label: "Policies", icon: FileText },
  { value: "contact", label: "Contact", icon: Phone },
];

// what each homepage block shows on the storefront
const SECTION_INFO = {
  categories: { name: "Category tiles", text: "Shop-by-category tiles. Which categories appear is set in the Featured categories tab." },
  featured: { name: "Featured products", text: "Products labelled “featured” in the catalogue." },
  deals: { name: "Deals", text: "Products currently on sale, biggest discount first." },
  top_rated: { name: "Top rated", text: "Highest-rated products." },
  new: { name: "New arrivals", text: "Most recently added products." },
  trending: { name: "Trending", text: "Products labelled “trending” in the catalogue." },
  bestsellers: { name: "Best sellers", text: "Most-sold products." },
  recently_viewed: { name: "Recently viewed", text: "The shopper's own browsing history. Hidden until they've viewed a product." },
  recommended: { name: "Recommended", text: "Personalised picks for the shopper." },
  newsletter: { name: "Newsletter sign-up", text: "Email sign-up box. Sign-ups appear under Marketing → Newsletter." },
};
const SECTION_KEYS = Object.keys(SECTION_INFO);

const POLICIES = [
  { key: "shipping", label: "Shipping policy", path: "/policies/shipping" },
  { key: "returns", label: "Returns & refunds", path: "/policies/returns" },
  { key: "privacy", label: "Privacy policy", path: "/policies/privacy" },
  { key: "terms", label: "Terms of service", path: "/policies/terms" },
];

const LINK_RX = /^(\/|https?:\/\/|mailto:|tel:)/i;
const MAX_NAV = 8;
const MAX_FOOTER_COLS = 4;
const MAX_FOOTER_LINKS = 8;
const MAX_FAQS = 50;

// client-side checks mirroring the server (which silently drops incomplete rows)
const validate = (d) => {
  const e = {};
  const link = (prefix, l) => {
    if (!l.label.trim()) e[`${prefix}.label`] = "Required";
    if (!l.to.trim()) e[`${prefix}.to`] = "Required";
    else if (!LINK_RX.test(l.to.trim())) e[`${prefix}.to`] = "Start with / or https://";
  };
  if (d.announcement.active && !d.announcement.text.trim()) e["announcement.text"] = "Add text or turn the bar off";
  if (d.announcement.link && !LINK_RX.test(d.announcement.link.trim())) e["announcement.link"] = "Start with / or https://";
  d.homeSections.forEach((s, i) => !s.title.trim() && (e[`sections.${i}.title`] = "Required"));
  d.navLinks.forEach((l, i) => link(`nav.${i}`, l));
  d.footerColumns.forEach((c, ci) => {
    if (!c.title.trim()) e[`footer.${ci}.title`] = "Required";
    c.links.forEach((l, i) => link(`footer.${ci}.${i}`, l));
  });
  d.faqs.forEach((f, i) => {
    if (!f.question.trim()) e[`faqs.${i}.question`] = "Required";
    if (!f.answer.trim()) e[`faqs.${i}.answer`] = "Required";
  });
  return e;
};

// which tab holds the first error
const tabForError = (key) =>
  ({ announcement: "announcement", sections: "sections", nav: "nav", footer: "footer", faqs: "faqs" })[key.split(".")[0]];

// fills any shape gaps so editors can rely on arrays/strings
const normalize = (d = {}) => ({
  announcement: { text: "", link: "", active: false, ...d.announcement },
  homeSections: (d.homeSections || []).map((s) => ({ key: s.key, title: s.title || "", enabled: !!s.enabled })),
  featuredCategories: d.featuredCategories || [],
  navLinks: (d.navLinks || []).map((l) => ({ label: l.label || "", to: l.to || "" })),
  footerColumns: (d.footerColumns || []).map((c) => ({
    title: c.title || "",
    links: (c.links || []).map((l) => ({ label: l.label || "", to: l.to || "" })),
  })),
  faqs: (d.faqs || []).map((f) => ({ question: f.question || "", answer: f.answer || "" })),
  policies: { shipping: "", returns: "", privacy: "", terms: "", ...d.policies },
  contact: { email: "", phone: "", address: "", hours: "", ...d.contact },
});

export default function Content() {
  const confirm = useConfirm();
  const [meta, setMeta] = useState(null); // server response minus draft
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(""); // JSON of the last saved draft
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("announcement");
  const [errors, setErrors] = useState({});
  const [action, setAction] = useState(null); // "save" | "preview" | "publish" | "discard"

  const apply = (data) => {
    const d = normalize(data.draft);
    setDraft(d);
    setSaved(JSON.stringify(d));
    setMeta(data);
    setErrors({});
  };

  const load = useCallback(
    () =>
      Promise.all([api.get("/admin/content"), api.get("/categories").catch(() => ({ data: [] }))])
        .then(([c, cats]) => {
          apply(c.data);
          setCategories((cats.data || []).map((x) => x.name));
          setError("");
        })
        .catch((err) => setError(errorMessage(err, "Content load failed")))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const dirty = !!draft && JSON.stringify(draft) !== saved;

  // browser-level guard for unsaved edits (tab close / reload)
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const update = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const clearError = (k) => errors[k] && setErrors((e) => ({ ...e, [k]: undefined }));

  /* ================= ACTIONS ================= */
  const save = async ({ quiet = false } = {}) => {
    const found = validate(draft);
    setErrors(found);
    const keys = Object.keys(found);
    if (keys.length) {
      const t = tabForError(keys[0]);
      if (t) setTab(t);
      toast.error("Fix the highlighted fields before saving");
      return false;
    }
    try {
      await api.put("/admin/content", draft);
      const { data } = await api.get("/admin/content");
      apply(data);
      if (!quiet) toast.success("Draft saved — preview it or publish when ready");
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Save failed"));
      return false;
    }
  };

  const run = async (name, fn) => {
    setAction(name);
    try {
      await fn();
    } finally {
      setAction(null);
    }
  };

  const onSave = () => run("save", () => save());

  const onPreview = () =>
    run("preview", async () => {
      const url = `${STORE_URL}/?preview=1`;
      if (!dirty) {
        window.open(url, "_blank", "noopener");
        return;
      }
      // open the tab during the click (popup blockers), point it at the store once saved
      const win = window.open("", "_blank");
      if (await save({ quiet: true })) {
        toast.success("Draft saved — opening preview");
        if (win) win.location.href = url;
        else window.open(url, "_blank", "noopener");
      } else win?.close();
    });

  const onPublish = () =>
    run("publish", async () => {
      const ok = await confirm({
        title: "Publish to the storefront?",
        message: dirty
          ? "Your edits will be saved and then go live for all customers immediately."
          : "The current draft will go live for all customers immediately.",
        confirmLabel: "Publish",
        tone: "primary",
      });
      if (!ok) return;
      if (dirty && !(await save({ quiet: true }))) return;
      try {
        const { data } = await api.post("/admin/content/publish");
        toast.success(data?.message || "Published");
        const res = await api.get("/admin/content");
        apply(res.data);
      } catch (err) {
        toast.error(errorMessage(err, "Publish failed"));
      }
    });

  const onDiscard = () =>
    run("discard", async () => {
      const ok = await confirm({
        title: "Discard draft?",
        message: "All unpublished changes (saved and unsaved) will be lost and the editor reset to what's live on the storefront.",
        confirmLabel: "Discard draft",
      });
      if (!ok) return;
      try {
        await api.post("/admin/content/discard");
        const { data } = await api.get("/admin/content");
        apply(data);
        toast.success("Draft discarded");
      } catch (err) {
        toast.error(errorMessage(err, "Discard failed"));
      }
    });

  if (loading) return <FullPageLoader label="Loading website content…" />;
  if (error)
    return (
      <div>
        <PageHeader title="Website content" />
        <div className="card">
          <ErrorState
            message={error}
            onRetry={() => {
              setLoading(true);
              load();
            }}
          />
        </div>
      </div>
    );

  const unpublished = meta?.hasUnpublishedChanges;
  const busy = !!action;

  return (
    <div>
      <PageHeader
        title="Website content"
        description="Edit storefront text, layout and pages as a draft. Preview it (only signed-in admins see drafts), then publish."
        actions={
          <>
            <button onClick={onDiscard} disabled={busy || (!unpublished && !dirty)} className="btn btn-ghost">
              {action === "discard" ? <Spinner /> : <Undo2 className="size-4" />} Discard draft
            </button>
            <button onClick={onSave} disabled={busy || !dirty} className="btn btn-secondary">
              {action === "save" ? <Spinner /> : <Save className="size-4" />} Save draft
            </button>
            <button onClick={onPreview} disabled={busy} className="btn btn-secondary">
              {action === "preview" ? <Spinner /> : <Eye className="size-4" />} Preview
            </button>
            <button onClick={onPublish} disabled={busy || (!unpublished && !dirty)} className="btn btn-primary">
              {action === "publish" ? <Spinner /> : <Rocket className="size-4" />} Publish
            </button>
          </>
        }
      />

      {/* status strip */}
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        {dirty ? (
          <span className="badge badge-warning">
            <AlertTriangle className="size-3" /> Unsaved edits
          </span>
        ) : null}
        {unpublished ? <span className="badge badge-info">Unpublished changes</span> : <span className="badge badge-success">Draft matches live site</span>}
        <span className="text-ink-500">
          {meta?.publishedAt
            ? `Last published ${formatDateTime(meta.publishedAt)}${meta.publishedBy ? ` by ${meta.publishedBy}` : ""}`
            : "Never published — the storefront shows the default content"}
        </span>
      </div>

      <div className="mb-5">
        <StatusTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "announcement" && (
        <AnnouncementEditor value={draft.announcement} onChange={(v) => update("announcement", v)} errors={errors} clearError={clearError} />
      )}
      {tab === "sections" && <SectionsEditor value={draft.homeSections} onChange={(v) => update("homeSections", v)} errors={errors} />}
      {tab === "categories" && (
        <CategoriesEditor value={draft.featuredCategories} all={categories} onChange={(v) => update("featuredCategories", v)} />
      )}
      {tab === "nav" && (
        <Card
          title="Header navigation"
          description={`Links in the storefront's top menu (max ${MAX_NAV}). Use store paths like /products or full URLs.`}
        >
          <LinkRows
            value={draft.navLinks}
            onChange={(v) => update("navLinks", v)}
            max={MAX_NAV}
            prefix="nav"
            errors={errors}
            clearError={clearError}
          />
        </Card>
      )}
      {tab === "footer" && <FooterEditor value={draft.footerColumns} onChange={(v) => update("footerColumns", v)} errors={errors} clearError={clearError} />}
      {tab === "faqs" && <FaqEditor value={draft.faqs} onChange={(v) => update("faqs", v)} errors={errors} clearError={clearError} />}
      {tab === "policies" && (
        <div className="grid gap-5 xl:grid-cols-2">
          {POLICIES.map((p) => (
            <Card key={p.key} title={p.label} description={`Shown at ${p.path}`}>
              <TextArea
                label={<span className="sr-only">{p.label}</span>}
                rows={10}
                maxLength={10000}
                value={draft.policies[p.key]}
                onChange={(e) => update("policies", { ...draft.policies, [p.key]: e.target.value })}
                hint={`${draft.policies[p.key].length.toLocaleString()} / 10,000 · blank lines start new paragraphs. Leave empty to use the default text.`}
              />
            </Card>
          ))}
        </div>
      )}
      {tab === "contact" && (
        <Card title="Contact details" description="Shown on the Contact page and in the footer. Empty fields fall back to the defaults.">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { key: "email", label: "Support email", type: "email", max: 200 },
              { key: "phone", label: "Phone", type: "tel", max: 40 },
              { key: "address", label: "Address", max: 300 },
              { key: "hours", label: "Opening hours", max: 100, placeholder: "Mon – Sat : 9 AM – 7 PM" },
            ].map((f) => (
              <Input
                key={f.key}
                label={f.label}
                type={f.type || "text"}
                maxLength={f.max}
                placeholder={f.placeholder}
                value={draft.contact[f.key]}
                onChange={(e) => update("contact", { ...draft.contact, [f.key]: e.target.value })}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* =================================================
   EDITORS
================================================= */
function RowControls({ index, length, onMove, onRemove, label }) {
  return (
    <div className="flex shrink-0 items-center">
      <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} className="btn btn-ghost btn-icon btn-sm" aria-label={`Move ${label} up`}>
        <ArrowUp className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onMove(index, 1)}
        disabled={index === length - 1}
        className="btn btn-ghost btn-icon btn-sm"
        aria-label={`Move ${label} down`}
      >
        <ArrowDown className="size-4" />
      </button>
      {onRemove && (
        <button type="button" onClick={() => onRemove(index)} className="btn btn-danger-ghost btn-icon btn-sm" aria-label={`Remove ${label}`}>
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}

function AnnouncementEditor({ value, onChange, errors, clearError }) {
  const set = (k, v) => {
    onChange({ ...value, [k]: v });
    clearError(`announcement.${k}`);
  };
  return (
    <Card title="Announcement bar" description="A thin strip above the storefront header — good for sales, shipping offers or notices.">
      <div className="space-y-4">
        <label className="flex items-center justify-between gap-4 rounded-xl bg-ink-50 px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-ink-800">Show announcement bar</span>
            <span className="block text-xs text-ink-500">Turn off to hide it without losing the text.</span>
          </span>
          <Switch checked={!!value.active} onChange={(v) => set("active", v)} label="Show announcement bar" />
        </label>
        <Input
          label="Text"
          maxLength={200}
          placeholder="Free delivery on orders over ₹999 — this week only!"
          value={value.text}
          onChange={(e) => set("text", e.target.value)}
          error={errors["announcement.text"]}
          hint={`${value.text.length}/200`}
        />
        <Input
          label="Link (optional)"
          placeholder="/products?onSale=1"
          value={value.link}
          onChange={(e) => set("link", e.target.value)}
          error={errors["announcement.link"]}
          hint="Makes the bar clickable. A store path or full URL."
        />
        <div>
          <p className="label">Preview</p>
          <div
            className={`rounded-lg px-4 py-2 text-center text-sm font-medium ${
              value.active && value.text ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-400"
            }`}
          >
            {value.text || "Your announcement text"}
            {value.link && value.active && <span className="ml-1 underline">→</span>}
            {!value.active && <span className="ml-2 text-xs">(hidden)</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}

function SectionsEditor({ value, onChange, errors }) {
  const missing = SECTION_KEYS.filter((k) => !value.some((s) => s.key === k));
  const setAt = (i, patch) => onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <Card
      title="Homepage sections"
      description="Order, visibility and headings of the blocks below the hero banner. Auto-discount offers and banners always show at the top."
    >
      <ol className="space-y-3">
        {value.map((s, i) => {
          const info = SECTION_INFO[s.key] || { name: labelize(s.key), text: "" };
          return (
            <li
              key={s.key}
              className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-start ${s.enabled ? "border-ink-200 bg-white" : "border-dashed border-ink-200 bg-ink-50/60"}`}
            >
              <span className="hidden size-7 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-xs font-bold text-ink-600 sm:flex">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">
                  {info.name} {!s.enabled && <span className="badge badge-neutral ml-1">Hidden</span>}
                </p>
                <p className="mb-2 text-xs text-ink-500">{info.text}</p>
                <Input
                  label={<span className="sr-only">Heading for {info.name}</span>}
                  maxLength={80}
                  placeholder="Heading shown on the storefront"
                  value={s.title}
                  onChange={(e) => setAt(i, { title: e.target.value })}
                  error={errors[`sections.${i}.title`]}
                />
              </div>
              <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                <Switch checked={s.enabled} onChange={(v) => setAt(i, { enabled: v })} label={`${s.enabled ? "Hide" : "Show"} ${info.name}`} />
                <RowControls index={i} length={value.length} onMove={(a, d) => onChange(moveItem(value, a, d))} label={info.name} />
              </div>
            </li>
          );
        })}
      </ol>
      {missing.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-500">Add section:</span>
          {missing.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => onChange([...value, { key: k, title: SECTION_INFO[k].name, enabled: true }])}
              className="btn btn-secondary btn-sm"
            >
              <Plus className="size-3.5" /> {SECTION_INFO[k].name}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function CategoriesEditor({ value, all, onChange }) {
  const available = all.filter((c) => !value.includes(c));
  return (
    <Card
      title="Featured categories"
      description="Categories shown in the homepage “Shop by category” section, in this order. Leave empty to show all categories."
    >
      <p className="label">Selected ({value.length}/24)</p>
      {value.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-sm text-ink-500">
          None selected — the storefront shows all categories.
        </p>
      ) : (
        <ol className="space-y-2">
          {value.map((c, i) => (
            <li key={c} className="flex items-center gap-3 rounded-xl border border-ink-200 px-3 py-2">
              <span className="text-xs font-bold text-ink-400">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium capitalize text-ink-800">
                {labelize(c)}
                {!all.includes(c) && all.length > 0 && <span className="badge badge-warning ml-2 normal-case">Category no longer exists</span>}
              </span>
              <RowControls
                index={i}
                length={value.length}
                onMove={(a, d) => onChange(moveItem(value, a, d))}
                onRemove={(a) => onChange(value.filter((_, j) => j !== a))}
                label={labelize(c)}
              />
            </li>
          ))}
        </ol>
      )}
      <p className="label mt-5">Add categories</p>
      {available.length === 0 ? (
        <p className="text-sm text-ink-500">{all.length ? "All categories are selected." : "No categories found."}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {available.map((c) => (
            <button
              key={c}
              type="button"
              disabled={value.length >= 24}
              onClick={() => onChange([...value, c])}
              className="inline-flex items-center gap-1 rounded-full border border-ink-200 px-2.5 py-1 text-xs font-medium capitalize text-ink-600 transition hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
            >
              <Plus className="size-3" /> {labelize(c)}
            </button>
          ))}
        </div>
      )}
      {value.length > 0 && (
        <button type="button" onClick={() => onChange([])} className="btn btn-ghost btn-sm mt-4">
          <X className="size-4" /> Clear selection (show all)
        </button>
      )}
    </Card>
  );
}

function LinkRows({ value, onChange, max, prefix, errors, clearError }) {
  const setAt = (i, k, v) => {
    onChange(value.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
    clearError(`${prefix}.${i}.${k}`);
  };
  return (
    <div className="space-y-2">
      {value.length === 0 && <p className="text-sm text-ink-500">No links yet.</p>}
      {value.map((l, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl border border-ink-100 p-2 sm:flex-row sm:items-start sm:border-0 sm:p-0">
          <Input
            className="sm:flex-1"
            label={<span className="sr-only">Label</span>}
            placeholder="Label"
            maxLength={40}
            value={l.label}
            onChange={(e) => setAt(i, "label", e.target.value)}
            error={errors[`${prefix}.${i}.label`]}
          />
          <Input
            className="sm:flex-[1.4]"
            label={<span className="sr-only">Link</span>}
            placeholder="/products"
            value={l.to}
            onChange={(e) => setAt(i, "to", e.target.value)}
            error={errors[`${prefix}.${i}.to`]}
          />
          <div className="flex justify-end sm:pt-1">
            <RowControls
              index={i}
              length={value.length}
              onMove={(a, d) => onChange(moveItem(value, a, d))}
              onRemove={(a) => onChange(value.filter((_, j) => j !== a))}
              label={l.label || "link"}
            />
          </div>
        </div>
      ))}
      <button type="button" disabled={value.length >= max} onClick={() => onChange([...value, { label: "", to: "" }])} className="btn btn-secondary btn-sm">
        <Plus className="size-4" /> Add link {value.length >= max && `(max ${max})`}
      </button>
    </div>
  );
}

function FooterEditor({ value, onChange, errors, clearError }) {
  const setAt = (i, patch) => onChange(value.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        {value.map((col, ci) => (
          <Card
            key={ci}
            title={`Column ${ci + 1}`}
            actions={
              <RowControls
                index={ci}
                length={value.length}
                onMove={(a, d) => onChange(moveItem(value, a, d))}
                onRemove={(a) => onChange(value.filter((_, j) => j !== a))}
                label={`column ${ci + 1}`}
              />
            }
          >
            <div className="space-y-4">
              <Input
                label="Column heading"
                maxLength={40}
                value={col.title}
                onChange={(e) => {
                  setAt(ci, { title: e.target.value });
                  clearError(`footer.${ci}.title`);
                }}
                error={errors[`footer.${ci}.title`]}
              />
              <LinkRows
                value={col.links}
                onChange={(links) => setAt(ci, { links })}
                max={MAX_FOOTER_LINKS}
                prefix={`footer.${ci}`}
                errors={errors}
                clearError={clearError}
              />
            </div>
          </Card>
        ))}
      </div>
      {value.length === 0 && (
        <div className="card p-6 text-center text-sm text-ink-500">No footer columns — the storefront will show the default footer links.</div>
      )}
      <button
        type="button"
        disabled={value.length >= MAX_FOOTER_COLS}
        onClick={() => onChange([...value, { title: "", links: [] }])}
        className="btn btn-secondary"
      >
        <Plus className="size-4" /> Add column {value.length >= MAX_FOOTER_COLS && `(max ${MAX_FOOTER_COLS})`}
      </button>
    </div>
  );
}

function FaqEditor({ value, onChange, errors, clearError }) {
  const setAt = (i, k, v) => {
    onChange(value.map((f, j) => (j === i ? { ...f, [k]: v } : f)));
    clearError(`faqs.${i}.${k}`);
  };
  return (
    <Card title="FAQs" description={`Questions on the storefront FAQ page (max ${MAX_FAQS}). Leave none to show the defaults.`}>
      <ol className="space-y-4">
        {value.map((f, i) => (
          <li key={i} className="rounded-xl border border-ink-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Question {i + 1}</span>
              <RowControls
                index={i}
                length={value.length}
                onMove={(a, d) => onChange(moveItem(value, a, d))}
                onRemove={(a) => onChange(value.filter((_, j) => j !== a))}
                label={`question ${i + 1}`}
              />
            </div>
            <div className="space-y-3">
              <Input
                label="Question"
                maxLength={200}
                value={f.question}
                onChange={(e) => setAt(i, "question", e.target.value)}
                error={errors[`faqs.${i}.question`]}
              />
              <TextArea
                label="Answer"
                rows={3}
                maxLength={2000}
                value={f.answer}
                onChange={(e) => setAt(i, "answer", e.target.value)}
                error={errors[`faqs.${i}.answer`]}
              />
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={value.length >= MAX_FAQS}
        onClick={() => onChange([...value, { question: "", answer: "" }])}
        className="btn btn-secondary btn-sm mt-4"
      >
        <Plus className="size-4" /> Add question
      </button>
    </Card>
  );
}
