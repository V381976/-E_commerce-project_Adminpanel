import { useEffect, useState } from "react";
import axios from "axios";
const API = import.meta.env.VITE_API_URL;
/* ✅ GLOBAL FIX FOR 401 */
axios.defaults.withCredentials = true;

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [form, setForm] = useState({
    title: "",
    discountPercent: "",
    category: "",
    brand: ""
  });

  /* ================= FETCH ================= */
  const load = async () => {
    try {
      const [offerRes, catRes, brandRes] = await Promise.all([
        axios.get(`${API}/offers`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/brands`)
      ]);

      setOffers(offerRes.data);
      setCategories(catRes.data);
      setBrands(brandRes.data);

    } catch (err) {
      console.log("Load error:", err.response?.data || err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ================= ADD OFFER ================= */
  const addOffer = async () => {
    try {
      await axios.post(`${API}/offers`, form);

      setForm({
        title: "",
        discountPercent: "",
        category: "",
        brand: "",
        expiresAt:"" ,
      });

      load();
    } catch (err) {
      console.log("Add error:", err.response?.data || err.message);
    }
  };

  /* ================= DELETE ================= */
  const remove = async (id) => {
    try {
      await axios.delete(`${API}/offers/${id}`);
      load();
    } catch (err) {
      console.log("Delete error:", err.response?.data || err.message);
    }
  };

  /* ================= TOGGLE ================= */
  const toggle = async (id) => {
    try {
      await axios.put(`${API}/offers/toggle/${id}`);
      load();
    } catch (err) {
      console.log("Toggle error:", err.response?.data || err.message);
    }
  };

 return (
  <div className="p-10 text-white">

    <h1 className="text-3xl font-bold mb-8">
      🎁 Offers Management
    </h1>


    {/* ================= ADD FORM ================= */}
    <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl shadow-xl mb-10 border border-white/10">

      <div className="grid grid-cols-6 gap-4">

        <input
          placeholder="Title"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          className="bg-slate-800 text-white p-3 rounded-lg outline-none"
        />

        <input
          placeholder="Discount %"
          type="number"
          value={form.discountPercent}
          onChange={e => setForm({ ...form, discountPercent: e.target.value })}
          className="bg-slate-800 text-white p-3 rounded-lg outline-none"
        />

        <select
          value={form.category}
          onChange={e => setForm({ ...form, category: e.target.value })}
          className="bg-slate-800 text-white p-3 rounded-lg"
        >
          <option value="">Category</option>
          {categories.map(c => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>

        <select
          value={form.brand}
          onChange={e => setForm({ ...form, brand: e.target.value })}
          className="bg-slate-800 text-white p-3 rounded-lg"
        >
          <option value="">Brand</option>
          {brands.map(b => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>

        <input
          type="date"
          value={form.expiresAt}
          onChange={e => setForm({ ...form, expiresAt: e.target.value })}
          className="bg-slate-800 text-white p-3 rounded-lg"
        />

        <button
          onClick={addOffer}
          className="bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold"
        >
          Add Offer
        </button>
      </div>
    </div>



    {/* ================= TABLE ================= */}
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden border border-white/10">

      <table className="w-full">

        <thead className="bg-slate-900 text-gray-300 text-sm">
          <tr>
            <th className="p-4 text-left">Title</th>
            <th>Discount</th>
            <th>Category</th>
            <th>Brand</th>
            <th>Status</th>
            <th>Expiry</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {offers.map(o => (
            <tr
              key={o._id}
              className="border-t border-white/10 hover:bg-white/5 transition"
            >
              <td className="p-4">{o.title}</td>
              <td>{o.discountPercent}%</td>
              <td>{o.category?.name || "-"}</td>
              <td>{o.brand?.name || "-"}</td>

              {/* Status */}
              <td>
                <button
                  onClick={() => toggle(o._id)}
                  className={`px-3 py-1 rounded-full text-xs ${
                    o.active
                      ? "bg-green-600"
                      : "bg-gray-500"
                  }`}
                >
                  {o.active ? "Active" : "Off"}
                </button>
              </td>

              {/* Expiry */}
              <td>
                {o.expiresAt
                  ? new Date(o.expiresAt).toLocaleDateString()
                  : "No limit"}
              </td>

              {/* Delete */}
              <td>
                <button
                  onClick={() => remove(o._id)}
                  className="text-red-400 hover:text-red-600 font-semibold"
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
