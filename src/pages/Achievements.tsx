import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { AchievementHero } from "@/components/achievements/AchievementHero";
import { AchievementTimeline } from "@/components/achievements/AchievementTimeline";
import { AchievementClusters } from "@/components/achievements/AchievementClusters";
import { AchievementFeed } from "@/components/achievements/AchievementFeed";
import { AchievementSearch } from "@/components/achievements/AchievementSearch";
import { AchievementUnlockToast } from "@/components/achievements/AchievementUnlockToast";
import { AchievementLeaderboard } from "@/components/achievements/AchievementLeaderboard";
import { DailyChallenges } from "@/components/achievements/DailyChallenges";
import { AchievementTree } from "@/components/achievements/AchievementTree";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyAchievements } from "@/components/partner/CompanyAchievements";
import { AdminAchievementsManager } from "@/components/admin/AdminAchievementsManager";
import { useRole } from "@/contexts/RoleContext";
import { Loader2 } from "lucide-react";
import { BackgroundVideo } from "@/components/BackgroundVideo";

const Achievements = () => {
  const { t } = useTranslation('common');
  const { currentRole, companyId, loading } = useRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admin view
  if (currentRole === 'admin') {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <AdminAchievementsManager />
      </div>
    );
  }

  // Partner view
  if (currentRole === 'partner' && companyId) {
    return (
      <>
        <BackgroundVideo />
        <AchievementUnlockToast />
        <div className="relative z-10 min-h-screen">
          <AchievementHero />
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
            <DailyChallenges />
          </div>
          <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2 text-foreground">{t('achievements.title')}</h2>
              <p className="text-muted-foreground">{t('achievements.desc')}</p>
            </div>
            <AchievementTimeline />
          </div>
          <div className="w-full px-4 sm:px-6 lg:px-8 pb-6">
            <AchievementSearch onSearchChange={setSearchQuery} onCategoryChange={setSelectedCategory} onRarityChange={setSelectedRarity} />
          </div>
          <div className="w-full px-4 sm:px-6 lg:px-8 pb-16">
            <Tabs defaultValue="clusters" className="w-full">
              <TabsList className="glass mb-8">
                <TabsTrigger value="clusters">{t('achievements.tabAchievementgallery')}</TabsTrigger>
                <TabsTrigger value="feed">{t('achievements.tabCommunityfeed')}</TabsTrigger>
                <TabsTrigger value="leaderboard">{t('achievements.tabLeaderboard')}</TabsTrigger>
                <TabsTrigger value="tree">{t('achievements.tabAchievementpaths')}</TabsTrigger>
                <TabsTrigger value="company">{t('achievements.tabCustomcompanyachievements')}</TabsTrigger>
              </TabsList>
              <TabsContent value="clusters" className="space-y-8">
                <AchievementClusters searchQuery={searchQuery} selectedCategory={selectedCategory} selectedRarity={selectedRarity} />
              </TabsContent>
              <TabsContent value="feed"><AchievementFeed /></TabsContent>
              <TabsContent value="leaderboard"><AchievementLeaderboard /></TabsContent>
              <TabsContent value="tree"><AchievementTree /></TabsContent>
              <TabsContent value="company">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{t('achievements.title')}</h3>
                  <p className="text-muted-foreground">{t('achievements.desc2')}</p>
                </div>
                <CompanyAchievements companyId={companyId} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </>
    );
  }

  // Candidate/User view
  return (
    <>
      <BackgroundVideo />
      <AchievementUnlockToast />
      <div className="relative z-10 min-h-screen">
        <AchievementHero />
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <DailyChallenges />
        </div>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 text-foreground">{t('achievements.title')}</h2>
            <p className="text-muted-foreground">{t('achievements.desc3')}</p>
          </div>
          <AchievementTimeline />
        </div>
        <div className="w-full px-4 sm:px-6 lg:px-8 pb-6">
          <AchievementSearch onSearchChange={setSearchQuery} onCategoryChange={setSelectedCategory} onRarityChange={setSelectedRarity} />
        </div>
        <div className="w-full px-4 sm:px-6 lg:px-8 pb-16">
          <Tabs defaultValue="clusters" className="w-full">
            <TabsList className="glass mb-8">
              <TabsTrigger value="clusters">{t('achievements.tabAchievementgallery')}</TabsTrigger>
              <TabsTrigger value="feed">{t('achievements.tabCommunityfeed')}</TabsTrigger>
              <TabsTrigger value="leaderboard">{t('achievements.tabLeaderboard')}</TabsTrigger>
              <TabsTrigger value="tree">{t('achievements.tabAchievementpaths')}</TabsTrigger>
            </TabsList>
            <TabsContent value="clusters" className="space-y-8">
              <AchievementClusters searchQuery={searchQuery} selectedCategory={selectedCategory} selectedRarity={selectedRarity} />
            </TabsContent>
            <TabsContent value="feed"><AchievementFeed /></TabsContent>
            <TabsContent value="leaderboard"><AchievementLeaderboard /></TabsContent>
            <TabsContent value="tree"><AchievementTree /></TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Achievements;
