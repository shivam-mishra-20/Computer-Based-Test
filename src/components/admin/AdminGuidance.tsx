"use client";
import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface GuidanceDoc {
  _id?: string;
  subject?: string;
  topic?: string;
  instructions: string;
  isActive: boolean;
}

export default function AdminGuidance() {
  const [items, setItems] = useState<GuidanceDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<GuidanceDoc>({
    instructions: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = (await apiFetch("/ai/guidance")) as {
        items: GuidanceDoc[];
      };
      setItems(res.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!draft.instructions.trim()) return alert("Add some instructions");
    setSaving(true);
    try {
      await apiFetch("/ai/guidance", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      setDraft({ instructions: "", isActive: true });
      await load();
    } catch (e) {
      alert((e as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await apiFetch(`/ai/guidance/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      });
      await load();
    } catch {}
  }

  async function remove(id: string) {
    if (!confirm("Delete guidance?")) return;
    try {
      await apiFetch(`/ai/guidance/${id}`, { method: "DELETE" });
      await load();
    } catch {}
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-accent">LLM Guidance</h2>
      <div className="bg-white/80 backdrop-blur p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            placeholder="Subject (optional)"
            value={draft.subject || ""}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cta/30 focus:border-cta"
          />
          <input
            placeholder="Topic (optional)"
            value={draft.topic || ""}
            onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cta/30 focus:border-cta"
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) =>
                setDraft({ ...draft, isActive: e.target.checked })
              }
            />
            Active
          </label>
        </div>
        <textarea
          placeholder="Write instructions to guide question generation (style, syllabus constraints, language, etc.)"
          value={draft.instructions}
          onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-cta/30 focus:border-cta"
        />
        <div>
          <button
            disabled={saving}
            onClick={save}
            className="px-4 py-2 bg-cta text-white rounded-lg disabled:opacity-50 hover:bg-cta/90"
          >
            {saving ? "Saving..." : "Add Guidance"}
          </button>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur p-4 rounded-xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : items.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="py-2">Subject</th>
                <th className="py-2">Topic</th>
                <th className="py-2">Active</th>
                <th className="py-2 w-1/2">Instructions</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((g) => (
                <tr
                  key={g._id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="py-2">{g.subject || "—"}</td>
                  <td className="py-2">{g.topic || "—"}</td>
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={g.isActive}
                      onChange={(e) => toggleActive(g._id!, e.target.checked)}
                    />
                  </td>
                  <td className="py-2 pr-4 whitespace-pre-wrap">
                    {g.instructions}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => remove(g._id!)}
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
          <div className="text-sm text-gray-500">No guidance added yet.</div>
        )}
      </div>
    </div>
  );
}
