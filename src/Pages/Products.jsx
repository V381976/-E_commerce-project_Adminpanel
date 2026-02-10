import { useEffect, useState } from "react";
import axios from "axios";
const API = import.meta.env.VITE_API_URL;
export default function Products() {

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const limit = 6;


  /* ================= FETCH ================= */
  const fetchProducts = async () => {
    try {
      const res = await axios.get(
        `${API}/list?page=${page}&limit=${limit}&keyword=${search}`,
        { withCredentials: true }
      );

      setProducts(res.data.products || []);
      setPages(res.data.pages || 1);

    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search]);


  /* ================= DELETE ================= */
  const deleteProduct = async (id) => {
    await axios.delete(
      `${API}/product/${id}`,
      { withCredentials: true }
    );

    fetchProducts();
  };


  return (
    <div className="space-y-8 text-white">

      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">

        <h1 className="text-3xl font-bold tracking-tight">
          📦 Products Management
        </h1>

        <input
          type="text"
          placeholder="Search product..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="
            bg-slate-800
            border border-white/10
            px-4 py-2
            rounded-xl
            w-full md:w-72
            outline-none
            focus:ring-2 focus:ring-indigo-500
          "
        />
      </div>


      {/* ================= TABLE ================= */}
      <div
        className="
          bg-slate-900/70
          backdrop-blur-lg
          border border-white/10
          rounded-2xl
          shadow-xl
          overflow-x-auto
        "
      >

        <table className="w-full text-sm text-slate-200">

          {/* HEADER */}
          <thead className="border-b border-slate-700 text-slate-400 sticky top-0 bg-slate-900">
            <tr>
              <th className="p-4">Image</th>
              <th>Title</th>
              <th>Price</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Action</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {products.map((p) => (
              <tr
                key={p._id}
                className="border-b border-slate-800 hover:bg-white/5 transition text-center"
              >
                <td className="p-3">
                  <img
                    src={`http://localhost:5000/${p.thumbnail}`}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover mx-auto border border-slate-700"
                  />
                </td>

                <td className="font-semibold">{p.title}</td>

                <td className="text-indigo-400 font-semibold">
                  ₹ {p.price}
                </td>

                <td>{p.category}</td>

                <td>
                  <span
                    className={`
                      px-2 py-1 rounded-lg text-xs
                      ${
                        p.stock > 0
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }
                    `}
                  >
                    {p.stock}
                  </span>
                </td>

                <td>
                  <button
                    onClick={() => deleteProduct(p._id)}
                    className="
                      bg-red-600
                      hover:bg-red-700
                      px-4 py-1
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


      {/* ================= PAGINATION ================= */}
      <div className="flex justify-center items-center gap-4">

        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="
            px-4 py-2
            bg-slate-700
            rounded-lg
            disabled:opacity-40
            hover:bg-slate-600
          "
        >
          Prev
        </button>

        <span className="text-slate-400 font-medium">
          Page {page} / {pages}
        </span>

        <button
          disabled={page === pages}
          onClick={() => setPage(page + 1)}
          className="
            px-4 py-2
            bg-linear-to-r
            from-indigo-600 to-purple-600
            rounded-lg
            disabled:opacity-40
            hover:scale-105 transition
          "
        >
          Next
        </button>

      </div>

    </div>
  );
}
