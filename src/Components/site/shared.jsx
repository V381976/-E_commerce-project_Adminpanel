import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/* small UI pieces shared by the marketing / engagement / storefront pages */

// right-side panel (full screen on phones)
export function Drawer({ open, onClose, title, subtitle, children, footer }) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
      <div className="absolute inset-0 animate-fade-in bg-ink-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl animate-fade-in flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-ink-900">{title}</h2>
            {subtitle && <div className="mt-0.5 text-sm text-ink-500">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost btn-icon btn-sm -mr-2">
            <X className="size-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <footer className="border-t border-ink-100 px-5 py-4 sm:px-6">{footer}</footer>}
      </aside>
    </div>,
    document.body
  );
}

// tab bar with optional counts — horizontally scrollable inside itself on phones
export function StatusTabs({ tabs, value, onChange, counts = {} }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="inline-flex min-w-max gap-1 rounded-xl bg-ink-100/70 p-1" role="tablist">
        {tabs.map((t) => {
          const active = t.value === value;
          const n = t.count ?? counts[t.value];
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.value)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active ? "bg-white text-ink-900 shadow-soft" : "text-ink-500 hover:text-ink-800"
              }`}
            >
              {t.label}
              {n != null && (
                <span
                  className={`rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                    active ? "bg-brand-100 text-brand-700" : "bg-ink-200/70 text-ink-600"
                  }`}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
