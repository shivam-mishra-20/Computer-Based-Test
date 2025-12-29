'use client';

import StudentAttendance from '@/components/student/StudentAttendance';

export default function StudentAttendancePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <StudentAttendance />
      </div>
    </div>
  );
}
