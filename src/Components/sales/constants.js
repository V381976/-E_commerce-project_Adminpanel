import api from "../../api";
import { shortId, titleCase } from "../../lib/format";

// mirrors models/OrderDitealsModel.js + utils/orderService.js on the backend
export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];
export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"];

export const STATUS_BADGE = {
  PENDING: "badge-warning",
  CONFIRMED: "badge-brand",
  PROCESSING: "badge-info",
  SHIPPED: "badge-info",
  DELIVERED: "badge-success",
  CANCELLED: "badge-danger",
  RETURNED: "badge-neutral",
};

export const PAYMENT_BADGE = {
  PENDING: "badge-warning",
  PAID: "badge-success",
  FAILED: "badge-danger",
  REFUNDED: "badge-neutral",
  PARTIALLY_REFUNDED: "badge-info",
};

export const RETURN_BADGE = {
  REQUESTED: "badge-warning",
  APPROVED: "badge-info",
  RECEIVED: "badge-success",
  REJECTED: "badge-danger",
};

export const REFUND_BADGE = {
  PENDING: "badge-warning",
  PROCESSED: "badge-success",
  FAILED: "badge-danger",
};

export const PAYMENT_METHOD_LABEL = { COD: "Cash on delivery", ONLINE: "Online (Razorpay)" };

// "PARTIALLY_REFUNDED" → "Partially refunded", "Order_Manager" → "Order manager"
export const humanize = (s = "") => titleCase(String(s).replace(/_/g, " ").toUpperCase());

export const formatFull = (v) =>
  v
    ? new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

// ISO date → value for <input type="date">
export const toDateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");

export const orderLabel =(o) => o?.orderNumber || `#${shortId(o?._id)}`;

// registered user, guest checkout, or an account that has since been deleted
export const orderCustomer = (o) => {
  if (o.user && typeof o.user === "object") return { name: o.user.name, email: o.user.email, phone: o.user.phone, id: o.user._id, guest: false };
  if (o.guest?.email || o.guest?.name)
    return { name: o.guest.name || o.shippingAddress?.fullName || "Guest", email: o.guest.email, phone: o.guest.phone, guest: true };
  return { name: o.shippingAddress?.fullName || "Deleted customer", email: "", deleted: true, guest: false };
};

export const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

export const ROLE_LABELS = {
  Super_Admin: "Super Admin",
  Admin: "Admin",
  Inventory_Manager: "Inventory Manager",
  Order_Manager: "Order Manager",
  Product_admin: "Product Admin (legacy)",
};

export const PERMISSION_LABELS = {
  dashboard: "Dashboard",
  reports: "Reports & analytics",
  products: "Products",
  categories: "Categories & brands",
  inventory: "Inventory",
  orders: "Orders, returns & refunds",
  customers: "Customers",
  coupons: "Coupons & offers",
  content: "Website content & banners",
  reviews: "Reviews",
  support: "Support tickets",
  settings: "Store settings",
  staff: "Staff & roles",
  audit: "Audit log",
};

// drop empty filter values so they don't reach the API
export const cleanParams = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v != null));

// GET a text/csv endpoint and save it via a temporary <a download>
export async function downloadCsv(path, params, filename) {
  let res;
  try {
    res = await api.get(path, { params, responseType: "blob" });
  } catch (err) {
    // with responseType "blob" the JSON error body arrives as a Blob too
    const data = err.response?.data;
    if (data instanceof Blob) {
      try {
        const json = JSON.parse(await data.text());
        err.response.data = json;
      } catch {
        /* not JSON — keep the original error */
      }
    }
    throw err;
  }
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
