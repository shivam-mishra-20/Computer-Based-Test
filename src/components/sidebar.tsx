"use client";
import React from "react";
import Link from "next/link";

export default function Sidebar() {
  return (
    <aside style={{ width: 220, padding: 12, borderRight: "1px solid #eee" }}>
      <h4>Menu</h4>
      <ul>
        <li>
          <Link href="/dashboard">Overview</Link>
        </li>
        <li>
          <Link href="/dashboard/exam">Exams</Link>
        </li>
        <li>
          <Link href="/dashboard/schedule">Schedule</Link>
        </li>
      </ul>
    </aside>
  );
}
