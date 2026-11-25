import { Suspense, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { FullPageLoader, Spinner } from "./ui";
import api from "../api";

export default function AdminLayout() {
  // "loading" | "ok" | "denied"
  const [auth, setAuth] = useState("loading");
  const [admin, setAdmin] = useState(null);
  const [sidebar, setSidebar] = useState(false);
  const { pathname } = useLocation();

  /* ================= LOGIN CHECK ================= */
  useEffect(() => {
    api
      .get("/admin/me")
      .then((res) => {
        setAdmin(res.data);
        setAuth("ok");
      })
      .catch(() => setAuth("denied"));
  }, []);

  // close the mobile sidebar after navigating
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setSidebar(false);
  }

  if (auth === "loading") {
    return (
      <div className="flex h-screen items-center justify-center gap-3 bg-ink-50 text-sm text-ink-500">
        <Spinner className="size-5 text-brand-600" /> Checking your session…
      </div>
    );
  }

  if (auth === "denied") return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-ink-50 print:block print:bg-white">
      <Sidebar open={sidebar} onClose={() => setSidebar(false)} permissions={admin?.permissions} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar admin={admin} onMenu={() => setSidebar(true)} />

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">
          <Suspense fallback={<FullPageLoader />}>
            <Outlet context={{ admin, can: (perm) => !!admin?.permissions?.includes(perm) }} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
