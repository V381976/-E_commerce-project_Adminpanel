import { useEffect, useState } from "react";
import axios from "axios";
const API = import.meta.env.VITE_API_URL;
export default function Categories() {

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [cat, setCat] = useState("");
  const [brand, setBrand] = useState("");


  /* ================= FETCH ================= */
  const fetchData = async () => {
    const c = await axios.get(`${API}/categories`, {
      withCredentials: true
    });

    const b = await axios.get(`${API}/brands`, {
      withCredentials: true
    });

    setCategories(c.data || []);
    setBrands(b.data || []);
  };

  useEffect(() => {
    fetchData();
  }, []);


  /* ================= ADD ================= */
  const addCategory = async () => {
    if (!cat) return;

    await axios.post(
      `${API}/categories`,
      { name: cat },
      { withCredentials: true }
    );

    setCat("");
    fetchData();
  };

  const addBrand = async () => {
    if (!brand) return;

    await axios.post(
      `${API}/brands`,
      { name: brand },
      { withCredentials: true }
    );

    setBrand("");
    fetchData();
  };


  /* ================= DELETE ================= */
  const deleteCategory = async (id) => {
    await axios.delete(
      `${API}/categories/${id}`,
      { withCredentials: true }
    );
    fetchData();
  };

  const deleteBrand = async (id) => {
    await axios.delete(
      `${API}/brands/${id}`,
      { withCredentials: true }
    );
    fetchData();
  };


  return (
    <div className="space-y-8 text-white">

      {/* ================= TITLE ================= */}
      <h1 className="text-3xl font-bold tracking-tight">
        🗂 Category & Brand Management
      </h1>


      {/* ================= GRID ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">


        {/* ================= CATEGORY CARD ================= */}
        <Card title="Categories" gradient="from-indigo-500 to-purple-600">

          <AddRow
            value={cat}
            setValue={setCat}
            placeholder="Add category"
            onAdd={addCategory}
          />

          <List
            items={categories}
            onDelete={deleteCategory}
            empty="No categories added"
          />

        </Card>



        {/* ================= BRAND CARD ================= */}
        <Card title="Brands" gradient="from-green-500 to-emerald-600">

          <AddRow
            value={brand}
            setValue={setBrand}
            placeholder="Add brand"
            onAdd={addBrand}
          />

          <List
            items={brands}
            onDelete={deleteBrand}
            empty="No brands added"
          />

        </Card>

      </div>

    </div>
  );
}



/* =================================================
   SMALL REUSABLE COMPONENTS
================================================= */

const Card = ({ title, children, gradient }) => (
  <div
    className="
      bg-slate-900/70
      backdrop-blur-xl
      border border-white/10
      rounded-2xl
      shadow-xl
      overflow-hidden
      p-5
      space-y-4
    "
  >
    <div className={`text-lg font-semibold   bg-linear-to-r ${gradient} bg-clip-text text-transparent`}>
      {title}
    </div>

    {children}
  </div>
);


const AddRow = ({ value, setValue, placeholder, onAdd }) => (
  <div className="flex gap-2">
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      className="
        flex-1
        bg-slate-800
        border border-white/10
        rounded-xl
        px-4 py-2
        outline-none
        focus:ring-2 focus:ring-indigo-500
      "
    />

    <button
      onClick={onAdd}
      className="
        px-4
        bg-linear-to-r
        from-indigo-600 to-purple-600
        rounded-xl
        hover:scale-105
        transition
      "
    >
      Add
    </button>
  </div>
);


const List = ({ items, onDelete, empty }) => (
  <div className="space-y-2 max-h-80 overflow-y-auto">

    {items.length === 0 && (
      <p className="text-slate-500 text-sm">{empty}</p>
    )}

    {items.map((item) => (
      <div
        key={item._id}
        className="
          flex justify-between items-center
          bg-slate-800
          px-4 py-2
          rounded-xl
          hover:bg-slate-700
          transition
        "
      >
        <span>{item.name}</span>

        <button
          onClick={() => onDelete(item._id)}
          className="text-red-400 text-xs hover:text-red-500"
        >
          Delete
        </button>
      </div>
    ))}

  </div>
);
