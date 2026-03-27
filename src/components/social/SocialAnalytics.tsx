import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Eye, Heart, MessageCircle, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export const SocialAnalytics = () => {
  const { t } = useTranslation("common");
  const stats = [
    {
      label: t('social.analytics.totalReach'),
      value: "45.2K",
      change: "+12.5%",
      trend: "up",
      icon: Eye
    },
    {
      label: t('social.analytics.engagementRate'),
      value: "8.4%",
      change: "+2.1%",
      trend: "up",
      icon: Heart
    },
    {
      label: t('social.analytics.totalComments'),
      value: "1,234",
      change: "-3.2%",
      trend: "down",
      icon: MessageCircle
    },
    {
      label: t('social.analytics.shares'),
      value: "892",
      change: "+15.8%",
      trend: "up",
      icon: Share2
    }
  ];

  const topPosts = [
    {
      id: "1",
      platform: "instagram",
      content: "Behind the scenes of our latest project...",
      engagement: 2340,
      reach: 12500
    },
    {
      id: "2",
      platform: "twitter",
      content: "Excited to announce our partnership with...",
      engagement: 1890,
      reach: 9800
    },
    {
      id: "3",
      platform: "linkedin",
      content: "5 tips for growing your professional network...",
      engagement: 1567,
      reach: 8900
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;
          
          return (
            <Card key={stat.label} className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <Badge 
                  variant={stat.trend === "up" ? "default" : "destructive"}
                  className="gap-1"
                >
                  <TrendIcon className="h-3 w-3" />
                  {stat.change}
                </Badge>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          );
        })}
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('social.analytics.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="posts">{t('social.analytics.tabs.topPosts')}</TabsTrigger>
          <TabsTrigger value="audience">{t('social.analytics.tabs.audience')}</TabsTrigger>
          <TabsTrigger value="growth">{t('social.analytics.tabs.growth')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('social.analytics.performanceOverview')}</h3>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              {t('social.analytics.chartPlaceholder')}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('social.analytics.topPerformingPosts')}</h3>
            <div className="space-y-4">
              {topPosts.map((post) => (
                <Card key={post.id} className="p-4 bg-card/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Badge variant="outline" className="mb-2 capitalize">
                        {post.platform}
                      </Badge>
                      <p className="text-sm mb-3">{post.content}</p>
                      <div className="flex gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {post.engagement.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {post.reach.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="audience">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('social.analytics.audienceInsights')}</h3>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              {t('social.analytics.audiencePlaceholder')}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="growth">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('social.analytics.growthTrends')}</h3>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              {t('social.analytics.growthPlaceholder')}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};