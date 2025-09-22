"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

type Audit = {
  _id: string;
  userId: string;
  action: string;
  resource?: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};

export default function AdminAudit() {
  const [items, setItems] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = (await apiFetch("/api/admin/audit-logs")) as {
        items: Audit[];
        total: number;
      };
      setItems(res.items || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-semibold text-accent">Audit Trail</h2>

      <div className="bg-white/80 backdrop-blur p-4 rounded-xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : items.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="py-2">When</th>
                <th className="py-2">Action</th>
                <th className="py-2">Resource</th>
                <th className="py-2">By</th>
                <th className="py-2">Meta</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a._id} className="border-b border-gray-50">
                  <td className="py-2 text-gray-600">
                    {new Date(a.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 font-mono text-xs">{a.action}</td>
                  <td className="py-2 text-gray-700">{a.resource || "—"}</td>
                  <td className="py-2 font-mono text-xs">{a.userId}</td>
                  <td className="py-2 text-gray-600">
                    {a.meta ? (
                      <code className="text-xs">{JSON.stringify(a.meta)}</code>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-sm text-gray-500">No audit logs yet.</div>
        )}
      </div>
    </motion.div>
  );
}
