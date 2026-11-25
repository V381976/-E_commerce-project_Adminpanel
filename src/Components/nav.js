import {
  LayoutDashboard,
  BarChart3,
  Package,
  PackagePlus,
  FolderTree,
  Boxes,
  ShoppingCart,
  Undo2,
  Users,
  TicketPercent,
  BadgePercent,
  Star,
  LifeBuoy,
  Image,
  LayoutTemplate,
  Mail,
  Settings,
  ShieldCheck,
  ScrollText,
} from "lucide-react";

// sidebar sections + page titles for the top bar.
// `perm` must be in the signed-in admin's permissions (from /admin/me) to show the item.
export const NAV = [
  {
    group: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard" },
      { to: "/reports", label: "Reports", icon: BarChart3, perm: "reports" },
    ],
  },
  {
    group: "Catalog",
    items: [
      { to: "/products", label: "Products", icon: Package, perm: "products" },
      { to: "/add", label: "Add Product", icon: PackagePlus, perm: "products" },
      { to: "/categories", label: "Categories & Brands", icon: FolderTree, perm: "categories" },
      { to: "/inventory", label: "Inventory", icon: Boxes, perm: "inventory" },
    ],
  },
  {
    group: "Sales",
    items: [
      { to: "/orders", label: "Orders", icon: ShoppingCart, perm: "orders" },
      { to: "/returns", label: "Returns & Refunds", icon: Undo2, perm: "orders" },
      { to: "/customers", label: "Customers", icon: Users, perm: "customers" },
    ],
  },
  {
    group: "Marketing",
    items: [
      { to: "/coupons", label: "Coupons", icon: TicketPercent, perm: "coupons" },
      { to: "/offers", label: "Auto discounts", icon: BadgePercent, perm: "coupons" },
      { to: "/newsletter", label: "Newsletter", icon: Mail, perm: "content" },
    ],
  },
  {
    group: "Engagement",
    items: [
      { to: "/reviews", label: "Reviews", icon: Star, perm: "reviews" },
      { to: "/support", label: "Support & Q&A", icon: LifeBuoy, perm: "support" },
    ],
  },
  {
    group: "Storefront",
    items: [
      { to: "/banner", label: "Banners", icon: Image, perm: "content" },
      { to: "/content", label: "Website content", icon: LayoutTemplate, perm: "content" },
    ],
  },
  {
    group: "Administration",
    items: [
      { to: "/settings", label: "Settings", icon: Settings, perm: "settings" },
      { to: "/staff", label: "Staff & roles", icon: ShieldCheck, perm: "staff" },
      { to: "/audit", label: "Audit log", icon: ScrollText, perm: "audit" },
    ],
  },
];

// first page a role can open (e.g. Inventory Managers land on /inventory)
export const firstAllowedPath = (permissions = []) =>
  NAV.flatMap((s) => s.items).find((i) => permissions.includes(i.perm))?.to || "/";

export const STORE_URL = (import.meta.env.VITE_STORE_URL || "http://localhost:5173").replace(/\/$/, "");
