"use client";
import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { adminCreateUser } from "@/lib/auth";
import Protected from "@/components/Protected";
import DashboardHeader from "@/components/ui/dashboard-header";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { InlineLoader } from "@/components/ElegantLoader";

type Role = "admin" | "teacher" | "student";
type UserStatus = "pending" | "approved" | "rejected";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: UserStatus;
  classLevel?: string;
  batch?: string;
  empCode?: string;
  phone?: string;
  createdAt?: string;
}

const CLASS_OPTIONS = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "Dropper"];
const BATCH_OPTIONS = ["Lakshya", "Aadharshilla", "Basic", "Commerce"];

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<Role | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: "", email: "", password: "", role: "student" as Role,
    classLevel: "", batch: "", empCode: "", phone: ""
  });
  const [editForm, setEditForm] = useState({
    name: "", email: "", role: "student" as Role,
    classLevel: "", batch: "", empCode: "", phone: ""
  });
  const [newPassword, setNewPassword] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const q = filterRole === "all" ? "" : `?role=${filterRole}`;
      const data = await apiFetch(`/users${q}`) as Array<Record<string, unknown>>;
      setUsers(data.map((u) => ({
        id: (u._id as string) || (u.id as string),
        name: u.name as string,
        email: u.email as string,
        role: u.role as Role,
        status: u.status as UserStatus,
        classLevel: (u.classLevel as string) || "",
        batch: (u.batch as string) || "",
        empCode: (u.empCode as string) || "",
        phone: (u.phone as string) || "",
        createdAt: u.createdAt as string,
      })));
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [filterRole]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Filtered users based on search
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.empCode?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Create User
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await adminCreateUser({
        name: createForm.name, email: createForm.email, password: createForm.password,
        role: createForm.role, empCode: createForm.empCode,
        classLevel: createForm.role === "student" ? createForm.classLevel : undefined,
        batch: createForm.role === "student" ? createForm.batch : undefined,
      });
      toast.success(`${createForm.name} created successfully`);
      setShowCreateModal(false);
      setCreateForm({ name: "", email: "", password: "", role: "student", classLevel: "", batch: "", empCode: "", phone: "" });
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setActionLoading(false);
    }
  };

  // Edit User
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name, email: user.email, role: user.role,
      classLevel: user.classLevel || "", batch: user.batch || "",
      empCode: user.empCode || "", phone: user.phone || ""
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await apiFetch(`/users/${selectedUser.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editForm.name, email: editForm.email, role: editForm.role, empCode: editForm.empCode,
          classLevel: editForm.role === "student" ? editForm.classLevel : undefined,
          batch: editForm.role === "student" ? editForm.batch : undefined,
        }),
      });
      toast.success("User updated successfully");
      setShowEditModal(false);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setActionLoading(false);
    }
  };

  // Change Password
  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword("");
    setShowPasswordModal(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    setActionLoading(true);
    try {
      await apiFetch(`/users/${selectedUser.id}`, {
        method: "PUT", body: JSON.stringify({ password: newPassword }),
      });
      toast.success("Password changed successfully");
      setShowPasswordModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete User
  const handleDelete = async (user: User) => {
    if (!confirm(`Delete ${user.name} permanently?`)) return;
    try {
      await apiFetch(`/users/${user.id}`, { method: "DELETE" });
      toast.success("User deleted");
      setUsers(users.filter(u => u.id !== user.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const getRoleBadge = (role: Role) => {
    const styles = {
      admin: "bg-purple-50 text-purple-700 border-purple-200",
      teacher: "bg-blue-50 text-blue-700 border-blue-200",
      student: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
    return styles[role] || "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getStatusBadge = (status?: UserStatus) => {
    if (!status || status === "approved") return null;
    const styles = {
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      rejected: "bg-red-50 text-red-700 border-red-200",
    };
    return styles[status];
  };

  return (
    <Protected requiredRole="admin">
      <main className="p-6 font-poppins">
        <DashboardHeader
          title="User Management"
          subtitle="Manage users, roles, and permissions"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard/admin" },
            { label: "App Management", href: "/dashboard/admin/app-management" },
            { label: "Users" },
          ]}
        />

        {/* Toolbar */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {["all", "admin", "teacher", "student"].map((role) => (
              <button
                key={role}
                onClick={() => setFilterRole(role as Role | "all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filterRole === role ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {role === "all" ? "All" : role.charAt(0).toUpperCase() + role.slice(1)}
                {role !== "all" && <span className="ml-1 opacity-75">({users.filter(u => u.role === role).length})</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 sm:w-64 px-4 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Add User
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center"><InlineLoader /> Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Details</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{user.name}</p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getRoleBadge(user.role)}`}>
                            {user.role}
                          </span>
                          {getStatusBadge(user.status) && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getStatusBadge(user.status)}`}>
                              {user.status}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.empCode || "-"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {user.role === "student" && (
                          <div>
                            {user.classLevel && <span className="bg-slate-100 px-2 py-0.5 rounded mr-2">{user.classLevel}</span>}
                            {user.batch ? (
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{user.batch}</span>
                            ) : (
                              <span className="text-amber-600 text-xs">No batch</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(user)} className="px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Edit</button>
                          <button onClick={() => openPasswordModal(user)} className="px-3 py-1.5 text-xs font-medium border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50">Password</button>
                          <button onClick={() => handleDelete(user)} className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-700 rounded-lg hover:bg-red-50">Delete</button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create User Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Create New User</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                      <input required value={createForm.name} onChange={(e) => setCreateForm({...createForm, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                      <input required type="email" value={createForm.email} onChange={(e) => setCreateForm({...createForm, email: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                      <input required type="password" value={createForm.password} onChange={(e) => setCreateForm({...createForm, password: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">EmpCode *</label>
                      <input required value={createForm.empCode} onChange={(e) => setCreateForm({...createForm, empCode: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                    <select value={createForm.role} onChange={(e) => setCreateForm({...createForm, role: e.target.value as Role})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-500">
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {createForm.role === "student" && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-emerald-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-emerald-800 mb-1">Class</label>
                        <select value={createForm.classLevel} onChange={(e) => setCreateForm({...createForm, classLevel: e.target.value})} className="w-full px-3 py-2 border border-emerald-200 rounded-lg">
                          <option value="">Select Class</option>
                          {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-emerald-800 mb-1">Batch</label>
                        <select value={createForm.batch} onChange={(e) => setCreateForm({...createForm, batch: e.target.value})} className="w-full px-3 py-2 border border-emerald-200 rounded-lg">
                          <option value="">Select Batch</option>
                          {BATCH_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 pt-4">
                    <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                      {actionLoading ? <><InlineLoader /> Creating...</> : "Create User"}
                    </button>
                    <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Cancel</button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit User Modal */}
        <AnimatePresence>
          {showEditModal && selectedUser && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Edit User: {selectedUser.name}</h2>
                <form onSubmit={handleEdit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                      <input required value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input required type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">EmpCode</label>
                      <input value={editForm.empCode} onChange={(e) => setEditForm({...editForm, empCode: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                      <select value={editForm.role} onChange={(e) => setEditForm({...editForm, role: e.target.value as Role})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-500">
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  {editForm.role === "student" && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-emerald-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-emerald-800 mb-1">Class</label>
                        <select value={editForm.classLevel} onChange={(e) => setEditForm({...editForm, classLevel: e.target.value})} className="w-full px-3 py-2 border border-emerald-200 rounded-lg">
                          <option value="">Select Class</option>
                          {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-emerald-800 mb-1">Batch {!selectedUser.batch && <span className="text-amber-600">(Not Assigned)</span>}</label>
                        <select value={editForm.batch} onChange={(e) => setEditForm({...editForm, batch: e.target.value})} className="w-full px-3 py-2 border border-emerald-200 rounded-lg">
                          <option value="">Select Batch</option>
                          {BATCH_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 pt-4">
                    <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                      {actionLoading ? <><InlineLoader /> Saving...</> : "Save Changes"}
                    </button>
                    <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Cancel</button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Change Password Modal */}
        <AnimatePresence>
          {showPasswordModal && selectedUser && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPasswordModal(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Change Password</h2>
                <p className="text-slate-500 text-sm mb-4">Set a new password for {selectedUser.name}</p>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                    <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-500" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={actionLoading || !newPassword} className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      {actionLoading ? <><InlineLoader /> Updating...</> : "Update Password"}
                    </button>
                    <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Cancel</button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </Protected>
  );
}
