"use client";
import Protected from "@/components/Protected";
import StudentScheduleView from "@/components/schedule/StudentScheduleView";

export default function StudentSchedulePage() {
  return (
    <Protected requiredRole="student">
      <StudentScheduleView />
    </Protected>
  );
}
