"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

type Setting = { key: string; value: unknown; description?: string };

export default function AdminSettings() {
  const [items, setItems] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Setting>({
    key: "feature.example",
    value: true,
    description: "Example toggle",
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = (await apiFetch("/admin/settings")) as {
        items: Setting[];
      };
      setItems(res.items || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/admin/settings", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ key: "", value: "", description: "" });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(key: string) {
    await apiFetch(`/admin/settings/${encodeURIComponent(key)}`, {
      method: "DELETE",
    });
    await load();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-semibold text-accent">System Settings</h2>

      <div className="bg-white/80 backdrop-blur p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="key"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
          />
          <input
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="value (JSON accepted)"
            value={JSON.stringify(form.value)}
            onChange={(e) => {
              try {
                setForm({ ...form, value: JSON.parse(e.target.value) });
              } catch {
                setForm({ ...form, value: e.target.value });
              }
            }}
          />
          <input
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="description"
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <button
          disabled={saving}
          onClick={save}
          className="px-4 py-2 bg-cta text-white rounded-lg disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save/Update"}
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur p-4 rounded-xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : items.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="py-2">Key</th>
                <th className="py-2">Value</th>
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.key} className="border-b border-gray-50">
                  <td className="py-2 font-mono text-xs">{s.key}</td>
                  <td className="py-2 text-gray-700">
                    {typeof s.value === "object"
                      ? JSON.stringify(s.value)
                      : String(s.value)}
                  </td>
                  <td className="py-2 text-gray-500">{s.description || "—"}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => remove(s.key)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-sm text-gray-500">No settings yet.</div>
        )}
      </div>
    </motion.div>
  );
}
