"use client";
import { useRouter } from "next/navigation";
import QuickCreateExamForm from "./QuickCreateExamForm";

// Was previously a 3-step wizard (Setup → Select Questions → Organize & Save)
// that duplicated the build page's own question-bank UI and dead-ended back
// to its own step 1 after creating a draft instead of taking the teacher into
// the builder. Creation is now just the essentials; question selection,
// settings, students, and scheduling all happen in the one canonical builder
// (`/dashboard/teacher/exams/:id/build`) this navigates straight into.
export default function CreateExamFlow() {
  const router = useRouter();
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Create Exam</h2>
        <p className="text-sm text-gray-500 mt-1">
          Add the basics now — questions, settings, students, and scheduling happen next.
        </p>
      </div>
      <QuickCreateExamForm onCreated={(id) => router.push(`/dashboard/teacher/exams/${id}/build`)} />
    </div>
  );
}
