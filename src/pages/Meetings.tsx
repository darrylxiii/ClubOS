import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, Settings, Video, Clock, Sparkles, BarChart3, FileText, CheckSquare, Search } from "lucide-react";
import { CreateMeetingDialog } from "@/components/meetings/CreateMeetingDialog";
import { MeetingCard } from "@/components/meetings/MeetingCard";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MeetingStatsBar } from "@/components/meetings/MeetingStatsBar";
import { UnifiedCalendarView } from "@/components/meetings/UnifiedCalendarView";
import { MeetingIntelligenceTab } from "@/components/meetings/MeetingIntelligenceTab";
import { NotetakerSettingsTab } from "@/components/meetings/NotetakerSettingsTab";
import { MeetingHistoryTab } from "@/components/meetings/MeetingHistoryTab";
import { InstantMeetingButton } from "@/components/meetings/InstantMeetingButton";
import { MeetingAnalyticsDashboard } from "@/components/meetings/MeetingAnalyticsDashboard";
import { PostMeetingPanel } from "@/components/meetings/PostMeetingPanel";
import { useAutoCreatePMR } from "@/hooks/useAutoCreatePMR";
import { useMeetingsData } from "@/hooks/useMeetingsData";

export default function Meetings() {
  const { t } = useTranslation('meetings');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPostMeeting, setSelectedPostMeeting] = useState<string | null>(null);

  const { meetings, loading, stats, deleteMeeting, refetch } = useMeetingsData();
  const activeTab = searchParams.get('tab') || 'calendar';

  useAutoCreatePMR();

  const filterMeetings = (type: string) => {
    let filtered = meetings;
    if (type === 'my-meetings') {
      filtered = meetings.filter(m => m.host_id === user?.id);
    }
    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  };

  const myMeetings = filterMeetings('my-meetings');

  const setActiveTabValue = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">{t('meetings.text2')}</h1>
          <p className="text-muted-foreground">{t('meetings.desc')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/settings?tab=integrations')} className="gap-2">
            <Settings className="h-4 w-4" />
            Integrations
          </Button>
          <InstantMeetingButton />
          <CreateMeetingDialog onMeetingCreated={refetch} />
        </div>
      </div>

      <MeetingStatsBar
        upcomingCount={stats.upcoming}
        todayCount={stats.today}
        weekCount={stats.week}
        analyzedCount={stats.analyzed}
        hoursTranscribed={stats.hours}
      />

      <Tabs key={activeTab} value={activeTab} onValueChange={setActiveTabValue}>
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 py-1">
          <TabsTrigger value="calendar" className="gap-2"><CalendarIcon className="h-4 w-4" />{t('meetings.text3')}</TabsTrigger>
          <TabsTrigger value="my-meetings" className="gap-2"><Video className="h-4 w-4" />{t('meetings.text4')}</TabsTrigger>
          <TabsTrigger value="prep" className="gap-2"><FileText className="h-4 w-4" />{t('meetings.text5')}</TabsTrigger>
          <TabsTrigger value="post" className="gap-2"><CheckSquare className="h-4 w-4" />{t('meetings.text6')}</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><Clock className="h-4 w-4" />{t('meetings.text7')}</TabsTrigger>
          <TabsTrigger value="intelligence" className="gap-2"><Sparkles className="h-4 w-4" />{t('meetings.text8')}</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="h-4 w-4" />{t('meetings.text9')}</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" />{t('meetings.text10')}</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <UnifiedCalendarView />
        </TabsContent>

        <TabsContent value="my-meetings" className="mt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('meetings.text11')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
              </div>
            ) : myMeetings.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">{t('meetings.text12')}</p>
              </Card>
            ) : (
              myMeetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} onDelete={deleteMeeting} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="prep" className="mt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{t('meetings.text13')}</h3>
              <p className="text-sm text-muted-foreground">{t('meetings.text14')}</p>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : meetings.filter(m => new Date(m.scheduled_start) > new Date()).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('meetings.text15')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {meetings
                  .filter(m => new Date(m.scheduled_start) > new Date())
                  .slice(0, 5)
                  .map((meeting) => (
                    <Card key={meeting.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{meeting.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(meeting.scheduled_start).toLocaleDateString()} at{' '}
                            {new Date(meeting.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/meeting-notes/${meeting.id}`)}>{t('meetings.text16')}</Button>
                      </div>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="post" className="mt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{t('meetings.text17')}</h3>
              <p className="text-sm text-muted-foreground">{t('meetings.text18')}</p>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : meetings.filter(m => new Date(m.scheduled_end || m.scheduled_start) < new Date()).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('meetings.text19')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {meetings
                  .filter(m => new Date(m.scheduled_end || m.scheduled_start) < new Date())
                  .slice(0, 10)
                  .map((meeting) => (
                    <Card key={meeting.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{meeting.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(meeting.scheduled_start).toLocaleDateString()} at{' '}
                            {new Date(meeting.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/meeting-notes/${meeting.id}`)}>{t('meetings.text20')}</Button>
                          <Button variant="outline" size="sm" onClick={() => setSelectedPostMeeting(selectedPostMeeting === meeting.id ? null : meeting.id)}>
                            {selectedPostMeeting === meeting.id ? 'Hide Summary' : 'Quick Summary'}
                          </Button>
                        </div>
                      </div>
                      {selectedPostMeeting === meeting.id && (
                        <div className="mt-4 pt-4 border-t">
                          <PostMeetingPanel meetingId={meeting.id} />
                        </div>
                      )}
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6"><MeetingHistoryTab /></TabsContent>
        <TabsContent value="intelligence" className="mt-6"><MeetingIntelligenceTab /></TabsContent>
        <TabsContent value="analytics" className="mt-6"><MeetingAnalyticsDashboard /></TabsContent>
        <TabsContent value="settings" className="mt-6"><NotetakerSettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
