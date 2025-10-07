import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { AchievementHero } from "@/components/achievements/AchievementHero";
import { AchievementTimeline } from "@/components/achievements/AchievementTimeline";
import { AchievementClusters } from "@/components/achievements/AchievementClusters";
import { AchievementFeed } from "@/components/achievements/AchievementFeed";
import { AchievementSearch } from "@/components/achievements/AchievementSearch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Achievements = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null);

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Hero Banner */}
        <AchievementHero />

        {/* Timeline of Ascendance */}
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Timeline of Ascendance
            </h2>
            <p className="text-muted-foreground">Your quantum journey through achievement</p>
          </div>
          <AchievementTimeline />
        </div>

        {/* Search & Filter */}
        <div className="container mx-auto px-4 pb-6">
          <AchievementSearch
            onSearchChange={setSearchQuery}
            onCategoryChange={setSelectedCategory}
            onRarityChange={setSelectedRarity}
          />
        </div>

        {/* Main Content Tabs */}
        <div className="container mx-auto px-4 pb-16">
          <Tabs defaultValue="clusters" className="w-full">
            <TabsList className="glass mb-8">
              <TabsTrigger value="clusters">Achievement Gallery</TabsTrigger>
              <TabsTrigger value="feed">Community Feed</TabsTrigger>
            </TabsList>

            <TabsContent value="clusters" className="space-y-8">
              <AchievementClusters
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                selectedRarity={selectedRarity}
              />
            </TabsContent>

            <TabsContent value="feed">
              <AchievementFeed />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
};

export default Achievements;
