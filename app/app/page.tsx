'use client';

import { ProtectedRoute } from '@/components/protected-route';
import PremiumDashboard from '@/components/premium-dashboard';

export default function Home() {
  return (
    <ProtectedRoute>
      <PremiumDashboard />
    </ProtectedRoute>
  );
}
