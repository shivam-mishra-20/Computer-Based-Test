'use client';

import AutomationDashboard from '@/components/admin/AutomationDashboard';
import Protected from '@/components/Protected';

export default function AutomationPage() {
  return (
    <Protected requiredRole="admin">
      <AutomationDashboard />
    </Protected>
  );
}
