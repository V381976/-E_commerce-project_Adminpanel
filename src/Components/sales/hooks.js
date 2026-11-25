import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../../api";

/*
  List filters live in the URL so "back" from a detail page keeps them.
  `defaults` must be a module-level constant. Changing any filter resets the page.
*/
export function useQueryState(defaults) {
  const [sp, setSp] = useSearchParams();
  const values = {};
  for (const k of Object.keys(defaults)) values[k] = sp.get(k) ?? defaults[k];

  const update = useCallback(
    (patch) =>
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === "" || v == null || String(v) === String(defaults[k])) next.delete(k);
            else next.set(k, String(v));
          }
          if (!("page" in patch)) next.delete("page");
          return next;
        },
        { replace: true }
      ),
    [setSp, defaults]
  );

  return [values, update];
}

/*
  GET `path?query` whenever `query` (a query string) changes.
  `loading` is derived (last loaded query !== current) so no setState is needed inside effects,
  and stale responses from earlier queries are ignored.
*/
export function useRemote(path, query) {
  const key = `${path}?${query}`;
  const [state, setState] = useState({ key: null, data: null, error: "" });
  const reqId = useRef(0);

  const reload = useCallback(() => {
    const id = ++reqId.current;
    return api
      .get(path, { params: new URLSearchParams(query) })
      .then((res) => id === reqId.current && setState({ key, data: res.data, error: "" }))
      .catch((err) => id === reqId.current && setState((s) => ({ key, data: s.data, error: errorMessage(err, "Couldn't load data") })));
  }, [path, query, key]);

  useEffect(() => {
    reload();
  }, [reload]);

  const retry = () => {
    setState((s) => ({ ...s, key: null }));
    reload();
  };

  const loading = state.key !== key;
  return { data: state.data, loading, error: loading ? "" : state.error, reload, retry };
}

// debounced text input bound to a URL filter
export function useDebouncedFilter(value, onCommit, delay = 300) {
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);
  // URL changed from elsewhere (back button, "clear filters") → follow it
  if (prev !== value) {
    setPrev(value);
    if (value !== text.trim()) setText(value);
  }
  useEffect(() => {
    if (text.trim() === value) return;
    const t = setTimeout(() => onCommit(text.trim()), delay);
    return () => clearTimeout(t);
  }, [text, value, onCommit, delay]);
  return [text, setText];
}
