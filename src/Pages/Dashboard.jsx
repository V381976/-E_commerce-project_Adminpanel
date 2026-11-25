import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import CountUp from "react-countup";
import {
  Users as UsersIcon,
  Package,
  FolderTree,
  Tag,
  ShoppingCart,
  IndianRupee,
  ArrowRight,
  PackagePlus,
  Image,
  TicketPercent,
  Truck,
  Undo2,
  Wallet,
  Star,
  LifeBuoy,
  AlertTriangle,
  PackageX,
  CheckCircle2,
  Receipt,
  BarChart3,
} from "lucide-react";
import api, { errorMessage } from "../api";
import { Card, DataTable, EmptyState, ErrorState } from "../Components/ui";
import RevenueChart from "../Components/catalog/RevenueChart";
import { formatDate, formatPrice, shortId, titleCase, ORDER_BADGE } from "../lib/format";

const STAT_CARDS = [
  { field: "orders", label: "Total orders", icon: ShoppingCart, tone: "bg-brand-50 text-brand-600" },
  { field: "customers", label: "Customers", icon: UsersIcon, tone: "bg-sky-50 text-sky-600" },
  { field: "products", label: "Products", icon: Package, tone: "bg-amber-50 text-amber-600" },
  { field: "categories", label: "Categories", icon: FolderTree, tone: "bg-fuchsia-50 text-fuchsia-600" },
  { field: "brands", label: "Brands", icon: Tag, tone: "bg-rose-50 text-rose-600" },
];

const REVENUE_CARDS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "total", label: "All time" },
];

const QUICK = [
  { to: "/add", label: "Add product", icon: PackagePlus, perm: "products" },
  { to: "/banner", label: "Manage banners", icon: Image, perm: "content" },
  { to: "/coupons", label: "Create coupon", icon: TicketPercent, perm: "coupons" },
  { to: "/orders", label: "View orders", icon: ShoppingCart, perm: "orders" },
  { to: "/reports", label: "Sales reports", icon: BarChart3, perm: "reports" },
  { to: "/inventory", label: "Inventory", icon: PackageX, perm: "inventory" },
];

const RANGES = [7, 30, 90];

const BADGE = { ...ORDER_BADGE, CONFIRMED: "badge-info", PROCESSING: "badge-brand", RETURNED: "badge-neutral" };

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

function StatCard({ label, value, icon: Icon, tone, money, loading }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      {loading ? (
        <div className="skeleton mt-3 h-8 w-24" />
      ) : (
        <p className="mt-3 truncate text-2xl font-bold tracking-tight text-ink-900 tabular-nums">
          {money && "₹"}
          <CountUp end={value || 0} duration={1} separator="," decimals={money && !Number.isInteger(value || 0) ? 2 : 0} preserveValue />
        </p>
      )}
    </div>
  );
}

function SkeletonList({ n = 3, h = "h-9" }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={`skeleton ${h}`} />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { admin, can = () => false } = useOutletContext() || {};
  const [stats, setStats] = useState(null);
  const [latestOrders, setLatestOrders] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  const [days, setDays] = useState(7);
  const [chart, setChart] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState("");

  /* ================= FETCH ================= */
  // allSettled: one failing widget shouldn't blank the whole dashboard
  const fetchAll = useCallback(
    () =>
      Promise.allSettled([api.get("/admin/stats"), api.get("/admin/latest-orders"), api.get("/admin/recent-users")]).then(
        ([s, orders, users]) => {
          if (s.status === "fulfilled") setStats(s.value.data || {});
          if (orders.status === "fulfilled") setLatestOrders(orders.value.data || []);
          if (users.status === "fulfilled") setRecentUsers(users.value.data || []);
          const err = (r, fb) => (r.status === "rejected" ? errorMessage(r.reason, fb) : "");
          setErrors({
            stats: err(s, "Stats failed to load"),
            orders: err(orders, "Orders failed to load"),
            users: err(users, "Customers failed to load"),
          });
          setLoading(false);
        }
      ),
    []
  );

  const fetchChart = useCallback(
    () =>
      api
        .get("/admin/orders-analytics", { params: { days } })
        .then((res) => {
          setChart(res.data || []);
          setChartError("");
        })
        .catch((err) => setChartError(errorMessage(err, "Chart failed to load")))
        .finally(() => setChartLoading(false)),
    [days]
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  const retryAll = () => {
    setLoading(true);
    fetchAll();
  };

  const changeRange = (d) => {
    if (d === days) return;
    setChartLoading(true);
    setDays(d);
  };

  const chartRows = chart.map((d) => ({ ...d, label: d.date, tooltipLabel: formatDate(d.day, { weekday: "short", day: "numeric", month: "short" }) }));
  const rangeOrders = chart.reduce((n, d) => n + (d.orders || 0), 0);
  const rangeRevenue = chart.reduce((n, d) => n + (d.revenue || 0), 0);

  const pa = stats?.pendingActions || {};
  const attention = [
    { label: "Orders to ship", value: pa.ordersToShip, to: "/orders", icon: Truck, perm: "orders", tone: "text-brand-600 bg-brand-50" },
    { label: "Return requests", value: pa.returnRequests, to: "/returns", icon: Undo2, perm: "orders", tone: "text-amber-600 bg-amber-50" },
    { label: "Refunds pending", value: pa.refundsPending, to: "/returns", icon: Wallet, perm: "orders", tone: "text-rose-600 bg-rose-50" },
    { label: "Reviews to moderate", value: pa.reviewsPending, to: "/reviews", icon: Star, perm: "reviews", tone: "text-amber-600 bg-amber-50" },
    { label: "Open support tickets", value: pa.openTickets, to: "/support", icon: LifeBuoy, perm: "support", tone: "text-sky-600 bg-sky-50" },
    { label: "Low stock products", value: stats?.lowStock, to: "/inventory?filter=low", icon: AlertTriangle, perm: "inventory", tone: "text-amber-600 bg-amber-50" },
    { label: "Out of stock", value: stats?.outOfStock, to: "/inventory?filter=out", icon: PackageX, perm: "inventory", tone: "text-rose-600 bg-rose-50" },
  ].filter((a) => can(a.perm));
  const attentionCount = attention.reduce((n, a) => n + (a.value || 0), 0);

  const orderColumns = [
    {
      key: "id",
      header: "Order",
      mobile: "title",
      render: (o) => {
        const label = o.orderNumber || `#${shortId(o._id)}`;
        return (
          <div>
            {can("orders") ? (
              <Link to={`/orders/${o._id}`} className="font-semibold text-ink-900 hover:text-brand-700 hover:underline">
                {label}
              </Link>
            ) : (
              <p className="font-semibold text-ink-900">{label}</p>
            )}
            <p className="text-xs text-ink-500">{formatDate(o.createdAt)}</p>
          </div>
        );
      },
    },
    {
      key: "customer",
      header: "Customer",
      render: (o) =>
        o.user?.name ? (
          o.user.name
        ) : o.guest?.name ? (
          <span>
            {o.guest.name} <span className="text-xs text-ink-400">(guest)</span>
          </span>
        ) : (
          <span className="text-ink-400">Deleted user</span>
        ),
    },
    { key: "items", header: "Items", render: (o) => o.items?.reduce((n, i) => n + (i.quantity || 1), 0) || 0 },
    {
      key: "status",
      header: "Status",
      render: (o) => <span className={`badge ${BADGE[o.orderStatus] || "badge-neutral"}`}>{titleCase(o.orderStatus)}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (o) => <span className="font-semibold text-ink-900 tabular-nums">{formatPrice(o.totalAmount)}</span>,
    },
  ];

  const quick = QUICK.filter((q) => can(q.perm));

  return (
    <div className="space-y-6">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting()}
            {admin?.name ? `, ${admin.name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="mt-1 text-sm text-ink-500">Here's what's happening with your store today.</p>
        </div>
        <p className="text-sm text-ink-500">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {errors.stats && !stats ? (
        <div className="card">
          <ErrorState message={errors.stats} onRetry={retryAll} />
        </div>
      ) : (
        <>
          {/* ================= REVENUE ================= */}
          <section className="card overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <IndianRupee className="size-4" />
                </span>
                <h2 className="font-semibold text-ink-900">Revenue</h2>
              </div>
              <p className="text-xs text-ink-500">Paid online orders + COD, excluding cancelled & returned</p>
            </header>
            <div className="grid grid-cols-2 gap-px bg-ink-100 sm:grid-cols-3 lg:grid-cols-6">
              {REVENUE_CARDS.map((r) => (
                <div key={r.key} className="min-w-0 bg-white p-4 sm:p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{r.label}</p>
                  {loading ? (
                    <div className="skeleton mt-2 h-7 w-20" />
                  ) : (
                    <p className="mt-1.5 truncate text-xl font-bold tracking-tight text-ink-900 tabular-nums">
                      {formatPrice(stats?.revenue?.[r.key])}
                    </p>
                  )}
                  {r.key === "today" && !loading && (
                    <p className="mt-0.5 text-xs text-ink-500">
                      {stats?.todayOrders || 0} order{stats?.todayOrders === 1 ? "" : "s"}
                    </p>
                  )}
                  {r.key === "total" && !loading && (
                    <p className="mt-0.5 text-xs text-ink-500">
                      {stats?.salesCount || 0} sale{stats?.salesCount === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              ))}
              <div className="min-w-0 bg-brand-50 p-4 sm:p-5">
                <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-brand-700">
                  <Receipt className="size-3.5" /> Avg. order value
                </p>
                {loading ? (
                  <div className="skeleton mt-2 h-7 w-20" />
                ) : (
                  <p className="mt-1.5 truncate text-xl font-bold tracking-tight text-ink-900 tabular-nums">
                    {formatPrice(stats?.averageOrderValue)}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ================= COUNTS ================= */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {STAT_CARDS.map((c) => (
              <StatCard key={c.field} {...c} value={stats?.[c.field]} loading={loading} />
            ))}
          </div>
        </>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        {/* ================= CHART ================= */}
        <Card
          className="min-w-0 xl:col-span-2"
          title="Revenue & orders"
          description={
            chartLoading
              ? `Last ${days} days`
              : `Last ${days} days · ${formatPrice(rangeRevenue)} from ${rangeOrders} order${rangeOrders === 1 ? "" : "s"}`
          }
          actions={
            <div className="inline-flex rounded-lg bg-ink-100 p-0.5" role="group" aria-label="Chart range">
              {RANGES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => changeRange(d)}
                  aria-pressed={days === d}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    days === d ? "bg-white text-ink-900 shadow-soft" : "text-ink-500 hover:text-ink-800"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          }
        >
          <div className="h-64 sm:h-72">
            {chartLoading ? (
              <div className="skeleton size-full" />
            ) : chartError ? (
              <ErrorState
                message={chartError}
                onRetry={() => {
                  setChartLoading(true);
                  fetchChart();
                }}
              />
            ) : (
              <RevenueChart data={chartRows} id="dash" />
            )}
          </div>
        </Card>

        {/* ================= NEEDS ATTENTION ================= */}
        <Card
          title="Needs attention"
          bodyClassName="p-2"
          actions={!loading && attention.length > 0 && <span className={`badge ${attentionCount ? "badge-warning" : "badge-success"}`}>{attentionCount}</span>}
        >
          {loading ? (
            <SkeletonList n={5} h="h-11" />
          ) : errors.stats ? (
            <ErrorState message={errors.stats} onRetry={retryAll} />
          ) : attention.length === 0 ? (
            <EmptyState compact icon={CheckCircle2} title="Nothing for your role here" />
          ) : (
            <ul>
              {attention.map(({ label, value, to, icon: Icon, tone }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-ink-50"
                  >
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${value ? tone : "bg-ink-50 text-ink-400"}`}>
                      <Icon className="size-4" />
                    </span>
                    <span className={`flex-1 text-sm ${value ? "font-medium text-ink-800" : "text-ink-500"}`}>{label}</span>
                    <span className={`badge ${value ? "badge-warning" : "badge-neutral"} tabular-nums`}>{value || 0}</span>
                    <ArrowRight className="size-3.5 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* ================= LATEST ORDERS ================= */}
        <Card
          className="min-w-0 xl:col-span-2"
          title="Latest orders"
          bodyClassName=""
          actions={
            can("orders") && (
              <Link to="/orders" className="btn btn-ghost btn-sm text-brand-600">
                View all <ArrowRight className="size-3.5" />
              </Link>
            )
          }
        >
          {errors.orders ? (
            <ErrorState message={errors.orders} onRetry={retryAll} />
          ) : (
            <DataTable
              columns={orderColumns}
              rows={latestOrders}
              loading={loading}
              skeletonRows={5}
              empty={<EmptyState icon={ShoppingCart} title="No orders yet" description="New orders will appear here." />}
            />
          )}
        </Card>

        <div className="space-y-6">
          {/* ================= NEWEST CUSTOMERS ================= */}
          <Card
            title="Newest customers"
            bodyClassName="p-2"
            actions={
              can("customers") && (
                <Link to="/customers" className="btn btn-ghost btn-sm text-brand-600">
                  All <ArrowRight className="size-3.5" />
                </Link>
              )
            }
          >
            {loading ? (
              <SkeletonList />
            ) : errors.users ? (
              <ErrorState message={errors.users} onRetry={retryAll} />
            ) : recentUsers.length === 0 ? (
              <EmptyState compact title="No customers yet" />
            ) : (
              <ul>
                {recentUsers.map((u) => {
                  const body = (
                    <>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-600">
                        {u.name?.charAt(0)?.toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-900">{u.name}</p>
                        <p className="truncate text-xs text-ink-500">{u.email}</p>
                      </div>
                      <span className="text-xs text-ink-400">{formatDate(u.createdAt, { day: "numeric", month: "short" })}</span>
                    </>
                  );
                  return (
                    <li key={u._id}>
                      {can("customers") ? (
                        <Link to={`/customers/${u._id}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-ink-50">
                          {body}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {quick.length > 0 && (
            <Card title="Quick actions" bodyClassName="grid grid-cols-2 gap-2 p-4">
              {quick.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex flex-col items-start gap-2 rounded-xl border border-ink-100 p-3 text-sm font-medium text-ink-700 transition hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-700"
                >
                  <Icon className="size-[18px] text-brand-600" />
                  {label}
                </Link>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
