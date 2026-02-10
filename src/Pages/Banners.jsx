import { useEffect, useState } from "react";
import axios from "axios";
const API = import.meta.env.VITE_API_URL;
export default function Banners() {

  const [banners, setBanners] = useState([]);

  const [form, setForm] = useState({
    title: "",
    link: "",
    image: null
  });

  const [preview, setPreview] = useState(null);


  const load = () => {
    axios.get(`${API}/banner`)
      .then(res => setBanners(res.data));
  };

  useEffect(() => { load(); }, []);


  /* ================= ADD ================= */
  const addBanner = async () => {
 try {
    const data = new FormData();
    data.append("title", form.title);
    data.append("link", form.link);
    data.append("image", form.image);

    await axios.post(`${API}/banner`, data);

    setForm({ title: "", link: "", image: null });
    setPreview(null);

    load();
     } catch (err) {
      console.log("Add error:", err.response?.data || err.message);
    }
  };


  const remove = async (id) => {
     try {
      await axios.delete(`${API}/banner/${id}`);
      load();
    } catch (err) {
      console.log("Delete error:", err.response?.data || err.message);
    }
  };


  const toggle = async (id) => {
    try{
    await axios.put(`${API}/banner/${id}`);
    load();
    } catch (err) {
      console.log("Toggle error:", err.response?.data || err.message);
    }
  };


  return (
    <div className="p-10 text-white space-y-10">

      {/* ================= TITLE ================= */}
      <h1 className="text-3xl font-bold tracking-wide">
        Banner Management
      </h1>



      {/* ================= ADD FORM (GLASS) ================= */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 grid md:grid-cols-4 gap-4">

        <input
          placeholder="Banner Title"
          value={form.title}
          onChange={(e)=>setForm({...form,title:e.target.value})}
          className="bg-white/20 text-white border border-white/20 p-3 rounded-xl placeholder-gray-300"
        />

        <input
          placeholder="Redirect Link (/products)"
          value={form.link}
          onChange={(e)=>setForm({...form,link:e.target.value})}
          className="bg-white/20 text-white border border-white/20 p-3 rounded-xl placeholder-gray-300"
        />

        <input
          type="file"
          className="text-sm"
          onChange={(e)=>{
            setForm({...form,image:e.target.files[0]});
            setPreview(URL.createObjectURL(e.target.files[0]));
          }}
        />

        <button
          onClick={addBanner}
          className="bg-linear-to-r from-indigo-500 to-purple-600 rounded-xl py-3 font-semibold hover:scale-105 transition"
        >
          Add Banner
        </button>

        {preview && (
          <img src={preview} className="h-24 rounded-xl col-span-4 mt-3"/>
        )}

      </div>




      {/* ================= TABLE ================= */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden">

        <table className="w-full text-sm">

          <thead className="bg-white/20 text-white">
            <tr>
              <th className="p-4 text-left">Preview</th>
              <th>Title</th>
              <th>Link</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {banners.map(b => (
              <tr key={b._id} className="border-t border-white/10 hover:bg-white/10 transition">

                <td className="p-4">
                  <img
                    src={`${API}/${b.image}`}
                    className="h-14 rounded-xl shadow"
                  />
                </td>

                <td>{b.title}</td>

                <td className="text-indigo-300">{b.link}</td>

                <td>
                  <button
                    onClick={()=>toggle(b._id)}
                    className={`px-3 py-1 rounded-full text-xs ${
                      b.active
                        ? "bg-green-500"
                        : "bg-gray-500"
                    }`}
                  >
                    {b.active ? "Active" : "Off"}
                  </button>
                </td>

                <td>
                  <button
                    onClick={()=>remove(b._id)}
                    className="text-red-400 hover:text-red-600"
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
