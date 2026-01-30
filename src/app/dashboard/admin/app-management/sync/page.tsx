"use client";
import Protected from "@/components/Protected";
import AdminFirebaseSync from "@/components/admin/AdminFirebaseSync";

export default function AdminFirebaseSyncPage() {
  return (
    <Protected requiredRole="admin">
      <AdminFirebaseSync />
    </Protected>
  );
}
