import { Leaderboard } from '@/components/academy/Leaderboard';
import { AppLayout } from '@/components/AppLayout';

export default function LeaderboardPage() {
  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <Leaderboard />
      </div>
    </AppLayout>
  );
}
