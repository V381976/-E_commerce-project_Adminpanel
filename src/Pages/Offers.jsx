import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;
axios.defaults.withCredentials = true;

export default function Offers() {

  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    title: "",
    discountPercent: "",
    category: "",
    expiresAt: ""
  });


  /* ================= FETCH ================= */
  const load = async () => {
    try {
      const [offerRes, catRes] = await Promise.all([
        axios.get(`${API}/offers`),
        axios.get(`${API}/categories`)
      ]);

      setOffers(offerRes.data);
      setCategories(catRes.data);

    } catch (err) {
      console.log("Load error:", err.response?.data || err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);


  /* ================= ADD ================= */
  const addOffer = async () => {

    if (!form.title || !form.discountPercent || !form.category)
      return alert("Title, Discount & Category required");

    await axios.post(`${API}/offers`, form);

    setForm({
      title: "",
      discountPercent: "",
      category: "",
      expiresAt: ""
    });

    load();
  };


  /* ================= DELETE ================= */
  const remove = async (id) => {
    await axios.delete(`${API}/offers/${id}`);
    load();
  };


  /* ================= TOGGLE ================= */
  const toggle = async (id) => {
    await axios.put(`${API}/offers/toggle/${id}`);
    load();
  };


  return (
    <div className="p-6 text-white max-w-7xl mx-auto">

      <h1 className="text-3xl font-bold mb-8">🎁 Offers Management</h1>


      {/* ================= FORM ================= */}
      <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl mb-8 grid md:grid-cols-4 gap-4">

        <input
          placeholder="Title"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          className="bg-slate-800 p-3 rounded-lg"
        />

        <input
          type="number"
          placeholder="Discount %"
          value={form.discountPercent}
          onChange={e => setForm({ ...form, discountPercent: e.target.value })}
          className="bg-slate-800 p-3 rounded-lg"
        />

        <select
          value={form.category}
          onChange={e => setForm({ ...form, category: e.target.value })}
          className="bg-slate-800 p-3 rounded-lg"
        >
          <option value="">Category</option>
          {categories.map(c => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>

        <input
          type="date"
          value={form.expiresAt}
          onChange={e => setForm({ ...form, expiresAt: e.target.value })}
          className="bg-slate-800 p-3 rounded-lg"
        />

        <button
          onClick={addOffer}
          className="bg-indigo-600 hover:bg-indigo-700 rounded-lg py-3 font-semibold"
        >
          Add Offer
        </button>
      </div>



      {/* ================= TABLE ================= */}
      <div className="overflow-x-auto bg-white/10 rounded-xl border border-white/20">

        <table className="w-full border-collapse">

          {/* HEADER */}
          <thead className="bg-slate-900 text-gray-300">
            <tr>
              <th className="p-4 border border-white/10">Title</th>
              <th className="border border-white/10">Discount</th>
              <th className="border border-white/10">Category</th>
              <th className="border border-white/10">Status</th>
              <th className="border border-white/10">Expiry</th>
              <th className="border border-white/10">Action</th>
            </tr>
          </thead>


          {/* BODY */}
          <tbody>
            {offers.map(o => {

              const now = new Date();
              const isExpired =
                o.expiresAt && new Date(o.expiresAt) < now;

              return (
                <tr
                  key={o._id}
                  className="text-center border-t border-white/10 hover:bg-white/5 transition"
                >

                  <td className="p-4 border border-white/10 font-medium">
                    {o.title}
                  </td>

                  <td className="border border-white/10">
                    {o.discountPercent}%
                  </td>

                  <td className="border border-white/10">
                    {o.category?.name || "-"}
                  </td>


                  {/* STATUS LOGIC */}
                  <td className="border border-white/10">

                    {isExpired ? (
                      <span className="px-3 py-1 rounded-full text-xs bg-red-600">
                        Expired
                      </span>
                    ) : (
                      <button
                        onClick={() => toggle(o._id)}
                        className={`px-3 py-1 rounded-full text-xs ${
                          o.active
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-gray-500 hover:bg-gray-600"
                        }`}
                      >
                        {o.active ? "Active" : "Off"}
                      </button>
                    )}

                  </td>


                  <td className="border border-white/10">
                    {o.expiresAt
                      ? new Date(o.expiresAt).toLocaleDateString()
                      : "No limit"}
                  </td>


                  <td className="border border-white/10">
                    <button
                      onClick={() => remove(o._id)}
                      className="text-red-400 hover:text-red-600 font-semibold"
                    >
                      Delete
                    </button>
                  </td>

                </tr>
              );
            })}
          </tbody>

        </table>

      </div>

    </div>
  );
}
