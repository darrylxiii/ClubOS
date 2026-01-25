/**
 * WhatsApp Booking Admin Page
 * 
 * Admin interface for monitoring and testing WhatsApp-based booking sessions
 */

import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { WhatsAppBookingDashboard } from '@/components/admin/WhatsAppBookingDashboard';

export default function WhatsAppBookingPage() {
  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto py-8">
          <WhatsAppBookingDashboard />
        </div>
      </RoleGate>
    </AppLayout>
  );
}
