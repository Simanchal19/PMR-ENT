"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  KeyRound,
  Edit2,
  Trash2,
  Power,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  Crown,
  BriefcaseBusiness,
  Shield,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Search,
} from "lucide-react";
import { UserRole, EnterpriseUserRecord, AuthUser } from "@/lib/types";
import {
  getEnterpriseUsers,
  createEnterpriseUser,
  updateEnterpriseUser,
  updateUserPassword,
  toggleUserStatus,
  deleteEnterpriseUser,
} from "@/lib/storage";

interface Props {
  role: UserRole;
  currentUser: AuthUser | null;
}

export default function UserManagementSection({ role, currentUser }: Props) {
  const [users, setUsers] = useState<EnterpriseUserRecord[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal States
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<EnterpriseUserRecord | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    role: "manager" as UserRole,
    password: "",
  });

  // Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<EnterpriseUserRecord | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<EnterpriseUserRecord | null>(null);

  const loadUsers = () => {
    setUsers(getEnterpriseUsers());
  };

  useEffect(() => {
    loadUsers();
    window.addEventListener("tpm_users_updated", loadUsers);
    window.addEventListener("tpm_data_updated", loadUsers);
    return () => {
      window.removeEventListener("tpm_users_updated", loadUsers);
      window.removeEventListener("tpm_data_updated", loadUsers);
    };
  }, []);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4500);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4500);
    }
  };

  const actorName = currentUser?.fullName
    ? `${currentUser.fullName} (${role.toUpperCase()})`
    : role === "admin"
    ? "System Administrator (Admin)"
    : "Pramod Maharaj (Owner)";

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      fullName: "",
      username: "",
      email: "",
      role: "manager",
      password: "",
    });
    setShowAddEditModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: EnterpriseUserRecord) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      password: "", // Not modified here
    });
    setShowAddEditModal(true);
  };

  // Submit Add or Edit
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      // Update existing
      const res = updateEnterpriseUser(
        editingUser.id,
        {
          fullName: formData.fullName,
          username: formData.username,
          email: formData.email,
          role: formData.role,
        },
        actorName
      );
      if (!res.success) {
        showNotification(res.error || "Failed to update user.", true);
        return;
      }
      showNotification(`User @${formData.username} profile updated successfully!`);
    } else {
      // Create new
      const res = createEnterpriseUser(
        {
          fullName: formData.fullName,
          username: formData.username,
          email: formData.email,
          role: formData.role,
          password: formData.password || "Password@123",
        },
        actorName
      );
      if (!res.success) {
        showNotification(res.error || "Failed to create user.", true);
        return;
      }
      showNotification(`New user @${formData.username} created successfully!`);
    }
    setShowAddEditModal(false);
    loadUsers();
  };

  // Open Password Modal
  const handleOpenPassword = (user: EnterpriseUserRecord) => {
    setPasswordTargetUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordText(false);
    setShowPasswordModal(true);
  };

  // Submit Password Change
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser) return;
    if (newPassword !== confirmPassword) {
      showNotification("New password and confirmation do not match.", true);
      return;
    }
    const res = updateUserPassword(passwordTargetUser.id, newPassword, actorName);
    if (!res.success) {
      showNotification(res.error || "Failed to update password.", true);
      return;
    }
    showNotification(`Password for @${passwordTargetUser.username} updated successfully!`);
    setShowPasswordModal(false);
    loadUsers();
  };

  // Toggle Account Active / Inactive
  const handleToggleStatus = (user: EnterpriseUserRecord) => {
    const nextStatus = !user.isActive;
    const res = toggleUserStatus(user.id, nextStatus, actorName);
    if (!res.success) {
      showNotification(res.error || "Cannot change account status.", true);
      return;
    }
    showNotification(`Account @${user.username} is now ${nextStatus ? "Active" : "Deactivated"}.`);
    loadUsers();
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deleteTargetUser) return;
    const res = deleteEnterpriseUser(deleteTargetUser.id, actorName);
    if (!res.success) {
      showNotification(res.error || "Failed to delete account.", true);
      return;
    }
    showNotification(`Account @${deleteTargetUser.username} deleted permanently.`);
    setShowDeleteModal(false);
    loadUsers();
  };

  const isAdminOrOwner = role === "admin" || role === "owner";

  // Role Counts
  const adminCount = users.filter((u) => u.role === "admin").length;
  const managerCount = users.filter((u) => u.role === "manager").length;
  const ownerCount = users.filter((u) => u.role === "owner").length;

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200 font-bold shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">
                User Accounts &amp; Login Management
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                Admin Control Desk
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage system credentials, portal logins, passwords and access permissions
            </p>
          </div>
        </div>

        {isAdminOrOwner && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add New Login</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="font-bold">
            ✕
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/40 border-b border-slate-100 text-xs">
        <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Total Logins</div>
            <div className="font-black text-slate-900 text-sm">{users.length}</div>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-purple-600 font-bold uppercase">Admins</div>
            <div className="font-black text-slate-900 text-sm">{adminCount}</div>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Crown className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-amber-600 font-bold uppercase">Owners</div>
            <div className="font-black text-slate-900 text-sm">{ownerCount}</div>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <BriefcaseBusiness className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-emerald-600 font-bold uppercase">Managers</div>
            <div className="font-black text-slate-900 text-sm">{managerCount}</div>
          </div>
        </div>
      </div>

      {/* Quick Filter Toolbar */}
      <div className="px-4 py-3 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search staff name, @username, or email..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "ALL" | UserRole)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="ALL">All Roles ({users.length})</option>
            <option value="admin">Admin ({adminCount})</option>
            <option value="owner">Owner ({ownerCount})</option>
            <option value="manager">Manager ({managerCount})</option>
            <option value="operator">Operator</option>
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">User / Staff Member</th>
              <th className="py-3 px-3">Username</th>
              <th className="py-3 px-3">Portal Role</th>
              <th className="py-3 px-3">Email Address</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                  No staff accounts match your search filter.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
              const isCurrentSession = currentUser?.id === u.id || currentUser?.username === u.username;
              return (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          u.role === "admin"
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : u.role === "owner"
                            ? "bg-amber-100 text-amber-700 border border-amber-200"
                            : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {u.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{u.fullName}</span>
                          {isCurrentSession && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-semibold">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {u.id}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3 font-mono font-bold text-slate-700">
                    @{u.username}
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.role === "admin"
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : u.role === "owner"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {u.role === "admin" && <Shield className="w-3 h-3" />}
                      {u.role === "owner" && <Crown className="w-3 h-3" />}
                      {u.role === "manager" && <BriefcaseBusiness className="w-3 h-3" />}
                      <span>{u.role}</span>
                    </span>
                  </td>

                  <td className="py-3 px-3 font-medium text-slate-600 truncate max-w-[200px]">
                    {u.email}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {u.isActive ? "Active" : "Deactivated"}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isAdminOrOwner && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit User Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenPassword(u)}
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Change / Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.isActive
                                ? "text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={u.isActive ? "Deactivate Account" : "Activate Account"}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {!isCurrentSession && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTargetUser(u);
                                setShowDeleteModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden p-3 space-y-3 bg-slate-50/50">
        {filteredUsers.map((u) => {
          const isCurrentSession = currentUser?.id === u.id || currentUser?.username === u.username;
          return (
            <div
              key={u.id}
              className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      u.role === "admin"
                        ? "bg-purple-100 text-purple-700 border border-purple-200"
                        : u.role === "owner"
                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                        : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {u.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
                      <span>{u.fullName}</span>
                      {isCurrentSession && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-semibold shrink-0">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">@{u.username}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      u.role === "admin"
                        ? "bg-purple-100 text-purple-800"
                        : u.role === "owner"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {u.role}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      u.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {u.isActive ? "Active" : "Disabled"}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 truncate">{u.email}</div>

              {isAdminOrOwner && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(u)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenPassword(u)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-semibold flex items-center justify-center gap-1 border border-purple-200"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(u)}
                    className={`py-1.5 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 ${
                      u.isActive
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                    title={u.isActive ? "Deactivate" : "Activate"}
                  >
                    <Power className="w-3 h-3" />
                  </button>

                  {!isCurrentSession && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTargetUser(u);
                        setShowDeleteModal(true);
                      }}
                      className="py-1.5 px-2.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 text-[11px]"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ---------------- MODAL 1: ADD / EDIT USER ---------------- */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  {editingUser ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingUser ? "Edit User Account" : "Create New User / Login"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingUser
                      ? `Updating profile for @${editingUser.username}`
                      : "Add credentials to access Owner, Manager, or Admin portals"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Full Name / Staff Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sahu (Store Cashier)"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Username (Login ID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ramesh"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Portal Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  >
                    <option value="manager">Manager (Operations)</option>
                    <option value="owner">Owner (Executive)</option>
                    <option value="admin">Admin (System Full Control)</option>
                    <option value="operator">Operator (Cashier/Staff)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. ramesh@pramodmaharaj.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Initial Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Default: Password@123"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Password can be changed anytime later by Administrator.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs transition-colors"
                >
                  {editingUser ? "Save Changes" : "Create Login"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL 2: RESET PASSWORD ---------------- */}
      {showPasswordModal && passwordTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Reset Password</h3>
                  <p className="text-[11px] text-slate-500">
                    User: <strong>@{passwordTargetUser.username}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswordText ? "text" : "password"}
                    required
                    placeholder="Enter new password (min 4 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 rounded-lg border border-slate-200 bg-white font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showPasswordText ? "text" : "password"}
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs transition-colors"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL 3: DELETE CONFIRMATION ---------------- */}
      {showDeleteModal && deleteTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-rose-200 overflow-hidden animate-fadeIn">
            <div className="p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Delete User Account?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to permanently delete account for{" "}
                <strong className="text-slate-900">{deleteTargetUser.fullName}</strong> (@{deleteTargetUser.username})?
                This action cannot be undone.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs transition-colors"
              >
                Yes, Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
