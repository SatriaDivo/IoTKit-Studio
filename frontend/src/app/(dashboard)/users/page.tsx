"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  KeyRound,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  FolderKanban,
  Check,
  Copy,
  Eye,
  EyeOff,
  AlertCircle,
  Lock,
  UserCheck,
  Calendar,
  Layers,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { User } from "@/types";

interface ManagedUser extends User {
  projectCount: number;
}

export default function UsersManagementPage() {
  const currentUser = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "operator">("all");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<"operator" | "admin">("operator");
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"operator" | "admin">("operator");
  const [updating, setUpdating] = useState(false);

  // Reset Password Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Delete Confirm Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users");
      setUsers(res.data || []);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to load user records";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchUsers();
    }
  }, [currentUser]);

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole =
        roleFilter === "all" ? true : (u.role || "operator") === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === "admin").length;
    const operators = users.filter((u) => u.role !== "admin").length;
    const totalProjects = users.reduce((acc, u) => acc + (u.projectCount || 0), 0);
    return { total, admins, operators, totalProjects };
  }, [users]);

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    if (createPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setCreating(true);
      const payload = {
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
      };
      await api.post("/users", payload);
      toast.success(`Account ${createEmail} successfully created`);
      setShowCreateModal(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("operator");
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to create user";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (user: ManagedUser) => {
    setEditingUser(user);
    setEditName(user.name || "");
    setEditEmail(user.email);
    setEditRole((user.role as "admin" | "operator") || "operator");
    setShowEditModal(true);
  };

  // Handle Update User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setUpdating(true);
      await api.put(`/users/${editingUser.id}`, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
      });
      toast.success("User profile updated successfully");
      setShowEditModal(false);
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to update user";
      toast.error(msg);
    } finally {
      setUpdating(false);
    }
  };

  // Open Reset Password Modal
  const openResetModal = (user: ManagedUser) => {
    setResetTargetUser(user);
    setNewPassword(generateRandomPassword());
    setShowResetModal(true);
  };

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setResetting(true);
      await api.post(`/users/${resetTargetUser.id}/reset-password`, {
        newPassword,
      });
      toast.success(`Password successfully updated for ${resetTargetUser.email}`);
      setShowResetModal(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to reset password";
      toast.error(msg);
    } finally {
      setResetting(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (user: ManagedUser) => {
    if (user.id === currentUser?.id) {
      toast.error("You cannot delete your own active administrator account");
      return;
    }
    setDeleteTargetUser(user);
    setShowDeleteModal(true);
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;

    try {
      setDeleting(true);
      await api.delete(`/users/${deleteTargetUser.id}`);
      toast.success(`Account ${deleteTargetUser.email} has been deleted`);
      setShowDeleteModal(false);
      setDeleteTargetUser(null);
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to delete user account";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Password copied to clipboard");
  };

  // Restrict access if not admin
  if (currentUser && currentUser.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="p-4 rounded-full bg-rose-50 border border-rose-200 text-rose-600 mb-4">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">Access Restricted</h2>
        <p className="text-sm text-[#64748B] max-w-md mt-2">
          Administrator privileges are required to access and manage system operator credentials and roles.
        </p>
        <span className="mt-4 px-3 py-1 rounded bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
          ROLE_REQUIRED: ADMIN (CURRENT: {(currentUser.role || "OPERATOR").toUpperCase()})
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-slate-900 text-amber-400 border border-slate-800 shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
                  User &amp; Operator Access Matrix
                </h1>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-amber-600" />
                  RBAC_ACTIVE
                </span>
              </div>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                Manage operator accounts, assign security roles, and reset access credentials.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium text-[#475569] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>REFRESH</span>
            </button>
            <button
              onClick={() => {
                setCreateName("");
                setCreateEmail("");
                setCreatePassword(generateRandomPassword());
                setCreateRole("operator");
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] shadow-xs transition-all"
            >
              <UserPlus className="h-3.5 w-3.5 text-amber-400" />
              <span>Provision Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-mono uppercase font-semibold">TOTAL_ACCOUNTS</span>
            <Users className="h-4 w-4 text-[#94A3B8]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#0F172A]">{stats.total}</div>
          <div className="text-[11px] text-[#94A3B8] font-mono mt-1">Registered operators</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-mono uppercase font-semibold">ADMINISTRATORS</span>
            <Shield className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700">{stats.admins}</div>
          <div className="text-[11px] text-[#94A3B8] font-mono mt-1">Full control privilege</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#475569] mb-2">
            <span className="text-xs font-mono uppercase font-semibold">OPERATORS</span>
            <UserCheck className="h-4 w-4 text-[#64748B]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#0F172A]">{stats.operators}</div>
          <div className="text-[11px] text-[#94A3B8] font-mono mt-1">Telemetry execution</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-mono uppercase font-semibold">PROJECTS_BOUND</span>
            <Layers className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">{stats.totalProjects}</div>
          <div className="text-[11px] text-[#94A3B8] font-mono mt-1">Total active nodes</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by name or email address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-[#CBD5E1] rounded text-[#0F172A] focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-mono"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs font-mono text-[#64748B]">ROLE:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="h-8 px-2.5 text-xs font-mono bg-white border border-[#CBD5E1] rounded text-[#0F172A] focus:outline-none focus:border-slate-800"
          >
            <option value="all">ALL ROLES ({users.length})</option>
            <option value="admin">ADMIN ({stats.admins})</option>
            <option value="operator">OPERATOR ({stats.operators})</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-mono uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3 font-semibold">User Details</th>
                <th className="px-4 py-3 font-semibold">Security Role</th>
                <th className="px-4 py-3 font-semibold">IoT Projects</th>
                <th className="px-4 py-3 font-semibold">Created Date</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#94A3B8] font-mono">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#64748B]" />
                    RETRIEVING_SECURITY_DIRECTORY...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#94A3B8] font-mono">
                    <Users className="h-8 w-8 mx-auto mb-2 text-[#CBD5E1]" />
                    NO_OPERATOR_ACCOUNTS_FOUND
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isAdmin = u.role === "admin";
                  const isCurrent = u.id === currentUser?.id;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-[#F8FAFC] transition-colors font-mono"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded flex items-center justify-center font-bold text-xs uppercase border ${
                              isAdmin
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {u.name ? u.name[0] : u.email[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-sans font-semibold text-[#0F172A]">
                              <span>{u.name || "Unnamed Operator"}</span>
                              {isCurrent && (
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  YOU
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#64748B]">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${
                            isAdmin
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {isAdmin ? (
                            <Shield className="h-3 w-3 text-amber-600" />
                          ) : (
                            <UserCheck className="h-3 w-3 text-slate-500" />
                          )}
                          {isAdmin ? "ADMINISTRATOR" : "OPERATOR"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0] text-[11px]">
                          <FolderKanban className="h-3 w-3 text-[#64748B]" />
                          {u.projectCount} nodes
                        </span>
                      </td>

                      <td className="px-4 py-3 text-[11px] text-[#64748B]">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-[#94A3B8]" />
                          {new Date(u.createdAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            title="Edit User Profile"
                            className="p-1.5 rounded text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] border border-transparent hover:border-[#CBD5E1] transition-all"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => openResetModal(u)}
                            title="Reset User Password"
                            className="p-1.5 rounded text-amber-700 hover:text-amber-900 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-all"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => openDeleteModal(u)}
                            disabled={isCurrent}
                            title={isCurrent ? "Cannot delete own account" : "Delete User Account"}
                            className={`p-1.5 rounded border border-transparent transition-all ${
                              isCurrent
                                ? "opacity-30 cursor-not-allowed text-slate-400"
                                : "text-rose-600 hover:text-rose-800 hover:bg-rose-50 hover:border-rose-200"
                            }`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-[#CBD5E1] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-slate-900 text-amber-400">
                  <UserPlus className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">Provision New Account</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] text-xs font-mono font-bold"
              >
                [ESC]
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#475569] font-medium mb-1">
                  FULL NAME / OPERATOR ALIAS
                </label>
                <input
                  type="text"
                  placeholder="e.g. Satria Divo"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded text-[#0F172A] focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#475569] font-medium mb-1">
                  EMAIL ADDRESS <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded text-[#0F172A] focus:outline-none focus:border-slate-900 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-mono text-[#475569] font-medium">
                    PASSWORD <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreatePassword(generateRandomPassword())}
                    className="text-[11px] font-mono text-blue-600 hover:text-blue-800 underline"
                  >
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    required
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="w-full pl-3 pr-16 py-2 text-xs bg-white border border-[#CBD5E1] rounded text-[#0F172A] focus:outline-none focus:border-slate-900 font-mono"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createPassword)}
                      title="Copy Password"
                      className="p-1 text-slate-400 hover:text-slate-700"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                    >
                      {showCreatePassword ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#475569] font-medium mb-1">
                  SYSTEM SECURITY ROLE
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateRole("operator")}
                    className={`p-3 rounded border text-left transition-all ${
                      createRole === "operator"
                        ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                        : "border-[#CBD5E1] hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#0F172A]">
                      <UserCheck className="h-3.5 w-3.5 text-slate-600" />
                      Operator
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Manage own IoT projects &amp; simulation payloads
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateRole("admin")}
                    className={`p-3 rounded border text-left transition-all ${
                      createRole === "admin"
                        ? "border-amber-500 bg-amber-50/50 ring-1 ring-amber-500"
                        : "border-[#CBD5E1] hover:border-amber-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                      <Shield className="h-3.5 w-3.5 text-amber-600" />
                      Administrator
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Full access to operator management &amp; system config
                    </p>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded text-xs font-mono text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creating && <RefreshCw className="h-3 w-3 animate-spin" />}
                  <span>Save &amp; Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-[#CBD5E1] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                  <Pencil className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">Edit Operator Profile</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] text-xs font-mono font-bold"
              >
                [ESC]
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#475569] font-medium mb-1">
                  FULL NAME / OPERATOR ALIAS
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded text-[#0F172A] focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#475569] font-medium mb-1">
                  EMAIL ADDRESS <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded text-[#0F172A] focus:outline-none focus:border-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#475569] font-medium mb-1">
                  SECURITY ROLE
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditRole("operator")}
                    className={`p-3 rounded border text-left transition-all ${
                      editRole === "operator"
                        ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                        : "border-[#CBD5E1] hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#0F172A]">
                      <UserCheck className="h-3.5 w-3.5 text-slate-600" />
                      Operator
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Standard project execution
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditRole("admin")}
                    className={`p-3 rounded border text-left transition-all ${
                      editRole === "admin"
                        ? "border-amber-500 bg-amber-50/50 ring-1 ring-amber-500"
                        : "border-[#CBD5E1] hover:border-amber-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                      <Shield className="h-3.5 w-3.5 text-amber-600" />
                      Administrator
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Full access to user controls
                    </p>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-1.5 rounded text-xs font-mono text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-1.5 rounded text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {updating && <RefreshCw className="h-3 w-3 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-[#CBD5E1] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-amber-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Reset User Password</h3>
                  <p className="text-[11px] font-mono text-[#64748B]">
                    TARGET: {resetTargetUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] text-xs font-mono font-bold"
              >
                [ESC]
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  This will immediately invalidate the operator's current password. Ensure you
                  securely provide them the new credential.
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-mono text-[#475569] font-medium">
                    NEW PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-[11px] font-mono text-blue-600 hover:text-blue-800 underline"
                  >
                    Generate Random
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-16 py-2 text-xs bg-white border border-[#CBD5E1] rounded text-[#0F172A] focus:outline-none focus:border-slate-900 font-mono"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(newPassword)}
                      title="Copy Password"
                      className="p-1 text-slate-400 hover:text-slate-700"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-3.5 py-1.5 rounded text-xs font-mono text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-4 py-1.5 rounded text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {resetting && <RefreshCw className="h-3 w-3 animate-spin" />}
                  <span>Confirm Password Reset</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-rose-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                  <Trash2 className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-rose-900">Confirm Account Deletion</h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] text-xs font-mono font-bold"
              >
                [ESC]
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-[#334155] leading-relaxed">
                Are you sure you want to permanently delete the account for{" "}
                <strong className="text-[#0F172A] font-mono">{deleteTargetUser.email}</strong>?
              </p>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  CASCADE PURGE WARNING
                </div>
                <p className="text-[11px] leading-normal">
                  All associated resources ({deleteTargetUser.projectCount} IoT projects,
                  payload templates, simulation telemetry logs, and AI chats) will be permanently
                  purged from the database.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-3.5 py-1.5 rounded text-xs font-mono text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={deleting}
                  className="px-4 py-1.5 rounded text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {deleting && <RefreshCw className="h-3 w-3 animate-spin" />}
                  <span>Delete Operator Permanently</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
