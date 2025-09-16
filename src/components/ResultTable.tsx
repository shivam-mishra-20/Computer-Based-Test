"use client";
import React from "react";

type Result = { student?: string; score?: number | string };

export default function ResultTable({ results }: { results?: Result[] }) {
  return (
    <div className="overflow-x-auto font-poppins">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-bg">
            <th
              className="text-left px-4 py-2 border"
              style={{ borderColor: "var(--beige-sand)" }}
            >
              Student
            </th>
            <th
              className="text-left px-4 py-2 border"
              style={{ borderColor: "var(--beige-sand)" }}
            >
              Score
            </th>
          </tr>
        </thead>
        <tbody>
          {(results || []).map((r, i) => (
            <tr key={i} className="hover:bg-white">
              <td
                className="px-4 py-2 border"
                style={{ borderColor: "var(--beige-sand)" }}
              >
                {r.student ?? "Unknown"}
              </td>
              <td
                className="px-4 py-2 border"
                style={{ borderColor: "var(--beige-sand)" }}
              >
                {r.score ?? "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
