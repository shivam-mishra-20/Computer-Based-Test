"use client";
import React, { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { adminCreateUser } from "../../lib/auth";

type Role = "admin" | "teacher" | "student";
interface User { id: string; name: string; email: string; role: Role }

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<Role | "all">("all");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" as Role });
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const q = filterRole === "all" ? "" : `?role=${filterRole}`;
      const data = await apiFetch(`/api/users${q}`) as any[];
      setUsers(data.map((u: any) => ({ id: u._id || u.id, name: u.name, email: u.email, role: u.role })));
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterRole]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null); setCreating(true);
    try {
      await adminCreateUser(form);
      setMessage("User created");
      setForm({ name: "", email: "", password: "", role: "student" });
      await load();
    } catch (err: any) {
      setMessage(err?.message || "Failed to create");
    } finally { setCreating(false); }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-xl font-semibold">Users</h2>
        <div className="flex gap-2 items-center">
          <select value={filterRole} onChange={e=>setFilterRole(e.target.value as any)} className="border rounded-md px-2 py-1 text-sm">
            <option value="all">All</option>
            <option value="admin">Admins</option>
            <option value="teacher">Teachers</option>
            <option value="student">Students</option>
          </select>
        </div>
      </div>
      <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-left px-3 py-2 font-medium">Email</th>
              <th className="text-left px-3 py-2 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={3} className="px-3 py-4 text-center text-gray-500">Loading...</td></tr>
            )}
            {!loading && users.map(u => (
              <tr key={u.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2 capitalize">{u.role}</td>
              </tr>
            ))}
            {!loading && !users.length && (
              <tr><td colSpan={3} className="px-3 py-4 text-center text-gray-400">No users</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 max-w-md">
        <h3 className="text-lg font-medium mb-2">Create User</h3>
        <form onSubmit={onCreate} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600">Name</label>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Email</label>
            <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Password</label>
            <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Role</label>
            <select value={form.role} onChange={e=>setForm({...form,role:e.target.value as Role})} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {message && <div className={`text-xs ${message.includes("created")?"text-green-600":"text-red-600"}`}>{message}</div>}
          <button disabled={creating} className="px-4 py-2 rounded-md bg-primary text-white disabled:opacity-50 text-sm">{creating?"Creating...":"Create"}</button>
        </form>
      </div>
    </div>
  );
}
