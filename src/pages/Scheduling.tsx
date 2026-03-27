import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import { Calendar, Clock, Plus, Settings, Brain, UsersRound, Code, Zap, BarChart3, CheckCircle, Link as LinkIcon, CreditCard } from 'lucide-react';

import { useBookingLinks, useUpcomingBookings, usePendingBookingsCount, useConnectedCalendars, useCreateBookingLink } from '@/hooks/useBookingLinks';
import { BookingLinksTab } from '@/components/scheduling/BookingLinksTab';
import { UpcomingBookingsTab } from '@/components/scheduling/UpcomingBookingsTab';
import { BookingAvailabilitySettings } from '@/components/scheduling/BookingAvailabilitySettings';
import { BookingAnalyticsDashboard } from '@/components/booking/BookingAnalyticsDashboard';
import { CalendarConnectionStatus } from '@/components/scheduling/CalendarConnectionStatus';
import { VideoPlatformSelector } from '@/components/booking/VideoPlatformSelector';
import { AIPageCopilot } from '@/components/ai/AIPageCopilot';
import { BookingApprovalList } from '@/components/booking/BookingApprovalList';
import { AvailabilityOnboardingWizard } from '@/components/scheduling/AvailabilityOnboardingWizard';
import { useAvailabilityOnboarding } from '@/hooks/useAvailabilityOnboarding';
import { SchedulingSkeleton } from '@/components/LoadingSkeletons';
import { SchedulingAITab } from '@/components/scheduling/SchedulingAITab';
import { TeamLoadDashboard } from '@/components/scheduling/TeamLoadDashboard';
import { EmbedCodeGenerator } from '@/components/booking/EmbedCodeGenerator';
import { BookingWorkflowBuilder } from '@/components/booking/BookingWorkflowBuilder';
import { BookingLinkBrandingSettings } from '@/components/booking/BookingLinkBrandingSettings';
import { useQueryClient } from '@tanstack/react-query';

const INITIAL_LINK_STATE = {
  title: '',
  description: '',
  slug: '',
  duration_minutes: 30,
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
  advance_booking_days: 60,
  min_notice_hours: 2,
  color: '#6366f1',
  scheduling_type: 'individual',
  video_conferencing_provider: null as string | null,
  auto_generate_meeting_link: false,
  allow_waitlist: true,
  single_use: false,
  max_uses: null as number | null,
  requires_approval: false,
  max_bookings_per_day: null as number | null,
  primary_calendar_id: null as string | null,
  create_quantum_meeting: true,
  enable_club_ai: false,
  video_platform: 'quantum_club' as string,
  allow_guest_platform_choice: false,
  available_platforms: ['quantum_club'] as string[],
  guest_permissions: {
    allow_guest_cancel: false,
    allow_guest_reschedule: false,
    allow_guest_propose_times: true,
    allow_guest_add_attendees: false,
    booker_can_delegate: true,
  },
  confirmation_message: '',
  redirect_url: '',
  custom_logo_url: null as string | null,
  payment_required: false,
  payment_amount: null as number | null,
  payment_currency: 'eur',
};

function generateSlug(title: string) {
  const { t } = useTranslation('settings');
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function Scheduling() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'links';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newLink, setNewLink] = useState(INITIAL_LINK_STATE);
  const queryClient = useQueryClient();

  const { data: bookingLinks = [], isLoading: linksLoading } = useBookingLinks();
  const { data: upcomingBookings = [] } = useUpcomingBookings();
  const { data: pendingCount = 0 } = usePendingBookingsCount();
  const { data: connectedCalendars = [] } = useConnectedCalendars();
  const createLink = useCreateBookingLink();
  const { needsOnboarding, loading: onboardingLoading, markComplete } = useAvailabilityOnboarding();

  const handleCreateLink = async () => {
    if (!newLink.title || !newLink.slug) {
      toast.error("Please provide a title and URL slug");
      return;
    }
    createLink.mutate(newLink, {
      onSuccess: () => {
        setNewLink(INITIAL_LINK_STATE);
        setDialogOpen(false);
      },
    });
  };

  if (linksLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <SchedulingSkeleton />
      </div>
    );
  }

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">{t('scheduling.text3')}</h1>
            <p className="text-muted-foreground mt-2">{t('scheduling.desc')}</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="glass">
                <Plus className="h-4 w-4 mr-2" />
                New Booking Link
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('scheduling.text4')}</DialogTitle>
                <DialogDescription>
                  Set up a new booking link for people to schedule time with you
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Basic fields */}
                <div>
                  <Label htmlFor="title">{"Event Title *"}</Label>
                  <Input
                    id="title"
                    value={newLink.title}
                    onChange={(e) => setNewLink({
                      ...newLink,
                      title: e.target.value,
                      slug: newLink.slug || generateSlug(e.target.value),
                    })}
                    placeholder={"e.g., 30 Minute Meeting"}
                  />
                </div>
                <div>
                  <Label htmlFor="slug">{"URL Slug *"}</Label>
                  <div className="flex gap-2">
                    <span className="flex items-center text-sm text-muted-foreground">/book/</span>
                    <Input
                      id="slug"
                      value={newLink.slug}
                      onChange={(e) => setNewLink({ ...newLink, slug: generateSlug(e.target.value) })}
                      placeholder={"30-min-meeting"}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">{t('scheduling.text5')}</Label>
                  <Textarea
                    id="description"
                    value={newLink.description}
                    onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                    placeholder={t('scheduling.text6')}
                  />
                </div>

                {/* Timing */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('scheduling.text7')}</Label>
                    <Input type="number" min="15" step="15" value={newLink.duration_minutes} onChange={(e) => setNewLink({ ...newLink, duration_minutes: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <Label>{t('scheduling.text8')}</Label>
                    <Input type="number" min="0" value={newLink.min_notice_hours} onChange={(e) => setNewLink({ ...newLink, min_notice_hours: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <Label>{t('scheduling.text9')}</Label>
                    <Input type="number" min="0" step="5" value={newLink.buffer_before_minutes} onChange={(e) => setNewLink({ ...newLink, buffer_before_minutes: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <Label>{t('scheduling.text10')}</Label>
                    <Input type="number" min="0" step="5" value={newLink.buffer_after_minutes} onChange={(e) => setNewLink({ ...newLink, buffer_after_minutes: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>{t('scheduling.text11')}</Label>
                  <Input type="number" min="1" value={newLink.advance_booking_days} onChange={(e) => setNewLink({ ...newLink, advance_booking_days: parseInt(e.target.value) })} />
                </div>
                <div>
                  <Label>{t('scheduling.text12')}</Label>
                  <Input type="color" value={newLink.color} onChange={(e) => setNewLink({ ...newLink, color: e.target.value })} />
                </div>

                {/* Advanced Options */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Advanced Options
                  </h3>
                  <div>
                    <Label>{t('scheduling.text13')}</Label>
                    <Select value={newLink.scheduling_type} onValueChange={(value) => setNewLink({ ...newLink, scheduling_type: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">{t('scheduling.text14')}</SelectItem>
                        <SelectItem value="round_robin">{t('scheduling.text15')}</SelectItem>
                        <SelectItem value="collective">{t('scheduling.text16')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('scheduling.text17')}</Label>
                    <Select
                      value={newLink.video_conferencing_provider || 'none'}
                      onValueChange={(value) => setNewLink({ ...newLink, video_conferencing_provider: value === 'none' ? null : value, auto_generate_meeting_link: value !== 'none' })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('scheduling.text18')}</SelectItem>
                        <SelectItem value="google_meet">{t('scheduling.text19')}</SelectItem>
                        <SelectItem value="zoom">{t('scheduling.text20')}</SelectItem>
                        <SelectItem value="microsoft_teams">{t('scheduling.text21')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {[
                    { id: 'waitlist', label: 'Enable Waitlist', desc: 'Let people join waitlist when fully booked', key: 'allow_waitlist' as const },
                    { id: 'single_use', label: 'Single-Use Link', desc: 'Link expires after first booking', key: 'single_use' as const },
                    { id: 'requires_approval', label: 'Require Approval', desc: 'Manually approve bookings before confirming', key: 'requires_approval' as const },
                  ].map((opt) => (
                    <div key={opt.id} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={opt.id}>{opt.label}</Label>
                        <p className="text-sm text-muted-foreground">{opt.desc}</p>
                      </div>
                      <Switch id={opt.id} checked={newLink[opt.key] as boolean} onCheckedChange={(checked) => setNewLink({ ...newLink, [opt.key]: checked })} />
                    </div>
                  ))}

                  <div>
                    <Label>{t('scheduling.text22')}</Label>
                    <Input type="number" min="1" placeholder={t('scheduling.text23')} value={newLink.max_bookings_per_day || ''} onChange={(e) => setNewLink({ ...newLink, max_bookings_per_day: e.target.value ? parseInt(e.target.value) : null })} />
                  </div>
                </div>

                {/* Calendar Integration */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Calendar Integration
                  </h3>
                  <div>
                    <Label>{t('scheduling.text24')}</Label>
                    <Select value={newLink.primary_calendar_id || 'none'} onValueChange={(value) => setNewLink({ ...newLink, primary_calendar_id: value === 'none' ? null : value })}>
                      <SelectTrigger><SelectValue placeholder={t('scheduling.text25')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('scheduling.text26')}</SelectItem>
                        {connectedCalendars.map((cal: any) => (
                          <SelectItem key={cal.id} value={cal.id}>
                            {cal.provider === 'google' ? '📅 Google' : '📆 Microsoft'} - {cal.calendar_label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <VideoPlatformSelector
                    value={newLink.video_platform || 'quantum_club'}
                    onChange={(platform) => setNewLink({
                      ...newLink,
                      video_platform: platform,
                      create_quantum_meeting: platform === 'quantum_club',
                      available_platforms: newLink.available_platforms.includes(platform) ? newLink.available_platforms : [...newLink.available_platforms, platform],
                    })}
                    hasGoogleCalendar={connectedCalendars.some((cal: any) => cal.provider === 'google')}
                    onConnectGoogle={() => toast.info("Please connect your Google Calendar in Settings → Connections")}
                    enableClubAI={newLink.enable_club_ai}
                    onEnableClubAIChange={(checked) => setNewLink({ ...newLink, enable_club_ai: checked })}
                    allowGuestChoice={newLink.allow_guest_platform_choice}
                    onAllowGuestChoiceChange={(checked) => setNewLink({ ...newLink, allow_guest_platform_choice: checked })}
                    availablePlatforms={newLink.available_platforms}
                    onAvailablePlatformsChange={(platforms) => setNewLink({ ...newLink, available_platforms: platforms })}
                  />
                </div>

                {/* Guest Permissions */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Guest Permissions
                  </h3>
                  {[
                    { id: 'allow_propose_times', label: 'Allow guests to propose alternative times', key: 'allow_guest_propose_times' as const },
                    { id: 'allow_cancel', label: 'Allow guests to cancel the meeting', key: 'allow_guest_cancel' as const },
                    { id: 'allow_reschedule', label: 'Allow guests to reschedule', key: 'allow_guest_reschedule' as const },
                    { id: 'allow_add_attendees', label: 'Allow guests to add more attendees', key: 'allow_guest_add_attendees' as const },
                  ].map((perm) => (
                    <div key={perm.id} className="flex items-center justify-between">
                      <Label htmlFor={perm.id} className="text-sm font-normal">{perm.label}</Label>
                      <Switch id={perm.id} checked={newLink.guest_permissions[perm.key]} onCheckedChange={(checked) => setNewLink({ ...newLink, guest_permissions: { ...newLink.guest_permissions, [perm.key]: checked } })} />
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-normal">{t('scheduling.text27')}</Label>
                        <p className="text-xs text-muted-foreground">{t('scheduling.text28')}</p>
                      </div>
                      <Switch checked={newLink.guest_permissions.booker_can_delegate} onCheckedChange={(checked) => setNewLink({ ...newLink, guest_permissions: { ...newLink.guest_permissions, booker_can_delegate: checked } })} />
                    </div>
                  </div>
                </div>

                {/* Payment */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('scheduling.text29')}</Label>
                      <p className="text-sm text-muted-foreground">{t('scheduling.text30')}</p>
                    </div>
                    <Switch checked={newLink.payment_required} onCheckedChange={(checked) => setNewLink({ ...newLink, payment_required: checked })} />
                  </div>
                  {newLink.payment_required && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('scheduling.text31')}</Label>
                        <Input type="number" min="0.50" step="0.50" placeholder="25.00" value={newLink.payment_amount || ''} onChange={(e) => setNewLink({ ...newLink, payment_amount: e.target.value ? parseFloat(e.target.value) : null })} />
                      </div>
                      <div>
                        <Label>{t('scheduling.text32')}</Label>
                        <Select value={newLink.payment_currency} onValueChange={(value) => setNewLink({ ...newLink, payment_currency: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="eur">{"EUR (€)"}</SelectItem>
                            <SelectItem value="usd">{"USD ($)"}</SelectItem>
                            <SelectItem value="gbp">{"GBP (£)"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Branding */}
                <BookingLinkBrandingSettings
                  value={{ custom_logo_url: newLink.custom_logo_url, confirmation_message: newLink.confirmation_message, redirect_url: newLink.redirect_url }}
                  onChange={(branding) => setNewLink({ ...newLink, custom_logo_url: branding.custom_logo_url, confirmation_message: branding.confirmation_message, redirect_url: branding.redirect_url })}
                />

                <Button onClick={handleCreateLink} disabled={createLink.isPending} className="w-full" variant="glass">
                  {createLink.isPending ? 'Creating...' : 'Create Booking Link'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <CalendarConnectionStatus />

        {!onboardingLoading && needsOnboarding && (
          <AvailabilityOnboardingWizard onComplete={markComplete} onSkip={markComplete} />
        )}

        <Tabs value={currentTab} onValueChange={(val) => setSearchParams({ tab: val }, { replace: true })} className="w-full">
          <TabsList className="flex-wrap h-auto gap-1 py-1">
            <TabsTrigger value="links"><LinkIcon className="h-4 w-4 mr-2" />{t('scheduling.text33')}</TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              <CheckCircle className="h-4 w-4 mr-2" />
              Pending Approvals
              {pendingCount > 0 && <Badge variant="destructive" className="ml-2 h-5 min-w-5 text-xs">{pendingCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="bookings"><Calendar className="h-4 w-4 mr-2" />{t('scheduling.text34')}</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-2" />{t('scheduling.text35')}</TabsTrigger>
            <TabsTrigger value="availability"><Clock className="h-4 w-4 mr-2" />{t('scheduling.text36')}</TabsTrigger>
            <TabsTrigger value="ai" className="gap-2"><Brain className="h-4 w-4" />{t('scheduling.text37')}</TabsTrigger>
            <TabsTrigger value="team" className="gap-2"><UsersRound className="h-4 w-4" />{t('scheduling.text38')}</TabsTrigger>
            <TabsTrigger value="embed" className="gap-2"><Code className="h-4 w-4" />{t('scheduling.text39')}</TabsTrigger>
            <TabsTrigger value="workflows" className="gap-2"><Zap className="h-4 w-4" />{t('scheduling.text40')}</TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="space-y-4 mt-6">
            <BookingLinksTab bookingLinks={bookingLinks} />
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4 mt-6">
            <UpcomingBookingsTab bookings={upcomingBookings} />
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <BookingApprovalList onApprovalChange={() => queryClient.invalidateQueries({ queryKey: ['pending-bookings-count'] })} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <BookingAnalyticsDashboard userId={user?.id || ''} />
          </TabsContent>

          <TabsContent value="availability" className="mt-6">
            <BookingAvailabilitySettings />
          </TabsContent>

          <TabsContent value="ai" className="mt-6">
            <SchedulingAITab bookingIds={upcomingBookings.map((b) => b.id)} />
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            {bookingLinks.some((l) => l.scheduling_type === 'round_robin' || l.scheduling_type === 'collective') ? (
              <TeamLoadDashboard bookingLinkId={bookingLinks.find((l) => l.scheduling_type === 'round_robin' || l.scheduling_type === 'collective')?.id || ''} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <UsersRound className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('scheduling.text41')}</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">{t('scheduling.desc2')}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="embed" className="mt-6">
            <EmbedCodeGenerator bookingLinks={bookingLinks.map((l) => ({ id: l.id, slug: l.slug, title: l.title }))} />
          </TabsContent>

          <TabsContent value="workflows" className="mt-6">
            <BookingWorkflowBuilder bookingLinks={bookingLinks.map((l) => ({ id: l.id, title: l.title }))} userId={user?.id || ''} />
          </TabsContent>
        </Tabs>
      </div>

      <AIPageCopilot currentPage="/scheduling" contextData={{ bookingLinksCount: bookingLinks.length }} />
    </>
  );
}
