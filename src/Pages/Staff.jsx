import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { UserPlus, Trash2, Ban, CheckCircle2, KeyRound, ShieldCheck, Check, Minus } from "lucide-react";
import api, { errorMessage } from "../api";
import { PageHeader, Card, DataTable, EmptyState, ErrorState, Modal, Input, Select, useConfirm } from "../Components/ui";
import { formatDate } from "../lib/format";
import { ROLE_LABELS, PERMISSION_LABELS, formatFull, initials, humanize } from "../Components/sales/constants";

const EMPTY = { name: "", email: "", password: "", role: "" };
const roleLabel = (r) => ROLE_LABELS[r] || humanize(r);

function CreateModal({ open, onClose, roleOptions, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const close = () => {
    setForm(EMPTY);
    setErrors({});
    onClose();
  };

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.name.trim()) found.name = "Name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) found.email = "Enter a valid email";
    if (form.password.length < 8) found.password = "Use at least 8 characters";
    if (!form.role) found.role = "Choose a role";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await api.post("/users", { ...form, name: form.name.trim(), email: form.email.trim().toLowerCase() });
      toast.success(`${form.name.trim()} added as ${roleLabel(form.role)}`);
      close();
      onCreated();
    } catch (err) {
      const msg = errorMessage(err, "Couldn't create staff member");
      // AddUser replies with a plain {msg}; put the obvious ones under their field
      if (/email/i.test(msg)) setErrors({ email: msg });
      else if (/password/i.test(msg)) setErrors({ password: msg });
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add staff member"
      description="They sign in to this admin panel with the email and password you set."
      footer={
        <>
          <button type="button" onClick={close} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" form="staff-create" disabled={saving} className="btn btn-primary">
            {saving ? "Creating…" : "Create account"}
          </button>
        </>
      }
    >
      <form id="staff-create" onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Full name" value={form.name} onChange={set("name")} error={errors.name} required maxLength={100} autoComplete="off" />
        <Input label="Email" type="email" value={form.email} onChange={set("email")} error={errors.email} required autoComplete="off" />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={set("password")}
          error={errors.password}
          hint="At least 8 characters. Share it with them securely."
          required
          autoComplete="new-password"
        />
        <Select
          label="Role"
          value={form.role}
          onChange={set("role")}
          error={errors.role}
          required
          placeholder="Choose a role…"
          options={roleOptions}
        />
      </form>
    </Modal>
  );
}

function PasswordModal({ member, onClose }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters");
    setSaving(true);
    try {
      await api.put(`/admin/staff/${member._id}`, { password });
      toast.success(`Password reset for ${member.name}`);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, "Password reset failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Reset password`}
      description={`${member.name} will be signed out everywhere and must use the new password.`}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" form="staff-password" disabled={saving} className="btn btn-primary">
            {saving ? "Saving…" : "Reset password"}
          </button>
        </>
      }
    >
      <form id="staff-password" onSubmit={submit} noValidate>
        <Input
          label="New password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          error={error}
          hint="At least 8 characters."
          autoComplete="new-password"
          required
        />
      </form>
    </Modal>
  );
}

function PermissionMatrix({ roles }) {
  const roleKeys = Object.keys(roles);
  const perms = [...new Set([...Object.keys(PERMISSION_LABELS), ...roleKeys.flatMap((r) => roles[r])])];
  return (
    <Card title="Role permissions" description="What each role can open and manage. Roles are fixed by the server." bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/70">
              <th scope="col" className="px-4 py-3 pl-6 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                Area
              </th>
              {roleKeys.map((r) => (
                <th key={r} scope="col" className="px-3 py-3 text-center text-xs font-semibold text-ink-700">
                  {roleLabel(r)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {perms.map((p) => (
              <tr key={p}>
                <th scope="row" className="px-4 py-2.5 pl-6 text-left font-medium text-ink-800">
                  {PERMISSION_LABELS[p] || humanize(p)}
                </th>
                {roleKeys.map((r) => {
                  const has = roles[r].includes(p);
                  return (
                    <td key={r} className="px-3 py-2.5 text-center">
                      {has ? (
                        <Check className="mx-auto size-4 text-emerald-600" aria-label="Allowed" />
                      ) : (
                        <Minus className="mx-auto size-4 text-ink-300" aria-label="Not allowed" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function Staff() {
  const { admin } = useOutletContext();
  const confirm = useConfirm();
  const [data, setData] = useState({ staff: [], roles: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(null);
  const [busy, setBusy] = useState(null);

  const fetchStaff = useCallback(
    () =>
      api
        .get("/admin/staff")
        .then((res) => {
          setData({ staff: res.data.staff || [], roles: res.data.roles || {} });
          setError("");
        })
        .catch((err) => setError(errorMessage(err, "Staff load failed")))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const isSelf = (m) => m.email?.toLowerCase() === admin?.email?.toLowerCase();
  const isSuper = admin?.role === "Super_Admin";
  // only a Super Admin may hand out the Super Admin role
  const roleOptions = Object.keys(data.roles)
    .filter((r) => isSuper || r !== "Super_Admin")
    .map((r) => ({ value: r, label: roleLabel(r) }));

  const changeRole = async (m, role) => {
    if (role === m.role) return;
    const ok = await confirm({
      title: `Make ${m.name} ${roleLabel(role)}?`,
      message: `Their access changes to: ${(data.roles[role] || []).map((p) => PERMISSION_LABELS[p] || p).join(", ")}. They'll need to sign in again.`,
      confirmLabel: "Change role",
      tone: "primary",
    });
    if (!ok) return;
    setBusy(m._id);
    try {
      await api.put(`/admin/staff/${m._id}`, { role });
      toast.success(`${m.name} is now ${roleLabel(role)}`);
      await fetchStaff();
    } catch (err) {
      toast.error(errorMessage(err, "Role change failed"));
    } finally {
      setBusy(null);
    }
  };

  const toggleBlock = async (m) => {
    const blocking = !m.blocked;
    const ok = await confirm({
      title: blocking ? `Block ${m.name}?` : `Unblock ${m.name}?`,
      message: blocking ? "They're signed out and can't access the admin panel until unblocked." : "They'll be able to sign in again.",
      confirmLabel: blocking ? "Block" : "Unblock",
      tone: blocking ? undefined : "primary",
    });
    if (!ok) return;
    setBusy(m._id);
    try {
      const res = await api.put(`/users/toggle/${m._id}`);
      toast.success(res.data.blocked ? `${m.name} blocked` : `${m.name} unblocked`);
      await fetchStaff();
    } catch (err) {
      toast.error(errorMessage(err, "Update failed"));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (m) => {
    const ok = await confirm({
      title: `Remove ${m.name}?`,
      message: `${m.email} loses admin access permanently. Their past actions stay in the audit log.`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    setBusy(m._id);
    try {
      await api.delete(`/users/${m._id}`);
      toast.success(`${m.name} removed`);
      await fetchStaff();
    } catch (err) {
      toast.error(errorMessage(err, "Remove failed"));
    } finally {
      setBusy(null);
    }
  };

  const columns = [
    {
      key: "member",
      header: "Staff member",
      mobile: "title",
      render: (m) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
            {initials(m.name)}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-semibold text-ink-900">
              <span className="truncate">{m.name}</span>
              {isSelf(m) && <span className="badge badge-brand shrink-0">You</span>}
            </p>
            <p className="max-w-60 truncate text-xs text-ink-500">{m.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (m) =>
        isSelf(m) || (!isSuper && m.role === "Super_Admin") ? (
          <span className="badge badge-neutral">{roleLabel(m.role)}</span>
        ) : (
          <select
            value={m.role}
            onChange={(e) => changeRole(m, e.target.value)}
            disabled={busy === m._id}
            aria-label={`Role for ${m.name}`}
            className="input h-8 w-44 rounded-lg py-0 pl-2.5 text-xs font-medium"
          >
            {(roleOptions.some((o) => o.value === m.role) ? roleOptions : [{ value: m.role, label: roleLabel(m.role) }, ...roleOptions]).map(
              (o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              )
            )}
          </select>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (m) => <span className={`badge ${m.blocked ? "badge-danger" : "badge-success"}`}>{m.blocked ? "Blocked" : "Active"}</span>,
    },
    {
      key: "login",
      header: "Last login",
      render: (m) => (m.lastLoginAt ? formatFull(m.lastLoginAt) : <span className="text-ink-400">Never</span>),
    },
    { key: "added", header: "Added", render: (m) => formatDate(m.createdAt) },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (m) =>
        isSelf(m) ? (
          <span className="text-xs text-ink-400">Your account</span>
        ) : (
          <div className="flex justify-end gap-1">
            <button onClick={() => setResetting(m)} disabled={busy === m._id} className="btn btn-ghost btn-sm" title="Reset password">
              <KeyRound className="size-4" /> <span className="md:sr-only">Reset password</span>
            </button>
            <button
              onClick={() => toggleBlock(m)}
              disabled={busy === m._id}
              className="btn btn-ghost btn-sm"
              title={m.blocked ? "Unblock" : "Block"}
            >
              {m.blocked ? <CheckCircle2 className="size-4" /> : <Ban className="size-4" />}
              <span className="md:sr-only">{m.blocked ? "Unblock" : "Block"}</span>
            </button>
            <button onClick={() => remove(m)} disabled={busy === m._id} className="btn btn-danger-ghost btn-sm" title="Remove">
              <Trash2 className="size-4" /> <span className="md:sr-only">Remove</span>
            </button>
          </div>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Staff & roles"
        description={loading ? "Loading staff…" : `${data.staff.length} people can sign in to the admin panel`}
        actions={
          <button onClick={() => setCreating(true)} disabled={loading || !!error} className="btn btn-primary">
            <UserPlus className="size-4" /> Add staff
          </button>
        }
      />

      <div className="space-y-6">
        <div className="card overflow-hidden">
          {error ? (
            <ErrorState
              message={error}
              onRetry={() => {
                setLoading(true);
                fetchStaff();
              }}
            />
          ) : (
            <DataTable
              columns={columns}
              rows={data.staff}
              loading={loading}
              empty={<EmptyState icon={ShieldCheck} title="No staff yet" description="Add people who help run the store." />}
            />
          )}
        </div>

        {!loading && !error && Object.keys(data.roles).length > 0 && <PermissionMatrix roles={data.roles} />}
      </div>

      <CreateModal open={creating} onClose={() => setCreating(false)} roleOptions={roleOptions} onCreated={fetchStaff} />
      {resetting && <PasswordModal member={resetting} onClose={() => setResetting(null)} />}
    </div>
  );
}
