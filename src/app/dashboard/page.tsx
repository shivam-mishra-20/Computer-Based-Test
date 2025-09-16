"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchMe, getToken, setUser, User } from "../../lib/auth";

export default function DashboardIndex() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    fetchMe()
      .then((me: unknown) => {
        if (!me || typeof me !== "object") {
          router.push("/login");
          return;
        }
        const u = me as User;
        setUser(u);
        const role = u.role as string | undefined;
        if (role === "admin") router.push("/dashboard/admin");
        else if (role === "teacher") router.push("/dashboard/teacher");
        else router.push("/dashboard/student");
      })
      .catch(() => router.push("/login"));
  }, [router]);

  return <div style={{ padding: 20 }}>Redirecting to your dashboard...</div>;
}
