import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Star, Check, X, Flag, Trash2, BadgeCheck, ExternalLink, MessageSquare, Filter } from "lucide-react";
import api, { errorMessage } from "../api";
import { PageHeader, Pagination, SearchInput, EmptyState, ErrorState, Thumb, Modal, TextArea, Spinner, useConfirm } from "../Components/ui";
import { StatusTabs } from "../Components/site/shared";
import { STORE_URL } from "../Components/nav";
import { formatDateTime } from "../lib/format";

const LIMIT = 20;

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "flagged", label: "Flagged" },
  { value: "rejected", label: "Rejected" },
  { value: "", label: "All" },
];

const STATUS_BADGE = {
  pending: "badge-warning",
  approved: "badge-success",
  flagged: "badge-sale",
  rejected: "badge-danger",
};

function Stars({ value }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`size-4 ${i <= value ? "fill-amber-400 text-amber-400" : "text-ink-200"}`} />
      ))}
    </span>
  );
}

export default function Reviews() {
  const confirm = useConfirm();
  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({});
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState("");
  const [product, setProduct] = useState(null); // { _id, title }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const requestId = useRef(0);

  const fetchReviews = useCallback(() => {
    const id = ++requestId.current;
    return api
      .get("/admin/reviews", {
        params: {
          page,
          limit: LIMIT,
          status: status || undefined,
          q: search || undefined,
          rating: rating || undefined,
          product: product?._id,
        },
      })
      .then((res) => {
        if (id !== requestId.current) return;
        setReviews(res.data.reviews || []);
        setCounts(res.data.counts || {});
        setMeta({ total: res.data.total || 0, pages: Math.max(res.data.pages || 1, 1) });
        setError("");
      })
      .catch((err) => id === requestId.current && setError(errorMessage(err, "Reviews load failed")))
      .finally(() => id === requestId.current && setLoading(false));
  }, [page, status, search, rating, product]);

  useEffect(() => {
    const t = setTimeout(fetchReviews, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchReviews, search]);

  // every filter change resets to page 1 and shows skeletons
  const change = (setter) => (v) => {
    setLoading(true);
    setPage(1);
    setter(v);
  };
  const onPage = (p) => {
    setLoading(true);
    setPage(p);
  };

  const allCount = Object.values(counts).reduce((s, n) => s + n, 0);

  const moderate = async (r, next, note) => {
    setBusy(r._id);
    try {
      await api.put(`/admin/reviews/${r._id}/status`, { status: next, note });
      toast.success(
        next === "approved" ? "Review published" : next === "rejected" ? "Review rejected" : next === "flagged" ? "Review flagged" : "Moved to pending"
      );
      if (reviews.length === 1 && page > 1 && status && status !== next) onPage(page - 1);
      else fetchReviews();
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Update failed"));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const remove = async (r) => {
    const ok = await confirm({
      title: "Delete review?",
      message: `${r.userName || "This customer"}'s review will be permanently removed and the product rating recalculated.`,
    });
    if (!ok) return;
    setBusy(r._id);
    try {
      await api.delete(`/admin/reviews/${r._id}`);
      toast.success("Review deleted");
      if (reviews.length === 1 && page > 1) onPage(page - 1);
      else fetchReviews();
    } catch (err) {
      toast.error(errorMessage(err, "Delete failed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Customer reviews appear on product pages only after approval. Approving or deleting recalculates the product's rating."
      />

      <div className="card mb-5 flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <StatusTabs tabs={TABS.map((t) => (t.value ? t : { ...t, count: allCount }))} value={status} onChange={change(setStatus)} counts={counts} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={rating}
            onChange={(e) => change(setRating)(e.target.value)}
            aria-label="Filter by rating"
            className="input h-10 sm:w-36"
          >
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n === 1 ? "" : "s"}
              </option>
            ))}
          </select>
          <SearchInput value={search} onChange={change(setSearch)} placeholder="Search text or name…" className="w-full sm:w-64" />
        </div>
      </div>

      {product && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-ink-600">
          <Filter className="size-4" /> Showing reviews for
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1 font-medium text-brand-700">
            {product.title}
            <button
              onClick={() => change(setProduct)(null)}
              aria-label="Clear product filter"
              className="flex size-5 items-center justify-center rounded-full hover:bg-brand-100"
            >
              <X className="size-3" />
            </button>
          </span>
        </div>
      )}

      {error ? (
        <div className="card">
          <ErrorState
            message={error}
            onRetry={() => {
              setLoading(true);
              fetchReviews();
            }}
          />
        </div>
      ) : loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card space-y-3 p-5">
              <div className="flex gap-3">
                <div className="skeleton size-12" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-3 w-1/4" />
                </div>
              </div>
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={MessageSquare}
            title={status === "pending" && !search && !rating && !product ? "All caught up" : "No reviews found"}
            description={
              status === "pending" && !search && !rating && !product
                ? "There are no reviews waiting for moderation."
                : "Try a different status, rating or search."
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-ink-100">
            {reviews.map((r) => (
              <ReviewItem
                key={r._id}
                review={r}
                busy={busy === r._id}
                onModerate={(next) => moderate(r, next)}
                onReject={() => setRejecting(r)}
                onDelete={() => remove(r)}
                onFilterProduct={() => r.product && change(setProduct)({ _id: r.product._id, title: r.product.title })}
              />
            ))}
          </ul>
          <Pagination page={page} pages={meta.pages} total={meta.total} pageSize={LIMIT} onChange={onPage} />
        </div>
      )}

      {rejecting && (
        <RejectModal
          review={rejecting}
          onClose={() => setRejecting(null)}
          onSubmit={async (note) => {
            if (await moderate(rejecting, "rejected", note)) setRejecting(null);
          }}
        />
      )}
    </div>
  );
}

function ReviewItem({ review: r, busy, onModerate, onReject, onDelete, onFilterProduct }) {
  const p = r.product;
  return (
    <li className="p-4 sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row">
        {/* product */}
        <div className="flex min-w-0 items-start gap-3 md:w-60 md:shrink-0">
          <Thumb src={p?.thumbnail} className="size-12" />
          <div className="min-w-0">
            {p ? (
              <>
                <a
                  href={`${STORE_URL}/products/${p.slug || p._id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-brand-700"
                >
                  {p.title} <ExternalLink className="inline size-3 text-ink-400" />
                </a>
                <button onClick={onFilterProduct} className="mt-0.5 text-xs text-brand-600 hover:underline">
                  All reviews for this product
                </button>
              </>
            ) : (
              <p className="text-sm text-ink-400">Product deleted</p>
            )}
          </div>
        </div>

        {/* review */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Stars value={r.rating} />
            <span className={`badge ${STATUS_BADGE[r.status] || "badge-neutral"} capitalize`}>{r.status}</span>
            {r.verified && (
              <span className="badge badge-info">
                <BadgeCheck className="size-3" /> Verified purchase
              </span>
            )}
          </div>
          {r.title && <p className="mt-2 font-semibold text-ink-900">{r.title}</p>}
          {r.comment ? (
            <p className="mt-1 whitespace-pre-line break-words text-sm text-ink-700">{r.comment}</p>
          ) : (
            <p className="mt-1 text-sm italic text-ink-400">No written comment</p>
          )}
          <p className="mt-2 text-xs text-ink-500">
            <span className="font-medium text-ink-700">{r.userName || "Customer"}</span>
            {r.user?.email && <> · {r.user.email}</>} · {formatDateTime(r.createdAt)}
          </p>
          {r.adminNote && (
            <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
              <span className="font-semibold">Note:</span> {r.adminNote}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {r.status !== "approved" && (
              <button onClick={() => onModerate("approved")} disabled={busy} className="btn btn-primary btn-sm">
                {busy ? <Spinner /> : <Check className="size-4" />} Approve
              </button>
            )}
            {r.status !== "rejected" && (
              <button onClick={onReject} disabled={busy} className="btn btn-secondary btn-sm">
                <X className="size-4" /> Reject
              </button>
            )}
            {r.status !== "flagged" && (
              <button onClick={() => onModerate("flagged")} disabled={busy} className="btn btn-ghost btn-sm">
                <Flag className="size-4" /> Flag
              </button>
            )}
            <button onClick={onDelete} disabled={busy} className="btn btn-danger-ghost btn-sm">
              <Trash2 className="size-4" /> Delete
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function RejectModal({ review, onClose, onSubmit }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit(note.trim());
    setSaving(false);
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Reject review?"
      description={`${review.userName || "The customer"} will be notified that the review wasn't published.`}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" form="reject-form" disabled={saving} className="btn btn-danger">
            {saving && <Spinner />} Reject
          </button>
        </>
      }
    >
      <form id="reject-form" onSubmit={submit}>
        <TextArea
          label="Note to customer (optional)"
          rows={3}
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Reviews can't include links or personal details."
          hint="Included in the notification the customer receives."
        />
      </form>
    </Modal>
  );
}
