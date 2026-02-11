import { useEffect, useState } from "react";
import axios from "axios";
import CountUp from "react-countup";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

const API = import.meta.env.VITE_API_URL;

export default function Dashboard() {

  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    categories: 0,
    brands: 0,
    orders: 0,
    todaySales: 0,
  });

  const [ordersChart, setOrdersChart] = useState([]);
  const [latestOrders, setLatestOrders] = useState([]);
  const [loading, setLoading] = useState(true);


  /* ================= FETCH ================= */
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [s, chart, orders] = await Promise.all([
          axios.get(`${API}/admin/stats`),
          axios.get(`${API}/admin/orders-analytics`),
          axios.get(`${API}/admin/latest-orders`),
        ]);

        setStats(s.data);
        setOrdersChart(chart.data);
        setLatestOrders(orders.data);

      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);


  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-slate-400">
        Loading Dashboard...
      </div>
    );
  }


  return (
    <div className="w-full text-white space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-10">

      {/* ================= HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Admin Dashboard
        </h1>

        <span className="text-sm text-slate-400">
          Welcome back 👋
        </span>
      </div>



      {/* ================= STATS ================= */}
      <div className="
        grid
        grid-cols-1
        sm:grid-cols-2
        md:grid-cols-3
        lg:grid-cols-4
        xl:grid-cols-6
        gap-4
      ">

        <StatCard title="Users" value={stats.users} icon="👤" />
        <StatCard title="Products" value={stats.products} icon="📦" />
        <StatCard title="Categories" value={stats.categories} icon="🗂" />
        <StatCard title="Brands" value={stats.brands} icon="🏷" />
        <StatCard title="Orders" value={stats.orders} icon="🧾" />
        <StatCard title="Today Sales ₹" value={stats.todaySales} icon="💰" />

      </div>



      {/* ================= CHART ================= */}
      <div className="
        bg-slate-900/70
        backdrop-blur-lg
        border border-white/10
        rounded-2xl
        p-4 sm:p-6
      ">

        <h2 className="mb-4 font-semibold">
          Weekly Orders Analytics
        </h2>

        {/* mobile small height */}
        <div className="h-55 sm:h-75 lg:h-85 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ordersChart}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />

              <Line
                type="monotone"
                dataKey="orders"
                stroke="#818cf8"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>



      {/* ================= TABLE ================= */}
      <div className="
        bg-slate-900/70
        backdrop-blur-lg
        border border-white/10
        rounded-2xl
        p-4 sm:p-6
      ">

        <h2 className="mb-4 font-semibold">
          Latest Orders
        </h2>

        {/* horizontal scroll on mobile */}
        <div className="overflow-x-auto">

          <table className="min-w-125 w-full text-sm">

            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-400">
                <th className="p-3">Order ID</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Amount</th>
              </tr>
            </thead>

            <tbody>
              {latestOrders.map(o => (
                <tr
                  key={o._id}
                  className="border-b border-slate-800 hover:bg-white/5"
                >
                  <td className="p-3 font-medium">#{o._id.slice(-5)}</td>
                  <td className="p-3">{o.user?.name}</td>
                  <td className="p-3 text-green-400 font-semibold">
                    ₹ {(o.totalAmount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </div>

    </div>
  );
}



/* ================= CARD ================= */
function StatCard({ title, value, icon }) {
  return (
    <div className="
      bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600
      p-4 sm:p-5
      rounded-2xl
      shadow-lg
      hover:-translate-y-1
      transition
    ">
      <div className="flex justify-between items-center">

        <div>
          <p className="text-xs opacity-80">{title}</p>
          <h2 className="text-xl sm:text-2xl font-bold">
            <CountUp end={value || 0} duration={1.2} separator="," />
          </h2>
        </div>

        <span className="text-2xl">{icon}</span>

      </div>
    </div>
  );
}
