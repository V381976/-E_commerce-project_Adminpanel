import { useEffect, useState } from "react";
import axios from "axios";
import CountUp from "react-countup";
const API = import.meta.env.VITE_API_URL;
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

export default function Dashboard() {

  /* ================= STATES ================= */
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
      <div className="h-[60vh] flex items-center justify-center text-slate-400 text-lg">
        Loading Dashboard...
      </div>
    );
  }


  return (
    <div className="space-y-10 text-white">

      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Admin Dashboard
        </h1>

        <span className="text-sm text-slate-400">
          Welcome back 👋
        </span>
      </div>


      {/* ================= STATS ================= */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">

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
        p-6
        shadow-xl
      ">

        <h2 className="font-semibold text-lg mb-6">
          Weekly Orders Analytics
        </h2>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={ordersChart}>

            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />

            <XAxis stroke="#94a3b8" dataKey="date" />
            <YAxis stroke="#94a3b8" />
            <Tooltip />

            <Line
              type="monotone"
              dataKey="orders"
              stroke="#818cf8"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />

          </LineChart>
        </ResponsiveContainer>

      </div>


      {/* ================= TABLE ================= */}
      <div className="
        bg-slate-900/70
        backdrop-blur-lg
        border border-white/10
        rounded-2xl
        p-6
        shadow-xl
      ">

        <h2 className="font-semibold text-lg mb-6">
          Latest Orders
        </h2>

        <div className="overflow-x-auto">

          <table className="w-full text-sm text-slate-200">

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
                  className="border-b border-slate-800 hover:bg-white/5 transition"
                >
                  <td className="p-3 font-medium">
                    #{o._id.slice(-5)}
                  </td>

                  <td className="p-3">
                    {o.user?.name}
                  </td>

                  <td className="p-3 font-semibold text-green-400">
                    ₹  {(o.totalAmount).toFixed(2)}
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



/* =================================================
   REUSABLE CARD
================================================= */
function StatCard({ title, value, icon }) {

  return (
    <div
      className="
        bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600
        text-white
        p-6
        rounded-2xl
        shadow-lg
        hover:shadow-2xl
        hover:-translate-y-1
        transition
      "
    >

      <div className="flex justify-between items-center">

        <div>
          <p className="text-sm opacity-80">{title}</p>

          <h2 className="text-2xl font-bold mt-1">
            <CountUp end={value || 0} duration={1.5} separator="," />
          </h2>
        </div>

        <span className="text-3xl">{icon}</span>

      </div>

    </div>
  );
}
