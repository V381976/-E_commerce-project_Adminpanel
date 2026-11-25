import api from "../../api";

// GET a CSV endpoint as a blob and save it via a temporary <a download>
export const downloadFile = async (url, params, fallbackName = "export.csv") => {
  const res = await api.get(url, { params, responseType: "blob" });
  const disposition = res.headers?.["content-disposition"] || "";
  const name = /filename="?([^";]+)"?/i.exec(disposition)?.[1] || fallbackName;
  const href = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
};

// blob error bodies (responseType: "blob") hide the JSON message — read it back
export const blobErrorMessage = async (err, fallback = "Download failed") => {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return typeof parsed === "string" ? parsed : parsed?.message || parsed?.msg || fallback;
    } catch {
      return fallback;
    }
  }
  if (typeof data === "string") return data;
  return data?.message || data?.msg || fallback;
};

export const PRODUCT_STATUSES = ["draft", "active", "inactive"];
export const STATUS_BADGE = { active: "badge-success", draft: "badge-neutral", inactive: "badge-warning" };
export const LABELS = ["featured", "trending", "new", "bestseller"];

// variants carry the stock when present; null = stock not tracked
export const totalStock = (p) => {
  if (p?.variants?.length) return p.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  return p?.stock == null ? null : Number(p.stock) || 0;
};

export const stockState = (stock, threshold = 5) => {
  if (stock == null) return "untracked";
  if (stock <= 0) return "out";
  if (stock <= threshold) return "low";
  return "ok";
};

export const variantLabel = (v) =>
  Object.entries(v?.options || {})
    .map(([k, x]) => `${k}: ${x}`)
    .join(" · ");

export const REASON_LABEL = {
  order: "Order",
  cancel: "Cancelled order",
  expired: "Payment expired",
  return: "Return",
  adjustment: "Adjustment",
  restock: "Restock",
  import: "Import",
  bulk: "Bulk update",
  edit: "Product edit",
  create: "Created",
};

// yyyy-mm-dd in local time (date inputs + report params)
export const isoDay = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
