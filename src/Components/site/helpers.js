import api from "../../api";

// GET a CSV endpoint as a blob and save it
export async function downloadCsv(url, params, filename) {
  const res = await api.get(url, { params, responseType: "blob" });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

// server validation errors → { field: "msg" }
export const fieldErrors = (err) => err?.response?.data?.errors || {};

// Date → "YYYY-MM-DD" in local time (for <input type="date">)
export const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const todayInput = () => toDateInput(new Date());

// move item at index i by dir (-1 up, +1 down), returns a new array
export const moveItem = (list, i, dir) => {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

export const labelize = (s = "") => s.replace(/[-_]/g, " ");
