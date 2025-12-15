import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { ActiveCallProvider } from '@/contexts/ActiveCallContext';
import LiveHubLayout from '@/components/livehub/LiveHubLayout';

const LiveHub = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <AppLayout>
      <ActiveCallProvider>
        <LiveHubLayout />
      </ActiveCallProvider>
    </AppLayout>
  );
};

export default LiveHub;
