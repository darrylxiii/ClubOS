import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StreakWidget } from './StreakWidget';
import { WeeklyGoalWidget } from './WeeklyGoalWidget';
import { TopAchievementsBadges } from './TopAchievementsBadges';
import { QuickActionsMenu } from './QuickActionsMenu';
import { JobMatchesPreview } from './JobMatchesPreview';

export const AcademySidebar = () => {
  return (
    <aside className="w-80 space-y-4 sticky top-4 hidden xl:block">
      <StreakWidget />
      <WeeklyGoalWidget />
      <TopAchievementsBadges />
      <JobMatchesPreview />
      <QuickActionsMenu />
    </aside>
  );
};
