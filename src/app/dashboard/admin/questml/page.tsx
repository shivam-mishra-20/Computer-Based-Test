'use client';

import QuestMlDashboard from '@/components/admin/QuestMlDashboard';
import Protected from '@/components/Protected';

export default function QuestMlPage() {
  return (
    <Protected requiredRole="admin">
      <QuestMlDashboard />
    </Protected>
  );
}
