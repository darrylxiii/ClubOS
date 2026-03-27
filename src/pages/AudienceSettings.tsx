import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, List, Users, Settings } from "lucide-react";
import { BestFriendsManager } from "@/components/audience/BestFriendsManager";
import { CustomListSelector } from "@/components/audience/CustomListSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function AudienceSettings() {
  const { t } = useTranslation('settings');
  const [showBestFriends, setShowBestFriends] = useState(false);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{t('audienceSettings.text8')}</h1>
        <p className="text-muted-foreground">{t('audienceSettings.desc')}</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">{t('audienceSettings.text9')}</TabsTrigger>
          <TabsTrigger value="lists">{t('audienceSettings.text10')}</TabsTrigger>
          <TabsTrigger value="best-friends">{t('audienceSettings.text11')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-pink-500/20 rounded-lg">
                      <Heart className="w-6 h-6 text-pink-500" />
                    </div>
                    <div>
                      <CardTitle>{t('audienceSettings.text12')}</CardTitle>
                      <CardDescription>{t('audienceSettings.text13')}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">{t('audienceSettings.text14')}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{t('audienceSettings.desc2')}</p>
                <Button 
                  onClick={() => setShowBestFriends(true)}
                  className="w-full gap-2"
                  variant="outline"
                >
                  <Heart className="w-4 h-4" />
                  Manage Best Friends
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/20 rounded-lg">
                      <List className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle>{t('audienceSettings.text15')}</CardTitle>
                      <CardDescription>{t('audienceSettings.text16')}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Create custom audience segments like "Board Members", "Team", or "Project Partners"
                </p>
                <Button 
                  onClick={() => {}}
                  className="w-full gap-2"
                  variant="outline"
                  asChild
                >
                  <a href="#lists">
                    <List className="w-4 h-4" />
                    View Custom Lists
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Users className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle>{t('audienceSettings.text17')}</CardTitle>
                    <CardDescription>{t('audienceSettings.text18')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{t('audienceSettings.desc3')}</p>
                <Button 
                  className="w-full gap-2"
                  variant="outline"
                  disabled
                >
                  <Users className="w-4 h-4" />
                  Manage Connections
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/20 rounded-lg">
                    <Settings className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle>{t('audienceSettings.text19')}</CardTitle>
                    <CardDescription>{t('audienceSettings.text20')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{t('audienceSettings.desc4')}</p>
                <Button 
                  className="w-full gap-2"
                  variant="outline"
                  disabled
                >
                  <Settings className="w-4 h-4" />
                  Configure Defaults
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('audienceSettings.text21')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div>
                    <p className="font-medium">{t('audienceSettings.text22')}</p>
                    <p className="text-sm text-muted-foreground">{t('audienceSettings.desc5')}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div>
                    <p className="font-medium">{t('audienceSettings.text23')}</p>
                    <p className="text-sm text-muted-foreground">
                      Combine multiple audiences (e.g., "Connections + Best Friends") for more control
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div>
                    <p className="font-medium">{t('audienceSettings.text24')}</p>
                    <p className="text-sm text-muted-foreground">{t('audienceSettings.desc6')}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div>
                    <p className="font-medium">{t('audienceSettings.text25')}</p>
                    <p className="text-sm text-muted-foreground">{t('audienceSettings.desc7')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lists" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('audienceSettings.text26')}</CardTitle>
              <CardDescription>
                Create and manage audience segments for targeted sharing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomListSelector
                selectedIds={selectedLists}
                onSelectionChange={setSelectedLists}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="best-friends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                Best Friends
              </CardTitle>
              <CardDescription>
                Your most trusted contacts for exclusive content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                  <p className="text-sm">
                    <strong>{t('audienceSettings.text27')}</strong> Add your closest contacts to share exclusive content that only they can see.
                  </p>
                </div>
                <Button 
                  onClick={() => setShowBestFriends(true)}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Heart className="w-5 h-5" />
                  Manage Best Friends
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BestFriendsManager
        isOpen={showBestFriends}
        onClose={() => setShowBestFriends(false)}
      />
    </div>
  );
}