"use client";
import React, { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

interface Exam {
  _id: string;
  title: string;
  isPublished?: boolean;
}

export default function AdminExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  // errors displayed inline via empty states; maintain minimal state
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = (await apiFetch("/api/exams")) as { items?: Exam[] };
      setExams(Array.isArray(data.items) ? data.items : []);
    } catch {
      setExams([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/api/exams", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: "",
          totalDurationMins: 60,
          sections: [],
          isPublished: false,
        }),
      });
      setTitle("");
      await load();
    } catch {
      // ignore error
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Exams</h2>
        <form onSubmit={onCreate} className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New exam title"
            className="border rounded-md px-3 py-2 text-sm"
          />
          <button
            disabled={creating}
            className="px-4 py-2 rounded-md bg-primary text-white text-sm disabled:opacity-50"
          >
            {creating ? "Adding..." : "Add"}
          </button>
        </form>
      </div>
      <div className="mt-4 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Title</th>
              <th className="text-left px-3 py-2 font-medium">Published</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={2} className="px-3 py-3 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}
            {!loading &&
              exams.map((ex) => (
                <tr key={ex._id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{ex.title}</td>
                  <td className="px-3 py-2">{ex.isPublished ? "Yes" : "No"}</td>
                </tr>
              ))}
            {!loading && !exams.length && (
              <tr>
                <td colSpan={2} className="px-3 py-4 text-center text-gray-400">
                  No exams
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
