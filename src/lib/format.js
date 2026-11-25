const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export const formatPrice = (value) => inr.format(Number(value) || 0);

export const formatDate = (value, opts = { day: "numeric", month: "short", year: "numeric" }) =>
  value ? new Date(value).toLocaleDateString("en-IN", opts) : "—";

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : "—";

export const shortId = (id = "") => id.slice(-8).toUpperCase();

export const titleCase = (s = "") => (s ? s.charAt(0) + s.slice(1).toLowerCase() : "");

export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];

export const ORDER_BADGE = {
  PENDING: "badge-warning",
  CONFIRMED: "badge-brand",
  PROCESSING: "badge-brand",
  SHIPPED: "badge-info",
  DELIVERED: "badge-success",
  CANCELLED: "badge-danger",
  RETURNED: "badge-neutral",
};
