import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import { NAV } from "./nav";

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-900/40">
        <svg viewBox="0 0 32 32" className="size-5" aria-hidden>
          <path d="M9 12h14l-1.3 10.6a2 2 0 0 1-2 1.8h-7.4a2 2 0 0 1-2-1.8L9 12Z" fill="#fff" />
          <path d="M12.5 12v-1.2a3.5 3.5 0 0 1 7 0V12" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </span>
      <div className="leading-tight">
        <p className="font-extrabold tracking-tight text-white">
          Shop<span className="text-brand-300">Ease</span>
        </p>
        <p className="text-[11px] font-medium text-ink-400">Admin console</p>
      </div>
    </div>
  );
}

export default function Sidebar({ open, onClose, permissions = [] }) {
  const sections = NAV.map((s) => ({ ...s, items: s.items.filter((i) => permissions.includes(i.perm)) })).filter((s) => s.items.length);
  const linkClass = ({ isActive }) =>
    `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? "bg-white/10 text-white" : "text-ink-400 hover:bg-white/5 hover:text-ink-100"
    }`;

  return (
    <>
      {open && <div onClick={onClose} className="fixed inset-0 z-40 animate-fade-in bg-ink-950/60 backdrop-blur-sm lg:hidden" />}

      <aside
        className={`print:hidden fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-ink-950 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Sidebar"
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <Brand />
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="btn btn-icon btn-sm text-ink-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section.group}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-500">{section.group}</p>
              <div className="space-y-0.5">
                {section.items.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} end={to === "/"} onClick={onClose} className={linkClass}>
                    {({ isActive }) => (
                      <>
                        <Icon className={`size-[18px] ${isActive ? "text-brand-300" : "text-ink-500 group-hover:text-ink-300"}`} />
                        {label}
                        {isActive && <span className="ml-auto size-1.5 rounded-full bg-brand-400" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="m-3 rounded-xl border border-white/5 bg-white/[0.03] p-4">
          <p className="text-xs font-semibold text-ink-200">Need help?</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
            Banners show best at 1920×640 px. Changes to website content stay in draft until you publish.
          </p>
        </div>
      </aside>
    </>
  );
}
