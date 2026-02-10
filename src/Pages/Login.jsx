import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const API = import.meta.env.VITE_API_URL;
export default function Login() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  /* ================= LOGIN ================= */
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      await axios.post(
        `${API}/admin-login`,
        form,
        { withCredentials: true }
      );

      navigate("/");

    } catch {
      setError("Invalid credentials");

    } finally {
      setLoading(false);
    }
  };


  return (

    /* ================= BACKGROUND ================= */
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">

      {/* Gradient Base */}
      <div className="absolute inset-0 bg-linear-to-r from-indigo-900 via-slate-900 to-purple-900" />

      {/* Glow Blobs (premium effect) */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600 opacity-30 blur-3xl rounded-full" />
      <div className="absolute bottom-0 right-0 w-125 h-125 bg-purple-600 opacity-25 blur-3xl rounded-full" />
      <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-600 opacity-20 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />


      {/* ================= LOGIN CARD ================= */}
      <form
        onSubmit={handleLogin}
        className="
          relative z-10
          w-full max-w-sm
          bg-slate-900/70
          backdrop-blur-xl
          border border-white/10
          rounded-2xl
          shadow-2xl
          p-8
          space-y-6
          text-white
        "
      >

        {/* TITLE */}
        <h2
          className="
            text-2xl font-bold text-center
            bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400
            bg-clip-text text-transparent
          "
        >
          Admin Login
        </h2>


        {/* ERROR */}
        {error && (
          <div className="bg-red-500/20 text-red-400 text-sm p-2 rounded-lg text-center">
            {error}
          </div>
        )}


        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email"
          required
          className="
            w-full
            bg-slate-800
            border border-white/10
            rounded-xl
            px-4 py-2
            outline-none
            focus:ring-2 focus:ring-indigo-500
          "
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
        />


        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Password"
          required
          className="
            w-full
            bg-slate-800
            border border-white/10
            rounded-xl
            px-4 py-2
            outline-none
            focus:ring-2 focus:ring-indigo-500
          "
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />


        {/* BUTTON */}
        <button
          disabled={loading}
          className="
            w-full
            bg-linear-to-r
            from-indigo-600 via-purple-600 to-pink-600
            py-2
            rounded-xl
            font-semibold
            hover:scale-105
            transition
            disabled:opacity-50
          "
        >
          {loading ? "Logging in..." : "Login"}
        </button>

      </form>
    </div>
  );
}
