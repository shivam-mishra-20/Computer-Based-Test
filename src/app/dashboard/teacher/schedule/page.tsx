"use client";
import Protected from "@/components/Protected";
import StudentScheduleView from "@/components/schedule/StudentScheduleView";

export default function TeacherSchedulePage() {
  return (
    <Protected requiredRole="teacher">
      <StudentScheduleView />
    </Protected>
  );
}
