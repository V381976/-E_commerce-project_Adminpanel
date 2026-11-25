import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
  AlertTriangle,
  RefreshCw,
  ImagePlus,
  Trash2,
} from "lucide-react";
import { imageUrl } from "../api";

/* =================================================
   PAGE HEADER
================================================= */
export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* =================================================
   CARD
================================================= */
export function Card({ title, description, actions, children, className = "", bodyClassName = "p-5 sm:p-6" }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4 sm:px-6">
          <div className="min-w-0 break-words">
            {title && <h2 className="font-semibold text-ink-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/* =================================================
   STATES
================================================= */
export function EmptyState({ icon: Icon = Inbox, title, description, action, compact = false }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "px-4 py-10" : "px-6 py-16"}`}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-ink-100 text-ink-400">
        <Icon className="size-6" aria-hidden />
      </div>
      <p className="font-semibold text-ink-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Couldn't load data"
      description={message}
      action={
        onRetry && (
          <button onClick={onRetry} className="btn btn-secondary btn-sm">
            <RefreshCw className="size-3.5" /> Retry
          </button>
        )
      }
    />
  );
}

export function Spinner({ className = "" }) {
  return <span className={`spinner ${className}`} role="status" aria-label="Loading" />;
}

export function FullPageLoader({ label = "Loading…" }) {
  return (
    <div className="flex h-[60vh] items-center justify-center gap-3 text-sm text-ink-500">
      <Spinner className="size-5 text-brand-600" /> {label}
    </div>
  );
}

/* =================================================
   SWITCH
================================================= */
export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-emerald-500" : "bg-ink-200"
      }`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/* =================================================
   FORM FIELDS
================================================= */
export function Field({ label, error, hint, required, children, className = "", htmlFor }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function Input({ label, error, hint, required, className, id, ...props }) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={fid}>
      <input id={fid} aria-invalid={!!error} className="input" {...props} />
    </Field>
  );
}

export function TextArea({ label, error, hint, required, className, id, rows = 4, ...props }) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={fid}>
      <textarea id={fid} rows={rows} aria-invalid={!!error} className="input" {...props} />
    </Field>
  );
}

export function Select({ label, error, hint, required, className, id, options, placeholder, ...props }) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={fid}>
      <select id={fid} aria-invalid={!!error} className="input" {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input h-10 pl-9"
      />
    </div>
  );
}

/* =================================================
   IMAGE DROPZONE (object URLs are revoked on change/unmount)
================================================= */
// URLs are created inside the effect so StrictMode's mount→cleanup→mount can't revoke live ones
function useObjectUrls(files) {
  const [state, setState] = useState({ files: null, urls: [] });
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    // syncing with an external resource (blob URLs) — set once per files change
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ files, urls });
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);
  return state.files === files ? state.urls : [];
}

export function ImageDropzone({
  files,
  onChange,
  multiple = false,
  max = 10,
  label = "Upload image",
  hint = "PNG, JPG or WebP",
  error,
  previewClassName = "size-24",
}) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const urls = useObjectUrls(files);

  const accept = (list) => {
    const images = [...list].filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    onChange(multiple ? [...files, ...images].slice(0, max) : [images[0]]);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), inputRef.current?.click())}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          accept(e.dataTransfer.files);
        }}
        aria-invalid={!!error}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition ${
          drag
            ? "border-brand-500 bg-brand-50"
            : error
              ? "border-rose-300 bg-rose-50/50"
              : "border-ink-200 bg-ink-50/50 hover:border-brand-300 hover:bg-brand-50/40"
        }`}
      >
        <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft">
          <ImagePlus className="size-5" />
        </span>
        <p className="text-sm font-medium text-ink-800">
          {label} <span className="text-brand-600">· browse</span>
        </p>
        <p className="mt-1 text-xs text-ink-500">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            accept(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="field-error">{error}</p>}

      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {urls.map((url, i) => (
            <div key={url} className={`group relative overflow-hidden rounded-xl border border-ink-100 bg-white ${previewClassName}`}>
              <img src={url} alt="" className="size-full object-contain p-1" />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                aria-label="Remove image"
                className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-lg bg-white/90 text-rose-600 shadow opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =================================================
   THUMB
================================================= */
export function Thumb({ src, className = "size-11" }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`block shrink-0 overflow-hidden rounded-lg border border-ink-100 bg-ink-50 ${className}`}>
      {src && !failed ? (
        <img
          src={imageUrl(src)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-contain p-0.5"
        />
      ) : null}
    </span>
  );
}

/* =================================================
   DATA TABLE — table on md+, stacked cards on mobile
   column: { key, header, render?, className?, align?, mobile?: false | "title" }
================================================= */
export function DataTable({ columns, rows, rowKey = "_id", loading, empty, skeletonRows = 5 }) {
  const cell = (col, row) => (col.render ? col.render(row) : row[col.key]);
  const alignClass = (a) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");
  const titleCol = columns.find((c) => c.mobile === "title");
  const actionsCol = columns.find((c) => c.key === "actions");

  if (!loading && rows.length === 0) return empty;

  return (
    <>
      {/* desktop */}
      <div className="relative hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/70">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500 first:pl-6 last:pr-6 ${alignClass(c.align)}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {loading
              ? Array.from({ length: skeletonRows }, (_, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-4 first:pl-6 last:pr-6">
                        <div className="skeleton h-4 w-full max-w-32" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => (
                  <tr key={row[rowKey]} className="transition-colors hover:bg-ink-50/60">
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-4 py-3.5 align-middle text-ink-700 first:pl-6 last:pr-6 ${alignClass(c.align)} ${c.className || ""}`}
                      >
                        {cell(c, row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* mobile */}
      <ul className="divide-y divide-ink-100 md:hidden">
        {loading
          ? Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="space-y-2 p-4">
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton h-3 w-1/2" />
              </li>
            ))
          : rows.map((row) => (
              <li key={row[rowKey]} className="space-y-3 p-4">
                {titleCol && <div>{cell(titleCol, row)}</div>}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                  {columns
                    .filter((c) => c !== titleCol && c !== actionsCol && c.mobile !== false)
                    .map((c) => (
                      <div key={c.key} className="min-w-0">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{c.header}</dt>
                        <dd className="mt-0.5 text-ink-700">{cell(c, row)}</dd>
                      </div>
                    ))}
                </dl>
                {actionsCol && <div className="flex flex-wrap gap-2 pt-1">{cell(actionsCol, row)}</div>}
              </li>
            ))}
      </ul>
    </>
  );
}

/* =================================================
   PAGINATION
================================================= */
export function Pagination({ page, pages, total, pageSize, onChange }) {
  if (!total) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // compact page list: 1 … 4 5 6 … 12
  const list = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) list.push(p);
    else if (list[list.length - 1] !== "…") list.push("…");
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-5 py-4 sm:flex-row sm:px-6">
      <p className="text-sm text-ink-500">
        Showing <span className="font-medium text-ink-800">{from}</span>–<span className="font-medium text-ink-800">{to}</span> of{" "}
        <span className="font-medium text-ink-800">{total}</span>
      </p>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="btn btn-secondary btn-sm btn-icon"
        >
          <ChevronLeft className="size-4" />
        </button>
        {list.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1.5 text-sm text-ink-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={`btn btn-sm min-w-8 px-2 ${p === page ? "btn-dark" : "btn-ghost"}`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
          className="btn btn-secondary btn-sm btn-icon"
        >
          <ChevronRight className="size-4" />
        </button>
      </nav>
    </div>
  );
}

/* =================================================
   MODAL
================================================= */
export function Modal({ open, onClose, title, description, children, footer, size = "md" }) {
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };
  const panelRef = useRef(null);
  // callers pass inline handlers; a ref keeps the open/focus effect from re-running on every render
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const prev = document.activeElement;
    panelRef.current?.querySelector("input,select,textarea,button:not([data-close])")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-ink-950/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        className={`relative flex max-h-[92vh] w-full ${widths[size]} animate-scale-in flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
          </div>
          <button data-close type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost btn-icon btn-sm -mr-2">
            <X className="size-4" />
          </button>
        </header>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-ink-100 px-6 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

/* =================================================
   CONFIRM DIALOG — const confirm = useConfirm(); if (await confirm({...})) …
================================================= */
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback(
    (opts) => new Promise((resolve) => setState({ ...opts, resolve })),
    []
  );

  const close = (result) => {
    state?.resolve(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title || "Are you sure?"}
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => close(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => close(true)}
              className={`btn ${state?.tone === "primary" ? "btn-primary" : "btn-danger"}`}
            >
              {state?.confirmLabel || "Delete"}
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-600">{state?.message}</p>
      </Modal>
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useConfirm = () => useContext(ConfirmContext);
