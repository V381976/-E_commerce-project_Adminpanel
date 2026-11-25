import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, LogOut, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";
import { NAV } from "./nav";

const TITLES = Object.fromEntries(NAV.flatMap((s) => s.items).map((i) => [i.to, i.label]));

export default function Topbar({ admin, onMenu }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const logout = async () => {
    try {
      await api.post("/admin-logout");
      toast.success("Signed out");
    } finally {
      navigate("/login");
    }
  };

  const initial = admin?.name?.charAt(0)?.toUpperCase() || "A";

  return (
    <header className="print:hidden sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-ink-100 bg-white/85 px-4 backdrop-blur-lg sm:px-6 lg:px-8">
      <button onClick={onMenu} aria-label="Open sidebar" className="btn btn-ghost btn-icon -ml-2 lg:hidden">
        <Menu className="size-5" />
      </button>

      <div className="min-w-0">
        <p className="hidden text-xs text-ink-400 sm:block">ShopEase / Admin</p>
        <p className="truncate font-semibold text-ink-900">{TITLES[pathname] || TITLES["/" + pathname.split("/")[1]] || "Admin"}</p>
      </div>

      <div ref={ref} className="relative ml-auto">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 transition hover:bg-ink-100"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            {initial}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block max-w-36 truncate text-sm font-semibold text-ink-900">{admin?.name}</span>
            <span className="block text-[11px] text-ink-500">{admin?.role?.replace("_", " ")}</span>
          </span>
          <ChevronDown className={`size-4 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div role="menu" className="absolute right-0 mt-2 w-60 origin-top-right animate-scale-in rounded-xl border border-ink-100 bg-white p-1.5 shadow-lift">
            <div className="border-b border-ink-100 px-3 py-2.5">
              <p className="truncate text-sm font-semibold">{admin?.name}</p>
              <p className="truncate text-xs text-ink-500">{admin?.email}</p>
            </div>
            <button
              role="menuitem"
              onClick={logout}
              className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
