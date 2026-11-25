import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, BarChart3, Package, ShieldCheck } from "lucide-react";
import api, { errorMessage } from "../api";
import { Spinner } from "../Components/ui";

const POINTS = [
  { icon: BarChart3, text: "Live sales & order analytics" },
  { icon: Package, text: "Manage catalogue, offers & banners" },
  { icon: ShieldCheck, text: "Secure, role-based access" },
];

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ================= LOGIN ================= */
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return setError("Enter your email and password");

    try {
      setLoading(true);
      setError("");
      await api.post("/admin-login", form);
      navigate("/");
    } catch (err) {
      setError(errorMessage(err, "Invalid credentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      {/* brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-32 -top-32 size-[28rem] rounded-full bg-brand-600/40 blur-3xl" />
        <div className="absolute -bottom-40 right-0 size-[26rem] rounded-full bg-fuchsia-500/15 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-600">
            <svg viewBox="0 0 32 32" className="size-6" aria-hidden>
              <path d="M9 12h14l-1.3 10.6a2 2 0 0 1-2 1.8h-7.4a2 2 0 0 1-2-1.8L9 12Z" fill="#fff" />
              <path d="M12.5 12v-1.2a3.5 3.5 0 0 1 7 0V12" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-lg font-extrabold text-white">
            Shop<span className="text-brand-300">Ease</span> <span className="font-medium text-ink-400">Admin</span>
          </span>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight text-white">
            Everything you need to run your store.
          </h1>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-ink-300">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/5 text-brand-300">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-ink-500">© {new Date().getFullYear()} ShopEase</p>
      </div>

      {/* form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={handleLogin} noValidate className="w-full max-w-sm animate-fade-up">
          <h2 className="text-2xl font-bold tracking-tight text-ink-900">Sign in to admin</h2>
          <p className="mt-1.5 text-sm text-ink-500">Only authorised administrators can access this console.</p>

          {error && (
            <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="admin@shopease.com"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input px-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-400 hover:text-ink-700"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button disabled={loading} className="btn btn-primary btn-lg w-full">
              {loading && <Spinner />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
