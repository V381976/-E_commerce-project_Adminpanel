import { Navigate, useOutletContext } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { EmptyState } from "./ui";
import { firstAllowedPath } from "./nav";

// route guard: <RequirePermission perm="orders"><Orders/></RequirePermission>
export default function RequirePermission({ perm, children }) {
  const { admin } = useOutletContext() || {};
  const perms = admin?.permissions || [];
  if (perms.includes(perm)) return children;

  // landing on "/" without dashboard access → first page this role may open
  if (perm === "dashboard") return <Navigate to={firstAllowedPath(perms)} replace />;

  return (
    <div className="card">
      <EmptyState
        icon={ShieldAlert}
        title="You don't have access to this page"
        description="Ask a Super Admin to change your role if you need it."
      />
    </div>
  );
}
