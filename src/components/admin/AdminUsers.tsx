"use client";
import React, { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { adminCreateUser } from "../../lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { InlineLoader } from "../ElegantLoader";

type Role = "admin" | "teacher" | "student";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  classLevel?: string;
  batch?: string;
  empCode?: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<Role | "all">("all");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student" as Role,
    classLevel: "",
    batch: "",
    empCode: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = filterRole === "all" ? "" : `?role=${filterRole}`;
      const data = (await apiFetch(`/users${q}`)) as Array<
        Record<string, unknown>
      >;
      setUsers(
        data.map((u: Record<string, unknown>) => ({
          id: (u._id as string) || (u.id as string),
          name: u.name as string,
          email: u.email as string,
          role: u.role as Role,
          classLevel: (u.classLevel as string) || "",
          batch: (u.batch as string) || "",
          empCode: (u.empCode as string) || "",
        }))
      );
      setRefreshKey((prev) => prev + 1);
    } catch {
      setError("Failed to load users");
      toast.error("Load Failed", {
        description: "Failed to load users. Please try again.",
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  }, [filterRole]);

  useEffect(() => {
    load();
  }, [filterRole, load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setCreating(true);
    try {
      await adminCreateUser({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        classLevel: form.role === "student" ? form.classLevel : undefined,
        batch: form.role === "student" ? form.batch : undefined,
        empCode: form.empCode,
      });
      toast.success("User Created Successfully", {
        description: `${form.name} has been added as a ${form.role}`,
        duration: 4000,
      });
      setMessage("User created successfully");
      setForm({
        name: "",
        email: "",
        password: "",
        role: "student",
        classLevel: "",
        batch: "",
        empCode: "",
      });
      await load();
      setShowForm(false);

      setTimeout(() => {
        if (message?.includes("successfully")) {
          setMessage(null);
        }
      }, 3000);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create user";
      toast.error("Failed to Create User", {
        description: errorMessage,
        duration: 4000,
      });
      setMessage(errorMessage);
    } finally {
      setCreating(false);
    }
  }

  const getRoleBadgeStyles = (role: Role) => {
    switch (role) {
      case "admin":
        return "bg-purple-50 text-purple-700 border border-purple-200";
      case "teacher":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "student":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-200";
    }
  };

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case "admin":
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        );
      case "teacher":
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        );
    }
  };

  async function onDeleteUser(id: string) {
    if (!confirm("Delete this user permanently?")) return;
    try {
      await apiFetch(`/users/${id}`, { method: "DELETE" });
      setUsers((arr) => arr.filter((u) => u.id !== id));
      toast.success("User deleted");
    } catch (e) {
      toast.error((e as Error).message || "Delete failed");
    }
  }

  async function onChangePassword(id: string) {
    const password = prompt("Enter new password for this user");
    if (!password) return;
    try {
      await apiFetch(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify({ password }),
      });
      toast.success("Password updated");
    } catch (e) {
      toast.error((e as Error).message || "Update failed");
    }
  }

  async function onEditUser(u: User) {
    const name = prompt("Name", u.name) ?? u.name;
    const email = prompt("Email", u.email) ?? u.email;
    const role = (prompt("Role (admin|teacher|student)", u.role) ??
      u.role) as Role;
    let classLevel = u.classLevel || "";

    let batch = u.batch || "";
    let empCode = u.empCode || "";
    
    // EmpCode should be editable for migration
    empCode = prompt("Employee/Student Code (Required for Attendance)", empCode) ?? empCode;
    
    if (role === "student") {
      classLevel = prompt("Class (7-12)", classLevel) ?? classLevel;
      batch =
        prompt("Batch (Lakshya|Aadharshilla|Basic|Commerce)", batch) ?? batch;
    }
    try {
      const resp = (await apiFetch(`/users/${u.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          email,
          role,
          classLevel: role === "student" ? classLevel : undefined,
          batch: role === "student" ? batch : undefined,
          empCode,
        }),
      })) as Partial<User>;
      setUsers((arr) =>
        arr.map((x) =>
          x.id === u.id
            ? {
                ...x,
                name,
                email,
                role,
                classLevel: resp.classLevel ?? classLevel,
                batch: resp.batch ?? batch,
                empCode: resp.empCode ?? empCode,
              }
            : x
        )
      );
      toast.success("User updated");
    } catch (e) {
      toast.error((e as Error).message || "Update failed");
    }
  }

  const filteredUsers = users.filter((user) =>
    filterRole === "all" ? true : user.role === filterRole
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 p-4 lg:p-6">
      <div className="max-w-8xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                User Management
              </h1>
              <p className="text-slate-600">
                Manage admin, teacher, and student accounts
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span className="hidden sm:inline">Add User</span>
            <span className="sm:hidden">Add</span>
          </motion.button>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3"
          >
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-red-700">{error}</span>
            <button
              onClick={() => {
                setError(null);
                load();
              }}
              className="ml-auto text-red-700 hover:text-red-900 font-medium text-sm"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-sm p-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium">Filter by role:</span>
              <div className="flex gap-2 flex-wrap">
                {["all", "admin", "teacher", "student"].map((role) => (
                  <motion.button
                    key={role}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFilterRole(role as Role | "all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      filterRole === role
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {role === "all"
                      ? "All"
                      : role.charAt(0).toUpperCase() + role.slice(1)}
                    {role !== "all" && (
                      <span className="ml-1 opacity-75">
                        ({users.filter((u) => u.role === role).length})
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">
                {filteredUsers.length} user
                {filteredUsers.length !== 1 ? "s" : ""}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => load()}
                className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                title="Refresh"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Add User Form - Mobile Friendly */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Add New User
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-slate-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <form onSubmit={onCreate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Full Name
                      </label>
                      <input
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all duration-200"
                        placeholder="Enter full name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all duration-200"
                        placeholder="user@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Code (EmpCode) <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={form.empCode}
                        onChange={(e) =>
                          setForm({ ...form, empCode: e.target.value })
                        }
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all duration-200"
                        placeholder="e.g. 0001"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        User Role
                      </label>
                      <select
                        value={form.role}
                        onChange={(e) =>
                          setForm({ ...form, role: e.target.value as Role })
                        }
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all duration-200"
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all duration-200"
                      placeholder="Enter secure password"
                      required
                    />
                  </div>

                  {form.role === "student" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div>
                        <label className="block text-sm font-medium text-emerald-800 mb-2">
                          Class
                        </label>
                        <select
                          value={form.classLevel}
                          onChange={(e) =>
                            setForm({ ...form, classLevel: e.target.value })
                          }
                          className="w-full px-4 py-2.5 border border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all duration-200"
                        >
                          <option value="">Select class</option>
                          <option value="7">Class 7</option>
                          <option value="8">Class 8</option>
                          <option value="9">Class 9</option>
                          <option value="10">Class 10</option>
                          <option value="11">Class 11</option>
                          <option value="12">Class 12</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-emerald-800 mb-2">
                          Batch
                        </label>
                        <select
                          value={form.batch}
                          onChange={(e) =>
                            setForm({ ...form, batch: e.target.value })
                          }
                          className="w-full px-4 py-2.5 border border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all duration-200"
                        >
                          <option value="">Select batch</option>
                          <option value="Lakshya">Lakshya</option>
                          <option value="Aadharshilla">Aadharshilla</option>
                          <option value="Basic">Basic</option>
                          <option value="Commerce">Commerce</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {message && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`p-3 rounded-lg flex items-center gap-2 ${
                          message.includes("successfully")
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {message.includes("successfully") ? (
                          <svg
                            className="w-4 h-4 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                        <span className="text-sm">{message}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-3 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={creating}
                      className="flex-1 sm:flex-none sm:px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      {creating ? (
                        <span className="flex items-center justify-center gap-2">
                          <InlineLoader />
                          Creating...
                        </span>
                      ) : (
                        "Create User"
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Users List - Mobile Responsive Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {loading && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
              <div className="flex items-center justify-center gap-3">
                <InlineLoader />
                <span className="text-slate-600 font-medium">
                  Loading users...
                </span>
              </div>
            </div>
          )}

          {!loading && filteredUsers.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No users found
              </h3>
              <p className="text-slate-600 mb-6">
                {filterRole === "all"
                  ? "Create your first user to get started"
                  : `No ${filterRole}s found. Try a different filter.`}
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Add First User
              </motion.button>
            </div>
          )}

          {!loading && filteredUsers.length > 0 && (
            <motion.div
              key={refreshKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-3"
            >
              {filteredUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center ${getRoleBadgeStyles(
                              user.role
                            )}`}
                          >
                            {getRoleIcon(user.role)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {user.name}
                          </h3>
                          <p className="text-slate-600 text-sm truncate">
                            {user.email}
                          </p>
                          {user.empCode && (
                            <p className="text-slate-500 text-xs mt-0.5">
                              Code: {user.empCode}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${getRoleBadgeStyles(
                                user.role
                              )}`}
                            >
                              {getRoleIcon(user.role)}
                              {user.role.charAt(0).toUpperCase() +
                                user.role.slice(1)}
                            </span>
                            {user.role === "student" &&
                              (user.classLevel || user.batch) && (
                                <div className="text-xs text-slate-500">
                                  {user.classLevel &&
                                    `Class ${user.classLevel}`}
                                  {user.classLevel && user.batch && " • "}
                                  {user.batch}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onEditUser(user)}
                          className="px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Edit
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onChangePassword(user.id)}
                          className="px-3 py-1.5 text-xs font-medium border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          Password
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onDeleteUser(user.id)}
                          className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
