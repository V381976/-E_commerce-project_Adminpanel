import { useEffect, useState } from "react";
import axios from "axios";
const API = import.meta.env.VITE_API_URL;
export default function Users() {

  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Product_admin",
  });


  /* ================= FETCH ================= */
  const fetchUsers = async () => {
    const res = await axios.get(
      `${API}/users`,
      { withCredentials: true }
    );
    setUsers(res.data || []);
  };

  useEffect(() => {
    fetchUsers();
  }, []);


  /* ================= CREATE ================= */
  const createUser = async (e) => {
    e.preventDefault();

    await axios.post(
      `${API}/users`,
      form,
      { withCredentials: true }
    );

    setShowModal(false);
    setForm({ name: "", email: "", password: "", role: "Product_admin" });

    fetchUsers();
  };


  /* ================= ACTIONS ================= */
  const toggleUser = async (id) => {
    await axios.put(
      `${API}/users/toggle/${id}`,
      {},
      { withCredentials: true }
    );
    fetchUsers();
  };

  const deleteUser = async (id) => {
    await axios.delete(
      `${API}/users/${id}`,
      { withCredentials: true }
    );
    fetchUsers();
  };


  return (
    <div className="space-y-8 text-white">

      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
        <h1 className="text-3xl font-bold tracking-tight">
          👥 Users Management
        </h1>

        <button
          onClick={() => setShowModal(true)}
          className="
            bg-linear-to-r
            from-indigo-600 to-purple-600
            px-5 py-2 rounded-xl
            hover:scale-105 transition
          "
        >
          + Add User
        </button>
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

          <thead className="border-b border-slate-700 text-slate-400">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="text-left">Email</th>
              <th className="text-left">Status</th>
              <th className="text-center w-56">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr
                key={u._id}
                className="border-b border-slate-800 hover:bg-white/5 transition"
              >
                <td className="p-4 font-semibold">{u.name}</td>

                <td>{u.email}</td>

                {/* STATUS */}
                <td>
                  <span
                    className={`
                      px-3 py-1 rounded-full text-xs font-semibold
                      ${
                        u.blocked
                          ? "bg-red-500/20 text-red-400"
                          : "bg-green-500/20 text-green-400"
                      }
                    `}
                  >
                    {u.blocked ? "Blocked" : "Active"}
                  </span>
                </td>

                {/* ACTIONS */}
                <td>
                  <div className="flex justify-center gap-3">

                    <button
                      onClick={() => toggleUser(u._id)}
                      className={`
                        px-4 py-2 rounded-lg text-xs
                        ${
                          u.blocked
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-yellow-500 hover:bg-yellow-600"
                        }
                      `}
                    >
                      {u.blocked ? "Unblock" : "Block"}
                    </button>

                    <button
                      onClick={() => deleteUser(u._id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-xs"
                    >
                      Delete
                    </button>

                  </div>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>


      {/* ================= MODAL ================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">

          <form
            onSubmit={createUser}
            className="
              bg-slate-900
              border border-white/10
              text-white
              p-6 rounded-2xl
              w-[95%] max-w-md
              space-y-4
              shadow-2xl
            "
          >

            <h2 className="text-xl font-semibold">
              Create Admin User
            </h2>

            <input
              placeholder="Name"
              className="bg-slate-800 p-3 rounded-lg w-full outline-none"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />

            <input
              placeholder="Email"
              className="bg-slate-800 p-3 rounded-lg w-full outline-none"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />

            <input
              type="password"
              placeholder="Password"
              className="bg-slate-800 p-3 rounded-lg w-full outline-none"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />

            <select
              className="bg-slate-800 p-3 rounded-lg w-full"
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value })
              }
            >
              <option value="Product_admin">Product Admin</option>
              <option value="Super_Admin">Super Admin</option>
            </select>

            <div className="flex gap-3 pt-2">
              <button className="flex-1 bg-indigo-600 py-2 rounded-lg hover:bg-indigo-700">
                Create
              </button>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-700 py-2 rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
            </div>

          </form>

        </div>
      )}

    </div>
  );
}
