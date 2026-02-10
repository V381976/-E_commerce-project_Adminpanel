import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

export default function Sidebar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const menu = [
    { to: "/", label: "Dashboard", icon: "🏠" },
    { to: "/users", label: "Users", icon: "👤" },
    { to: "/products", label: "Products", icon: "📦" },
    { to: "/add", label: "Add Product", icon: "➕" },
    { to: "/categories", label: "Categories", icon: "🗂" },
    { to: "/orders", label: "Orders", icon: "🧾" },
     { to: "/offers", label: "Offers", icon: "📦" },
      { to: "/banner", label: "Banner", icon: "🎋" },
  ];

  return (
    <>
      {/* mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-indigo-600 text-white p-2 rounded-lg"
      >
        ☰
      </button>

      <aside
        className={`
          fixed lg:static
          z-40
          h-screen
          w-64
          transform
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          transition-transform duration-300

          bg-linear-to-b from-indigo-900 via-purple-900 to-slate-900
          text-white
          shadow-2xl
          p-6
        `}
      >
        <h1 className="text-2xl font-bold mb-10 tracking-wide">
          Admin Panel
        </h1>

        <nav className="flex flex-col gap-3">

          {menu.map(item => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl
                transition
                hover:bg-white/10

                ${
                  location.pathname === item.to
                    ? "bg-white/20"
                    : ""
                }
              `}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}

        </nav>
      </aside>
    </>
  );
}
