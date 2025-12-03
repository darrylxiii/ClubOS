import { useState } from 'react';
import { ActivityMonitoringDashboard } from '@/components/admin/ActivityMonitoringDashboard';
import { UserDetailModal } from './UserDetailModal';

export function AllUsersTab() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setModalOpen(true);
  };

  return (
    <>
      <ActivityMonitoringDashboard onUserClick={handleUserClick} />
      <UserDetailModal 
        userId={selectedUserId} 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
      />
    </>
  );
}
