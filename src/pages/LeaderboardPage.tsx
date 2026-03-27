import { useTranslation } from 'react-i18next';
import { Leaderboard } from '@/components/academy/Leaderboard';

export default function LeaderboardPage() {
  const { t } = useTranslation('common');
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <Leaderboard />
    </div>
  );
}
