import { RefreshCw, MessageSquare, Settings } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { PageTitle, Subtitle } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCandidateCommunications } from '@/hooks/useCandidateCommunications';
import { CandidateTimelineView } from '@/components/communication/CandidateTimelineView';
import { MyStrategistCard } from '@/components/communication/MyStrategistCard';
import { CommunicationPreferencesCard } from '@/components/communication/CommunicationPreferencesCard';
import { CommunicationStatsCard } from '@/components/communication/CommunicationStatsCard';

export default function MyCommunications() {
  const {
    communications,
    preferences,
    myStrategist,
    stats,
    loading,
    updatePreferences,
    refetch
  } = useCandidateCommunications();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <PageTitle className="flex items-center gap-2">
              <MessageSquare className="h-7 w-7 text-primary" />
              My Communications
            </PageTitle>
            <Subtitle className="mt-1">
              All your conversations with The Quantum Club in one place
            </Subtitle>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Timeline */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="timeline" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="timeline" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Preferences
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="timeline" className="mt-4">
                <CandidateTimelineView 
                  communications={communications}
                  loading={loading}
                />
              </TabsContent>
              
              <TabsContent value="settings" className="mt-4">
                <CommunicationPreferencesCard
                  preferences={preferences}
                  onUpdate={updatePreferences}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Strategist & Stats */}
          <div className="space-y-6">
            <MyStrategistCard strategist={myStrategist} />
            <CommunicationStatsCard stats={stats} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
