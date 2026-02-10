import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="sticky top-0  flex h-screen bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">

      {/* Sidebar */}
      <Sidebar />

      {/* Content */}
      <div className="flex-1 flex flex-col">

        <Topbar />

        <main className="p-6 lg:p-10 flex-1 overflow-y-auto">
          <Outlet />
        </main>

      </div>

    </div>
  );
}
