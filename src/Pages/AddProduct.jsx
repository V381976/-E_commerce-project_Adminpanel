import { useState, useEffect } from "react";
import axios from "axios";
const API = import.meta.env.VITE_API_URL;
export default function AddProduct() {

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    stock: "",
    discountPercent: "",
    rating: "",
    category: "",
    brand: ""
  });

  const [thumbnailPreview, setThumbnailPreview] = useState("");


  /* ================= FETCH ================= */
  useEffect(() => {
    axios.get(`${API}/categories`, { withCredentials: true })
      .then(res => setCategories(res.data || []));

    axios.get(`${API}/brands`, { withCredentials: true })
      .then(res => setBrands(res.data || []));
  }, []);


  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleThumbnail = (e) => {
    const file = e.target.files[0];
    if (file) setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post(`${API}/api/add`, form);
    alert("Product Added");
  };


  return (
    <div className="space-y-8 text-white">

      {/* ================= TITLE ================= */}
      <h1 className="text-3xl font-bold tracking-tight">
        ➕ Add New Product
      </h1>


      {/* ================= CARD ================= */}
      <div
        className="
          bg-slate-900/70
          backdrop-blur-lg
          border border-white/10
          rounded-2xl
          shadow-xl
          p-6 lg:p-10
        "
      >

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >

          <Input label="Title" name="title" onChange={handleChange} />
          <Input label="Price" name="price" type="number" onChange={handleChange} />
          <Input label="Stock" name="stock" type="number" onChange={handleChange} />

          <Input label="Discount %" name="discountPercent" onChange={handleChange} />
          <Input label="Rating" name="rating" onChange={handleChange} />


          {/* DESCRIPTION */}
          <div className="lg:col-span-3">
            <TextArea label="Description" name="description" onChange={handleChange} />
          </div>


          {/* DROPDOWNS */}
          <div className="lg:col-span-3 grid md:grid-cols-2 gap-6">

            <Select
              label="Category"
              name="category"
              options={categories}
              onChange={handleChange}
            />

            <Select
              label="Brand"
              name="brand"
              options={brands}
              onChange={handleChange}
            />

          </div>


          {/* THUMBNAIL */}
          <div className="lg:col-span-3">
            <label className="text-sm text-slate-400">Thumbnail</label>

            <input
              type="file"
              onChange={handleThumbnail}
              className="mt-2 block text-sm"
            />

            {thumbnailPreview && (
              <img
                src={thumbnailPreview}
                alt=""
                className="
                  w-28 h-28
                  mt-4
                  rounded-xl
                  object-cover
                  border border-slate-700
                  shadow-lg
                "
              />
            )}
          </div>


          {/* BUTTON */}
          <button
            className="
              lg:col-span-3
              bg-linear-to-r
              from-indigo-600 via-purple-600 to-pink-600
              py-3
              rounded-xl
              font-semibold
              hover:scale-105
              transition
            "
          >
            Save Product
          </button>

        </form>

      </div>

    </div>
  );
}



/* =================================================
   REUSABLE COMPONENTS (Dark Inputs)
================================================= */

const Input = ({ label, ...props }) => (
  <div>
    <label className="text-sm text-slate-400">{label}</label>
    <input
      {...props}
      className="
        w-full
        mt-1
        bg-slate-800
        border border-white/10
        rounded-xl
        px-4 py-2
        outline-none
        focus:ring-2 focus:ring-indigo-500
      "
    />
  </div>
);


const TextArea = ({ label, ...props }) => (
  <div>
    <label className="text-sm text-slate-400">{label}</label>
    <textarea
      {...props}
      rows="4"
      className="
        w-full
        mt-1
        bg-slate-800
        border border-white/10
        rounded-xl
        px-4 py-2
        outline-none
        focus:ring-2 focus:ring-indigo-500
      "
    />
  </div>
);


const Select = ({ label, name, options, onChange }) => (
  <div>
    <label className="text-sm text-slate-400">{label}</label>

    <select
      name={name}
      onChange={onChange}
      className="
        w-full
        mt-1
        bg-slate-800
        border border-white/10
        rounded-xl
        px-4 py-2
        outline-none
        focus:ring-2 focus:ring-indigo-500
      "
    >
      <option value="">Select {label}</option>
      {options.map(o => (
        <option key={o._id}>{o.name}</option>
      ))}
    </select>
  </div>
);
