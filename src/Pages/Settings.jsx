import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Store,
  Receipt,
  Truck,
  CreditCard,
  Tag,
  Boxes,
  ClipboardList,
  Plug,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import api, { errorMessage } from "../api";
import { PageHeader, Card, ErrorState, Input, Switch, Spinner } from "../Components/ui";
import { fieldErrors } from "../Components/site/helpers";
import { formatPrice } from "../lib/format";

const BACKEND_URL = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");

// server errors come back as "tax.rate" — strip the section prefix
const sectionErrors = (err, section) =>
  Object.fromEntries(Object.entries(fieldErrors(err)).map(([k, v]) => [k.startsWith(`${section}.`) ? k.slice(section.length + 1) : k, v]));

/* one card = one section object, saved on its own with PUT /admin/settings { [section]: {...} } */
function SectionForm({ section, title, description, icon: Icon, initial, toBody = (f) => f, onSaved, children }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put("/admin/settings", { [section]: toBody(form) });
      toast.success(`${title} saved`);
      setErrors({});
      onSaved(data.settings);
    } catch (err) {
      setErrors(sectionErrors(err, section));
      toast.error(errorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Card
        title={
          <span className="flex items-center gap-2">
            <Icon className="size-4 text-brand-600" /> {title}
          </span>
        }
        description={description}
        actions={
          <div className="flex items-center gap-2">
            {dirty && <span className="badge badge-warning">Unsaved</span>}
            <button disabled={saving || !dirty} className="btn btn-primary btn-sm">
              {saving ? <Spinner /> : <Save className="size-4" />} Save
            </button>
          </div>
        }
      >
        {children({ form, set, errors, setForm })}
      </Card>
    </form>
  );
}

function ToggleRow({ title, text, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl bg-ink-50 px-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink-800">{title}</span>
        {text && <span className="mt-0.5 block text-xs text-ink-500">{text}</span>}
      </span>
      <Switch checked={!!checked} onChange={onChange} label={title} />
    </label>
  );
}

const numField = (form, set, errors, key, props) => ({
  type: "number",
  value: form[key] ?? "",
  onChange: (e) => set(key, e.target.value),
  error: errors[key],
  ...props,
});

const zoneToForm = (z) => ({
  name: z.name || "",
  pincodePrefixes: (z.pincodePrefixes || []).join(", "),
  charge: z.charge ?? 0,
  etaMin: z.etaMin ?? "",
  etaMax: z.etaMax ?? "",
  active: z.active !== false,
});

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [integrations, setIntegrations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      api
        .get("/admin/settings")
        .then((r) => {
          const { integrations: integ, ...rest } = r.data;
          setSettings(rest);
          setIntegrations(integ);
          setError("");
        })
        .catch((err) => setError(errorMessage(err, "Settings load failed")))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const onSaved = (s) => s && setSettings(s);

  if (loading)
    return (
      <div>
        <PageHeader title="Settings" description="Store-wide configuration." />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card space-y-3 p-6">
              <div className="skeleton h-5 w-1/3" />
              <div className="skeleton h-10 w-full" />
              <div className="skeleton h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    );

  if (error)
    return (
      <div>
        <PageHeader title="Settings" />
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

  const s = settings;
  // remount a section after the server returns its saved (normalised) values
  const k = (section) => JSON.stringify(s[section] || {});

  return (
    <div>
      <PageHeader title="Settings" description="Store-wide configuration. Each section saves on its own and applies to new orders immediately." />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          {/* ================= STORE ================= */}
          <SectionForm
            key={k("store")}
            section="store"
            title="Store details"
            description="Shown on invoices, emails and the storefront."
            icon={Store}
            initial={{ name: "", email: "", phone: "", address: "", ...s.store }}
            toBody={({ name, email, phone, address }) => ({ name, email, phone, address })}
            onSaved={onSaved}
          >
            {({ form, set, errors }) => (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Store name" value={form.name} onChange={(e) => set("name", e.target.value)} error={errors.name} />
                <Input label="Support email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
                <Input label="Phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} />
                <Input label="Currency" value={form.currency || "INR"} readOnly disabled hint="Prices are in Indian rupees (₹)." />
                <Input
                  className="sm:col-span-2"
                  label="Address"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  error={errors.address}
                />
              </div>
            )}
          </SectionForm>

          {/* ================= TAX ================= */}
          <SectionForm
            key={k("tax")}
            section="tax"
            title="Tax"
            description="Applied to every order at checkout."
            icon={Receipt}
            initial={{ rate: 0, inclusive: true, label: "GST", ...s.tax }}
            onSaved={onSaved}
          >
            {({ form, set, errors }) => (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Tax rate (%)" {...numField(form, set, errors, "rate", { min: 0, max: 50, step: "0.01" })} hint="0–50. Use 0 for no tax." />
                  <Input label="Label" maxLength={20} value={form.label} onChange={(e) => set("label", e.target.value)} error={errors.label} hint="e.g. GST, VAT" />
                </div>
                <ToggleRow
                  title="Prices include tax"
                  text={
                    form.inclusive
                      ? `On: product prices already contain ${form.label || "tax"}. Checkout shows the tax portion but the total doesn't change.`
                      : `Off: ${form.label || "tax"} at ${Number(form.rate) || 0}% is added on top of product prices at checkout.`
                  }
                  checked={form.inclusive}
                  onChange={(v) => set("inclusive", v)}
                />
              </div>
            )}
          </SectionForm>

          {/* ================= PAYMENTS ================= */}
          <SectionForm
            key={k("payments")}
            section="payments"
            title="Payments"
            description="Which payment methods shoppers can choose at checkout."
            icon={CreditCard}
            initial={{ codEnabled: true, codMaxAmount: 0, onlineEnabled: true, guestCheckout: true, ...s.payments }}
            onSaved={onSaved}
          >
            {({ form, set, errors }) => (
              <div className="space-y-3">
                <ToggleRow title="Cash on delivery" text="Let customers pay when the order arrives." checked={form.codEnabled} onChange={(v) => set("codEnabled", v)} />
                {form.codEnabled && (
                  <Input
                    label="COD max order amount (₹)"
                    {...numField(form, set, errors, "codMaxAmount", { min: 0 })}
                    hint="Orders above this must be paid online. 0 = no limit."
                  />
                )}
                <ToggleRow
                  title="Online payments (Razorpay)"
                  text={
                    integrations?.razorpay
                      ? "Cards, UPI, net banking and wallets via Razorpay."
                      : "Razorpay keys aren't configured on the server, so online payment stays unavailable even when this is on."
                  }
                  checked={form.onlineEnabled}
                  onChange={(v) => set("onlineEnabled", v)}
                />
                <ToggleRow
                  title="Guest checkout"
                  text="Allow ordering without creating an account. Guests track orders with order number + email."
                  checked={form.guestCheckout}
                  onChange={(v) => set("guestCheckout", v)}
                />
              </div>
            )}
          </SectionForm>

          {/* ================= PRICING ================= */}
          <SectionForm
            key={k("pricing")}
            section="pricing"
            title="Pricing"
            description="How product-level discounts are charged."
            icon={Tag}
            initial={{ applyProductDiscounts: true, ...s.pricing }}
            onSaved={onSaved}
          >
            {({ form, set }) => (
              <ToggleRow
                title="Charge discounted product prices"
                text={
                  form.applyProductDiscounts
                    ? "On: customers pay the discounted (sale) price shown on product cards and product pages."
                    : "Off: discounts shown on product cards are display-only and customers are charged the full list price. Coupons and automatic category discounts still apply."
                }
                checked={form.applyProductDiscounts}
                onChange={(v) => set("applyProductDiscounts", v)}
              />
            )}
          </SectionForm>

          {/* ================= INVENTORY + ORDERS ================= */}
          <SectionForm
            key={k("inventory")}
            section="inventory"
            title="Inventory"
            description="Stock alerts on the dashboard and inventory page."
            icon={Boxes}
            initial={{ lowStockThreshold: 5, ...s.inventory }}
            onSaved={onSaved}
          >
            {({ form, set, errors }) => (
              <Input
                label="Low-stock threshold"
                {...numField(form, set, errors, "lowStockThreshold", { min: 0 })}
                hint="Products at or below this quantity are flagged as low stock (products can override it individually)."
              />
            )}
          </SectionForm>

          <SectionForm
            key={k("orders")}
            section="orders"
            title="Orders"
            description="Returns and payment timing."
            icon={ClipboardList}
            initial={{ returnWindowDays: 7, paymentTimeoutMinutes: 30, ...s.orders }}
            onSaved={onSaved}
          >
            {({ form, set, errors }) => (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Return window (days)"
                  {...numField(form, set, errors, "returnWindowDays", { min: 0, max: 365 })}
                  hint="Days after delivery a customer can request a return."
                />
                <Input
                  label="Online payment timeout (min)"
                  {...numField(form, set, errors, "paymentTimeoutMinutes", { min: 5, max: 1440 })}
                  hint="Unpaid online orders are cancelled and stock released after this. 5–1440."
                />
              </div>
            )}
          </SectionForm>
        </div>

        <div className="space-y-6">
          {/* ================= SHIPPING ================= */}
          <SectionForm
            key={k("shipping")}
            section="shipping"
            title="Shipping"
            description="Delivery charges and delivery-time estimates."
            icon={Truck}
            initial={{
              flatRate: s.shipping?.flatRate ?? 0,
              freeThreshold: s.shipping?.freeThreshold ?? 0,
              defaultEtaMin: s.shipping?.defaultEtaMin ?? 3,
              defaultEtaMax: s.shipping?.defaultEtaMax ?? 7,
              restrictToZones: !!s.shipping?.restrictToZones,
              zones: (s.shipping?.zones || []).map(zoneToForm),
            }}
            onSaved={onSaved}
          >
            {({ form, set, errors }) => <ShippingFields form={form} set={set} errors={errors} />}
          </SectionForm>

          <IntegrationsPanel integrations={integrations} />
        </div>
      </div>
    </div>
  );
}

function ShippingFields({ form, set, errors }) {
  const setZone = (i, patch) => set("zones", form.zones.map((z, j) => (j === i ? { ...z, ...patch } : z)));
  const flat = Number(form.flatRate) || 0;
  const threshold = Number(form.freeThreshold) || 0;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Flat delivery charge (₹)" {...numField(form, set, errors, "flatRate", { min: 0 })} hint="Charged when no zone matches. 0 = free." />
        <Input
          label="Free shipping above (₹)"
          {...numField(form, set, errors, "freeThreshold", { min: 0 })}
          hint="Cart value for free delivery. 0 = no threshold."
        />
        <Input label="Default delivery — min days" {...numField(form, set, errors, "defaultEtaMin", { min: 0, max: 60 })} />
        <Input label="Default delivery — max days" {...numField(form, set, errors, "defaultEtaMax", { min: 0, max: 60 })} />
      </div>
      <p className="flex gap-2 rounded-lg bg-brand-50/60 px-3 py-2 text-xs text-brand-800">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {flat === 0
          ? "Delivery is free by default."
          : `Delivery costs ${formatPrice(flat)}${threshold ? `, free on carts over ${formatPrice(threshold)}` : ""}.`}{" "}
        Zones below override the charge and estimate for matching pincodes.
      </p>

      <ToggleRow
        title="Only deliver to listed zones"
        text="When on, pincodes that don't match an active zone can't check out."
        checked={form.restrictToZones}
        onChange={(v) => set("restrictToZones", v)}
      />

      <div>
        <p className="label">Delivery zones</p>
        {form.zones.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-200 px-4 py-5 text-center text-sm text-ink-500">
            No zones — the flat rate and default estimate apply everywhere.
          </p>
        ) : (
          <ul className="space-y-3">
            {form.zones.map((z, i) => (
              <li key={i} className={`rounded-xl border p-3 ${z.active ? "border-ink-200" : "border-dashed border-ink-200 bg-ink-50/60"}`}>
                <div className="mb-3 flex items-center gap-2">
                  <Input
                    className="flex-1"
                    label={<span className="sr-only">Zone name</span>}
                    placeholder="Zone name, e.g. Delhi NCR"
                    value={z.name}
                    onChange={(e) => setZone(i, { name: e.target.value })}
                  />
                  <Switch checked={z.active} onChange={(v) => setZone(i, { active: v })} label={`${z.active ? "Disable" : "Enable"} zone`} />
                  <button
                    type="button"
                    onClick={() => set("zones", form.zones.filter((_, j) => j !== i))}
                    className="btn btn-danger-ghost btn-icon btn-sm"
                    aria-label="Remove zone"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr]">
                  <Input
                    label="Pincode prefixes"
                    placeholder="110, 1220, 201"
                    value={z.pincodePrefixes}
                    onChange={(e) => setZone(i, { pincodePrefixes: e.target.value })}
                    hint="Comma-separated, 1–6 digits"
                  />
                  <Input label="Charge (₹)" type="number" min="0" value={z.charge} onChange={(e) => setZone(i, { charge: e.target.value })} />
                  <Input label="Min days" type="number" min="0" value={z.etaMin} onChange={(e) => setZone(i, { etaMin: e.target.value })} />
                  <Input label="Max days" type="number" min="0" value={z.etaMax} onChange={(e) => setZone(i, { etaMax: e.target.value })} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          disabled={form.zones.length >= 50}
          onClick={() => set("zones", [...form.zones, { name: "", pincodePrefixes: "", charge: 0, etaMin: "", etaMax: "", active: true }])}
          className="btn btn-secondary btn-sm mt-3"
        >
          <Plus className="size-4" /> Add zone
        </button>
      </div>
    </div>
  );
}

const INTEGRATIONS = [
  {
    key: "razorpay",
    name: "Razorpay payments",
    text: "Online card / UPI / net-banking payments and refunds.",
    env: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
  },
  {
    key: "razorpayWebhook",
    name: "Razorpay webhook",
    text: `Confirms payments even if the shopper closes the tab. Point the Razorpay webhook at ${BACKEND_URL || "<backend>"}/payment/webhook.`,
    env: ["RAZORPAY_WEBHOOK_SECRET"],
  },
  {
    key: "email",
    name: "Email (SMTP)",
    text: "Order confirmations, status updates, support replies and password resets.",
    env: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"],
  },
  {
    key: "cloudinary",
    name: "Cloudinary images",
    text: "Product image hosting. Without it, uploads are stored on the server's disk.",
    env: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
  },
];

function IntegrationsPanel({ integrations }) {
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Plug className="size-4 text-brand-600" /> Integrations
        </span>
      }
      description="Read-only. Configured through the backend's .env file — restart the server after changing it. Secret values are never shown here."
    >
      <ul className="space-y-3">
        {INTEGRATIONS.map((it) => {
          const on = !!integrations?.[it.key];
          return (
            <li key={it.key} className="rounded-xl border border-ink-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink-900">{it.name}</p>
                  <p className="mt-0.5 break-words text-xs text-ink-500">{it.text}</p>
                </div>
                {on ? (
                  <span className="badge badge-success shrink-0">
                    <CheckCircle2 className="size-3" /> Connected
                  </span>
                ) : (
                  <span className="badge badge-neutral shrink-0">
                    <XCircle className="size-3" /> Not configured
                  </span>
                )}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {it.env.map((v) => (
                  <code key={v} className="rounded bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-700">
                    {v}
                  </code>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
