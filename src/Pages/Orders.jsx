import { useEffect, useState } from "react";
import axios from "axios";
const API = import.meta.env.VITE_API_URL;
export default function Orders() {

  const [orders, setOrders] = useState([]);

  /* ================= FETCH ================= */
  const fetchOrders = async () => {
    const res = await axios.get(
      `${API}/orders`,
      { withCredentials: true }
    );
    setOrders(res.data || []);
  };

  useEffect(() => {
    fetchOrders();
  }, []);


  /* ================= STATUS ================= */
  const changeStatus = async (id, status) => {
    await axios.put(
      `${API}/orders/status/${id}`,
      { status },
      { withCredentials: true }
    );
    fetchOrders();
  };


  /* ================= DELETE ================= */
  const deleteOrder = async (id) => {
    await axios.delete(
      `${API}/orders/${id}`,
      { withCredentials: true }
    );
    fetchOrders();
  };


 
  const statusColor = (status) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-500/20 text-green-400";
      case "SHIPPED":
        return "bg-blue-500/20 text-blue-400";
      case "CANCELLED":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-yellow-500/20 text-yellow-400";
    }
  };

  const paymentColor = (status) =>
    status === "PAID"
      ? "bg-green-500/20 text-green-400"
      : "bg-red-500/20 text-red-400";


  return (
    <div className="space-y-8 text-white">

      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          📦 Orders Management
        </h1>

        <span className="text-slate-400 text-sm">
          Total Orders: {orders.length}
        </span>
      </div>


      {/* ================= TABLE CARD ================= */}
      <div
        className="
          bg-slate-900/70
          backdrop-blur-xl
          border border-white/10
          rounded-2xl
          shadow-xl
          overflow-x-auto
        "
      >

        <table className="w-full text-sm text-slate-200">

          {/* ================= HEADER ================= */}
          <thead className="border-b border-slate-700 text-slate-400 bg-slate-900 sticky top-0">
            <tr>
              <th className="p-4 text-left">User</th>
              <th>Items</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th className="w-44">Action</th>
            </tr>
          </thead>


          {/* ================= BODY ================= */}
          <tbody>

            {orders.map((o) => (
              <tr
                key={o._id}
                className="border-b border-slate-800 hover:bg-white/5 transition text-center"
              >

                {/* USER */}
                <td className="p-4 text-left">
                  <p className="font-semibold">{o.user?.name}</p>
                  <p className="text-xs text-slate-500">{o.user?.email}</p>
                </td>

                {/* ITEMS */}
                <td>{o.items.length} items</td>

                {/* AMOUNT */}
                <td className="font-bold text-indigo-400">
                  ₹ {o.totalAmount.toFixed(2)}
                </td>

                {/* PAYMENT */}
                <td>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${paymentColor(o.paymentStatus)}`}
                  >
                    {o.paymentStatus}
                  </span>
                </td>

                {/* STATUS */}
                <td>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor(o.orderStatus)}`}
                  >
                    {o.orderStatus}
                  </span>
                </td>

                {/* ACTIONS */}
                <td className="space-x-2">

                  <select
                    value={o.orderStatus}
                    onChange={(e) =>
                      changeStatus(o._id, e.target.value)
                    }
                    className="
                      bg-slate-800
                      border border-white/10
                      rounded-lg
                      px-2 py-1
                      text-xs
                      outline-none
                    "
                  >
                    <option>PENDING</option>
                    <option>SHIPPED</option>
                    <option>DELIVERED</option>
                    <option>CANCELLED</option>
                  </select>

                  <button
                    onClick={() => deleteOrder(o._id)}
                    className="
                      bg-red-600
                      hover:bg-red-700
                      px-3 py-1
                      rounded-lg
                      text-xs
                    "
                  >
                    Delete
                  </button>

                </td>

              </tr>
            ))}

          </tbody>

        </table>
      </div>

    </div>
  );
}
