"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMe, getToken, setUser, User } from "../lib/auth";

type Props = {
  children: React.ReactNode;
  requiredRole?: "admin" | "teacher" | "student";
  redirectTo?: string;
};

export default function Protected({
  children,
  requiredRole,
  redirectTo = "/login",
}: Props) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace(redirectTo);
      return;
    }
    (async () => {
      try {
        const me = (await fetchMe()) as User;
        if (!me || !me.role) throw new Error("unauthorized");
        setUser(me);
        if (requiredRole && me.role !== requiredRole) {
          // Route to their own dashboard if role mismatch
          if (me.role === "admin") router.replace("/dashboard/admin");
          else if (me.role === "teacher") router.replace("/dashboard/teacher");
          else router.replace("/dashboard/student");
          return;
        }
        setOk(true);
      } catch {
        router.replace(redirectTo);
      }
    })();
  }, [router, redirectTo, requiredRole]);

  if (!ok) {
    return <div style={{ padding: 20 }}>Authenticating...</div>;
  }
  return <>{children}</>;
}
