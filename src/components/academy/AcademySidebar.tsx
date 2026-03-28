import { StreakWidget } from './StreakWidget';
import { WeeklyGoalWidget } from './WeeklyGoalWidget';
import { TopAchievementsBadges } from './TopAchievementsBadges';
import { QuickActionsMenu } from './QuickActionsMenu';
import { JobMatchesPreview } from './JobMatchesPreview';
import { ReviewNudge } from './ReviewNudge';

export const AcademySidebar = () => {
  return (
    <aside className="w-80 space-y-3 sticky top-4 hidden xl:block">
      <ReviewNudge />
      <StreakWidget />
      <WeeklyGoalWidget />
      <TopAchievementsBadges />
      <JobMatchesPreview />
      <QuickActionsMenu />
    </aside>
  );
};
