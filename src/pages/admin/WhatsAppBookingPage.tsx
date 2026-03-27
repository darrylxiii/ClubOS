/**
 * WhatsApp Booking Admin Page
 * 
 * Admin interface for monitoring and testing WhatsApp-based booking sessions
 */

import { useTranslation } from 'react-i18next';
import { RoleGate } from '@/components/RoleGate';
import { WhatsAppBookingDashboard } from '@/components/admin/WhatsAppBookingDashboard';

export default function WhatsAppBookingPage() {
  const { t } = useTranslation('admin');
  return (
    <RoleGate allowedRoles={['admin', 'strategist']}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <WhatsAppBookingDashboard />
      </div>
    </RoleGate>
  );
}
